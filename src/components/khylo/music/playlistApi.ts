import type { QueryClient } from '@tanstack/react-query';

import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { MediaType } from '@khylo/sdk/lib/generated-client/models/media-type';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getPlaylistApi } from '@khylo/sdk/lib/utils/api/playlist-api';

import { cleanPlaylistName, idsToAdd } from './playlistRules';

/** The sidebar's list of audio playlists. Refresh it after any change (see refreshPlaylists). */
export const PLAYLISTS_QUERY_KEY = 'KhyloMusicPlaylists';
/** The songs of one playlist, for its page. */
export const PLAYLIST_SONGS_QUERY_KEY = 'KhyloPlaylistSongs';

export interface PlaylistAccess {
    /** The owner, or someone the owner let edit. Only they can rename, add, remove or reorder. */
    canEdit: boolean;
    /** Visible to everyone on this server. */
    isPublic: boolean;
}

/** Audio playlists only; video playlists belong to the rest of the app. */
export async function fetchAudioPlaylists(api: Api, userId: string | undefined): Promise<BaseItemDto[]> {
    const res = await getLibraryApi(api).getItems({
        userId,
        includeItemTypes: [ BaseItemKind.Playlist ],
        recursive: true,
        fields: [ ItemFields.ChildCount, ItemFields.PrimaryImageAspectRatio ],
        sortBy: [ ItemSortBy.SortName ]
    });
    return (res.data.Items ?? []).filter(playlist => playlist.MediaType === MediaType.Audio);
}

/** The songs of a playlist in order. Each carries PlaylistItemId, which the server uses to remove or move it. */
export async function fetchPlaylistSongs(api: Api, userId: string | undefined, playlistId: string): Promise<BaseItemDto[]> {
    const res = await getPlaylistApi(api).getPlaylistItems({
        playlistId,
        userId,
        fields: [ ItemFields.PrimaryImageAspectRatio, ItemFields.Genres ],
        enableUserData: true
    });
    return res.data.Items ?? [];
}

/** The ids of the songs in a playlist, for "is this song already in it". */
export async function fetchPlaylistSongIds(api: Api, userId: string | undefined, playlistId: string): Promise<string[]> {
    const res = await getPlaylistApi(api).getPlaylistItems({ playlistId, userId, fields: [], enableImages: false, enableUserData: false });
    return (res.data.Items ?? []).map(item => item.Id).filter((id): id is string => Boolean(id));
}

/** Whether this user may change the playlist, and who can see it. */
export async function fetchPlaylistAccess(api: Api, userId: string | undefined, playlistId: string): Promise<PlaylistAccess> {
    const playlist = getPlaylistApi(api);
    let isPublic = false;
    try {
        isPublic = Boolean((await playlist.getPlaylist({ playlistId })).data.OpenAccess);
    } catch {
        // Not readable: treated as private
    }
    let canEdit = false;
    if (userId) {
        try {
            canEdit = Boolean((await playlist.getPlaylistUser({ playlistId, userId })).data?.CanEdit);
        } catch {
            // The server answers "not found" for someone with no rights
        }
    }
    return { canEdit, isPublic };
}

/** Makes a playlist (with songs in it, if given) and returns its id. */
export async function createPlaylist(api: Api, userId: string | undefined, name: string, songIds: string[] = [], isPublic = false): Promise<string> {
    const clean = cleanPlaylistName(name);
    if (!clean) throw new Error('A playlist needs a name.');
    const res = await getPlaylistApi(api).createPlaylist({
        createPlaylistDto: { Name: clean, Ids: songIds, UserId: userId, MediaType: MediaType.Audio, IsPublic: isPublic }
    });
    const id = res.data.Id;
    if (!id) throw new Error('The server did not say which playlist it made.');
    return id;
}

/** Renames a playlist and/or changes who can see it. */
export async function updatePlaylist(api: Api, playlistId: string, changes: { name?: string; isPublic?: boolean }): Promise<void> {
    const name = changes.name === undefined ? undefined : cleanPlaylistName(changes.name);
    if (name === '') throw new Error('A playlist needs a name.');
    await getPlaylistApi(api).updatePlaylist({ playlistId, updatePlaylistDto: { Name: name, IsPublic: changes.isPublic } });
}

/** Adds songs that are not already in the playlist. Says how many went in. */
export async function addSongs(api: Api, userId: string | undefined, playlistId: string, songIds: string[]): Promise<{ added: number; alreadyThere: number }> {
    const existing = await fetchPlaylistSongIds(api, userId, playlistId);
    const fresh = idsToAdd(existing, songIds);
    if (fresh.length > 0) {
        await getPlaylistApi(api).addItemToPlaylist({ playlistId, ids: fresh, userId });
    }
    return { added: fresh.length, alreadyThere: songIds.length - fresh.length };
}

/** Takes songs out by their playlist entry id (the PlaylistItemId each song carries). */
export async function removeSongs(api: Api, playlistId: string, entryIds: string[]): Promise<void> {
    if (entryIds.length === 0) return;
    await getPlaylistApi(api).removeItemFromPlaylist({ playlistId, entryIds });
}

/** Moves a song (by its playlist entry id) to a new place in the playlist. */
export async function moveSong(api: Api, playlistId: string, entryId: string, newIndex: number): Promise<void> {
    await getPlaylistApi(api).moveItem({ playlistId, itemId: entryId, newIndex });
}

/** Deletes the playlist. Only its owner (or an admin) may; the songs themselves are not touched. */
export async function deletePlaylist(api: Api, playlistId: string): Promise<void> {
    await getLibraryApi(api).deleteItem({ itemId: playlistId });
}

/** Refreshes everything that shows playlists, so a change appears at once everywhere. */
export async function refreshPlaylists(queryClient: QueryClient, playlistId?: string): Promise<void> {
    const tasks = [ queryClient.invalidateQueries({ queryKey: [ PLAYLISTS_QUERY_KEY ] }) ];
    if (playlistId) {
        tasks.push(queryClient.invalidateQueries({ queryKey: [ PLAYLIST_SONGS_QUERY_KEY, playlistId ] }));
        tasks.push(queryClient.invalidateQueries({ queryKey: [ 'KhyloItemDetails', playlistId ] }));
        tasks.push(queryClient.invalidateQueries({ queryKey: [ 'KhyloPlaylistMembers' ] }));
    }
    await Promise.all(tasks);
}

/** A readable reason for a failed playlist change, for a message on screen. */
export function playlistErrorMessage(error: unknown): string {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 403 || status === 401) return 'Only the playlist’s owner can change it.';
    if (status === 404) return 'That playlist is no longer there.';
    if (error instanceof Error && error.message) return error.message;
    return 'Something went wrong. Try again.';
}
