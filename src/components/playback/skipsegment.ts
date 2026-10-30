import { PlaybackManager } from './playbackmanager';
import { TICKS_PER_MILLISECOND, TICKS_PER_SECOND } from 'constants/time';
import { MediaSegmentType } from '@khylo/sdk/lib/generated-client/models/media-segment-type';
import type { MediaSegmentDto } from '@khylo/sdk/lib/generated-client/models/media-segment-dto';
import type { PlaybackStopInfo } from 'types/playbackStopInfo';
import { PlaybackSubscriber } from 'apps/legacy/features/playback/utils/playbackSubscriber';
import { isInSegment } from 'apps/legacy/features/playback/utils/mediaSegments';
import Events, { type Event } from 'utils/events';
import { EventType } from 'constants/eventType';
import './skipbutton.scss';
import dom from 'utils/dom';
import globalize from 'lib/globalize';
import * as userSettings from 'scripts/settings/userSettings';
import focusManager from 'components/focusManager';
import layoutManager from 'components/layoutManager';
import { ServerConnections } from 'lib/khylo-apiclient';
import { isEligibleForVideoSegments, segmentRunsToEnd } from 'apps/legacy/features/playback/utils/mediaSegmentManager';
import { isPlaybackNavigationLocked } from './navigationPolicy';

interface ShowOptions {
    animate?: boolean;
    keep?: boolean;
    focus?: boolean;
}

function onHideComplete(this: HTMLButtonElement) {
    if (this) {
        // Handle focus after the hide transition completes
        if (document.activeElement === this) {
            this.blur();
            const pauseButton = document.querySelector('.btnPause');
            if (pauseButton && focusManager.isCurrentlyFocusable(pauseButton)) {
                focusManager.focus(pauseButton);
            }
        }

        this.classList.add('hide');
    }
}

class SkipSegment extends PlaybackSubscriber {
    private skipElement: HTMLButtonElement | null;
    private currentSegment: MediaSegmentDto | null | undefined;
    private hideTimeout: ReturnType<typeof setTimeout> | null | undefined;
    private autoSkipInterval: ReturnType<typeof setInterval> | null = null;

    constructor(playbackManager: PlaybackManager) {
        super(playbackManager);

        this.skipElement = null;
        this.onOsdChanged = this.onOsdChanged.bind(this);
    }

    clearAutoSkipTimer() {
        if (this.autoSkipInterval) {
            clearInterval(this.autoSkipInterval);
            this.autoSkipInterval = null;
        }
    }

    advanceToNextEpisode() {
        const player = this.player || this.playbackManager.getCurrentPlayer();
        const currentItem = this.playbackManager.currentItem(player);

        if (this.playbackManager.getNextItem()) {
            this.playbackManager.nextTrack(player);
            return;
        }

        // If queue had only 1 item, dynamically query and launch the next episode for the series
        if (currentItem && (currentItem.SeriesId || currentItem.SeriesName)) {
            const apiClient = (ServerConnections as any).getApiClient(currentItem.ServerId) || (ServerConnections as any).currentApiClient();
            const seriesId = currentItem.SeriesId;
            if (apiClient && seriesId) {
                const userId = apiClient.getCurrentUserId();
                apiClient.getEpisodes(seriesId, {
                    UserId: userId,
                    IsVirtualUnaired: false,
                    IsMissing: false,
                    startItemId: currentItem.Id,
                    limit: 10
                }).then((res: any) => {
                    const episodes = res?.Items || [];
                    const currentIndex = episodes.findIndex((e: any) => e.Id === currentItem.Id);
                    const nextEp = (currentIndex >= 0 && currentIndex + 1 < episodes.length)
                        ? episodes[currentIndex + 1]
                        : null;
                    if (nextEp) {
                        (this.playbackManager as any).play({
                            items: [nextEp],
                            serverId: nextEp.ServerId || currentItem.ServerId
                        });
                    } else {
                        // Last episode: skipping the end credits ends playback
                        this.playbackManager.stop(player);
                    }
                }).catch(() => {
                    this.playbackManager.stop(player);
                });
                return;
            }
        }

        // Nothing to advance to (e.g. a movie): skipping the end credits ends playback
        this.playbackManager.stop(player);
    }

