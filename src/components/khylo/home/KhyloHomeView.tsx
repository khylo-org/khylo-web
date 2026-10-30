import React, { useState, useMemo, useEffect, type FC } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';

import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import HistoryIcon from '@mui/icons-material/History';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getShowApi } from '@khylo/sdk/lib/utils/api/show-api';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';

import { useApi } from 'hooks/useApi';
import { KhyloHero } from './KhyloHero';
import { KhyloContentRail } from '../media/KhyloContentRail';
import { KhyloMediaCard } from '../media/KhyloMediaCard';
import { KhyloSkeleton } from '../ui/KhyloSkeleton';
import { KhyloButton } from '../ui/KhyloButton';
import {
    getHiddenContinueItemIds,
    isEbookMediaItem,
    isAudiobookMediaItem,
    collapseBookParts
} from '../media/mediaUtils';
import './KhyloHomeView.scss';

const HERO_ITEM_FIELDS = [
    ItemFields.PrimaryImageAspectRatio,
    ItemFields.Overview,
    ItemFields.Genres,
    ItemFields.Taglines,
    ItemFields.Width,
    ItemFields.Height,
    ItemFields.ChildCount,
    ItemFields.MediaStreams,
    ItemFields.ParentId,
    ItemFields.Chapters,
    ItemFields.MediaSources
];

type WatchlistFilter = 'all' | 'movies' | 'shows';
type ContinueTab = 'watching' | 'listening' | 'reading';

const CONTINUE_TABS: { id: ContinueTab; label: string }[] = [
    { id: 'watching', label: 'Watching' },
    { id: 'listening', label: 'Listening' },
    { id: 'reading', label: 'Reading' }
];

/** Most recent activity for a book or audiobook: server play date, or the local reader's last-read date. */
const getBookActivityTime = (item: BaseItemDto) => {
    if (item.UserData?.LastPlayedDate) return new Date(item.UserData.LastPlayedDate).getTime();
    try {
        return Number(localStorage.getItem(`khylo_book_read_date_${item.Id}`) || 0);
    } catch {
        return 0;
    }
};

