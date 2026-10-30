import { useCallback, useEffect, useState } from 'react';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Looked up on use: playbackManager may not be initialised yet when this module loads
const pm = () => playbackManager as any;

export interface AudiobookPlaybackState {
    player: any;
    item: BaseItemDto | null;
    parts: BaseItemDto[];
    currentIndex: number;
    positionTicks: number;
    durationTicks: number;
    isPaused: boolean;
    playbackRate: number;
}

const EMPTY_STATE: AudiobookPlaybackState = {
    player: null,
    item: null,
    parts: [],
    currentIndex: -1,
    positionTicks: 0,
    durationTicks: 0,
    isPaused: true,
    playbackRate: 1
};

const NOTHING_PLAYING_DELAY_MS = 1500;

const readTimes = (player: any) => ({
    positionTicks: Math.max(0, (pm().currentTime(player) || 0) * 10000),
    durationTicks: pm().duration(player) || 0,
    isPaused: Boolean(pm().paused(player)),
    playbackRate: pm().getPlaybackRate(player) || 1
});

/**
 * Live state of the current audiobook playback (current part, the full list of parts, position,
 * play / pause and speed), kept in sync with playbackManager events.
 */
export function useAudiobookPlayback(): AudiobookPlaybackState {
    const [ state, setState ] = useState<AudiobookPlaybackState>(EMPTY_STATE);

    const refreshAll = useCallback(async (isRecheck = false) => {
        const player = pm().getCurrentPlayer();
        const item: BaseItemDto | null = player ? pm().currentItem(player) : null;
        if (!player || !item) {
            // Moving to the next part briefly stops playback; only show "nothing playing"
            // if nothing has started again shortly after.
            if (isRecheck) {
                setState(EMPTY_STATE);
            } else {
                setTimeout(() => {
                    void refreshAll(true);
                }, NOTHING_PLAYING_DELAY_MS);
            }
            return;
        }

        const parts: BaseItemDto[] = (await pm().getPlaylist(player)) || [];
        const currentPlaylistItemId = pm().getCurrentPlaylistItemId(player);
        let currentIndex = parts.findIndex((part: any) => part.PlaylistItemId === currentPlaylistItemId);
        if (currentIndex < 0) currentIndex = parts.findIndex(part => part.Id === item.Id);

        setState({ player, item, parts, currentIndex, ...readTimes(player) });
    }, []);

    useEffect(() => {
        let boundPlayer: any = null;

        const onTimeUpdate = () => {
            if (boundPlayer) setState(prev => ({ ...prev, ...readTimes(boundPlayer) }));
        };
        const onRefresh = () => {
            void refreshAll();
        };

        const bindPlayer = () => {
            if (boundPlayer) {
                Events.off(boundPlayer, 'timeupdate', onTimeUpdate);
                Events.off(boundPlayer, 'pause', onTimeUpdate);
                Events.off(boundPlayer, 'unpause', onTimeUpdate);
                Events.off(boundPlayer, 'playbackstart', onRefresh);
                Events.off(boundPlayer, 'playbackstop', onRefresh);
            }
            boundPlayer = pm().getCurrentPlayer();
            if (boundPlayer) {
                Events.on(boundPlayer, 'timeupdate', onTimeUpdate);
                Events.on(boundPlayer, 'pause', onTimeUpdate);
                Events.on(boundPlayer, 'unpause', onTimeUpdate);
                Events.on(boundPlayer, 'playbackstart', onRefresh);
                Events.on(boundPlayer, 'playbackstop', onRefresh);
            }
            onRefresh();
        };

        bindPlayer();
        Events.on(playbackManager, 'playerchange', bindPlayer);
        Events.on(playbackManager, 'playbackstart', onRefresh);
        Events.on(playbackManager, 'playbackstop', onRefresh);

        return () => {
            Events.off(playbackManager, 'playerchange', bindPlayer);
            Events.off(playbackManager, 'playbackstart', onRefresh);
            Events.off(playbackManager, 'playbackstop', onRefresh);
            if (boundPlayer) {
                Events.off(boundPlayer, 'timeupdate', onTimeUpdate);
                Events.off(boundPlayer, 'pause', onTimeUpdate);
                Events.off(boundPlayer, 'unpause', onTimeUpdate);
                Events.off(boundPlayer, 'playbackstart', onRefresh);
                Events.off(boundPlayer, 'playbackstop', onRefresh);
            }
        };
    }, [refreshAll]);

    return state;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
