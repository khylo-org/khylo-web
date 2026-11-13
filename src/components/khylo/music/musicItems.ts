import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { MediaType } from '@khylo/sdk/lib/generated-client/models/media-type';

import { openPlaylistDialog, openPlaylistPicker } from './musicUi';

/**
 * Albums, artists, songs and audio playlists belong to the music section,
 * so their pages keep the music sidebar.
 */
export const isMusicItem = (item?: BaseItemDto | null): boolean => {
    if (!item) return false;
    if (item.Type === BaseItemKind.MusicAlbum || item.Type === BaseItemKind.MusicArtist || item.Type === BaseItemKind.Audio) {
        return true;
    }
    return item.Type === BaseItemKind.Playlist && item.MediaType === MediaType.Audio;
};

/**
 * Opens Khylo's own playlist screens: the details of an existing playlist (with an id), the picker to add songs to
 * a playlist (with songs), or a new playlist (with neither).
 */
export const openPlaylistEditor = (options: { items: string[]; id?: string; serverId?: string | null }): void => {
    if (options.id) {
        openPlaylistDialog({ playlistId: options.id });
    } else if (options.items.length > 0) {
        openPlaylistPicker(options.items);
    } else {
        openPlaylistDialog();
    }
};

/** The music section scrolls inside its main panel, not the window; jump that panel back to the top. */
export const scrollMusicPanelToTop = (): void => {
    document.querySelector('.khylo-music__content')?.scrollTo({ top: 0 });
};
