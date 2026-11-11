import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FC } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import GridViewIcon from '@mui/icons-material/GridView';

import { useApi } from 'hooks/useApi';
import { playMediaItem } from '../media/mediaUtils';
import { KhyloButton } from '../ui/KhyloButton';
import { KhyloLiveTvHero } from './KhyloLiveTvHero';
import { GUIDE_PAGE_SIZE, loadGuideSession, saveGuideSession } from './guideSession';
import { logoToneFor, type LogoTone } from './logoTone';
import { KhyloMultiView } from './KhyloMultiView';
import { KhyloProgramDrawer } from './KhyloProgramDrawer';
import { KhyloRecordings, RECORDINGS_QUERY_KEY } from './KhyloRecordings';
import {
    LIVE_TV_CATEGORIES,
    formatClock,
    getChannelLogoUrl,
    getChannels,
    getProgramSubtitle,
    getPrograms,
    isAiring,
    setChannelFavorite,
    type LiveTvCategory
} from './liveTvApi';
import '../live/KhyloLiveGuide.scss';
import '../live/KhyloChannelEmblem.scss';
import './KhyloLiveTvView.scss';

const GUIDE_HOURS = 6;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 6;
const MINUTE_MS = 60_000;

const floorToSlot = (time: number) => {
    const slotMs = SLOT_MINUTES * MINUTE_MS;
    return Math.floor(time / slotMs) * slotMs;
};

/** A channel's logo on the same tile as Live Channels' network logos, or its initials. */
const ChannelLogo: FC<{ channel: BaseItemDto }> = ({ channel }) => {
    const { api } = useApi();
    const [ failed, setFailed ] = useState(false);
    // White logos (made for a dark screen) vanish on the light tile, so they get a dark one
    const [ tone, setTone ] = useState<LogoTone>('light');
    const logo = failed ? null : getChannelLogoUrl(api, channel);
    if (logo) {
        return (
            <span className={classNames('khylo-channel-emblem khylo-channel-emblem--logo khylo-channel-emblem--sm', { 'khylo-channel-emblem--logo-dark': tone === 'dark' })} aria-hidden='true'>
                <img src={logo} alt='' loading='lazy' onError={() => setFailed(true)} onLoad={event => setTone(logoToneFor(event.currentTarget))} />
            </span>
        );
    }
    const initials = (channel.Name ?? '').replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return (
        <span className='khylo-channel-emblem khylo-channel-emblem--wordmark khylo-channel-emblem--sm' aria-hidden='true'>
            <span className='khylo-channel-emblem__wordmark'>{initials || 'TV'}</span>
        </span>
    );
};

interface GuideProgramProps {
    program: BaseItemDto;
    now: number;
    windowStartMs: number;
    windowEndMs: number;
    isFocused: boolean;
    onClick: () => void;
    onFocus: () => void;
}

/** One program in the guide grid, placed on the timeline. */
const GuideProgram: FC<GuideProgramProps> = ({ program, now, windowStartMs, windowEndMs, isFocused, onClick, onFocus }) => {
    const startMs = Date.parse(program.StartDate ?? '');
    const endMs = Date.parse(program.EndDate ?? '');
    const start = Math.max(startMs, windowStartMs);
    const end = Math.min(endMs, windowEndMs);
    if (end <= start || Number.isNaN(end - start)) return null;

    const onNow = isAiring(program, now);
    const subtitle = getProgramSubtitle(program);
    const startLabel = formatClock(program.StartDate);
    const heading = subtitle ? `${program.Name ?? ''} — ${subtitle}` : program.Name ?? '';
    const isRecording = Boolean(program.TimerId || program.SeriesTimerId);

    return (
        <button
            type='button'
            className={classNames('khylo-live__program', { 'khylo-live__program--now': onNow, 'khylo-live__program--focused': isFocused })}
            style={{ left: ((start - windowStartMs) / MINUTE_MS) * PX_PER_MINUTE, width: ((end - start) / MINUTE_MS) * PX_PER_MINUTE }}
            onClick={onClick}
            onFocus={onFocus}
            title={`${heading}\n${startLabel} – ${formatClock(program.EndDate)}`}
        >
            <span className='khylo-live__program-title'>
                {onNow && <PlayArrowIcon className='khylo-live__program-play' />}
                {isRecording && <FiberManualRecordIcon className='khylo-livetv__program-rec' />}
                {program.Name}
            </span>
            <span className='khylo-live__program-sub'>{subtitle ? `${startLabel} · ${subtitle}` : startLabel}</span>
            {onNow && <span className='khylo-live__program-progress' style={{ width: `${((now - startMs) / (endMs - startMs)) * 100}%` }} />}
        </button>
    );
};

