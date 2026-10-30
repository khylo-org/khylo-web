import Box from '@mui/material/Box/Box';
import Fade from '@mui/material/Fade/Fade';
import React, { useRef, type FC, useEffect, useState } from 'react';

import RemotePlayButton from 'apps/modern/components/AppToolbar/RemotePlayButton';
import SyncPlayButton from 'apps/modern/components/AppToolbar/SyncPlayButton';
import AppToolbar from 'components/toolbar/AppToolbar';
import { KhyloChannelOsd } from 'components/khylo/live/KhyloChannelOsd';
import ViewManagerPage from 'components/viewManager/ViewManagerPage';
import { EventType } from 'constants/eventType';
import Events, { type Event } from 'utils/events';
import Typography from '@mui/material/Typography';

/**
 * Video player page component that renders mui controls for the top controls and the legacy view for everything else.
 */
const VideoPage: FC = () => {
    const documentRef = useRef<Document>(document);
    const [ isVisible, setIsVisible ] = useState(true);
    const [ videoTitle, setVideoTitle ] = useState<string>('');

    const onShowVideoOsd = (_e: Event, isShowing: boolean) => {
        setIsVisible(isShowing);
    };

    const onTitleChange = (_e: Event, title: string) => {
        setVideoTitle(title);
    };

    // The back button uses the default appRouter.back(). Leaving the page hides the video view, which stops
    // playback itself; stopping here as well would make the player navigate back a second time.

    useEffect(() => {
        document.body.classList.add('video-player-active');
        const doc = documentRef.current;

        if (doc) {
            Events.on(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
            Events.on(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
        }

        return () => {
            if (doc) {
                Events.off(doc, EventType.SHOW_VIDEO_OSD, onShowVideoOsd);
                Events.off(doc, EventType.VIDEO_TITLE_CHANGE, onTitleChange);
            }

            document.body.classList.remove('video-player-active');
        };
    }, []);

    return (
        <>
            <Fade
                in={isVisible}
                easing='fade-out'
            >
                <Box
                    className='skinHeader skinHeader-withBackground skinHeader-blurred osdHeader'
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        color: 'white',
                        pointerEvents: 'unset !important'
                    }}
                >
                    <AppToolbar
                        isDrawerAvailable={false}
                        isDrawerOpen={false}
                        isBackButtonAvailable
                        isUserMenuAvailable={false}
                        buttons={
                            <>
                                <SyncPlayButton />
                                <RemotePlayButton />
                            </>
                        }
                        className='videoOsd-appBar'
                    >
                        <Typography>{videoTitle}</Typography>
                        <KhyloChannelOsd />
                    </AppToolbar>
                </Box>
            </Fade>

            <ViewManagerPage
                controller='playback/video/index'
                view='playback/video/index.html'
                type='video-osd'
                isFullscreen
                isNowPlayingBarEnabled={false}
                isThemeMediaSupported
            />
        </>
    );
};

export default VideoPage;
