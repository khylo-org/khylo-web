import { describe, expect, it } from 'vitest';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import {
    BROAD_GENRES,
    ERA_SPAN,
    buildProfile,
    genreKey,
    genreKeys,
    genreScore,
    interleave,
    rankCloseArtists,
    shuffled,
    songFits
} from './radioRules';

const song = (id: string, genres?: string[], year?: number): BaseItemDto => ({ Id: id, Genres: genres, ProductionYear: year });

describe('genre keys', () => {
    it('treats spellings of one genre as the same', () => {
        expect(genreKey('Post-Hardcore')).toBe('posthardcore');
        expect(genreKey('post hardcore')).toBe('posthardcore');
        expect(genreKey('Post Hardcore')).toBe('posthardcore');
        expect(genreKey('R&B')).toBe('randb');
    });

    it('splits tags that hold several genres', () => {
        expect(genreKeys([ 'Rock; Metalcore', 'Rock/Pop', 'Hip-Hop, Rap' ])).toEqual(new Set([ 'rock', 'metalcore', 'pop', 'hiphop', 'rap' ]));
    });

    it('copes with nothing', () => {
        expect(genreKeys(undefined).size).toBe(0);
        expect(genreKeys(null).size).toBe(0);
        expect(genreKeys([ '', ' ; ' ]).size).toBe(0);
    });

    it('keeps letters from other scripts', () => {
        expect(genreKey('ロック')).toBe('ロック');
    });
});

describe('genre score', () => {
    it('gives a whole point for a specific genre and a third for a broad one', () => {
        expect(BROAD_GENRES.has('rock')).toBe(true);
        expect(genreScore(new Set([ 'metalcore' ]), new Set([ 'metalcore' ]))).toBe(1);
        expect(genreScore(new Set([ 'rock' ]), new Set([ 'rock' ]))).toBeCloseTo(1 / 3);
        expect(genreScore(new Set([ 'rock', 'metalcore' ]), new Set([ 'rock', 'metalcore' ]))).toBeCloseTo(4 / 3);
    });

    it('scores nothing for no overlap', () => {
        expect(genreScore(new Set([ 'jazz' ]), new Set([ 'metalcore' ]))).toBe(0);
    });
});

describe('profile', () => {
    it("weights the artist's own tags above a stray song's tag", () => {
        const songs = Array.from({ length: 20 }, (_, i) => song(`s${i}`, [ 'Metalcore' ], 2020));
        songs.push(song('stray', [ 'Polka' ], 2020));
        const profile = buildProfile([ 'Post-Hardcore' ], songs);
        expect(profile.genres.has('posthardcore')).toBe(true);
        expect(profile.genres.has('metalcore')).toBe(true);
        // One polka song out of 21 is below the floor of 2
        expect(profile.genres.has('polka')).toBe(false);
    });

    it('takes the middle year of the songs, ignoring songs without one', () => {
        const profile = buildProfile([ 'Rock' ], [ song('a', [], 2000), song('b', [], 2010), song('c', [], 2020), song('d', [], undefined), song('e', [], 0) ]);
        expect(profile.year).toBe(2010);
    });

    it('has no year when no song has one', () => {
        expect(buildProfile([ 'Rock' ], [ song('a'), song('b') ]).year).toBeNull();
    });

    it('asks for a whole shared genre when the artist has a specific one, a third when only broad ones', () => {
        expect(buildProfile([ 'Metalcore', 'Rock' ], []).needed).toBe(1);
        expect(buildProfile([ 'Rock' ], []).needed).toBeCloseTo(1 / 3);
    });
});

describe('what fits a station', () => {
    const profile = buildProfile([ 'Post-Hardcore' ], [ song('a', [ 'Post-Hardcore' ], 2020), song('b', [ 'Post-Hardcore' ], 2020), song('c', [ 'Post-Hardcore' ], 2020) ]);

    it('accepts a song sharing a specific genre', () => {
        expect(songFits(song('x', [ 'Post Hardcore', 'Rock' ], 2019), profile)).toBe(true);
    });

    it('rejects a song sharing only a broad genre when the artist has a specific one', () => {
        expect(songFits(song('x', [ 'Rock' ], 2019), profile)).toBe(false);
    });

    it('lets a song with no genre through', () => {
        expect(songFits(song('x', undefined, 2019), profile)).toBe(true);
    });

    it('keeps out songs from a very different era but not ones just inside the span', () => {
        expect(songFits(song('far', [ 'Post-Hardcore' ], 2020 - ERA_SPAN - 1), profile)).toBe(false);
        expect(songFits(song('edge', [ 'Post-Hardcore' ], 2020 - ERA_SPAN), profile)).toBe(true);
    });

    it('ignores a song year when it is missing', () => {
        expect(songFits(song('x', [ 'Post-Hardcore' ]), profile)).toBe(true);
    });

    it('lets broad-only artists match on one broad genre', () => {
        const broad = buildProfile([ 'Rock' ], [ song('a', [ 'Rock' ]), song('b', [ 'Rock' ]) ]);
        expect(songFits(song('x', [ 'Rock' ]), broad)).toBe(true);
        expect(songFits(song('y', [ 'Jazz' ]), broad)).toBe(false);
    });
});

