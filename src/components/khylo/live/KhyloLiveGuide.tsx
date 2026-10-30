import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useApi } from 'hooks/useApi';
import {
    formatClockTime,
    getLiveGuide,
    getProgramSubtitle,
    getProgramTitle,
    type LiveChannel,
    type LiveChannelProgram
} from './liveChannelsApi';
import { setLiveChannelLineup, tuneInToLiveChannel } from './liveChannelPlayback';
import { KhyloLiveHero } from './KhyloLiveHero';
import { KhyloChannelDrawer } from './KhyloChannelDrawer';
import { KhyloChannelEmblem } from './KhyloChannelEmblem';
import { useLiveChannelsEnabled } from './useLiveChannelsEnabled';
import './KhyloLiveGuide.scss';

const GUIDE_HOURS = 6;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 6;
const MINUTE_MS = 60_000;
const ALL_CATEGORY = 'All';
const CATEGORY_ORDER = [ 'TV', 'Movies', 'Networks', 'Collections' ];

const floorToSlot = (date: Date) => {
    const slotMs = SLOT_MINUTES * MINUTE_MS;
    return new Date(Math.floor(date.getTime() / slotMs) * slotMs);
};

const isOnAt = (program: LiveChannelProgram, time: number) => Date.parse(program.StartUtc) <= time && Date.parse(program.EndUtc) > time;
const findCurrent = (channel: LiveChannel, now: number) => channel.Programs.find(p => isOnAt(p, now));

