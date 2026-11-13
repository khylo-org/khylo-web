import React, { type FC } from 'react';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { openPlaylistPicker } from './musicUi';

export interface KhyloAddToPlaylistButtonProps {
    item: BaseItemDto;
}

/** Opens "Add to playlist" for one song, next to the button: pick a playlist, or make a new one. */
export const KhyloAddToPlaylistButton: FC<KhyloAddToPlaylistButtonProps> = ({ item }) => (
    <button
        type='button'
        className='khylo-track-row__add-btn'
        aria-label='Add to playlist'
        title='Add to playlist'
        onClick={e => {
            e.stopPropagation();
            if (!item.Id) return;
            openPlaylistPicker([ item.Id ], { label: [ item.Name, item.Artists?.[0] ].filter(Boolean).join(' · '), anchor: e.currentTarget });
        }}
    >
        <PlaylistAddIcon />
    </button>
);