    /**
     * Skips the given segment. Intros/recaps (and credits followed by more content, like a post-credits scene)
     * seek to the segment end. Credits that run to the end of the item advance to the next episode instead.
     */
    performSkip(segment: MediaSegmentDto) {
        const player = this.player || this.playbackManager.getCurrentPlayer();
        const runtimeTicks = this.playbackManager.currentItem(player)?.RunTimeTicks;

        if (segment.Type === MediaSegmentType.Outro && segmentRunsToEnd(segment, runtimeTicks)) {
            this.advanceToNextEpisode();
            return;
        }

        const time = this.playbackManager.currentTime(player) * TICKS_PER_MILLISECOND;
        if (segment.EndTicks && time < segment.EndTicks - TICKS_PER_SECOND) {
            this.playbackManager.seek(segment.EndTicks, player);
        }
    }

    getSkipLabel(segment: MediaSegmentDto): string {
        switch (segment.Type) {
            case MediaSegmentType.Intro:
                return 'Skip Intro';
            case MediaSegmentType.Recap:
                return 'Skip Recap';
            case MediaSegmentType.Preview:
                return 'Skip Preview';
            case MediaSegmentType.Outro: {
                const item = this.playbackManager.currentItem(this.player || this.playbackManager.getCurrentPlayer());
                const isEpisode = item?.Type === 'Episode' || Boolean(item?.SeriesId);
                return isEpisode && segmentRunsToEnd(segment, item?.RunTimeTicks) ? 'Next Episode' : 'Skip Credits';
            }
            default:
                return globalize.translate('MediaSegmentSkipPrompt', globalize.translate(`MediaSegmentType.${segment.Type}`));
        }
    }

    createSkipElement() {
        if (!this.skipElement && this.currentSegment) {
            let buttonHtml = '';

            buttonHtml += '<div class="skip-button-container"><button is="khylo-button" class="skip-button hide skip-button-hidden"></button></div>';

            document.body.insertAdjacentHTML('beforeend', buttonHtml);

            this.skipElement = document.body.querySelector('.skip-button');
            if (this.skipElement) {
                this.skipElement.addEventListener('click', () => {
                    this.clearAutoSkipTimer();
                    const seg = this.currentSegment;
                    if (seg) {
                        this.performSkip(seg);
                    }
                    this.hideSkipButton();
                });
            }
        }
    }

    setButtonText(countdownSeconds?: number) {
        if (this.skipElement && this.currentSegment) {
            let label = this.getSkipLabel(this.currentSegment);

            if (countdownSeconds !== undefined && countdownSeconds > 0) {
                label += ` (${countdownSeconds}s)`;
            }

            this.skipElement.innerHTML = `<span>${label}</span> <span class="material-icons skip_next" aria-hidden="true"></span>`;
        }
    }

    showSkipButton(options: ShowOptions) {
        // Live channels air everything as scheduled: no Skip Intro / Skip Credits
        if (isPlaybackNavigationLocked()) return;

        const elem = this.skipElement;
        if (elem) {
            this.clearHideTimeout();
            dom.removeEventListener(elem, dom.whichTransitionEvent(), onHideComplete, {
                once: true
            });
            elem.classList.remove('hide');
            if (!options.animate) {
                elem.classList.add('no-transition');
            } else {
                elem.classList.remove('no-transition');
            }

            // eslint-disable-next-line sonarjs/void-use
            void elem.offsetWidth;

            const hasFocus = document.activeElement && focusManager.isCurrentlyFocusable(document.activeElement);
            if (options.focus && !hasFocus) {
                focusManager.focus(elem);
            }

            requestAnimationFrame(() => {
                elem.classList.remove('skip-button-hidden');

                if (!options.keep) {
                    this.hideTimeout = setTimeout(this.hideSkipButton.bind(this), 8000);
                }
            });
        }
    }