export const KhyloLiveGuide: FC = () => {
    const { api, user } = useApi();
    const isEnabled = useLiveChannelsEnabled();
    const [ now, setNow ] = useState(() => Date.now());
    const [ category, setCategory ] = useState(ALL_CATEGORY);
    const [ selectedId, setSelectedId ] = useState<string | null>(null);
    // A later program the viewer clicked to read about (it can't be watched before it airs)
    const [ focusedProgram, setFocusedProgram ] = useState<LiveChannelProgram | null>(null);
    const [ infoChannelId, setInfoChannelId ] = useState<string | null>(null);
    const [ tuningId, setTuningId ] = useState<string | null>(null);
    const [ error, setError ] = useState<string | null>(null);

    // The guide starts at the current half hour and moves along with it
    const windowStartMs = floorToSlot(new Date(now)).getTime();
    const windowEndMs = windowStartMs + GUIDE_HOURS * 60 * MINUTE_MS;

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);

    const { data: channels, isLoading } = useQuery({
        queryKey: [ 'KhyloLiveGuide', user?.Id, windowStartMs ],
        queryFn: () => getLiveGuide(api!, new Date(windowStartMs), GUIDE_HOURS),
        enabled: Boolean(api && user?.Id),
        staleTime: 60_000,
        refetchInterval: 5 * 60_000
    });

    useEffect(() => {
        if (channels) setLiveChannelLineup(channels);
    }, [channels]);

    const categories = useMemo(() => {
        const present = new Set((channels ?? []).map(c => c.Category));
        return [ ALL_CATEGORY, ...CATEGORY_ORDER.filter(c => present.has(c)) ];
    }, [channels]);

    const visibleChannels = useMemo(
        () => (channels ?? []).filter(c => category === ALL_CATEGORY || c.Category === category),
        [ channels, category ]
    );

    const selected = useMemo(
        () => visibleChannels.find(c => c.Id === selectedId) ?? visibleChannels[0],
        [ visibleChannels, selectedId ]
    );
    const selectedCurrent = selected ? findCurrent(selected, now) : undefined;
    const isFocusedUpcoming = Boolean(
        focusedProgram && selected?.Programs.includes(focusedProgram) && Date.parse(focusedProgram.StartUtc) > now
    );
    const heroProgram = isFocusedUpcoming ? focusedProgram! : selectedCurrent;
    const heroNext = selected && selectedCurrent ? selected.Programs[selected.Programs.indexOf(selectedCurrent) + 1] : undefined;
    const infoChannel = channels?.find(c => c.Id === infoChannelId);

    const tuneIn = useCallback(async (channel: LiveChannel) => {
        if (!api || tuningId) return;
        setError(null);
        setTuningId(channel.Id);
        try {
            await tuneInToLiveChannel(api, channel.Id);
        } catch (err) {
            console.error('[LiveChannels] tune failed', err);
            setError(`Couldn't tune in to ${channel.Name}. Try again in a moment.`);
        } finally {
            setTuningId(null);
        }
    }, [ api, tuningId ]);

    const selectChannel = (channelId: string) => {
        if (channelId !== selected?.Id) setFocusedProgram(null);
        setSelectedId(channelId);
    };

    const onProgramClick = (channel: LiveChannel, program: LiveChannelProgram) => {
        if (isOnAt(program, now)) {
            void tuneIn(channel);
            return;
        }
        setSelectedId(channel.Id);
        setFocusedProgram(program);
    };

    const closeInfo = useCallback(() => setInfoChannelId(null), []);

    const slots = useMemo(
        () => Array.from({ length: (GUIDE_HOURS * 60) / SLOT_MINUTES }, (_, i) => new Date(windowStartMs + i * SLOT_MINUTES * MINUTE_MS)),
        [windowStartMs]
    );
    const nowOffsetPx = ((now - windowStartMs) / MINUTE_MS) * PX_PER_MINUTE;
    const timelineWidth = GUIDE_HOURS * 60 * PX_PER_MINUTE;

    if (isEnabled === false) {
        return (
            <div className='khylo-live khylo-live--empty'>
                <LiveTvOutlinedIcon className='khylo-live__empty-icon' />
                <h1 className='khylo-live__empty-title'>Khylo TV is turned off</h1>
                <p className='khylo-live__empty-text'>
                    An administrator has turned off Live Channels on this server.
                </p>
            </div>
        );
    }

    if (!isLoading && (!channels || channels.length === 0)) {
        return (
            <div className='khylo-live khylo-live--empty'>
                <LiveTvOutlinedIcon className='khylo-live__empty-icon' />
                <h1 className='khylo-live__empty-title'>No channels yet</h1>
                <p className='khylo-live__empty-text'>
                    Channels are built from your movie and TV libraries. Add more titles and they will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className='khylo-live'>
            {selected && heroProgram && (
                <KhyloLiveHero
                    channel={selected}
                    program={heroProgram}
                    next={heroNext}
                    isUpcoming={isFocusedUpcoming}
                    now={now}
                    isTuning={tuningId === selected.Id}
                    onWatch={() => { void tuneIn(selected); }}
                    onChannelInfo={() => setInfoChannelId(selected.Id)}
                />
            )}

            <div className='khylo-live__body'>
                {error && <p className='khylo-live__error' role='alert'>{error}</p>}

                <div className='khylo-live__toolbar'>
                    <div className='khylo-live__heading'>
                        <h1 className='khylo-live__title'>Khylo TV</h1>
                        {channels && <span className='khylo-live__count'>{`${channels.length} channels`}</span>}
                    </div>
                    <div className='khylo-live__tabs' role='tablist' aria-label='Channel categories'>
                        {categories.map(c => (
                            <button
                                key={c}
                                type='button'
                                role='tab'
                                aria-selected={category === c}
                                className={classNames('khylo-live__tab', { 'khylo-live__tab--active': category === c })}
                                onClick={() => setCategory(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                <section className='khylo-live__guide' aria-label='Channel guide'>
                    <div className='khylo-live__grid'>
                        <div className='khylo-live__grid-inner' style={{ width: `calc(var(--khylo-live-channel-col) + ${timelineWidth}px)` }}>
                            <div className='khylo-live__time-row'>
                                <div className='khylo-live__corner'>
                                    <span className='khylo-live__corner-label'>Now</span>
                                    {formatClockTime(new Date(now).toISOString())}
                                </div>
                                <div className='khylo-live__times' style={{ width: timelineWidth }}>
                                    {slots.map(slot => (
                                        <span key={slot.getTime()} className='khylo-live__time' style={{ width: SLOT_MINUTES * PX_PER_MINUTE }}>
                                            {formatClockTime(slot.toISOString())}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {visibleChannels.map(channel => {
                                return (
                                    <div
                                        key={channel.Id}
                                        className={classNames('khylo-live__row', { 'khylo-live__row--selected': channel.Id === selected?.Id })}
                                        onMouseEnter={() => selectChannel(channel.Id)}
                                    >
                                        <button
                                            type='button'
                                            className='khylo-live__channel'
                                            onClick={() => setInfoChannelId(channel.Id)}
                                            onFocus={() => selectChannel(channel.Id)}
                                            aria-label={`Channel ${channel.Number}, ${channel.Name}: channel info`}
                                        >
                                            <span className='khylo-live__channel-number'>{channel.Number}</span>
                                            <KhyloChannelEmblem channel={channel} />
                                            <span className='khylo-live__channel-name' title={channel.Name}>{channel.Name}</span>
                                        </button>

                                        <div className='khylo-live__programs' style={{ width: timelineWidth }}>
                                            {channel.Programs.map(program => {
                                                const startMs = Date.parse(program.StartUtc);
                                                const endMs = Date.parse(program.EndUtc);
                                                const start = Math.max(startMs, windowStartMs);
                                                const end = Math.min(endMs, windowEndMs);
                                                if (end <= start) return null;
                                                const isOnNow = isOnAt(program, now);
                                                const title = getProgramTitle(program);
                                                const subtitle = getProgramSubtitle(program);
                                                const startLabel = formatClockTime(program.StartUtc);
                                                const timeRange = `${startLabel} – ${formatClockTime(program.EndUtc)}`;
                                                const heading = subtitle ? `${title} — ${subtitle}` : title;
                                                const progress = isOnNow ? ((now - startMs) / (endMs - startMs)) * 100 : 0;
                                                return (
                                                    <button
                                                        type='button'
                                                        key={`${program.ItemId}-${program.StartUtc}`}
                                                        className={classNames('khylo-live__program', {
                                                            'khylo-live__program--now': isOnNow,
                                                            'khylo-live__program--focused': program === focusedProgram
                                                        })}
                                                        style={{
                                                            left: ((start - windowStartMs) / MINUTE_MS) * PX_PER_MINUTE,
                                                            width: ((end - start) / MINUTE_MS) * PX_PER_MINUTE
                                                        }}
                                                        onClick={() => onProgramClick(channel, program)}
                                                        onFocus={() => selectChannel(channel.Id)}
                                                        title={`${heading}\n${timeRange}${isOnNow ? '\nClick to watch live' : ''}`}
                                                    >
                                                        <span className='khylo-live__program-title'>
                                                            {isOnNow && <PlayArrowIcon className='khylo-live__program-play' />}
                                                            {title}
                                                        </span>
                                                        <span className='khylo-live__program-sub'>
                                                            {subtitle ? `${startLabel} · ${subtitle}` : startLabel}
                                                        </span>
                                                        {isOnNow && (
                                                            <span className='khylo-live__program-progress' style={{ width: `${progress}%` }} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            <div
                                className='khylo-live__now-line'
                                style={{ left: `calc(var(--khylo-live-channel-col) + ${nowOffsetPx}px)` }}
                                aria-hidden='true'
                            />
                        </div>
                    </div>
                </section>
            </div>

            {infoChannel && (
                <KhyloChannelDrawer
                    channel={infoChannel}
                    now={now}
                    isTuning={tuningId === infoChannel.Id}
                    onWatch={() => { void tuneIn(infoChannel); }}
                    onClose={closeInfo}
                />
            )}
        </div>
    );
};
