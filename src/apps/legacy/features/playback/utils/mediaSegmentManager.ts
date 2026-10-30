import type { Api } from '@khylo/sdk/lib/api';
import type { MediaSegmentDto } from '@khylo/sdk/lib/generated-client/models/media-segment-dto';
import { MediaSegmentType } from '@khylo/sdk/lib/generated-client/models/media-segment-type';
import { getMediaSegmentApi } from '@khylo/sdk/lib/utils/api/media-segment-api';

import type { PlaybackManager } from 'components/playback/playbackmanager';
import { TICKS_PER_MILLISECOND, TICKS_PER_SECOND } from 'constants/time';
import { ServerConnections } from 'lib/khylo-apiclient';
import { currentSettings as userSettings } from 'scripts/settings/userSettings';
import type { PlayerState } from 'types/playbackStopInfo';
import type { Event } from 'utils/events';

import { getMediaSegmentAction } from './mediaSegmentSettings';
import { findCurrentSegment } from './mediaSegments';
import { PlaybackSubscriber } from './playbackSubscriber';
import { MediaSegmentAction } from '../constants/mediaSegmentAction';
import { isPlaybackNavigationLocked } from 'components/playback/navigationPolicy';

/** A segment ending within this distance of the runtime is treated as running to the end of the item. */
const END_OF_ITEM_TOLERANCE_TICKS = 2 * TICKS_PER_SECOND;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEligibleForVideoSegments(item: any): boolean {
    if (!item) return false;
    const type = String(item.Type || '');
    const mediaType = String(item.MediaType || '');

    // Skip markers only make sense for video (movies, episodes, other videos); never books/audio/photos
    if (mediaType !== 'Video') return false;
    return type !== 'Book' && type !== 'AudioBook' && type !== 'Audio' && type !== 'Photo';
}

/**
 * Whether the segment runs to (or past) the end of the item, e.g. end credits with nothing after them.
 */
export function segmentRunsToEnd(segment: MediaSegmentDto, runtimeTicks: number | null | undefined): boolean {
    return !!runtimeTicks
        && segment.EndTicks != null
        && segment.EndTicks >= runtimeTicks - END_OF_ITEM_TOLERANCE_TICKS;
}

class MediaSegmentManager extends PlaybackSubscriber {
    private hasSegments = false;
    private isLastSegmentIgnored = false;
    private lastSegmentIndex = 0;
    private lastTime = -1;
    private mediaSegmentTypeActions: Record<Partial<MediaSegmentType>, MediaSegmentAction> | undefined;
    private mediaSegments: MediaSegmentDto[] = [];

    private async fetchMediaSegments(api: Api, itemId: string, includeSegmentTypes: MediaSegmentType[]) {
        try {
            const { data: mediaSegments } = await getMediaSegmentApi(api)
                .getItemSegments({ itemId, includeSegmentTypes });
            this.mediaSegments = mediaSegments.Items || [];
        } catch (err) {
            console.error('[MediaSegmentManager] failed to fetch segments', err);
            this.mediaSegments = [];
        }
    }

    skipSegment(mediaSegment: MediaSegmentDto) {
        // Ignore segment if playback progress has passed the segment's start time
        if (mediaSegment.StartTicks !== undefined && this.lastTime > mediaSegment.StartTicks) {
            console.info('[MediaSegmentManager] ignoring skipping segment that has been seeked back into', mediaSegment);
            this.isLastSegmentIgnored = true;
        } else if (mediaSegment.EndTicks) {
            // Do not skip if duration < 1s to avoid slow stream changes
            if (mediaSegment.StartTicks && mediaSegment.EndTicks - mediaSegment.StartTicks < TICKS_PER_SECOND) {
                console.info('[MediaSegmentManager] ignoring skipping segment with duration <1s', mediaSegment);
                this.isLastSegmentIgnored = true;
                return;
            }

            // Credits that run to the end of the item: go straight to the next queued item instead of
            // seeking to the very end of the stream. Credits followed by more content just get skipped past.
            const runtimeTicks = this.playbackManager.currentItem(this.player)?.RunTimeTicks;
            if (segmentRunsToEnd(mediaSegment, runtimeTicks) && this.playbackManager.getNextItem()) {
                console.debug('[MediaSegmentManager] segment runs to end of item; skipping to next item in queue');
                this.playbackManager.nextTrack(this.player);
                return;
            }

            console.debug('[MediaSegmentManager] skipping to %s ms', mediaSegment.EndTicks / TICKS_PER_MILLISECOND);
            this.playbackManager.seek(mediaSegment.EndTicks, this.player);
        } else {
            // If there is no end time, skip to the next track
            console.debug('[MediaSegmentManager] skipping to next item in queue');
            this.playbackManager.nextTrack(this.player);
        }
    }

