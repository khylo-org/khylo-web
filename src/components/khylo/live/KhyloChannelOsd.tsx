import React, { useEffect, useSyncExternalStore, type FC } from 'react';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { formatClockTime, getProgramTitle } from './liveChannelsApi';
import { getLiveChannelSession, subscribeLiveChannelSession, surfLiveChannel } from './liveChannelPlayback';
import './KhyloChannelOsd.scss';

// Keys for channel up / down: TV remotes send ChannelUp/ChannelDown, keyboards use Page Up/Down
const UP_KEYS = new Set([ 'ChannelUp', 'PageUp' ]);
const DOWN_KEYS = new Set([ 'ChannelDown', 'PageDown' ]);

/**
 * Channel strip in the video player while watching a live channel: channel, what's next, and
 * channel up / down.
 */
export const KhyloChannelOsd: FC = () => {
    const session = useSyncExternalStore(subscribeLiveChannelSession, getLiveChannelSession);

    useEffect(() => {
        if (!session) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (UP_KEYS.has(e.key)) {
                e.preventDefault();
                void surfLiveChannel(1);
            } else if (DOWN_KEYS.has(e.key)) {
                e.preventDefault();
                void surfLiveChannel(-1);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [session]);

    if (!session) return null;

    const next = session.programs[session.currentIndex + 1];

    return (
        <div className='khylo-channel-osd'>
            <span className='khylo-channel-osd__live'>Live</span>
            <span className='khylo-channel-osd__channel'>{`${session.channel.Number} · ${session.channel.Name}`}</span>
            {next && (
                <span className='khylo-channel-osd__next'>
                    {`Up next ${formatClockTime(next.StartUtc)} · ${getProgramTitle(next)}`}
                </span>
            )}
            <span className='khylo-channel-osd__surf'>
                <button type='button' onClick={() => { void surfLiveChannel(1); }} aria-label='Channel up' title='Channel up (Page Up)'>
                    <KeyboardArrowUpIcon />
                </button>
                <button type='button' onClick={() => { void surfLiveChannel(-1); }} aria-label='Channel down' title='Channel down (Page Down)'>
                    <KeyboardArrowDownIcon />
                </button>
            </span>
        </div>
    );
};
