import React, { type FC, type PropsWithChildren, useEffect } from 'react';
import viewContainer from './viewContainer';
import { playbackManager } from './playback/playbackmanager';

/**
 * A simple component that includes the correct structure for ViewManager pages
 * to exist alongside standard React pages.
 */
const AppBody: FC<PropsWithChildren<unknown>> = ({ children }) => {
    useEffect(() => () => {
        // Reset view container state on unload only if not actively playing video
        if (!playbackManager.isPlayingVideo?.()) {
            viewContainer.reset();
        }
    }, []);

    return (
        <>
            <div className='mainAnimatedPages skinBody' />
            <div className='skinBody'>
                {children}
            </div>
        </>
    );
};

export default AppBody;