    promptToSkip(mediaSegment: MediaSegmentDto) {
        if (mediaSegment.StartTicks && mediaSegment.EndTicks
            && mediaSegment.EndTicks - mediaSegment.StartTicks < TICKS_PER_SECOND * 3) {
            console.info('[MediaSegmentManager] ignoring segment prompt with duration <3s', mediaSegment);
            this.isLastSegmentIgnored = true;
            return;
        }
        this.playbackManager.promptToSkip(mediaSegment);
    }

    private performAction(mediaSegment: MediaSegmentDto) {
        // Live channels air everything as scheduled: no skipping intros or credits
        if (isPlaybackNavigationLocked()) return;

        if (!this.mediaSegmentTypeActions || !mediaSegment.Type || !this.mediaSegmentTypeActions[mediaSegment.Type]) {
            console.error('[MediaSegmentManager] segment type missing from action map', mediaSegment, this.mediaSegmentTypeActions);
            return;
        }

        const action = this.mediaSegmentTypeActions[mediaSegment.Type];
        if (action === MediaSegmentAction.Skip) {
            this.skipSegment(mediaSegment);
        } else if (action === MediaSegmentAction.AskToSkip) {
            this.promptToSkip(mediaSegment);
        }
    }

    onPlayerPlaybackStart(_e: Event, state: PlayerState) {
        this.isLastSegmentIgnored = false;
        this.lastSegmentIndex = 0;
        this.lastTime = -1;
        this.mediaSegments = [];

        // Segments come only from the server; nothing is guessed client-side.
        this.hasSegments = !!state.MediaSource?.HasSegments && isEligibleForVideoSegments(state.NowPlayingItem);

        const itemId = state.MediaSource?.Id;
        const serverId = state.NowPlayingItem?.ServerId || ServerConnections.currentApiClient()?.serverId();

        if (!this.hasSegments || !serverId || !itemId) return;

        // Get the user settings for media segment actions (Intro/Outro default to "ask to skip")
        this.mediaSegmentTypeActions = Object.values(MediaSegmentType)
            .map(type => ({
                type,
                action: getMediaSegmentAction(userSettings, type)
            }))
            .filter(({ action }) => !!action && action !== MediaSegmentAction.None)
            .reduce((acc, { type, action }) => {
                if (action) acc[type] = action;
                return acc;
            }, {} as Record<Partial<MediaSegmentType>, MediaSegmentAction>);

        if (!Object.keys(this.mediaSegmentTypeActions).length) {
            console.info('[MediaSegmentManager] user has no media segment actions enabled');
            return;
        }

        const api = ServerConnections.getApi(serverId);
        if (!api) {
            console.error('[MediaSegmentManager] no api instance available for server', serverId);
            return;
        }

        void this.fetchMediaSegments(
            api,
            itemId,
            Object.keys(this.mediaSegmentTypeActions).map(t => t as keyof typeof MediaSegmentType));
    }

    onPlayerTimeUpdate() {
        if (this.hasSegments && this.mediaSegments.length) {
            const time = this.playbackManager.currentTime(this.player) * TICKS_PER_MILLISECOND;
            const currentSegmentDetails = findCurrentSegment(this.mediaSegments, time, this.lastSegmentIndex);
            if (
                // The current time falls within a segment
                currentSegmentDetails
                // and the last segment is not ignored or the segment index has changed
                && (!this.isLastSegmentIgnored || this.lastSegmentIndex !== currentSegmentDetails.index)
            ) {
                console.debug(
                    '[MediaSegmentManager] found %s segment at %s ms',
                    currentSegmentDetails.segment.Type,
                    time / TICKS_PER_MILLISECOND,
                    currentSegmentDetails);
                this.isLastSegmentIgnored = false;
                this.performAction(currentSegmentDetails.segment);
                this.lastSegmentIndex = currentSegmentDetails.index;
            }
            this.lastTime = time;
        }
    }
}

export const bindMediaSegmentManager = (playbackManager: PlaybackManager) => new MediaSegmentManager(playbackManager);
