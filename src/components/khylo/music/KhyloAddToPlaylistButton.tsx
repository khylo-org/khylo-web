import React, { type FC } from 'react';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { openPlaylistEditor } from './musicItems';

export interface KhyloAddToPlaylistButtonProps {
    item: BaseItemDto;
}

/** Opens the playlist picker for one track: add to an existing playlist or a new one. */
export const KhyloAddToPlaylistButton: FC<KhyloAddToPlaylistButtonProps> = ({ item }) => (
    <button
        type='button'
        className='khylo-track-row__add-btn'
        aria-label='Add to playlist'
        title='Add to playlist'
        onClick={e => {
            e.stopPropagation();
            if (!item.Id) return;
            openPlaylistEditor({ items: [item.Id], serverId: item.ServerId });
        }}
    >
        <PlaylistAddIcon />
    </button>
);
