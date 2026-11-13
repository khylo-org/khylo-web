import React, { useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { MediaType } from '@khylo/sdk/lib/generated-client/models/media-type';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { KhyloDetailsView } from 'components/khylo/details/KhyloDetailsView';
import { useSetKhyloMusicMode } from 'components/khylo/shell/KhyloMusicModeContext';
import { KhyloMusicLayout } from 'components/khylo/music/KhyloMusicLayout';
import { KmxCollectionPage } from 'components/khylo/music/KmxCollectionPage';
import { scrollMusicPanelToTop } from 'components/khylo/music/musicItems';
import { useApi } from 'hooks/useApi';

/** Albums and audio playlists get the music pages; everything else (films, shows, books, songs...) keeps the details page. */
const isMusicCollection = (item?: BaseItemDto | null): boolean => Boolean(item) && (
    item!.Type === BaseItemKind.MusicAlbum || (item!.Type === BaseItemKind.Playlist && item!.MediaType === MediaType.Audio)
);

const DetailsPage: FC = () => {
    const [ searchParams ] = useSearchParams();
    const itemId = searchParams.get('id') || searchParams.get('itemId') || '';
    const { api, user } = useApi();
    const userId = user?.Id;
    const setMusicMode = useSetKhyloMusicMode();

    // The same request and key the details page makes, so the item is fetched once
    const { data: item } = useQuery({
        queryKey: [ 'KhyloItemDetails', itemId, userId ],
        queryFn: async () => {
            if (!api || !itemId) return null;
            return (await getLibraryApi(api).getItem({ userId: userId || undefined, itemId })).data as BaseItemDto;
        },
        enabled: Boolean(api && itemId)
    });

    const music = isMusicCollection(item);

    useEffect(() => {
        if (music) setMusicMode(true);
    }, [ music, setMusicMode ]);

    // A new album or playlist starts at the top
    useEffect(() => {
        if (music) scrollMusicPanelToTop();
    }, [ music, itemId ]);

    if (music && item) {
        return <KhyloMusicLayout><KmxCollectionPage key={item.Id} item={item} /></KhyloMusicLayout>;
    }
    return <KhyloDetailsView />;
};

export default DetailsPage;