describe('close artists', () => {
    const profile = buildProfile([ 'Post-Hardcore' ], [ song('a', [ 'Post-Hardcore', 'Metalcore' ]), song('b', [ 'Metalcore' ]) ]);
    const artist = (id: string, genres?: string[]): BaseItemDto => ({ Id: id, Genres: genres });

    it('drops the artist themself and anyone without enough shared genre, best first', () => {
        const ranked = rankCloseArtists([
            artist('self', [ 'Post-Hardcore' ]),
            artist('one', [ 'Metalcore' ]),
            artist('two', [ 'Post-Hardcore', 'Metalcore' ]),
            artist('none', [ 'Jazz' ]),
            artist('broad', [ 'Rock' ])
        ], 'self', profile, 10);
        expect(ranked.map(a => a.Id)).toEqual([ 'two', 'one' ]);
    });

    it('honours the limit', () => {
        const ranked = rankCloseArtists([ artist('one', [ 'Metalcore' ]), artist('two', [ 'Metalcore' ]) ], 'self', profile, 1);
        expect(ranked).toHaveLength(1);
    });

    it('leaves out artists with no genre tags unless asked to keep them', () => {
        const candidates = [ artist('tagged', [ 'Metalcore' ]), artist('bare'), artist('empty', []) ];
        expect(rankCloseArtists(candidates, 'self', profile, 10).map(a => a.Id)).toEqual([ 'tagged' ]);
    });

    it('keeps untagged artists after the real matches when asked, never ahead of them', () => {
        const candidates = [ artist('bare'), artist('tagged', [ 'Metalcore' ]), artist('jazz', [ 'Jazz' ]) ];
        const ranked = rankCloseArtists(candidates, 'self', profile, 10, { keepUnknown: true });
        expect(ranked.map(a => a.Id)).toEqual([ 'tagged', 'bare' ]);
    });

    it('still drops an artist whose tags clearly do not match, even when keeping untagged ones', () => {
        const ranked = rankCloseArtists([ artist('jazz', [ 'Jazz' ]) ], 'self', profile, 10, { keepUnknown: true });
        expect(ranked).toEqual([]);
    });

    it('applies the limit to the matches and the kept artists together', () => {
        const candidates = [ artist('a', [ 'Metalcore' ]), artist('b'), artist('c') ];
        expect(rankCloseArtists(candidates, 'self', profile, 2, { keepUnknown: true }).map(x => x.Id)).toEqual([ 'a', 'b' ]);
    });
});

describe('interleave', () => {
    const own = [ song('o1'), song('o2'), song('o3'), song('o4') ];
    const others = [ song('t1'), song('t2'), song('t3'), song('t4'), song('t5') ];

    it('goes artist, match, match, artist...', () => {
        expect(interleave(own, others, 7).map(s => s.Id)).toEqual([ 'o1', 't1', 't2', 'o2', 't3', 't4', 'o3' ]);
    });

    it('stops at the limit', () => {
        expect(interleave(own, others, 3)).toHaveLength(3);
    });

    it('carries on with matches when the artist runs out, and the other way round', () => {
        expect(interleave([ song('o1') ], others, 6).map(s => s.Id)).toEqual([ 'o1', 't1', 't2', 't3', 't4', 't5' ]);
        expect(interleave(own, [], 6).map(s => s.Id)).toEqual([ 'o1', 'o2', 'o3', 'o4' ]);
    });

    it('never plays a song twice', () => {
        const dupes = interleave([ song('x'), song('x') ], [ song('x'), song('y') ], 10);
        expect(dupes.map(s => s.Id)).toEqual([ 'x', 'y' ]);
    });

    it('is empty with nothing to play', () => {
        expect(interleave([], [], 10)).toEqual([]);
    });
});

describe('shuffled', () => {
    it('keeps every item and does not change the original', () => {
        const items = [ 1, 2, 3, 4, 5, 6 ];
        const out = shuffled(items);
        expect(out.slice().sort()).toEqual(items);
        expect(items).toEqual([ 1, 2, 3, 4, 5, 6 ]);
    });

    it('is repeatable with a fixed random source', () => {
        let n = 0;
        const fixed = () => [ 0.1, 0.7, 0.3, 0.9, 0.5 ][n++ % 5];
        const a = shuffled([ 1, 2, 3, 4, 5 ], fixed);
        n = 0;
        expect(shuffled([ 1, 2, 3, 4, 5 ], fixed)).toEqual(a);
    });
});
