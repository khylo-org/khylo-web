import React, { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import Slider from '@mui/material/Slider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward30Icon from '@mui/icons-material/Forward30';
import CheckIcon from '@mui/icons-material/Check';
import HeadsetIcon from '@mui/icons-material/Headset';
import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import { getAudiobookPartLabel, getAudiobookTitle } from '../media/mediaUtils';
import { useAudiobookPlayback } from './useAudiobookPlayback';
import './KhyloAudiobookPlayer.scss';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Looked up on use: playbackManager may not be initialised yet when this module loads
const pm = () => playbackManager as any;

const TICKS_PER_SECOND = 10_000_000;
const SKIP_BACK_SECONDS = 10;
const SKIP_FORWARD_SECONDS = 30;
const SPEEDS = [ 0.75, 1, 1.25, 1.5, 1.75, 2 ];

const formatClock = (ticks: number) => {
    const totalSeconds = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ss = String(seconds).padStart(2, '0');
    if (hours === 0) return `${minutes}:${ss}`;
    return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
};

const formatLength = (ticks: number) => {
    const totalMinutes = Math.round(ticks / TICKS_PER_SECOND / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const getCoverUrl = (api: Api | undefined, item: BaseItemDto) => {
    if (!api) return null;
    if (item.ImageTags?.Primary) {
        return `${api.basePath}/Items/${item.Id}/Images/Primary?maxHeight=900&tag=${item.ImageTags.Primary}`;
    }
    if (item.AlbumId && item.AlbumPrimaryImageTag) {
        return `${api.basePath}/Items/${item.AlbumId}/Images/Primary?maxHeight=900&tag=${item.AlbumPrimaryImageTag}`;
    }
    if (item.ParentId) {
        return `${api.basePath}/Items/${item.ParentId}/Images/Primary?maxHeight=900`;
    }
    return null;
};

/**
 * Audiobook tags often pack everyone into one artist string, e.g.
 * "James Patterson/Peter J. Fernandez/Dennis O'Hare/(c) 2003 by James Patterson".
 * The first name is the author, the rest are narrators; copyright notes are dropped.
 */
const getCredits = (item: BaseItemDto) => {
    const raw = item.AlbumArtist || item.Artists?.[0] || '';
    const names = raw
        .split(/[/;]/)
        .map(name => name.trim())
        .filter(name => name && !/\(c\)|©|copyright/i.test(name));
    const [ author = '', ...others ] = Array.from(new Set(names));
    const narrators = others.filter(name => name.toLowerCase() !== author.toLowerCase());
    return { author, narrators };
};

export const KhyloAudiobookPlayer: FC = () => {
    const { api } = useApi();
    const navigate = useNavigate();
    const { player, item, parts, currentIndex, positionTicks, durationTicks, isPaused, playbackRate } = useAudiobookPlayback();

    // While dragging, show the drag position instead of the live position
    const [ scrubTicks, setScrubTicks ] = useState<number | null>(null);
    const [ isSpeedMenuOpen, setIsSpeedMenuOpen ] = useState(false);
    const [ coverError, setCoverError ] = useState(false);
    const speedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCoverError(false);
    }, [item?.Id]);

    useEffect(() => {
        if (!isSpeedMenuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!speedRef.current?.contains(e.target as Node)) setIsSpeedMenuOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [isSpeedMenuOpen]);

    if (!item || !player) {
        return (
            <div className='khylo-abp khylo-abp--empty'>
                <HeadsetIcon className='khylo-abp__empty-icon' />
                <h1 className='khylo-abp__empty-title'>Nothing playing</h1>
                <p className='khylo-abp__empty-text'>Start an audiobook and it will appear here.</p>
                <button type='button' className='khylo-abp__empty-btn' onClick={() => navigate('/home')}>
                    Back to Home
                </button>
            </div>
        );
    }

    const title = getAudiobookTitle(item);
    const { author, narrators } = getCredits(item);
    const coverUrl = coverError ? null : getCoverUrl(api, item);
    const partCount = parts.length;
    const hasParts = partCount > 1;

    // Whole-book progress: finished parts plus the position in the current one
    const partLength = (part: BaseItemDto, index: number) => (index === currentIndex && durationTicks ? durationTicks : part.RunTimeTicks || 0);
    const bookTotalTicks = parts.reduce((sum, part, index) => sum + partLength(part, index), 0);
    const bookElapsedTicks = parts.slice(0, Math.max(currentIndex, 0)).reduce((sum, part, index) => sum + partLength(part, index), 0) + positionTicks;
    const bookPercent = bookTotalTicks > 0 ? Math.min(100, (bookElapsedTicks / bookTotalTicks) * 100) : 0;

    const shownTicks = scrubTicks ?? positionTicks;

    const seekBy = (seconds: number) => {
        const target = Math.min(Math.max(positionTicks + seconds * TICKS_PER_SECOND, 0), Math.max(durationTicks - TICKS_PER_SECOND, 0));
        pm().seek(target, player);
    };

    const playPart = (part: BaseItemDto) => {
        const playlistItemId = (part as any).PlaylistItemId;
        if (playlistItemId) {
            pm().setCurrentPlaylistItem(playlistItemId, player);
        }
    };

    const setSpeed = (speed: number) => {
        pm().setPlaybackRate(speed, player);
        setIsSpeedMenuOpen(false);
    };

    return (
        <div className='khylo-abp'>
            <button type='button' className='khylo-abp__back' onClick={() => navigate(-1)} aria-label='Back'>
                <ArrowBackIcon />
            </button>

            <section className='khylo-abp__player'>
                <div className='khylo-abp__cover'>
                    {coverUrl ? (
                        <img src={coverUrl} alt='' onError={() => setCoverError(true)} />
                    ) : (
                        <div className='khylo-abp__cover-fallback'><HeadsetIcon /></div>
                    )}
                </div>

                <div className='khylo-abp__main'>
                    <div className='khylo-abp__meta'>
                        <span className='khylo-abp__kicker'>
                            {hasParts ? `Part ${currentIndex + 1} of ${partCount}` : 'Audiobook'}
                        </span>
                        <h1 className='khylo-abp__title'>{title}</h1>
                        {author && <p className='khylo-abp__author'>{author}</p>}
                        {narrators.length > 0 && (
                            <p className='khylo-abp__narrator'>{`Read by ${narrators.join(' & ')}`}</p>
                        )}
                    </div>

                    <div className='khylo-abp__scrubber'>
                        <Slider
                            className='khylo-abp__slider'
                            aria-label='Position'
                            min={0}
                            max={Math.max(durationTicks, 1)}
                            value={Math.min(shownTicks, Math.max(durationTicks, 1))}
                            onChange={(_e, value) => setScrubTicks(value as number)}
                            onChangeCommitted={(_e, value) => {
                                pm().seek(value as number, player);
                                setScrubTicks(null);
                            }}
                        />
                        <div className='khylo-abp__times'>
                            <span>{formatClock(shownTicks)}</span>
                            <span>-{formatClock(Math.max(durationTicks - shownTicks, 0))}</span>
                        </div>
                    </div>

                    <div className='khylo-abp__controls'>
                        <div className='khylo-abp__speed' ref={speedRef}>
                            <button
                                type='button'
                                className='khylo-abp__speed-btn'
                                onClick={() => setIsSpeedMenuOpen(open => !open)}
                                aria-label='Playback speed'
                                aria-expanded={isSpeedMenuOpen}
                            >
                                {`${playbackRate}×`}
                            </button>
                            {isSpeedMenuOpen && (
                                <div className='khylo-abp__speed-menu' role='menu'>
                                    {SPEEDS.map(speed => (
                                        <button
                                            key={speed}
                                            type='button'
                                            role='menuitemradio'
                                            aria-checked={speed === playbackRate}
                                            className={classNames('khylo-abp__speed-option', { 'khylo-abp__speed-option--active': speed === playbackRate })}
                                            onClick={() => setSpeed(speed)}
                                        >
                                            {`${speed}×`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className='khylo-abp__transport'>
                            <button type='button' className='khylo-abp__icon-btn' onClick={() => pm().previousTrack(player)} disabled={!hasParts} aria-label='Previous part'>
                                <SkipPreviousIcon />
                            </button>
                            <button type='button' className='khylo-abp__icon-btn' onClick={() => seekBy(-SKIP_BACK_SECONDS)} aria-label={`Back ${SKIP_BACK_SECONDS} seconds`}>
                                <Replay10Icon />
                            </button>
                            <button type='button' className='khylo-abp__play-btn' onClick={() => pm().playPause(player)} aria-label={isPaused ? 'Play' : 'Pause'}>
                                {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                            </button>
                            <button type='button' className='khylo-abp__icon-btn' onClick={() => seekBy(SKIP_FORWARD_SECONDS)} aria-label={`Forward ${SKIP_FORWARD_SECONDS} seconds`}>
                                <Forward30Icon />
                            </button>
                            <button type='button' className='khylo-abp__icon-btn' onClick={() => pm().nextTrack(player)} disabled={!hasParts || currentIndex >= partCount - 1} aria-label='Next part'>
                                <SkipNextIcon />
                            </button>
                        </div>

                        <div className='khylo-abp__controls-spacer' />
                    </div>

                    {hasParts && bookTotalTicks > 0 && (
                        <div className='khylo-abp__book-progress'>
                            <div className='khylo-abp__book-track'>
                                <div className='khylo-abp__book-fill' style={{ width: `${bookPercent}%` }} />
                            </div>
                            <span className='khylo-abp__book-label'>
                                {`${Math.round(bookPercent)}% of book · ${formatLength(Math.max(bookTotalTicks - bookElapsedTicks, 0))} left`}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {hasParts && (
                <section className='khylo-abp__parts' aria-label='Parts'>
                    <div className='khylo-abp__parts-header'>
                        <h2 className='khylo-abp__parts-title'>Parts</h2>
                        <span className='khylo-abp__parts-count'>{`${partCount} parts · ${formatLength(bookTotalTicks)}`}</span>
                    </div>

                    <ol className='khylo-abp__part-list'>
                        {parts.map((part, index) => {
                            const isCurrent = index === currentIndex;
                            const isDone = index < currentIndex || (!isCurrent && Boolean(part.UserData?.Played));
                            return (
                                <li key={(part as any).PlaylistItemId || part.Id}>
                                    <button
                                        type='button'
                                        className={classNames('khylo-abp__part', {
                                            'khylo-abp__part--current': isCurrent,
                                            'khylo-abp__part--done': isDone
                                        })}
                                        onClick={() => playPart(part)}
                                        aria-current={isCurrent ? 'true' : undefined}
                                    >
                                        <span className='khylo-abp__part-index'>
                                            {isCurrent && !isPaused ? (
                                                <span className='khylo-abp__eq' aria-label='Playing'>
                                                    <i /><i /><i />
                                                </span>
                                            ) : String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className='khylo-abp__part-name'>{getAudiobookPartLabel(part, index)}</span>
                                        <span className='khylo-abp__part-length'>
                                            {isCurrent ? `${formatClock(positionTicks)} / ${formatClock(partLength(part, index))}` : formatLength(part.RunTimeTicks || 0)}
                                        </span>
                                        <span className='khylo-abp__part-state'>
                                            {isDone && <CheckIcon aria-label='Finished' />}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}
        </div>
    );
};
/* eslint-enable @typescript-eslint/no-explicit-any */
