import React, { type FC } from 'react';

import Page from 'components/Page';
import { KhyloAudiobookPlayer } from 'components/khylo/audiobook/KhyloAudiobookPlayer';

/**
 * Now Playing page for audiobooks: the player with every part of the book listed underneath.
 */
const AudiobookPage: FC = () => (
    <Page
        id='audiobookPlayerPage'
        className='khylo-abp-page'
        isNowPlayingBarEnabled={false}
    >
        <KhyloAudiobookPlayer />
    </Page>
);

export default AudiobookPage;
