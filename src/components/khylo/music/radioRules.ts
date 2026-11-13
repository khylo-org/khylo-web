import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

/**
 * The rules behind Artist Radio: an artist's songs mixed with songs by artists who really sound like them.
 * Same rules as the iPhone app (KhyloRadio.swift), so a station sounds the same everywhere.
 *
 * The server matches artists on any one shared genre, so a broad tag like "Rock" would put Elvis next to metalcore.
 * Here a match needs a shared specific genre (or several broad ones), and songs from a very different era stay out.
 */

/** Tags too wide to say two artists sound alike on their own. */
export const BROAD_GENRES: ReadonlySet<string> = new Set([
    'rock', 'pop', 'alternative', 'alternativerock', 'indie', 'indierock', 'electronic',
    'hiphop', 'rap', 'metal', 'heavymetal', 'randb', 'rnb', 'soul', 'country', 'jazz',
    'classical', 'soundtrack', 'dance', 'folk', 'blues', 'world', 'latin', 'punk',
    'christian', 'gospel', 'reggae', 'oldies', 'other', 'unknown', 'music', 'vocal',
    'instrumental', 'easylistening', 'poprock', 'hardrock'
]);

/** Most years apart two songs can be and still share a station. */
export const ERA_SPAN = 15;

/** How many songs a station's first queue holds. */
export const STATION_LIMIT = 80;

// Anything that is not a letter or digit in any script. Built from a string because the project's compile target predates the u flag in literals.
const NOT_LETTER_OR_DIGIT = new RegExp(String.raw`[^\p{L}\p{N}]`, 'gu');

/** "Post-Hardcore", "post hardcore" and "Post Hardcore" are one genre. */
export function genreKey(genre: string): string {
    return genre
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(NOT_LETTER_OR_DIGIT, '');
}

/** Splits tags that hold several genres ("Rock; Metalcore", "Rock/Pop"). */
export function genreKeys(genres?: readonly string[] | null): Set<string> {
    const keys = new Set<string>();
    for (const tag of genres ?? []) {
        for (const part of tag.split(/[;/|,]/)) {
            const key = genreKey(part);
            if (key) keys.add(key);
        }
    }
    return keys;
}

/** How alike two sets of genres are: 1 for each shared specific genre, a third for each broad one. */
export function genreScore(genres: ReadonlySet<string>, profile: ReadonlySet<string>): number {
    let score = 0;
    for (const genre of genres) {
        if (profile.has(genre)) score += BROAD_GENRES.has(genre) ? 1 / 3 : 1;
    }
    return score;
}

export interface RadioProfile {
    /** The genres that describe the artist, from their own tags and their songs'. */
    genres: Set<string>;
    /** The year in the middle of their songs, when the songs have years. */
    year: number | null;
    /** The score a match needs: with only broad tags to go on, sharing one is the best that can be asked. */
    needed: number;
}

/** What the artist sounds like, worked out from their own tags (weighted 3) and every song's (weighted 1). */
export function buildProfile(artistGenres: readonly string[] | null | undefined, songs: readonly BaseItemDto[]): RadioProfile {
    const counts = new Map<string, number>();
    for (const genre of genreKeys(artistGenres)) counts.set(genre, (counts.get(genre) ?? 0) + 3);
    for (const song of songs) {
        for (const genre of genreKeys(song.Genres)) counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }

    // A genre on one stray song out of many isn't what the artist is
    const floor = Math.max(1, Math.floor(songs.length / 10));
    const genres = new Set<string>();
    for (const [genre, count] of counts) {
        if (count >= floor) genres.add(genre);
    }

    const years = songs
        .map(song => song.ProductionYear)
        .filter((year): year is number => typeof year === 'number' && year > 1900)
        .sort((a, b) => a - b);

    return {
        genres,
        year: years.length ? years[Math.floor(years.length / 2)] : null,
        needed: [ ...genres ].some(genre => !BROAD_GENRES.has(genre)) ? 1 : 1 / 3
    };
}

/** True when a song belongs on the station: close enough in era, and sharing enough genre (a song with no genre passes). */
export function songFits(song: BaseItemDto, profile: RadioProfile): boolean {
    const songYear = song.ProductionYear;
    if (profile.year !== null && typeof songYear === 'number' && songYear > 1900 && Math.abs(songYear - profile.year) > ERA_SPAN) {
        return false;
    }
    const songGenres = genreKeys(song.Genres);
    return songGenres.size === 0 || genreScore(songGenres, profile.genres) + 1e-9 >= profile.needed;
}

/**
 * Artists who sound like this one, best match first. Candidates with tags that do not share enough genre are dropped.
 * An artist with no genre tags at all is not judged on tags it does not have: with `keepUnknown` they follow the matches
 * (a station then checks their songs one by one); without it they are left out (the "Similar artists" list stays strict).
 */
export function rankCloseArtists(
    candidates: readonly BaseItemDto[],
    artistId: string,
    profile: RadioProfile,
    limit: number,
    options?: { keepUnknown?: boolean }
): BaseItemDto[] {
    const others = candidates
        .filter(candidate => candidate.Id !== artistId)
        .map(candidate => ({ candidate, keys: genreKeys(candidate.Genres) }));

    const matched = others
        .filter(entry => entry.keys.size > 0)
        .map(entry => ({ candidate: entry.candidate, score: genreScore(entry.keys, profile.genres) }))
        .filter(entry => entry.score + 1e-9 >= profile.needed)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.candidate);

    const unknown = options?.keepUnknown ? others.filter(entry => entry.keys.size === 0).map(entry => entry.candidate) : [];
    return [ ...matched, ...unknown ].slice(0, limit);
}

/** Artist, match, match, artist... with no song twice. When one list runs out the other carries on. */
export function interleave(own: readonly BaseItemDto[], others: readonly BaseItemDto[], limit: number): BaseItemDto[] {
    const result: BaseItemDto[] = [];
    const seen = new Set<string>();
    let mine = 0;
    let theirs = 0;
    let step = 0;

    const nextMine = () => (mine < own.length ? own[mine++] : undefined);
    const nextTheirs = () => (theirs < others.length ? others[theirs++] : undefined);

    while (result.length < limit) {
        const song = step % 3 === 0 ? (nextMine() ?? nextTheirs()) : (nextTheirs() ?? nextMine());
        if (!song) break;
        step++;
        if (song.Id && !seen.has(song.Id)) {
            seen.add(song.Id);
            result.push(song);
        }
    }
    return result;
}

/** A shuffled copy (Fisher-Yates). The random source can be given so tests are repeatable. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
    const copy = [ ...items ];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [ copy[i], copy[j] ] = [ copy[j], copy[i] ];
    }
    return copy;
}