export const KhyloHomeView: FC = () => {
    const { api, user } = useApi();
    const userId = user?.Id;

    const [ searchParams, setSearchParams ] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [ hiddenContinueIds, setHiddenContinueIds ] = useState<Set<string>>(() => getHiddenContinueItemIds());

    useEffect(() => {
        const handleHiddenUpdate = () => {
            setHiddenContinueIds(getHiddenContinueItemIds());
        };
        const handleBookUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Books'] });
            queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Resume'] });
        };
        window.addEventListener('khylo-continue-watching-updated', handleHiddenUpdate);
        window.addEventListener('khylo-book-progress-updated', handleBookUpdate);
        return () => {
            window.removeEventListener('khylo-continue-watching-updated', handleHiddenUpdate);
            window.removeEventListener('khylo-book-progress-updated', handleBookUpdate);
        };
    }, [queryClient]);

    const [ watchlistFilter, setWatchlistFilter ] = useState<WatchlistFilter>('all');

    // Route states for "My Stuff" sub-destinations
    const isWatchlist = searchParams.get('tab') === '1' || searchParams.get('tab') === 'watchlist';
    const isHistory = searchParams.get('tab') === 'history' || location.hash === '#history';
    const isContinuePage = searchParams.get('tab') === 'continue';
    const continueTab: ContinueTab = CONTINUE_TABS.some(t => t.id === searchParams.get('type'))
        ? searchParams.get('type') as ContinueTab
        : 'watching';

    // Old "#continue" links now open the Continue page
    useEffect(() => {
        if (location.hash === '#continue') {
            navigate('/home?tab=continue', { replace: true });
        }
    }, [location.hash, navigate]);

    // 1. Continue Watching / Resume Items (Home)
    const { data: resumeData, isLoading: isResumeLoading } = useQuery({
        queryKey: ['KhyloHome', 'Resume', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getResumeItems({
                userId,
                limit: 50,
                fields: HERO_ITEM_FIELDS
            });
            return res.data.Items || [];
        },
        // Always re-check on visit: progress may have changed here or on another device
        staleTime: 0,
        enabled: Boolean(api && userId && !isWatchlist && !isHistory)
    });

    // 1b. User Books (for detecting local reading progress & CFIs)
    const { data: userBooksData } = useQuery({
        queryKey: ['KhyloHome', 'Books', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                includeItemTypes: [BaseItemKind.Book],
                recursive: true,
                fields: HERO_ITEM_FIELDS
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && !isWatchlist && !isHistory)
    });

    // 2. Next Up Items (Recently released / Next episodes to watch)
    const { data: nextUpData, isLoading: isNextUpLoading } = useQuery({
        queryKey: ['KhyloHome', 'NextUp', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getShowApi(api).getNextUp({
                userId,
                limit: 16,
                fields: HERO_ITEM_FIELDS
            });
            return res.data.Items || [];
        },
        staleTime: 0,
        enabled: Boolean(api && userId && !isWatchlist && !isHistory)
    });

    // 3. Recently Added in TV Shows
    const { data: latestShowsData, isLoading: isLatestShowsLoading } = useQuery({
        queryKey: ['KhyloHome', 'LatestShows', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                includeItemTypes: [BaseItemKind.Series],
                sortBy: [ItemSortBy.DateCreated],
                sortOrder: [SortOrder.Descending],
                recursive: true,
                limit: 16,
                fields: HERO_ITEM_FIELDS
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && !isWatchlist && !isHistory && !isContinuePage)
    });

    // 4. Recently Added in Movies
    const { data: latestMoviesData, isLoading: isLatestMoviesLoading } = useQuery({
        queryKey: ['KhyloHome', 'LatestMovies', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                includeItemTypes: [BaseItemKind.Movie],
                sortBy: [ItemSortBy.DateCreated],
                sortOrder: [SortOrder.Descending],
                recursive: true,
                limit: 16,
                fields: HERO_ITEM_FIELDS
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && !isWatchlist && !isHistory && !isContinuePage)
    });

    // 5. Recommended / Popular on Server (Highest Community Rating)
    const { data: recommendedData, isLoading: isRecommendedLoading } = useQuery({
        queryKey: ['KhyloHome', 'Recommended', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
                sortBy: [ItemSortBy.CommunityRating],
                sortOrder: [SortOrder.Descending],
                recursive: true,
                limit: 16,
                fields: HERO_ITEM_FIELDS
            });
            return (res.data.Items || []).filter(item => item.CommunityRating && item.CommunityRating > 0);
        },
        enabled: Boolean(api && userId && !isWatchlist && !isHistory && !isContinuePage)
    });

    // 6. Collections / BoxSets (Home)
    const { data: collectionsData, isLoading: isCollectionsLoading } = useQuery({
        queryKey: ['KhyloHome', 'Collections', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                includeItemTypes: [BaseItemKind.BoxSet],
                limit: 8,
                recursive: true,
                fields: [
                    ItemFields.ChildCount,
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview
                ]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && !isWatchlist && !isHistory && !isContinuePage)
    });

    // 7. Watchlist Data (Favorites)
    const { data: watchlistData, isLoading: isWatchlistLoading } = useQuery({
        queryKey: ['KhyloWatchlist', userId, watchlistFilter],
        queryFn: async () => {
            if (!api || !userId) return [];
            const includeItemTypes = watchlistFilter === 'movies'
                ? [BaseItemKind.Movie]
                : watchlistFilter === 'shows'
                    ? [BaseItemKind.Series]
                    : [BaseItemKind.Movie, BaseItemKind.Series];

            const res = await getLibraryApi(api).getItems({
                userId,
                isFavorite: true,
                recursive: true,
                includeItemTypes,
                fields: HERO_ITEM_FIELDS,
                sortBy: [ItemSortBy.SortName],
                sortOrder: [SortOrder.Ascending]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && isWatchlist)
    });

    // 8. History Data (Played items)
    const { data: historyData, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['KhyloHistory', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                isPlayed: true,
                sortBy: [ItemSortBy.DatePlayed],
                sortOrder: [SortOrder.Descending],
                recursive: true,
                limit: 50,
                fields: HERO_ITEM_FIELDS
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && isHistory)
    });

    // 1. Movies & TV Shows Continue Watching Queue (Strictly Video media only)
    // Strictly shows only ONE episode per series (the left-off episode, or next if finished)
    // Explicit Rule: Strictly Episode, Movie, or Video. NEVER Series or Season containers.
    const continueWatchingItems = useMemo(() => {
        const items: BaseItemDto[] = [];
        const seenIds = new Set<string>();
        const seenSeries = new Set<string>();

        // 1. Sort resumeData so the most recently played episode/media is evaluated first
        const sortedResume = [ ...(resumeData || []) ].sort((a, b) => {
            const dateA = a.UserData?.LastPlayedDate ? new Date(a.UserData.LastPlayedDate).getTime() : 0;
            const dateB = b.UserData?.LastPlayedDate ? new Date(b.UserData.LastPlayedDate).getTime() : 0;
            return dateB - dateA;
        });

        // Index in-progress episodes from resumeData by SeriesId / SeriesName for fast resolution
        const inProgressEpBySeries = new Map<string, BaseItemDto>();
        for (const r of sortedResume) {
            if (r.Type === BaseItemKind.Episode && (r.UserData?.PlaybackPositionTicks || 0) > 0) {
                const sKey = r.SeriesId || r.SeriesName;
                if (sKey && !inProgressEpBySeries.has(sKey)) {
                    inProgressEpBySeries.set(sKey, r);
                }
            }
        }

        // Map nextUp episodes by SeriesId for fallback lookup when an episode was completed
        const nextUpBySeries = new Map<string, BaseItemDto>();
        for (const nextUpItem of (nextUpData || [])) {
            if (nextUpItem.Type === BaseItemKind.Episode) {
                const sKey = nextUpItem.SeriesId || nextUpItem.SeriesName;
                if (sKey && !nextUpBySeries.has(sKey)) {
                    nextUpBySeries.set(sKey, nextUpItem);
                }
            }
        }

        // 2. Prioritize active in-progress media (items with PlaybackPositionTicks) - exactly 1 per series
        for (const rawItem of sortedResume) {
            if (!rawItem.Id) continue;
            // Explicitly exclude books, ebooks, and audiobooks from video Continue Watching
            if (isAudiobookMediaItem(rawItem) || isEbookMediaItem(rawItem)) continue;

            let item = rawItem;

            // If rawItem is a container (Series or Season), NEVER display the container directly!
            if (rawItem.Type === BaseItemKind.Series || rawItem.Type === BaseItemKind.Season) {
                const sKey = rawItem.SeriesId || (rawItem.Type === BaseItemKind.Series ? rawItem.Id : null);
                // Resolve to in-progress episode if available, else nextUp episode
                if (sKey && inProgressEpBySeries.has(sKey)) {
                    item = inProgressEpBySeries.get(sKey)!;
                } else if (sKey && nextUpBySeries.has(sKey)) {
                    item = nextUpBySeries.get(sKey)!;
                } else {
                    // Container cannot be resolved to a playable episode, skip completely
                    continue;
                }
            }

            // Strictly allow ONLY leaf playable video items: Episode, Movie, Video
            const isPlayableVideo = item.Type === BaseItemKind.Episode || item.Type === BaseItemKind.Movie || item.Type === BaseItemKind.Video;
            if (!isPlayableVideo) continue;

            if (!item.Id || seenIds.has(item.Id)) continue;

            const seriesKey = item.SeriesId || (item.Type === BaseItemKind.Episode ? item.SeriesName : null);
            if (seriesKey && seenSeries.has(seriesKey)) continue;
            if (hiddenContinueIds.has(item.Id) || (item.SeriesId && hiddenContinueIds.has(item.SeriesId))) continue;

            items.push(item);
            seenIds.add(item.Id);
            if (seriesKey) {
                seenSeries.add(seriesKey);
            }
        }

        // 3. Supplement with Next Up episodes for series not already active in resume - exactly 1 per series
        if (nextUpData && nextUpData.length > 0) {
            for (const item of nextUpData) {
                if (!item.Id || seenIds.has(item.Id)) continue;
                if (item.Type !== BaseItemKind.Episode) continue;
                if (isAudiobookMediaItem(item) || isEbookMediaItem(item)) continue;

                const seriesKey = item.SeriesId || item.SeriesName;
                if (seriesKey && seenSeries.has(seriesKey)) continue;
                if (hiddenContinueIds.has(item.Id) || (item.SeriesId && hiddenContinueIds.has(item.SeriesId))) continue;

                items.push(item);
                seenIds.add(item.Id);
                if (seriesKey) {
                    seenSeries.add(seriesKey);
                }
            }
        }

        return items;
    }, [resumeData, nextUpData, hiddenContinueIds]);

    // 2. Dedicated Continue Listening Queue (Audiobooks only, collapsed multi-parts)
    const continueListeningItems = useMemo(() => {
        const audioCandidates: BaseItemDto[] = [];
        const seenIds = new Set<string>();

        const sortedResume = [ ...(resumeData || []) ].sort((a, b) => {
            const dateA = a.UserData?.LastPlayedDate ? new Date(a.UserData.LastPlayedDate).getTime() : 0;
            const dateB = b.UserData?.LastPlayedDate ? new Date(b.UserData.LastPlayedDate).getTime() : 0;
            return dateB - dateA;
        });

        for (const item of sortedResume) {
            if (!item.Id || seenIds.has(item.Id)) continue;
            if (!isAudiobookMediaItem(item)) continue;
            if (hiddenContinueIds.has(item.Id)) continue;

            audioCandidates.push(item);
            seenIds.add(item.Id);
        }

        return collapseBookParts(audioCandidates);
    }, [resumeData, hiddenContinueIds]);

    // 3. Dedicated Continue Reading Queue (Books & E-Books, picking up from server & local CFI)
    const continueReadingItems = useMemo(() => {
        const readingCandidates: BaseItemDto[] = [];
        const seenIds = new Set<string>();

        // 1. From server resume queue
        if (resumeData) {
            for (const item of resumeData) {
                if (!item.Id || seenIds.has(item.Id)) continue;
                if (!isEbookMediaItem(item)) continue;
                if (hiddenContinueIds.has(item.Id)) continue;

                readingCandidates.push(item);
                seenIds.add(item.Id);
            }
        }

        // 2. From local reading progress / CFIs in books library
        if (userBooksData) {
            for (const item of userBooksData) {
                if (!item.Id || seenIds.has(item.Id)) continue;
                if (hiddenContinueIds.has(item.Id)) continue;

                const hasLocalCfi = typeof window !== 'undefined' && Boolean(localStorage.getItem(`khylo_book_cfi_${item.Id}`));
                const hasLocalPct = typeof window !== 'undefined' && Boolean(localStorage.getItem(`khylo_book_pct_${item.Id}`));
                const hasTicks = (item.UserData?.PlaybackPositionTicks || 0) > 0;
                const hasPlayedPct = (item.UserData?.PlayedPercentage || 0) > 0 && (item.UserData?.PlayedPercentage || 0) < 100;

                if (hasLocalCfi || hasLocalPct || hasTicks || hasPlayedPct) {
                    readingCandidates.push(item);
                    seenIds.add(item.Id);
                }
            }
        }

        readingCandidates.sort((a, b) => {
            const dateA = a.UserData?.LastPlayedDate
                ? new Date(a.UserData.LastPlayedDate).getTime()
                : (typeof window !== 'undefined' ? Number(localStorage.getItem(`khylo_book_read_date_${a.Id}`) || 0) : 0);
            const dateB = b.UserData?.LastPlayedDate
                ? new Date(b.UserData.LastPlayedDate).getTime()
                : (typeof window !== 'undefined' ? Number(localStorage.getItem(`khylo_book_read_date_${b.Id}`) || 0) : 0);
            return dateB - dateA;
        });

        return collapseBookParts(readingCandidates);
    }, [resumeData, userBooksData, hiddenContinueIds]);

    // Combined Continue Reading & Listening row for the home dashboard, most recent first
    const continueBooksItems = useMemo(() => (
        [ ...continueListeningItems, ...continueReadingItems ]
            .sort((a, b) => getBookActivityTime(b) - getBookActivityTime(a))
    ), [continueListeningItems, continueReadingItems]);

    const handleRemoveContinueWatching = (removedItem: BaseItemDto, mode: 'episode' | 'series') => {
        setHiddenContinueIds(prev => {
            const next = new Set(prev);
            if (mode === 'series' && removedItem.SeriesId) {
                next.add(removedItem.SeriesId);
            }
            if (removedItem.Id) {
                next.add(removedItem.Id);
            }
            return next;
        });
        void queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Resume'] });
        void queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'NextUp'] });
    };

    // Local reading progress for e-books is cleared by the card itself
    const handleRemoveContinueBook = (removedItem: BaseItemDto) => {
        if (removedItem.Id) {
            setHiddenContinueIds(prev => new Set(prev).add(removedItem.Id!));
        }
        void queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Resume'] });
        void queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Books'] });
    };

    // Hero billboard: Spotlight/Featured from newest additions
    const heroItems = useMemo(() => {
        const pool = [ ...(latestMoviesData || []), ...(latestShowsData || []) ];
        if (pool.length > 0) {
            const withBackdrops = pool.filter(item =>
                (item.BackdropImageTags && item.BackdropImageTags.length > 0) ||
                (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0) ||
                (item.ImageTags?.Thumb)
            );
            if (withBackdrops.length > 0) {
                return withBackdrops.slice(0, 5);
            }
            return pool.slice(0, 5);
        }
        if (continueWatchingItems.length > 0) {
            return continueWatchingItems.slice(0, 5);
        }
        return [];
    }, [latestMoviesData, latestShowsData, continueWatchingItems]);

    // Chronological grouping for History
    const historyGroups = useMemo(() => {
        if (!historyData || historyData.length === 0) return [];

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const sevenDays = 7 * oneDay;
        const thirtyDays = 30 * oneDay;

        const groups: { label: string; items: BaseItemDto[] }[] = [
            { label: 'Today', items: [] },
            { label: 'Yesterday', items: [] },
            { label: 'This Week', items: [] },
            { label: 'Earlier This Month', items: [] },
            { label: 'Older', items: [] }
        ];

        for (const item of historyData) {
            const lastPlayedDate = item.UserData?.LastPlayedDate ? new Date(item.UserData.LastPlayedDate).getTime() : 0;
            const diff = now - lastPlayedDate;

            if (diff < oneDay) {
                groups[0].items.push(item);
            } else if (diff < 2 * oneDay) {
                groups[1].items.push(item);
            } else if (diff < sevenDays) {
                groups[2].items.push(item);
            } else if (diff < thirtyDays) {
                groups[3].items.push(item);
            } else {
                groups[4].items.push(item);
            }
        }

        return groups.filter(g => g.items.length > 0);
    }, [historyData]);

    // --- Sub-View: Continue (Watching / Listening / Reading) ---
    if (isContinuePage) {
        const isVideoTab = continueTab === 'watching';
        let tabItems = continueReadingItems;
        if (isVideoTab) {
            tabItems = continueWatchingItems;
        } else if (continueTab === 'listening') {
            tabItems = continueListeningItems;
        }
        const isTabLoading = isResumeLoading || (isVideoTab && isNextUpLoading);
        const emptyText = {
            watching: 'Movies and episodes you start will show up here so you can pick up where you left off.',
            listening: 'Audiobooks you start listening to will show up here.',
            reading: 'Books you start reading will show up here.'
        }[continueTab];
        const gridClassName = classNames('khylo-subview__grid', isVideoTab ? 'khylo-subview__grid--wide' : 'khylo-subview__grid--books');

        return (
            <div className='khylo-subview'>
                <div className='khylo-subview__header'>
                    <div className='khylo-subview__title-row'>
                        <div className='khylo-subview__heading-group'>
                            <h1 className='khylo-subview__title'>Continue</h1>
                            {tabItems.length > 0 && (
                                <span className='khylo-subview__count-pill'>
                                    {tabItems.length} {tabItems.length === 1 ? 'Title' : 'Titles'}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className='khylo-subview__subtitle'>
                        Everything you have started, in one place
                    </p>

                    <div className='khylo-subview__filters' role='tablist'>
                        {CONTINUE_TABS.map(tab => (
                            <button
                                key={tab.id}
                                type='button'
                                role='tab'
                                aria-selected={continueTab === tab.id}
                                className={classNames('khylo-subview__filter-btn', {
                                    'khylo-subview__filter-btn--active': continueTab === tab.id
                                })}
                                onClick={() => setSearchParams({ tab: 'continue', type: tab.id }, { replace: true })}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className='khylo-subview__content'>
                    {isTabLoading && tabItems.length === 0 && (
                        <div className={gridClassName}>
                            {Array.from({ length: 8 }).map((_, idx) => (
                                <div key={idx} className='khylo-subview__card-wrap'>
                                    <KhyloSkeleton variant='card' aspectRatio={isVideoTab ? '16:9' : '2:3'} />
                                    <div style={{ marginTop: 10 }}>
                                        <KhyloSkeleton variant='text' width='80%' />
                                        <KhyloSkeleton variant='text' width='45%' />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tabItems.length > 0 && (
                        <div className={gridClassName}>
                            {tabItems.map(item => (
                                <div key={item.Id} className='khylo-subview__card-wrap'>
                                    <KhyloMediaCard
                                        item={item}
                                        variant={isVideoTab ? 'continue' : 'book'}
                                        onRemoveFromContinue={isVideoTab ? handleRemoveContinueWatching : handleRemoveContinueBook}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {!isTabLoading && tabItems.length === 0 && (
                        <div className='khylo-subview__empty'>
                            <div className='khylo-subview__empty-icon'>
                                <PlayCircleOutlineIcon />
                            </div>
                            <h3 className='khylo-subview__empty-title'>Nothing in progress</h3>
                            <p className='khylo-subview__empty-desc'>{emptyText}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Sub-View: Watchlist (Spec 103, 106) ---
    if (isWatchlist) {
        const savedItems = watchlistData || [];
        return (
            <div className='khylo-subview'>
                <div className='khylo-subview__header'>
                    <div className='khylo-subview__title-row'>
                        <div className='khylo-subview__heading-group'>
                            <h1 className='khylo-subview__title'>My Watchlist</h1>
                            {savedItems.length > 0 && (
                                <span className='khylo-subview__count-pill'>
                                    {savedItems.length} {savedItems.length === 1 ? 'Title' : 'Titles'} Saved
                                </span>
                            )}
                        </div>
                    </div>
                    <p className='khylo-subview__subtitle'>
                        Your curated queue of movies and series to watch next
                    </p>

                    {/* Filter Bar */}
                    <div className='khylo-subview__filters'>
                        <button
                            type='button'
                            className={classNames('khylo-subview__filter-btn', {
                                'khylo-subview__filter-btn--active': watchlistFilter === 'all'
                            })}
                            onClick={() => setWatchlistFilter('all')}
                        >
                            All Titles
                        </button>
                        <button
                            type='button'
                            className={classNames('khylo-subview__filter-btn', {
                                'khylo-subview__filter-btn--active': watchlistFilter === 'movies'
                            })}
                            onClick={() => setWatchlistFilter('movies')}
                        >
                            Movies
                        </button>
                        <button
                            type='button'
                            className={classNames('khylo-subview__filter-btn', {
                                'khylo-subview__filter-btn--active': watchlistFilter === 'shows'
                            })}
                            onClick={() => setWatchlistFilter('shows')}
                        >
                            TV Shows
                        </button>
                    </div>
                </div>

                <div className='khylo-subview__content'>
                    {isWatchlistLoading ? (
                        <div className='khylo-subview__grid'>
                            {Array.from({ length: 12 }).map((_, idx) => (
                                <div key={idx} className='khylo-subview__card-wrap'>
                                    <KhyloSkeleton variant='card' aspectRatio='2:3' />
                                    <div style={{ marginTop: 10 }}>
                                        <KhyloSkeleton variant='text' width='80%' />
                                        <KhyloSkeleton variant='text' width='45%' />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : savedItems.length > 0 ? (
                        <div className='khylo-subview__grid'>
                            {savedItems.map(item => (
                                <div key={item.Id} className='khylo-subview__card-wrap'>
                                    <KhyloMediaCard item={item} variant='poster' />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='khylo-subview__empty'>
                            <div className='khylo-subview__empty-icon'>
                                <BookmarkBorderIcon />
                            </div>
                            <h3 className='khylo-subview__empty-title'>Your Watchlist is Empty</h3>
                            <p className='khylo-subview__empty-desc'>
                                Click the &ldquo;Add to List&rdquo; button on any movie or TV show to save it to your personal queue.
                            </p>
                            <KhyloButton
                                variant='primary'
                                onClick={() => {
                                    setSearchParams({});
                                    navigate('/home');
                                }}
                            >
                                Browse Featured Titles
                            </KhyloButton>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Sub-View: Watch History (Spec 103, 107) ---
    if (isHistory) {
        return (
            <div className='khylo-subview'>
                <div className='khylo-subview__header'>
                    <div className='khylo-subview__title-row'>
                        <div className='khylo-subview__heading-group'>
                            <h1 className='khylo-subview__title'>Watch History</h1>
                            {historyData && historyData.length > 0 && (
                                <span className='khylo-subview__count-pill'>
                                    {historyData.length} {historyData.length === 1 ? 'Title' : 'Titles'}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className='khylo-subview__subtitle'>
                        Titles and episodes you have streamed across your Khylo media library
                    </p>
                </div>

                <div className='khylo-subview__content'>
                    {isHistoryLoading ? (
                        <div className='khylo-subview__grid'>
                            {Array.from({ length: 12 }).map((_, idx) => (
                                <div key={idx} className='khylo-subview__card-wrap'>
                                    <KhyloSkeleton variant='card' aspectRatio='2:3' />
                                    <div style={{ marginTop: 10 }}>
                                        <KhyloSkeleton variant='text' width='80%' />
                                        <KhyloSkeleton variant='text' width='45%' />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : historyGroups.length > 0 ? (
                        <div className='khylo-subview__history-groups'>
                            {historyGroups.map(group => (
                                <section key={group.label} className='khylo-subview__history-group'>
                                    <h2 className='khylo-subview__group-title'>{group.label}</h2>
                                    <div className='khylo-subview__grid'>
                                        {group.items.map(item => (
                                            <div key={item.Id} className='khylo-subview__card-wrap'>
                                                <KhyloMediaCard item={item} variant='poster' />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div className='khylo-subview__empty'>
                            <div className='khylo-subview__empty-icon'>
                                <HistoryIcon />
                            </div>
                            <h3 className='khylo-subview__empty-title'>No Watch History Yet</h3>
                            <p className='khylo-subview__empty-desc'>
                                As you stream movies and shows on Khylo, your playback history and completed titles will appear here.
                            </p>
                            <KhyloButton
                                variant='primary'
                                onClick={() => {
                                    navigate('/home');
                                }}
                            >
                                Discover Movies &amp; Shows
                            </KhyloButton>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- Default View: Cinematic Home Dashboard ---
    const isHeroLoading = isLatestMoviesLoading && isLatestShowsLoading && isResumeLoading;
    const isContinueLoading = isResumeLoading || isNextUpLoading;

    return (
        <div className='khylo-home'>
            {/* 1. Cinematic Hero Billboard (Featured Spotlight) */}
            {(heroItems.length > 0 || isHeroLoading) && (
                <KhyloHero
                    items={heroItems}
                    contextTag='Featured'
                    isLoading={isHeroLoading}
                />
            )}

            {/* 2. Unified Continue Watching Rail (Movies & TV Shows only) */}
            {(isContinueLoading || continueWatchingItems.length > 0) && (
                <KhyloContentRail
                    id='continue-watching'
                    title='Continue Watching'
                    subtitle='Pick up where you left off'
                    items={continueWatchingItems}
                    variant='continue'
                    isLoading={isContinueLoading && continueWatchingItems.length === 0}
                    headerAction={
                        <button
                            type='button'
                            className='khylo-home__see-all'
                            onClick={() => navigate('/home?tab=continue')}
                        >
                            See all
                        </button>
                    }
                    onRemoveFromContinue={handleRemoveContinueWatching}
                />
            )}

            {/* 3. Combined Continue Reading & Listening Rail (audiobooks and books, smaller than Continue Watching) */}
            {continueBooksItems.length > 0 && (
                <KhyloContentRail
                    id='continue-books'
                    title='Continue Reading & Listening'
                    subtitle='Pick up where you left off in your books and audiobooks'
                    className='khylo-rail--compact'
                    items={continueBooksItems}
                    variant='book'
                    showMediaTypeBadge
                    headerAction={
                        <button
                            type='button'
                            className='khylo-home__see-all'
                            onClick={() => navigate(`/home?tab=continue&type=${isAudiobookMediaItem(continueBooksItems[0]) ? 'listening' : 'reading'}`)}
                        >
                            See all
                        </button>
                    }
                    onRemoveFromContinue={handleRemoveContinueBook}
                />
            )}

            {/* 4. Recently Added in TV Shows */}
            {(isLatestShowsLoading || (latestShowsData && latestShowsData.length > 0)) && (
                <KhyloContentRail
                    id='recently-added-tv'
                    title='Recently Added TV Shows'
                    subtitle='New series and seasons on your server'
                    items={latestShowsData}
                    variant='poster'
                    isLoading={isLatestShowsLoading}
                />
            )}

            {/* 5. Recently Added in Movies */}
            {(isLatestMoviesLoading || (latestMoviesData && latestMoviesData.length > 0)) && (
                <KhyloContentRail
                    id='recently-added-movies'
                    title='Recently Added Movies'
                    subtitle='Fresh cinema added to your collection'
                    items={latestMoviesData}
                    variant='poster'
                    isLoading={isLatestMoviesLoading}
                />
            )}

            {/* 6. Recommended for You (Based on top community ratings and viewer favorites) */}
            {(isRecommendedLoading || (recommendedData && recommendedData.length > 0)) && (
                <KhyloContentRail
                    id='recommended-for-you'
                    title='Recommended for You'
                    subtitle='Top rated titles based on server viewer favorites'
                    items={recommendedData}
                    variant='poster'
                    isLoading={isRecommendedLoading}
                />
            )}

            {/* 7. Collections & Boxsets (Spec 42: wide cards) */}
            {(isCollectionsLoading || (collectionsData && collectionsData.length > 0)) && (
                <KhyloContentRail
                    id='collections'
                    title='Curated Franchises &amp; Collections'
                    subtitle='Series and boxset anthologies'
                    items={collectionsData}
                    variant='collection'
                    isLoading={isCollectionsLoading}
                />
            )}
        </div>
    );
};