const ADMIN_SETUP_TEXT = 'Add your IPTV playlist or an HDHomeRun tuner in the admin dashboard to start watching live TV.';
const VIEWER_SETUP_TEXT = 'Ask the server\'s administrator to add an IPTV service or tuner.';

/** Shown when the server has no channels at all. */
const LiveTvNotSetUp: FC<{ isAdmin: boolean }> = ({ isAdmin }) => (
    <div className='khylo-live khylo-live--empty'>
        <LiveTvOutlinedIcon className='khylo-live__empty-icon' />
        <h1 className='khylo-live__empty-title'>Live TV isn&apos;t set up yet</h1>
        <p className='khylo-live__empty-text'>{isAdmin ? ADMIN_SETUP_TEXT : VIEWER_SETUP_TEXT}</p>
        {isAdmin && <Link to='/dashboard/livetv' className='khylo-livetv__setup-link'>Set up Live TV</Link>}
    </div>
);

export const KhyloLiveTvView: FC = () => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const [ now, setNow ] = useState(() => Date.now());
    // Coming back from watching a channel puts the guide where it was left: the channels loaded, the category and search, the
    // highlighted channel and how far down the list was scrolled
    const restored = useRef(loadGuideSession(user?.Id));
    const [ view, setView ] = useState<'guide' | 'recordings'>(restored.current?.view ?? 'guide');
    const [ category, setCategory ] = useState<LiveTvCategory>(restored.current?.category ?? 'all');
    const [ search, setSearch ] = useState(restored.current?.search ?? '');
    const [ visibleCount, setVisibleCount ] = useState(restored.current?.visibleCount ?? GUIDE_PAGE_SIZE);
    const [ selectedId, setSelectedId ] = useState<string | null>(restored.current?.selectedId ?? null);
    const gridRef = useRef<HTMLDivElement>(null);
    const pendingScroll = useRef(restored.current?.scrollTop ?? 0);
    const lastFilter = useRef(`${restored.current?.category ?? 'all'}|${restored.current?.search ?? ''}`);
    const [ focusedProgram, setFocusedProgram ] = useState<BaseItemDto | null>(null);
    const [ drawerProgram, setDrawerProgram ] = useState<BaseItemDto | null>(null);
    const [ isMultiViewOpen, setIsMultiViewOpen ] = useState(false);
    const [ multiViewChannels, setMultiViewChannels ] = useState<BaseItemDto[]>([]);
    const canRecord = Boolean(user?.Policy?.EnableLiveTvManagement);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);

    // A new category or search starts again at the first page (the restored one is not new)
    useEffect(() => {
        const filter = `${category}|${search}`;
        if (filter === lastFilter.current) return;
        lastFilter.current = filter;
        setVisibleCount(GUIDE_PAGE_SIZE);
        pendingScroll.current = 0;
        saveGuideSession(user?.Id, { scrollTop: 0 });
    }, [ category, search, user?.Id ]);

    useEffect(() => {
        saveGuideSession(user?.Id, { view, category, search, visibleCount, selectedId });
    }, [ user?.Id, view, category, search, visibleCount, selectedId ]);

    const windowStartMs = floorToSlot(now);
    const windowEndMs = windowStartMs + GUIDE_HOURS * 60 * MINUTE_MS;

    // Typing pauses briefly before searching, so each keystroke doesn't hit the server
    const [ searchTerm, setSearchTerm ] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setSearchTerm(search.trim()), 250);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: channelPage, isLoading: isChannelsLoading } = useQuery({
        queryKey: [ 'KhyloLiveTvChannels', user?.Id, category, searchTerm, visibleCount ],
        queryFn: () => getChannels(api!, user!.Id!, category, visibleCount, searchTerm),
        enabled: Boolean(api && user?.Id),
        staleTime: 5 * 60_000,
        placeholderData: keepPreviousData
    });
    const channels = channelPage?.items;
    const totalChannels = channelPage?.total ?? 0;
    const pageChannels = useMemo(() => channels ?? [], [channels]);

    // Once the channels that were showing are back, scroll to where the list was
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid || pendingScroll.current <= 0 || pageChannels.length === 0) return;
        const wanted = Math.min(restored.current?.visibleCount ?? GUIDE_PAGE_SIZE, totalChannels);
        if (pageChannels.length < wanted) return;
        grid.scrollTop = pendingScroll.current;
        pendingScroll.current = 0;
    }, [ pageChannels.length, totalChannels, view ]);
    const pageIds = useMemo(() => pageChannels.map(c => c.Id!).filter(Boolean), [pageChannels]);

    const { data: programs } = useQuery({
        queryKey: [ 'KhyloLiveTvPrograms', user?.Id, windowStartMs, pageIds.join(',') ],
        queryFn: () => getPrograms(api!, user!.Id!, pageIds, new Date(windowStartMs), new Date(windowEndMs)),
        enabled: Boolean(api && user?.Id && pageIds.length),
        staleTime: 60_000,
        refetchInterval: 5 * 60_000
    });

    const programsByChannel = useMemo(() => {
        const map = new Map<string, BaseItemDto[]>();
        for (const program of programs ?? []) {
            const list = map.get(program.ChannelId ?? '') ?? [];
            list.push(program);
            map.set(program.ChannelId ?? '', list);
        }
        return map;
    }, [programs]);

    const selected = useMemo(
        () => pageChannels.find(c => selectedId !== null && c.Id === selectedId) ?? pageChannels[0],
        [ pageChannels, selectedId ]
    );
    const selectedPrograms = programsByChannel.get(selected?.Id ?? '') ?? [];
    const selectedCurrent = selectedPrograms.find(p => isAiring(p, now));
    const isFocusedUpcoming = Boolean(focusedProgram && focusedProgram.ChannelId === selected?.Id && Date.parse(focusedProgram.StartDate ?? '') > now);
    const heroProgram = isFocusedUpcoming ? focusedProgram! : selectedCurrent;
    const heroNext = selectedCurrent ? selectedPrograms[selectedPrograms.indexOf(selectedCurrent) + 1] : undefined;

    const watch = useCallback((channel: BaseItemDto) => playMediaItem(channel), []);

    const selectChannel = (channelId: string) => {
        if (channelId !== selected?.Id) setFocusedProgram(null);
        setSelectedId(channelId);
    };

    const onProgramClick = (channel: BaseItemDto, program: BaseItemDto) => {
        if (isAiring(program, now)) {
            watch(channel);
            return;
        }
        setSelectedId(channel.Id ?? null);
        setFocusedProgram(program);
        setDrawerProgram(program);
    };

    const refreshAfterRecording = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['KhyloLiveTvPrograms'] });
        void queryClient.invalidateQueries({ queryKey: [RECORDINGS_QUERY_KEY] });
        setDrawerProgram(null);
    }, [queryClient]);

    // Multi View starts with the highlighted channel; closing it stops every stream
    const openMultiView = () => {
        setMultiViewChannels(selected ? [selected] : []);
        setIsMultiViewOpen(true);
    };
    const closeMultiView = useCallback(() => {
        setIsMultiViewOpen(false);
        setMultiViewChannels([]);
    }, []);

    const toggleFavorite = async (channel: BaseItemDto) => {
        if (!api || !user?.Id || !channel.Id) return;
        await setChannelFavorite(api, user.Id, channel.Id, !channel.UserData?.IsFavorite);
        await queryClient.invalidateQueries({ queryKey: ['KhyloLiveTvChannels'] });
    };

    const slots = useMemo(
        () => Array.from({ length: (GUIDE_HOURS * 60) / SLOT_MINUTES }, (_, i) => windowStartMs + i * SLOT_MINUTES * MINUTE_MS),
        [windowStartMs]
    );
    const nowOffsetPx = ((now - windowStartMs) / MINUTE_MS) * PX_PER_MINUTE;
    const timelineWidth = GUIDE_HOURS * 60 * PX_PER_MINUTE;
    const drawerChannel = channels?.find(c => c.Id === drawerProgram?.ChannelId);

    if (!isChannelsLoading && category === 'all' && !searchTerm && totalChannels === 0) {
        return <LiveTvNotSetUp isAdmin={Boolean(user?.Policy?.IsAdministrator)} />;
    }

    return (
        <div className='khylo-live khylo-livetv'>
            {view === 'guide' && selected && (
                <KhyloLiveTvHero
                    channel={selected}
                    program={heroProgram}
                    next={heroNext}
                    isUpcoming={isFocusedUpcoming}
                    now={now}
                    canRecord={canRecord}
                    isFavorite={Boolean(selected.UserData?.IsFavorite)}
                    onWatch={() => watch(selected)}
                    onDetails={() => heroProgram && setDrawerProgram(heroProgram)}
                    onToggleFavorite={() => { toggleFavorite(selected).catch(() => undefined); }}
                />
            )}

            <div className='khylo-live__body'>
                <div className='khylo-live__toolbar'>
                    <div className='khylo-live__heading'>
                        <h1 className='khylo-live__title'>Live TV</h1>
                        {channels && view === 'guide' && <span className='khylo-live__count'>{`${totalChannels.toLocaleString()} channels`}</span>}
                    </div>
                    <div className='khylo-live__tabs' role='tablist' aria-label='Live TV'>
                        <button type='button' role='tab' aria-selected={view === 'guide'} className={classNames('khylo-live__tab', { 'khylo-live__tab--active': view === 'guide' })} onClick={() => setView('guide')}>
                            Guide
                        </button>
                        <button type='button' role='tab' aria-selected={view === 'recordings'} className={classNames('khylo-live__tab', { 'khylo-live__tab--active': view === 'recordings' })} onClick={() => setView('recordings')}>
                            <FiberManualRecordIcon className='khylo-livetv__rec-icon' /> Recordings
                        </button>
                    </div>
                    <button type='button' className='khylo-livetv__multiview-btn' onClick={openMultiView}>
                        <GridViewIcon /> Multi View
                    </button>
                </div>

                {view === 'recordings' ? <KhyloRecordings canManage={canRecord} /> : (
                    <>
                        <div className='khylo-livetv__filters'>
                            <div className='khylo-live__tabs' role='tablist' aria-label='Channel categories'>
                                {LIVE_TV_CATEGORIES.map(c => (
                                    <button
                                        key={c.id}
                                        type='button'
                                        role='tab'
                                        aria-selected={category === c.id}
                                        className={classNames('khylo-live__tab', { 'khylo-live__tab--active': category === c.id })}
                                        onClick={() => setCategory(c.id)}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                            <label className='khylo-livetv__search'>
                                <SearchIcon />
                                <input
                                    type='search'
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder='Find a channel'
                                    aria-label='Find a channel by name or number'
                                />
                            </label>
                        </div>

                        {pageChannels.length === 0 && !isChannelsLoading ? (
                            <p className='khylo-livetv__none'>
                                {category === 'favorites' ? 'No favorite channels yet. Pick a channel and press the star to add it.' : 'No channels match.'}
                            </p>
                        ) : (
                            <section className='khylo-live__guide' aria-label='TV guide'>
                                <div
                                    className='khylo-live__grid'
                                    ref={gridRef}
                                    onScroll={event => {
                                        // Not while the saved place is still being put back
                                        if (pendingScroll.current <= 0) saveGuideSession(user?.Id, { scrollTop: event.currentTarget.scrollTop });
                                    }}
                                >
                                    <div className='khylo-live__grid-inner' style={{ width: `calc(var(--khylo-live-channel-col) + ${timelineWidth}px)` }}>
                                        <div className='khylo-live__time-row'>
                                            <div className='khylo-live__corner'>
                                                <span className='khylo-live__corner-label'>Now</span>
                                                {formatClock(new Date(now).toISOString())}
                                            </div>
                                            <div className='khylo-live__times' style={{ width: timelineWidth }}>
                                                {slots.map(slot => (
                                                    <span key={slot} className='khylo-live__time' style={{ width: SLOT_MINUTES * PX_PER_MINUTE }}>
                                                        {formatClock(new Date(slot).toISOString())}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {pageChannels.map(channel => (
                                            <div
                                                key={channel.Id}
                                                className={classNames('khylo-live__row', { 'khylo-live__row--selected': channel.Id === selected?.Id })}
                                                onMouseEnter={() => selectChannel(channel.Id!)}
                                            >
                                                <button
                                                    type='button'
                                                    className='khylo-live__channel'
                                                    onClick={() => watch(channel)}
                                                    onFocus={() => selectChannel(channel.Id!)}
                                                    aria-label={`Watch channel ${channel.ChannelNumber ?? ''} ${channel.Name ?? ''}`}
                                                >
                                                    <span className='khylo-live__channel-number'>{channel.ChannelNumber}</span>
                                                    <ChannelLogo channel={channel} />
                                                    <span className='khylo-live__channel-name' title={channel.Name ?? ''}>{channel.Name}</span>
                                                </button>

                                                <div className='khylo-live__programs' style={{ width: timelineWidth }}>
                                                    {(programsByChannel.get(channel.Id!) ?? []).map(program => (
                                                        <GuideProgram
                                                            key={program.Id}
                                                            program={program}
                                                            now={now}
                                                            windowStartMs={windowStartMs}
                                                            windowEndMs={windowEndMs}
                                                            isFocused={program.Id === focusedProgram?.Id}
                                                            onClick={() => onProgramClick(channel, program)}
                                                            onFocus={() => selectChannel(channel.Id!)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div className='khylo-live__now-line' style={{ left: `calc(var(--khylo-live-channel-col) + ${nowOffsetPx}px)` }} aria-hidden='true' />
                                    </div>
                                </div>
                            </section>
                        )}

                        {totalChannels > pageChannels.length && (
                            <div className='khylo-livetv__more'>
                                <KhyloButton variant='secondary' onClick={() => setVisibleCount(count => count + GUIDE_PAGE_SIZE)}>
                                    {`Show more channels (${(totalChannels - pageChannels.length).toLocaleString()} more)`}
                                </KhyloButton>
                            </div>
                        )}
                    </>
                )}
            </div>

            {isMultiViewOpen && (
                <KhyloMultiView channels={multiViewChannels} onChannelsChange={setMultiViewChannels} onClose={closeMultiView} />
            )}

            {drawerProgram && (
                <KhyloProgramDrawer
                    program={drawerProgram}
                    channel={drawerChannel}
                    now={now}
                    canRecord={canRecord}
                    onWatch={() => drawerChannel && watch(drawerChannel)}
                    onChanged={refreshAfterRecording}
                    onClose={() => setDrawerProgram(null)}
                />
            )}
        </div>
    );
};
