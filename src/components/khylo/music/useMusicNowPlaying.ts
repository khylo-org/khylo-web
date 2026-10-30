import { useCallback, useEffect, useState } from 'react';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Looked up on use: playbackManager may not be initialised yet when this module loads
const pm = () => playbackManager as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface MusicNowPlaying {
    item: BaseItemDto | null;
    isPaused: boolean;
    togglePlayPause: () => void;
    next: () => void;
    previous: () => void;
}

/**
 * Tracks the song that is playing right now, for the music view's Now Playing card.
 */
export function useMusicNowPlaying(): MusicNowPlaying {
    const [ item, setItem ] = useState<BaseItemDto | null>(null);
    const [ isPaused, setIsPaused ] = useState(false);

    const refresh = useCallback(() => {
        const player = pm().getCurrentPlayer();
        const current: BaseItemDto | null = player ? pm().currentItem(player) : null;
        setItem(current || null);
        setIsPaused(player ? !pm().isPlaying(player) : false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let boundPlayer: any = null;

        const onPause = () => setIsPaused(true);
        const onUnpause = () => setIsPaused(false);

        const bindPlayer = () => {
            if (boundPlayer) {
                Events.off(boundPlayer, 'playbackstart', refresh);
                Events.off(boundPlayer, 'playbackstop', refresh);
                Events.off(boundPlayer, 'pause', onPause);
                Events.off(boundPlayer, 'unpause', onUnpause);
            }
            boundPlayer = pm().getCurrentPlayer();
            if (boundPlayer) {
                Events.on(boundPlayer, 'playbackstart', refresh);
                Events.on(boundPlayer, 'playbackstop', refresh);
                Events.on(boundPlayer, 'pause', onPause);
                Events.on(boundPlayer, 'unpause', onUnpause);
            }
            refresh();
        };

        bindPlayer();
        const interval = window.setInterval(bindPlayer, 2000);

        return () => {
            window.clearInterval(interval);
            if (boundPlayer) {
                Events.off(boundPlayer, 'playbackstart', refresh);
                Events.off(boundPlayer, 'playbackstop', refresh);
                Events.off(boundPlayer, 'pause', onPause);
                Events.off(boundPlayer, 'unpause', onUnpause);
            }
        };
    }, [refresh]);

    const togglePlayPause = useCallback(() => {
        const player = pm().getCurrentPlayer();
        if (player) pm().playPause(player);
    }, []);

    const next = useCallback(() => {
        const player = pm().getCurrentPlayer();
        if (player) pm().nextTrack(player);
    }, []);

    const previous = useCallback(() => {
        const player = pm().getCurrentPlayer();
        if (player) pm().previousTrack(player);
    }, []);

    return { item, isPaused, togglePlayPause, next, previous };
}