    hideSkipButton() {
        this.clearAutoSkipTimer();
        const elem = this.skipElement;
        if (elem) {
            elem.classList.remove('no-transition');
            // eslint-disable-next-line sonarjs/void-use
            void elem.offsetWidth;

            requestAnimationFrame(() => {
                elem.classList.add('skip-button-hidden');

                dom.addEventListener(elem, dom.whichTransitionEvent(), onHideComplete, {
                    once: true
                });
            });
        }
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    onOsdChanged(_e: Event, isOpen: boolean) {
        if (this.currentSegment) {
            if (isOpen) {
                this.showSkipButton({
                    animate: false,
                    keep: true,
                    focus: false
                });
            } else if (!this.hideTimeout) {
                this.hideSkipButton();
            }
        }
    }

    onPromptSkip(e: Event, segment: MediaSegmentDto) {
        const cur = this.player ? this.playbackManager.currentItem(this.player) : (this.playbackManager.getCurrentPlayer() ? this.playbackManager.currentItem(this.playbackManager.getCurrentPlayer()) : null);
        if (!isEligibleForVideoSegments(cur)) {
            this.hideSkipButton();
            return;
        }

        if (this.player && segment.EndTicks != null
            && segment.EndTicks >= this.playbackManager.currentItem(this.player).RunTimeTicks
            && this.playbackManager.getNextItem()
            && userSettings.enableNextVideoInfoOverlay()
        ) {
            // Don't display button when UpNextDialog is expected.
            return;
        }

        this.currentSegment = segment;
        this.createSkipElement();

        if (segment.Type === MediaSegmentType.Intro && userSettings.autoSkipIntro()) {
            const delay = userSettings.autoSkipIntroDelay();
            if (delay <= 0) {
                this.performSkip(segment);
                this.hideSkipButton();
                return;
            }

            let secondsLeft = delay;
            this.setButtonText(secondsLeft);
            this.showSkipButton({
                animate: true,
                focus: layoutManager.tv,
                keep: true
            });

            this.clearAutoSkipTimer();
            this.autoSkipInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    this.clearAutoSkipTimer();
                    this.performSkip(segment);
                    this.hideSkipButton();
                } else {
                    this.setButtonText(secondsLeft);
                }
            }, 1000);
        } else if (segment.Type === MediaSegmentType.Outro && userSettings.autoSkipCredits()) {
            const delay = userSettings.autoSkipCreditsDelay();
            if (delay <= 0) {
                this.performSkip(segment);
                this.hideSkipButton();
                return;
            }

            let secondsLeft = delay;
            this.setButtonText(secondsLeft);
            this.showSkipButton({
                animate: true,
                focus: layoutManager.tv,
                keep: true
            });

            this.clearAutoSkipTimer();
            this.autoSkipInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    this.clearAutoSkipTimer();
                    this.performSkip(segment);
                    this.hideSkipButton();
                } else {
                    this.setButtonText(secondsLeft);
                }
            }, 1000);
        } else {
            this.setButtonText();
            this.showSkipButton({
                animate: true,
                focus: layoutManager.tv
            });
        }
    }

    onPlayerTimeUpdate() {
        if (this.currentSegment) {
            const time = this.playbackManager.currentTime(this.player) * TICKS_PER_MILLISECOND;

            if (!isInSegment(this.currentSegment, time)) {
                this.currentSegment = null;
                this.hideSkipButton();
            }
        }
    }

    onPlayerChange(): void {
        if (this.playbackManager.getCurrentPlayer()) {
            Events.off(document, EventType.SHOW_VIDEO_OSD, this.onOsdChanged);
            Events.on(document, EventType.SHOW_VIDEO_OSD, this.onOsdChanged);
        }
    }

    onPlaybackStop(_e: Event, playbackStopInfo: PlaybackStopInfo) {
        this.currentSegment = null;
        this.hideSkipButton();
        if (!playbackStopInfo.nextItem) {
            Events.off(document, EventType.SHOW_VIDEO_OSD, this.onOsdChanged);
        }
    }
}

export const bindSkipSegment = (playbackManager: PlaybackManager) => new SkipSegment(playbackManager);
