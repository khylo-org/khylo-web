import type { Api } from '@khylo/sdk';

import { setPlaybackNavigationPolicy } from 'components/playback/navigationPolicy';
import { playbackManager } from 'components/playback/playbackmanager';
import { ServerConnections } from 'lib/khylo-apiclient';
import Events from 'utils/events';

import {
    getLiveGuide,
    leaveLiveChannels,
    tuneLiveChannel,
    type LiveChannel,
    type LiveChannelProgram
} from './liveChannelsApi';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Looked up on use: playbackManager may not be initialised yet when this module loads
const pm = () => playbackManager as any;

export interface LiveChannelSession {
    channel: LiveChannel;
    /** The programs queued in the player, in order. */
    programs: LiveChannelProgram[];
    /** Index in programs of the item playing now. */
    currentIndex: number;
}

// How long to wait after a stop before deciding the viewer left (a channel change stops and starts)
const STOP_SETTLE_MS = 1500;
// A stop this close to the end of a program counts as the program finishing
const NATURAL_END_TOLERANCE_TICKS = 10 * 10_000_000;
const TICKS_PER_MS = 10_000;
// Marks the page while watching a channel, so skip controls can be hidden
const BODY_CLASS = 'khylo-live-channel-active';

let api: Api | null = null;
let session: LiveChannelSession | null = null;
let channelList: LiveChannel[] = [];
let isTuning = false;
let isBound = false;
// Server clock minus local clock, so the live point matches the server's schedule
let clockOffsetMs = 0;
const listeners = new Set<() => void>();

const notify = () => {
    listeners.forEach(listener => {
        listener();
    });
};

/** Subscribes to channel session changes; returns an unsubscribe function. */
export function subscribeLiveChannelSession(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export const getLiveChannelSession = () => session;

/** Remembers the channel lineup (in guide order) for channel up / down. */
export function setLiveChannelLineup(channels: LiveChannel[]) {
    channelList = channels;
}

/** Where the broadcast is now in a program, in ticks (how far the viewer may catch up to). */
function getLivePositionTicks(program: LiveChannelProgram): number {
    return (Date.now() + clockOffsetMs - Date.parse(program.StartUtc)) * TICKS_PER_MS;
}

// While on a channel the viewer can pause and rewind, but never get ahead of the broadcast
const liveNavigationPolicy = {
    getMaxSeekTicks(itemId: string | undefined): number | null {
        if (!session) return null;
        const current = session.programs[session.currentIndex];
        const program = current?.ItemId === itemId ? current : session.programs.find(p => p.ItemId === itemId);
        return program ? getLivePositionTicks(program) : null;
    }
};

function startSession(next: LiveChannelSession) {
    session = next;
    setPlaybackNavigationPolicy(liveNavigationPolicy);
    document.body.classList.add(BODY_CLASS);
    notify();
}

function endSession() {
    if (!session) return;
    session = null;
    setPlaybackNavigationPolicy(null);
    document.body.classList.remove(BODY_CLASS);
    notify();
    if (api) {
        leaveLiveChannels(api).catch(err => console.warn('[LiveChannels] leave failed', err));
    }
}

const currentItemId = (): string | undefined => {
    const player = pm().getCurrentPlayer();
    return player ? pm().currentItem(player)?.Id : undefined;
};

function onPlaybackStart() {
    if (!session) return;
    const itemId = currentItemId();
    const index = itemId ? session.programs.findIndex(p => p.ItemId === itemId) : -1;
    if (index < 0) {
        // Something other than the channel is playing now
        if (!isTuning) endSession();
        return;
    }
    session = { ...session, currentIndex: index };
    notify();
}

function onPlaybackStop(_e: unknown, stopInfo: any) {
    if (!session || isTuning) return;
    const stopped = session;
    const state = stopInfo?.state;
    const stoppedItemId: string | undefined = state?.NowPlayingItem?.Id;
    const positionTicks: number = state?.PlayState?.PositionTicks ?? 0;
    const runTimeTicks: number = state?.NowPlayingItem?.RunTimeTicks ?? 0;

    setTimeout(() => {
        if (session !== stopped || isTuning) return;
        const playingId = currentItemId();
        if (playingId && stopped.programs.some(p => p.ItemId === playingId)) {
            // Moved on to the next queued program
            return;
        }

        const finishedProgram = stopped.programs.some(p => p.ItemId === stoppedItemId)
            && runTimeTicks > 0
            && positionTicks >= runTimeTicks - NATURAL_END_TOLERANCE_TICKS;
        if (finishedProgram && api) {
            // The queue ran out (or the player didn't continue): rejoin the channel live
            void tuneInToLiveChannel(api, stopped.channel.Id);
            return;
        }

        endSession();
    }, STOP_SETTLE_MS);
}

function bindPlaybackEvents() {
    if (isBound) return;
    isBound = true;
    Events.on(playbackManager, 'playbackstart', onPlaybackStart);
    Events.on(playbackManager, 'playbackstop', onPlaybackStop);
}

/**
 * Tunes in to a channel: plays what is on now from the scheduled position and queues what follows.
 * Items play directly from the library (direct play when the device supports the file).
 */
export async function tuneInToLiveChannel(apiInstance: Api, channelId: string): Promise<void> {
    api = apiInstance;
    bindPlaybackEvents();

    isTuning = true;
    try {
        const result = await tuneLiveChannel(apiInstance, channelId);
        if (!result.Current) {
            throw new Error('Nothing is scheduled on this channel right now');
        }

        clockOffsetMs = Date.parse(result.ServerTimeUtc) - Date.now();
        const programs = [ result.Current, ...result.UpNext ];
        startSession({ channel: result.Channel, programs, currentIndex: 0 });

        const serverId = (ServerConnections as any).currentApiClient()?.serverId();
        await pm().play({
            ids: programs.map(p => p.ItemId),
            serverId,
            startPositionTicks: result.StartPositionTicks
        });
    } finally {
        // Let the previous item's stop and the new item's start settle before tracking again
        setTimeout(() => {
            isTuning = false;
        }, STOP_SETTLE_MS);
    }
}

async function getLineup(apiInstance: Api): Promise<LiveChannel[]> {
    if (channelList.length === 0) {
        channelList = await getLiveGuide(apiInstance, new Date(), 0.25);
    }
    return channelList;
}

/** Changes to the next (+1) or previous (-1) channel in the lineup. */
export async function surfLiveChannel(direction: 1 | -1): Promise<void> {
    if (!api || !session || isTuning) return;
    const lineup = await getLineup(api);
    if (lineup.length === 0) return;
    const index = lineup.findIndex(c => c.Id === session?.channel.Id);
    const next = lineup[(index + direction + lineup.length) % lineup.length];
    await tuneInToLiveChannel(api, next.Id);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
