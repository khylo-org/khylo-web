import { PlaylistEditor } from 'components/playlisteditor/playlisteditor';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { MediaType } from '@khylo/sdk/lib/generated-client/models/media-type';

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

/** Opens the playlist editor: a new playlist (no id) or the songs of an existing one. */
export const openPlaylistEditor = (options: { items: string[]; id?: string; serverId?: string | null }): void => {
    void new PlaylistEditor().show({ items: options.items, id: options.id, serverId: options.serverId ?? '' });
};

/** The music section scrolls inside its main panel, not the window; jump that panel back to the top. */
export const scrollMusicPanelToTop = (): void => {
    document.querySelector('.khylo-music__content')?.scrollTo({ top: 0 });
};
