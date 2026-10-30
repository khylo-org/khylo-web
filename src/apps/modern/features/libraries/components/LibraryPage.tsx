import { CollectionType } from '@khylo/sdk/lib/generated-client/models/collection-type';
import React, { type FC } from 'react';
import useCurrentTab from 'hooks/useCurrentTab';
import { KhyloLibraryBrowser } from 'components/khylo/browse/KhyloLibraryBrowser';
import { KhyloMusicView } from 'components/khylo/music';

interface LibraryPageProps {
    type: CollectionType;
}

const LibraryPage: FC<LibraryPageProps> = ({
    type
}) => {
    const { libraryId } = useCurrentTab();

    if (type === CollectionType.Music) {
        return <KhyloMusicView parentId={libraryId} />;
    }

    return (
        <KhyloLibraryBrowser
            type={type}
            parentId={libraryId}
        />
    );
};

export default LibraryPage;
