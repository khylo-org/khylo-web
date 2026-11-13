import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { getInstantMixApi } from '@khylo/sdk/lib/utils/api/instant-mix-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { playMediaItem } from '../media/mediaUtils';
import { STATION_LIMIT, buildProfile, interleave, rankCloseArtists, shuffled, songFits } from './radioRules';

const SONG_FIELDS = [ ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ];

/** Songs by one artist, in random order. Nothing (rather than an error) when the server can't be asked. */
async function songsBy(api: Api, userId: string | undefined, artistId: string, limit: number): Promise<BaseItemDto[]> {
    try {
        const res = await getLibraryApi(api).getItems({
            userId,
            artistIds: [ artistId ],
            includeItemTypes: [ BaseItemKind.Audio ],
            recursive: true,
            sortBy: [ ItemSortBy.Random ],
            fields: SONG_FIELDS,
            limit
        });
        return res.data.Items ?? [];
    } catch {
        return [];
    }
}

/** An artist picked from a list or a link carries no genres: ask the server for the full artist. */
async function withGenres(api: Api, userId: string | undefined, artist: BaseItemDto): Promise<BaseItemDto> {
    if (artist.Genres || !artist.Id) return artist;
    try {
        const res = await getLibraryApi(api).getItem({ userId, itemId: artist.Id });
        return res.data;
    } catch {
        return artist;
    }
}

/** The server's list of artists like this one (it matches on any one shared genre, so the result is filtered after). */
async function similarArtists(api: Api, userId: string | undefined, artistId: string): Promise<BaseItemDto[]> {
    try {
        const res = await getLibraryApi(api).getSimilarArtists({ itemId: artistId, userId, limit: 40, fields: [ ItemFields.Genres ] });
        return res.data.Items ?? [];
    } catch {
        return [];
    }
}

/** The server's own mix for an artist; used when the library has few close artists. */
async function instantMix(api: Api, userId: string | undefined, artistId: string): Promise<BaseItemDto[]> {
    try {
        const res = await getInstantMixApi(api).getInstantMixFromItem({ itemId: artistId, userId, limit: 150, fields: SONG_FIELDS });
        return res.data.Items ?? [];
    } catch {
        return [];
    }
}

/**
 * A station's queue: starts with the artist, then alternates them with songs from artists who really sound like them.
 * Same steps as the iPhone app.
 */
export async function getRadioSongs(api: Api, userId: string | undefined, artist: BaseItemDto, limit = STATION_LIMIT): Promise<BaseItemDto[]> {
    const artistId = artist.Id;
    if (!artistId) return [];

    const own = await songsBy(api, userId, artistId, 120);
    const detailed = await withGenres(api, userId, artist);
    const profile = buildProfile(detailed.Genres, own);
    // Artists the library has no genre tags for are kept as candidates: their songs are checked one by one below
    const matches = rankCloseArtists(await similarArtists(api, userId, artistId), artistId, profile, 10, { keepUnknown: true });

    const lists = await Promise.all(matches.map(match => (match.Id ? songsBy(api, userId, match.Id, 14) : Promise.resolve([] as BaseItemDto[]))));
    let others = lists.flatMap(songs => songs.filter(song => songFits(song, profile)).slice(0, 8));

    if (others.length < 10) {
        // Few close artists in the library: the server's mix, held to the same standard
        const ownIds = new Set(own.map(song => song.Id));
        const mix = await instantMix(api, userId, artistId);
        others = others.concat(mix.filter(song => !ownIds.has(song.Id) && songFits(song, profile)));
    }

    return interleave(own, shuffled(others), limit);
}

/** Builds the station and plays it through the normal player. False when there was nothing to play. */
export async function startArtistRadio(api: Api | undefined, userId: string | undefined, artist: BaseItemDto): Promise<boolean> {
    if (!api || !artist.Id) return false;
    const songs = await getRadioSongs(api, userId, artist);
    if (songs.length === 0) return false;
    playMediaItem(songs[0], { items: songs, startIndex: 0 });
    return true;
}

/** Artists who really sound like this one, best match first (for the artist page's "Similar artists"). Same standard as the station. */
export async function getSimilarArtistsFor(api: Api, userId: string | undefined, artist: BaseItemDto, limit = 12): Promise<BaseItemDto[]> {
    const artistId = artist.Id;
    if (!artistId) return [];
    const own = await songsBy(api, userId, artistId, 60);
    const detailed = await withGenres(api, userId, artist);
    const profile = buildProfile(detailed.Genres, own);
    return rankCloseArtists(await similarArtists(api, userId, artistId), artistId, profile, limit);
}
