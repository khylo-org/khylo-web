import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@khylo/sdk/lib/generated-client/models/collection-type';

import { LibraryTab } from 'types/libraryTab';
import type { LibraryTabContent } from 'types/libraryTabContent';

const playlistsTabContent: LibraryTabContent = {
    viewType: LibraryTab.Playlists,
    collectionType: CollectionType.Playlists,
    itemType: [BaseItemKind.Playlist],
    isBtnNewPlaylistEnabled: true
};

const favoritesTabContent: LibraryTabContent = {
    viewType: LibraryTab.Favorites,
    collectionType: CollectionType.Playlists,
    itemType: [BaseItemKind.Playlist]
};

const playlistsViews: Record<number, LibraryTabContent> = {
    0: playlistsTabContent,
    1: favoritesTabContent
};

export default playlistsViews;
