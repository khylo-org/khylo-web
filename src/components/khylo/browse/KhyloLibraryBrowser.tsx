import React, { useState, useMemo, useRef, useEffect, type FC } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

import { CollectionType } from '@khylo/sdk/lib/generated-client/models/collection-type';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getShowApi } from '@khylo/sdk/lib/utils/api/show-api';

import { useApi } from 'hooks/useApi';
import { KhyloHero } from '../home/KhyloHero';
import { KhyloContentRail } from '../media/KhyloContentRail';
import { KhyloMediaCard } from '../media/KhyloMediaCard';
import { KhyloSkeleton } from '../ui/KhyloSkeleton';
import { KhyloButton } from '../ui/KhyloButton';
import { KhyloCollectionDialog } from '../collections/KhyloCollectionDialog';
import { COLLECTION_QUERY_KEYS, deleteCollection } from '../collections/collectionsApi';
import ConfirmDialog from 'components/ConfirmDialog';
import { getItemImageUrl, getHiddenContinueItemIds, collapseBookParts, isEbookMediaItem } from '../media/mediaUtils';
import './KhyloLibraryBrowser.scss';

export interface KhyloLibraryBrowserProps {
    type: CollectionType;
    parentId?: string | null;
    titleOverride?: string;
}

type SortOption = 'recent' | 'title' | 'release' | 'rating';

const BROWSE_ITEM_FIELDS = [
    ItemFields.PrimaryImageAspectRatio,
    ItemFields.Overview,
    ItemFields.Genres,
    ItemFields.ChildCount,
    ItemFields.CumulativeRunTimeTicks,
    ItemFields.Taglines,
    ItemFields.Width,
    ItemFields.Height,
    ItemFields.CanDelete
];

// Cast lists are big; only book pages need them (to find authors and narrators)
const BOOK_BROWSE_ITEM_FIELDS = [ ...BROWSE_ITEM_FIELDS, ItemFields.People ];

const GENRE_ACCENTS: Record<string, { color: string; glow: string; gradient: string }> = {
    'Action & Adventure': {
        color: '#FF4E50',
        glow: 'rgba(255, 78, 80, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(255, 78, 80, 0.5) 0%, rgba(249, 212, 35, 0.2) 100%)'
    },
    'Action': {
        color: '#FF4E50',
        glow: 'rgba(255, 78, 80, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(255, 78, 80, 0.5) 0%, rgba(249, 212, 35, 0.2) 100%)'
    },
    'Adventure': {
        color: '#F9D423',
        glow: 'rgba(249, 212, 35, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(249, 212, 35, 0.45) 0%, rgba(255, 78, 80, 0.2) 100%)'
    },
    'Animation': {
        color: '#FF0844',
        glow: 'rgba(255, 8, 68, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(255, 8, 68, 0.45) 0%, rgba(255, 177, 153, 0.2) 100%)'
    },
    'Comedy': {
        color: '#F9D423',
        glow: 'rgba(249, 212, 35, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(249, 212, 35, 0.45) 0%, rgba(255, 126, 95, 0.2) 100%)'
    },
    'Crime': {
        color: '#0BA360',
        glow: 'rgba(11, 163, 96, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(11, 163, 96, 0.45) 0%, rgba(59, 130, 246, 0.2) 100%)'
    },
    'Documentary': {
        color: '#11998E',
        glow: 'rgba(17, 153, 142, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(17, 153, 142, 0.45) 0%, rgba(56, 239, 125, 0.2) 100%)'
    },
    'Drama': {
        color: '#6A11CB',
        glow: 'rgba(106, 17, 203, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(106, 17, 203, 0.45) 0%, rgba(37, 117, 252, 0.2) 100%)'
    },
    'Family': {
        color: '#38EF7D',
        glow: 'rgba(56, 239, 125, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(56, 239, 125, 0.4) 0%, rgba(17, 153, 142, 0.2) 100%)'
    },
    'Fantasy': {
        color: '#B721FF',
        glow: 'rgba(183, 33, 255, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(183, 33, 255, 0.45) 0%, rgba(33, 212, 253, 0.2) 100%)'
    },
    'Horror': {
        color: '#E50914',
        glow: 'rgba(229, 9, 20, 0.45)',
        gradient: 'linear-gradient(135deg, rgba(229, 9, 20, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%)'
    },
    'Mystery': {
        color: '#8A2387',
        glow: 'rgba(138, 35, 135, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(138, 35, 135, 0.45) 0%, rgba(233, 64, 87, 0.2) 100%)'
    },
    'Reality': {
        color: '#F857A6',
        glow: 'rgba(248, 87, 166, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(248, 87, 166, 0.45) 0%, rgba(255, 88, 88, 0.2) 100%)'
    },
    'Romance': {
        color: '#FF416C',
        glow: 'rgba(255, 65, 108, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(255, 65, 108, 0.45) 0%, rgba(255, 75, 43, 0.2) 100%)'
    },
    'Sci-Fi & Fantasy': {
        color: '#00C9FF',
        glow: 'rgba(0, 201, 255, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(0, 201, 255, 0.45) 0%, rgba(146, 254, 157, 0.2) 100%)'
    },
    'Science Fiction': {
        color: '#00C9FF',
        glow: 'rgba(0, 201, 255, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(0, 201, 255, 0.45) 0%, rgba(146, 254, 157, 0.2) 100%)'
    },
    'Thriller': {
        color: '#FF5E3A',
        glow: 'rgba(255, 94, 58, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(255, 94, 58, 0.45) 0%, rgba(255, 42, 104, 0.2) 100%)'
    },
    'Western': {
        color: '#E65C00',
        glow: 'rgba(230, 92, 0, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(230, 92, 0, 0.5) 0%, rgba(249, 212, 35, 0.2) 100%)'
    },
    'War & Politics': {
        color: '#4B6CB7',
        glow: 'rgba(75, 108, 183, 0.4)',
        gradient: 'linear-gradient(135deg, rgba(75, 108, 183, 0.45) 0%, rgba(24, 40, 72, 0.3) 100%)'
    }
};

const DEFAULT_GENRE_ACCENT = {
    color: '#D97732',
    glow: 'rgba(217, 119, 50, 0.4)',
    gradient: 'linear-gradient(135deg, rgba(217, 119, 50, 0.45) 0%, rgba(18, 19, 20, 0.6) 100%)'
};

export const KhyloLibraryBrowser: FC<KhyloLibraryBrowserProps> = ({
    type,
    parentId,
    titleOverride
}) => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    // The collection waiting on "Delete?" confirmation
    const [ collectionToDelete, setCollectionToDelete ] = useState<BaseItemDto | null>(null);
    const userId = user?.Id;

    const [ selectedGenre, setSelectedGenre ] = useState<string | null>(null);
    const [ sortOption, setSortOption ] = useState<SortOption>('recent');
    const [ viewMode, setViewMode ] = useState<'curated' | 'grid'>('curated');
    const [ isNewCollectionOpen, setIsNewCollectionOpen ] = useState(false);
    const navigate = useNavigate();
    const [ isGenreDropdownOpen, setIsGenreDropdownOpen ] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const [ canCategoryScrollLeft, setCanCategoryScrollLeft ] = useState(false);
    const [ canCategoryScrollRight, setCanCategoryScrollRight ] = useState(false);
    const [ isCategoryHovered, setIsCategoryHovered ] = useState(false);

    const [ hiddenContinueIds, setHiddenContinueIds ] = useState<Set<string>>(() => getHiddenContinueItemIds());

    useEffect(() => {
        const handleHiddenUpdate = () => {
            setHiddenContinueIds(getHiddenContinueItemIds());
        };
        window.addEventListener('khylo-continue-watching-updated', handleHiddenUpdate);
        return () => window.removeEventListener('khylo-continue-watching-updated', handleHiddenUpdate);
    }, []);

    // Close genre dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsGenreDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 0. Fetch Library info by parentId to dynamically get actual library title and category
    const { data: libraryInfo } = useQuery({
        queryKey: ['KhyloLibraryInfo', parentId, userId],
        queryFn: async () => {
            if (!api || !parentId) return null;
            try {
                const res = await getLibraryApi(api).getItem({
                    itemId: parentId,
                    userId: userId || undefined
                });
                return res.data;
            } catch {
                return null;
            }
        },
        enabled: Boolean(api && parentId)
    });

    const libName = libraryInfo?.Name || '';
    const libNameLower = libName.toLowerCase();
    const libCollectionType = String(libraryInfo?.CollectionType || '').toLowerCase();
    const typeStr = String(type || '').toLowerCase();

    // The library's own type decides how it's shown; the page it was opened from only fills in until it's known
    const domain = libCollectionType || typeStr;
    const looksLiterary = domain === 'books' || domain === 'unknown' || domain === '';

    const isAudiobooks = domain === 'audiobooks'
        || (looksLiterary && (libNameLower.includes('audiobook') || libNameLower.includes('audio book')));

    const isMovies = domain === 'movies';
    const isShows = domain === 'tvshows';
    const isCollections = domain === 'boxsets';
    const isPlaylists = domain === 'playlists';
    const isMusic = domain === 'music';
    const isComics = domain === 'comics' || (looksLiterary && (libNameLower.includes('comic') || libNameLower.includes('manga')));
    const isPodcasts = domain === 'podcasts';
    const isBooks = domain === 'books' && !isAudiobooks && !isComics;

    const isLiterature = isAudiobooks || isBooks || isComics;
    const isEbooks = isBooks && !libNameLower.includes('comic');
    const isMusicVideos = domain === 'musicvideos';
    const isHomevideos = domain === 'homevideos';
    const isPhotos = domain === 'photos';
    const isPhotosDomain = isPhotos;

    const defaultTitle = isMovies
        ? 'Movies'
        : isShows
            ? 'Television'
            : isMusic
                ? 'Music'
                : isAudiobooks
                    ? 'Audiobooks'
                    : isComics
                        ? 'Comics & Manga'
                        : isPodcasts
                            ? 'Podcasts'
                            : isBooks
                            ? 'Books & Ebooks'
                            : isMusicVideos
                                ? 'Music Videos'
                                : isHomevideos
                                    ? 'Home Videos'
                                    : isPhotosDomain
                                        ? 'Photos & RAW'
                                        : isCollections
                                            ? 'Collections'
                                            : isPlaylists
                                                ? 'Playlists'
                                                : 'Library';

    const pageTitle = titleOverride || libName || defaultTitle;

    const cardVariant = isCollections ? 'collection'
        : (isPlaylists || isMusic || isPodcasts) ? 'square'
        : (isBooks || isAudiobooks || isEbooks || isComics || isLiterature) ? 'book'
        : (isMusicVideos || isHomevideos) ? 'continue'
        : isPhotosDomain ? 'photo'
        : 'poster';

    const skeletonRatio = isCollections ? 'wide'
        : (isPlaylists || isMusic || isPodcasts) ? '1:1'
        : (isBooks || isAudiobooks || isEbooks || isComics || isLiterature) ? '2:3'
        : (isMusicVideos || isHomevideos || isPhotosDomain) ? '16:9'
        : '2:3';

    // 1. Fetch All Items in this Library (to extract genres directly from metadata and power discovery rails)
    const { data: allItemsData, isLoading: isAllItemsLoading } = useQuery({
        queryKey: ['KhyloLibraryAllItems', type, parentId, userId, libCollectionType],
        queryFn: async () => {
            if (!api) return [];
            const includeItemTypes = isMovies
                ? [BaseItemKind.Movie]
                : isShows
                    ? [BaseItemKind.Series]
                    : isMusic
                        ? [BaseItemKind.MusicAlbum, BaseItemKind.MusicArtist]
                        : isAudiobooks
                            ? [BaseItemKind.AudioBook, BaseItemKind.Book, BaseItemKind.Audio]
                            : isComics
                                // Comic archives are their own type on the server
                                ? ['Comic' as BaseItemKind, BaseItemKind.Book]
                                : isPodcasts
                                    ? ['Podcast' as BaseItemKind]
                                    : isBooks
                                ? [BaseItemKind.Book, BaseItemKind.AudioBook]
                                : isMusicVideos
                                    ? [BaseItemKind.MusicVideo]
                                    : isHomevideos
                                        ? [BaseItemKind.Video, BaseItemKind.Photo]
                                        : isPhotosDomain
                                            ? [BaseItemKind.Photo]
                                            : isCollections
                                                ? [BaseItemKind.BoxSet]
                                                : isPlaylists
                                                    ? [BaseItemKind.Playlist]
                                                    : undefined;

            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                parentId: parentId || undefined,
                includeItemTypes,
                recursive: true,
                fields: (isBooks || isAudiobooks) ? BOOK_BROWSE_ITEM_FIELDS : BROWSE_ITEM_FIELDS,
                // One of each image is all the cards and hero use
                imageTypeLimit: 1
            });
            const rawItems = (res.data.Items || []).filter(item => {
                const typeStr = String(item.Type);
                return typeStr !== 'Folder' && typeStr !== 'CollectionFolder' && typeStr !== 'UserView';
            });
            if (isBooks || isAudiobooks || isEbooks || isComics || isLiterature) {
                return collapseBookParts(rawItems);
            }
            return rawItems;
        },
        enabled: Boolean(api)
    });

    // 2. Extract Categories DIRECTLY from the items' metadata
    const { availableGenres, genreItemsMap } = useMemo(() => {
        // Collections are hand-picked groups (a franchise, a director, ...), not a catalog to
        // browse by genre: genre tiles, filters and rails would just repeat the same few collections
        if (isCollections) {
            return { availableGenres: [] as string[], genreItemsMap: new Map<string, BaseItemDto[]>() };
        }

        const rawItems = allItemsData || [];
        const items = (isBooks || isAudiobooks || isEbooks || isComics || isLiterature)
            ? collapseBookParts(rawItems)
            : rawItems;
        const countMap = new Map<string, number>();
        const itemMap = new Map<string, BaseItemDto[]>();

        for (const item of items) {
            if (item.Genres && Array.isArray(item.Genres)) {
                for (const g of item.Genres) {
                    const cleanG = g.trim();
                    if (!cleanG) continue;
                    countMap.set(cleanG, (countMap.get(cleanG) || 0) + 1);
                    if (!itemMap.has(cleanG)) {
                        itemMap.set(cleanG, []);
                    }
                    itemMap.get(cleanG)!.push(item);
                }
            }
        }

        // Sort genres by frequency (most titles first)
        const sortedGenres = Array.from(countMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([genre]) => genre);

        return {
            availableGenres: sortedGenres,
            genreItemsMap: itemMap
        };
    }, [allItemsData, isCollections, isBooks, isAudiobooks, isEbooks, isComics, isLiterature]);

    // 3. Dedicated Category Tiles for the "Browse by Category" area
    const categoryTiles = useMemo(() => {
        return availableGenres.map(genre => {
            const items = genreItemsMap.get(genre) || [];
            const sampleItem = items.find(item =>
                (item.BackdropImageTags && item.BackdropImageTags.length > 0) ||
                (item.ImageTags?.Thumb) ||
                item.ParentBackdropItemId
            ) || items[0];

            return {
                genre,
                count: items.length,
                sampleItem
            };
        });
    }, [availableGenres, genreItemsMap]);

    const checkCategoryScroll = () => {
        const el = categoryScrollRef.current;
        if (!el) return;
        setCanCategoryScrollLeft(el.scrollLeft > 10);
        setCanCategoryScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };

    useEffect(() => {
        checkCategoryScroll();
        window.addEventListener('resize', checkCategoryScroll);
        return () => window.removeEventListener('resize', checkCategoryScroll);
    }, [categoryTiles]);

    const scrollCategory = (direction: 'left' | 'right') => {
        const el = categoryScrollRef.current;
        if (!el) return;
        const scrollAmount = el.clientWidth * 0.75;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // 4. Continue Watching scoped to this media type (Netflix/Hulu style)
    const { data: libraryContinueData, isLoading: isContinueLoading } = useQuery({
        queryKey: ['KhyloLibraryContinue', type, parentId, libCollectionType, userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            if (isShows) {
                const [resumeRes, nextUpRes] = await Promise.all([
                    getLibraryApi(api).getResumeItems({
                        userId,
                        limit: 20,
                        mediaTypes: ['Video'],
                        fields: BROWSE_ITEM_FIELDS
                    }).catch(() => ({ data: { Items: [] } })),
                    getShowApi(api).getNextUp({
                        userId,
                        limit: 20,
                        fields: BROWSE_ITEM_FIELDS
                    }).catch(() => ({ data: { Items: [] } }))
                ]);

                const resumeEpisodes = (resumeRes.data.Items || []).filter(item => item.Type === BaseItemKind.Episode);
                const nextUpEpisodes = (nextUpRes.data.Items || []).filter(item => item.Type === BaseItemKind.Episode);

                const combined: BaseItemDto[] = [];
                const seenSeries = new Set<string>();

                for (const ep of resumeEpisodes) {
                    const seriesKey = ep.SeriesId || ep.SeriesName;
                    if (seriesKey && seenSeries.has(seriesKey)) continue;
                    combined.push(ep);
                    if (seriesKey) seenSeries.add(seriesKey);
                }

                for (const ep of nextUpEpisodes) {
                    const seriesKey = ep.SeriesId || ep.SeriesName;
                    if (seriesKey && seenSeries.has(seriesKey)) continue;
                    combined.push(ep);
                    if (seriesKey) seenSeries.add(seriesKey);
                }

                return combined.slice(0, 12);
            }
            if (isMovies || isMusicVideos || isHomevideos) {
                const res = await getLibraryApi(api).getResumeItems({
                    userId,
                    limit: 12,
                    mediaTypes: ['Video'],
                    fields: BROWSE_ITEM_FIELDS
                });
                return (res.data.Items || []).filter(item =>
                    isMovies ? item.Type === BaseItemKind.Movie :
                    isMusicVideos ? item.Type === BaseItemKind.MusicVideo :
                    item.Type === BaseItemKind.Video
                );
            }
            if (isAudiobooks) {
                // Only this library's audiobooks: an ebook you're reading is not something you're listening to
                const res = await getLibraryApi(api).getResumeItems({
                    userId,
                    parentId: parentId || undefined,
                    limit: 12,
                    mediaTypes: ['Audio'],
                    fields: [ ...BROWSE_ITEM_FIELDS, ItemFields.Path ]
                });
                return collapseBookParts((res.data.Items || []).filter(item => !isEbookMediaItem(item)));
            }
            if (isMusic || isBooks) {
                const res = await getLibraryApi(api).getResumeItems({
                    userId,
                    parentId: parentId || undefined,
                    limit: 12,
                    mediaTypes: [isMusic ? 'Audio' : 'Book'],
                    fields: BROWSE_ITEM_FIELDS
                });
                return isBooks ? collapseBookParts(res.data.Items || []) : (res.data.Items || []);
            }
            return [];
        },
        enabled: Boolean(api && userId && (isShows || isMovies || isMusic || isBooks || isMusicVideos || isHomevideos || isAudiobooks || isEbooks || isComics))
    });

    const filteredContinueData = useMemo(() => {
        if (!libraryContinueData) return [];
        return libraryContinueData.filter(item => {
            if (!item.Id) return false;
            if (hiddenContinueIds.has(item.Id)) return false;
            if (item.SeriesId && hiddenContinueIds.has(item.SeriesId)) return false;
            return true;
        });
    }, [libraryContinueData, hiddenContinueIds]);

    // 5. Hero Billboard for this library (Featured Spotlight)
    const heroSpotlightItems = useMemo(() => {
        const items = allItemsData || [];
        if (items.length === 0) return [];

        const withBackdrops = items.filter(item =>
            (item.BackdropImageTags && item.BackdropImageTags.length > 0) ||
            item.ParentBackdropItemId ||
            item.ImageTags?.Thumb
        );
        if (withBackdrops.length > 0) {
            return withBackdrops.slice(0, 5);
        }
        return items.slice(0, 5);
    }, [allItemsData]);

    // 6. Recently Added in this Library
    const recentlyAddedItems = useMemo(() => {
        if (!allItemsData) return [];
        const pool = (isBooks || isAudiobooks || isEbooks || isComics || isLiterature)
            ? collapseBookParts(allItemsData)
            : allItemsData;
        return [...pool]
            .sort((a, b) => {
                const dateA = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
                const dateB = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 16);
    }, [allItemsData, isBooks, isAudiobooks, isEbooks, isComics, isLiterature]);

    // 7. Top Rated in this Library
    const topRatedItems = useMemo(() => {
        if (!allItemsData) return [];
        const pool = (isBooks || isAudiobooks || isEbooks || isComics || isLiterature)
            ? collapseBookParts(allItemsData)
            : allItemsData;
        return [...pool]
            .filter(item => item.CommunityRating != null && item.CommunityRating > 0)
            .sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0))
            .slice(0, 16);
    }, [allItemsData, isBooks, isAudiobooks, isEbooks, isComics, isLiterature]);

    // 8. Dynamic Curated Rails for Top Metadata Genres
    const topGenreRails = useMemo(() => {
        const topGenres = availableGenres.slice(0, 4);
        return topGenres.map(genre => {
            const raw = genreItemsMap.get(genre) || [];
            const items = (isBooks || isAudiobooks || isEbooks || isComics || isLiterature)
                ? collapseBookParts(raw)
                : raw;
            return {
                genre,
                items
            };
        }).filter(g => g.items.length > 0);
    }, [availableGenres, genreItemsMap, isBooks, isAudiobooks, isEbooks, isComics, isLiterature]);

    // 9. Grid items (for Selected Genre or Full Catalog Grid mode)
    const filteredGridItems = useMemo(() => {
        let pool = allItemsData || [];
        if (selectedGenre) {
            pool = genreItemsMap.get(selectedGenre) || [];
        }

        if (isBooks || isAudiobooks || isEbooks || isComics || isLiterature) {
            pool = collapseBookParts(pool);
        }

        const sorted = [...pool];
        if (sortOption === 'title') {
            sorted.sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));
        } else if (sortOption === 'release') {
            sorted.sort((a, b) => {
                const dateA = a.PremiereDate ? new Date(a.PremiereDate).getTime() : (a.ProductionYear || 0);
                const dateB = b.PremiereDate ? new Date(b.PremiereDate).getTime() : (b.ProductionYear || 0);
                return (dateB as number) - (dateA as number);
            });
        } else if (sortOption === 'rating') {
            sorted.sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0));
        } else {
            // 'recent'
            sorted.sort((a, b) => {
                const dateA = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
                const dateB = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
                return dateB - dateA;
            });
        }
        return sorted;
    }, [allItemsData, selectedGenre, genreItemsMap, sortOption, isBooks, isAudiobooks, isEbooks, isComics, isLiterature]);

    // Literature / Audiobooks authors extraction
    const topAuthors = useMemo(() => {
        if ((!isBooks && !isAudiobooks) || !allItemsData) return [];
        const authorMap = new Map<string, BaseItemDto[]>();
        for (const item of allItemsData) {
            const authorList: string[] = [];
            if (item.Artists && Array.isArray(item.Artists)) {
                authorList.push(...item.Artists);
            }
            if (item.AlbumArtist) {
                authorList.push(item.AlbumArtist);
            }
            if (item.People && Array.isArray(item.People)) {
                for (const p of item.People) {
                    if (p.Name && (p.Type === 'Writer' || p.Type === 'Author' || p.Role?.toLowerCase().includes('narrat') || p.Role?.toLowerCase().includes('author'))) {
                        authorList.push(p.Name);
                    }
                }
            }
            for (const a of authorList) {
                const clean = a.trim();
                if (!clean) continue;
                if (!authorMap.has(clean)) {
                    authorMap.set(clean, []);
                }
                authorMap.get(clean)!.push(item);
            }
        }
        return Array.from(authorMap.entries())
            .filter(([_, list]) => list.length >= 1)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5);
    }, [isBooks, allItemsData]);

    const heroContextTag = isAudiobooks
        ? 'Featured Audiobook'
        : isComics
            ? 'Featured Issue'
            : (isBooks || isEbooks)
                ? 'Featured Book'
                : isShows
                    ? 'Featured Show'
                    : isMusic
                        ? 'Featured Album'
                        : isMusicVideos
                            ? 'Featured Music Video'
                            : isPhotosDomain
                                ? 'Featured Photo'
                                : isMovies
                                        ? 'Featured Movie'
                                        : 'Featured Title';

    const continueTitle = isAudiobooks
        ? 'Continue Listening'
        : (isBooks || isEbooks || isComics)
            ? 'Continue Reading'
            : isShows
                ? 'Continue Watching Shows'
                : isMusic
                    ? 'Continue Listening'
                    : 'Continue Watching';

    const continueSubtitle = isAudiobooks
        ? 'Resume your audiobook where you left off'
        : (isBooks || isEbooks || isComics)
            ? 'Pick up where you left off in your book'
            : isShows
                ? 'Jump back into your next episode'
                : isMusic
                    ? 'Resume where you left off'
                    : 'Pick up where you left off';

    const recentlyAddedTitle = isAudiobooks
        ? 'Recently Added Audiobooks'
        : isComics
            ? 'Recently Added Comics'
            : (isBooks || isEbooks)
                ? 'Recently Added Books'
                : isShows
                    ? 'Recently Added TV Shows'
                    : isMusicVideos
                        ? 'Recently Added Music Videos'
                        : isPhotosDomain
                            ? 'Recently Added Photos'
                            : isMovies
                                    ? 'Recently Added Movies'
                                    : `Recently Added ${pageTitle}`;

    const topRatedTitle = isAudiobooks
        ? 'Top Rated Audiobooks'
        : isComics
            ? 'Top Rated Comics'
            : (isBooks || isEbooks)
                ? 'Top Rated Books'
                : isShows
                    ? 'Top Rated Shows'
                    : isMusicVideos
                        ? 'Top Rated Music Videos'
                        : isMovies
                                ? 'Top Rated Movies'
                                : `Top Rated ${pageTitle}`;

    // Playlists and collections are things people made themselves: show them all in a grid
    // rather than a discovery hub of genre rails
    const hasCuratedHub = !isPlaylists && !isCollections;
    const showBillboard = (isMovies || isShows) && heroSpotlightItems.length > 0;
    const isCuratedDiscovery = hasCuratedHub && selectedGenre === null && viewMode === 'curated';

    return (
        <div className='khylo-browse'>
            {/* Standard Subnav: ONLY shown in Grid mode or when a genre is selected */}
            {!isCuratedDiscovery && (
                <div className='khylo-browse__subnav'>
                    <div className='khylo-browse__subnav-left'>
                        <h1 className='khylo-browse__subnav-title'>
                            {selectedGenre ? (
                                <span className='khylo-browse__breadcrumb'>
                                    <button
                                        type='button'
                                        className='khylo-browse__breadcrumb-parent'
                                        onClick={() => {
                                            setSelectedGenre(null);
                                            setViewMode('curated');
                                        }}
                                    >
                                        {pageTitle}
                                    </button>
                                    <span className='khylo-browse__breadcrumb-sep'>/</span>
                                    <span className='khylo-browse__breadcrumb-current'>{selectedGenre}</span>
                                </span>
                            ) : (
                                pageTitle
                            )}
                        </h1>

                        {/* Netflix-style subtle 'Genres ▾' dropdown */}
                        {hasCuratedHub && availableGenres.length > 0 && (
                            <div className='khylo-browse__genre-dropdown-wrap' ref={dropdownRef}>
                                <button
                                    type='button'
                                    className={classNames('khylo-browse__genre-dropdown-trigger', {
                                        'khylo-browse__genre-dropdown-trigger--active': selectedGenre !== null
                                    })}
                                    onClick={() => setIsGenreDropdownOpen(prev => !prev)}
                                    aria-expanded={isGenreDropdownOpen}
                                >
                                    <span>{selectedGenre ? selectedGenre : 'Genres'}</span>
                                    <KeyboardArrowDownIcon
                                        className={classNames('khylo-browse__dropdown-arrow', {
                                            'khylo-browse__dropdown-arrow--open': isGenreDropdownOpen
                                        })}
                                    />
                                </button>

                                {isGenreDropdownOpen && (
                                    <div className='khylo-browse__genre-menu'>
                                        <div className='khylo-browse__genre-menu-header'>
                                            <span>Select Genre</span>
                                            {selectedGenre && (
                                                <button
                                                    type='button'
                                                    className='khylo-browse__genre-menu-clear'
                                                    onClick={() => {
                                                        setSelectedGenre(null);
                                                        setViewMode('curated');
                                                        setIsGenreDropdownOpen(false);
                                                    }}
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                        <div className='khylo-browse__genre-menu-grid'>
                                            <button
                                                type='button'
                                                className={classNames('khylo-browse__genre-menu-item', {
                                                    'khylo-browse__genre-menu-item--active': selectedGenre === null
                                                })}
                                                onClick={() => {
                                                    setSelectedGenre(null);
                                                    setViewMode('curated');
                                                    setIsGenreDropdownOpen(false);
                                                }}
                                            >
                                                All {pageTitle}
                                            </button>
                                            {availableGenres.map(genre => (
                                                <button
                                                    key={genre}
                                                    type='button'
                                                    className={classNames('khylo-browse__genre-menu-item', {
                                                        'khylo-browse__genre-menu-item--active': selectedGenre === genre
                                                    })}
                                                    onClick={() => {
                                                        setSelectedGenre(genre);
                                                        setViewMode('grid');
                                                        setIsGenreDropdownOpen(false);
                                                    }}
                                                >
                                                    <span>{genre}</span>
                                                    <span className='khylo-browse__genre-menu-count'>
                                                        {genreItemsMap.get(genre)?.length || 0}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sub-Nav Controls Right */}
                    <div className='khylo-browse__subnav-right'>
                        {isCollections && (
                            <KhyloButton variant='primary' size='sm' icon={<AddIcon />} onClick={() => setIsNewCollectionOpen(true)}>
                                New collection
                            </KhyloButton>
                        )}

                        <div className='khylo-browse__sort-wrap'>
                            <span className='khylo-browse__sort-label'>Sort:</span>
                            <select
                                className='khylo-browse__sort-select'
                                value={sortOption}
                                onChange={e => setSortOption(e.target.value as SortOption)}
                                aria-label='Sort media by'
                            >
                                <option value='recent'>Recently Added</option>
                                <option value='title'>Title (A–Z)</option>
                                <option value='release'>Release Date</option>
                                <option value='rating'>Top Rated</option>
                            </select>
                        </div>

                        {hasCuratedHub && (
                            <button
                                type='button'
                                className='khylo-browse__back-to-hub-btn'
                                onClick={() => {
                                    setSelectedGenre(null);
                                    setViewMode('curated');
                                }}
                            >
                                <ArrowBackIcon />
                                <span>Curated View</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            {isAllItemsLoading ? (
                <div className='khylo-browse__content'>
                    <div className='khylo-browse__grid'>
                        {Array.from({ length: 18 }).map((_, idx) => (
                            <div key={idx} className='khylo-browse__card-wrapper'>
                                <KhyloSkeleton variant='card' aspectRatio={skeletonRatio} />
                                <div style={{ marginTop: 10 }}>
                                    <KhyloSkeleton variant='text' width='85%' />
                                    <KhyloSkeleton variant='text' width='45%' />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : isCuratedDiscovery ? (
                /* 1. CURATED DISCOVERY HUB (Netflix / Hulu Style) */
                <div className='khylo-browse__discovery-hub'>
                    {/* Floating Glass Subnav Overlay (Overlays Top of Hero) */}
                    <div className={classNames('khylo-browse__subnav', { 'khylo-browse__subnav--overlay': showBillboard })}>
                        <div className='khylo-browse__subnav-left'>
                            <h1 className='khylo-browse__subnav-title'>{pageTitle}</h1>

                            {/* Netflix-style subtle 'Genres ▾' dropdown */}
                            {availableGenres.length > 0 && (
                                <div className='khylo-browse__genre-dropdown-wrap' ref={dropdownRef}>
                                    <button
                                        type='button'
                                        className={classNames('khylo-browse__genre-dropdown-trigger', {
                                            'khylo-browse__genre-dropdown-trigger--active': selectedGenre !== null
                                        })}
                                        onClick={() => setIsGenreDropdownOpen(prev => !prev)}
                                        aria-expanded={isGenreDropdownOpen}
                                    >
                                        <span>{selectedGenre ? selectedGenre : 'Genres'}</span>
                                        <KeyboardArrowDownIcon
                                            className={classNames('khylo-browse__dropdown-arrow', {
                                                'khylo-browse__dropdown-arrow--open': isGenreDropdownOpen
                                            })}
                                        />
                                    </button>

                                    {isGenreDropdownOpen && (
                                        <div className='khylo-browse__genre-menu'>
                                            <div className='khylo-browse__genre-menu-header'>
                                                <span>Select Genre</span>
                                            </div>
                                            <div className='khylo-browse__genre-menu-grid'>
                                                <button
                                                    type='button'
                                                    className='khylo-browse__genre-menu-item khylo-browse__genre-menu-item--active'
                                                    onClick={() => {
                                                        setSelectedGenre(null);
                                                        setViewMode('curated');
                                                        setIsGenreDropdownOpen(false);
                                                    }}
                                                >
                                                    All {pageTitle}
                                                </button>
                                                {availableGenres.map(genre => (
                                                    <button
                                                        key={genre}
                                                        type='button'
                                                        className='khylo-browse__genre-menu-item'
                                                        onClick={() => {
                                                            setSelectedGenre(genre);
                                                            setViewMode('grid');
                                                            setIsGenreDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span>{genre}</span>
                                                        <span className='khylo-browse__genre-menu-count'>
                                                            {genreItemsMap.get(genre)?.length || 0}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hero Billboard Spotlight: movies and TV only; every other library gets a compact header */}
                    {showBillboard && (
                        <KhyloHero
                            items={heroSpotlightItems}
                            contextTag={heroContextTag}
                            isLoading={false}
                        />
                    )}

                    {/* Continue Watching for this Library */}
                    {filteredContinueData && filteredContinueData.length > 0 && (
                        <KhyloContentRail
                            id='browse-continue-watching'
                            title={continueTitle}
                            subtitle={continueSubtitle}
                            items={filteredContinueData}
                            variant={isMusic ? 'square' : (isBooks || isAudiobooks || isEbooks || isComics) ? 'book' : 'continue'}
                            isLoading={isContinueLoading}
                            onRemoveFromContinue={(removedItem, mode) => {
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
                            }}
                        />
                    )}

                    {/* Recently Added in this Library */}
                    {recentlyAddedItems.length > 0 && (
                        <KhyloContentRail
                            id='browse-recently-added'
                            title={recentlyAddedTitle}
                            subtitle={`Fresh titles added to this ${pageTitle.toLowerCase()} collection`}
                            items={recentlyAddedItems}
                            variant={cardVariant}
                        />
                    )}

                    {/* Top Rated in this Library */}
                    {topRatedItems.length > 0 && (
                        <KhyloContentRail
                            id='browse-top-rated'
                            title={topRatedTitle}
                            subtitle='Critically acclaimed titles on your server'
                            items={topRatedItems}
                            variant={cardVariant}
                        />
                    )}

                    {/* Authors / Narrators Rail (for Books, Audiobooks, Comics) */}
                    {topAuthors && topAuthors.length > 0 && topAuthors.map(([author, authorItems]) => (
                        <KhyloContentRail
                            key={author}
                            id={`browse-author-${author.toLowerCase().replace(/\s+/g, '-')}`}
                            title={`More by ${author}`}
                            subtitle={isAudiobooks ? `Audiobooks narrated or written by ${author}` : `Works published by ${author}`}
                            items={authorItems}
                            variant='book'
                        />
                    ))}

                    {/* DEDICATED "BROWSE BY CATEGORY" HORIZONTAL RAIL (Hulu / Netflix Collection Shelf) */}
                    {categoryTiles.length > 0 && (
                        <section
                            className='khylo-browse__categories-section'
                            onMouseEnter={() => setIsCategoryHovered(true)}
                            onMouseLeave={() => setIsCategoryHovered(false)}
                            aria-label='Browse by Category'
                        >
                            <div className='khylo-browse__section-header'>
                                <h2 className='khylo-browse__section-title'>Browse by Category</h2>
                                <p className='khylo-browse__section-subtitle'>
                                    Explore {pageTitle.toLowerCase()} across your server genres
                                </p>
                            </div>

                            <div className='khylo-browse__category-rail-viewport'>
                                {canCategoryScrollLeft && (
                                    <button
                                        type='button'
                                        className={classNames('khylo-browse__category-arrow khylo-browse__category-arrow--left', {
                                            'khylo-browse__category-arrow--visible': isCategoryHovered
                                        })}
                                        onClick={() => scrollCategory('left')}
                                        aria-label='Scroll categories left'
                                    >
                                        <ChevronLeftIcon />
                                    </button>
                                )}

                                {canCategoryScrollRight && (
                                    <button
                                        type='button'
                                        className={classNames('khylo-browse__category-arrow khylo-browse__category-arrow--right', {
                                            'khylo-browse__category-arrow--visible': isCategoryHovered
                                        })}
                                        onClick={() => scrollCategory('right')}
                                        aria-label='Scroll categories right'
                                    >
                                        <ChevronRightIcon />
                                    </button>
                                )}

                                <div
                                    className='khylo-browse__category-rail-track'
                                    ref={categoryScrollRef}
                                    onScroll={checkCategoryScroll}
                                >
                                    {categoryTiles.map(({ genre, count, sampleItem }) => {
                                        const accent = GENRE_ACCENTS[genre] || DEFAULT_GENRE_ACCENT;
                                        const backdrop = sampleItem
                                            ? (getItemImageUrl(api, sampleItem, 'backdrop', 600) || getItemImageUrl(api, sampleItem, 'primary', 400))
                                            : null;

                                        return (
                                            <div
                                                key={genre}
                                                className='khylo-category-card'
                                                style={{
                                                    '--genre-color': accent.color,
                                                    '--genre-glow': accent.glow,
                                                    '--genre-gradient': accent.gradient
                                                } as React.CSSProperties}
                                                onClick={() => {
                                                    setSelectedGenre(genre);
                                                    setViewMode('grid');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        setSelectedGenre(genre);
                                                        setViewMode('grid');
                                                    }
                                                }}
                                            >
                                                {backdrop && (
                                                    <img
                                                        src={backdrop}
                                                        alt={genre}
                                                        className='khylo-category-card__backdrop'
                                                        loading='lazy'
                                                    />
                                                )}
                                                <div className='khylo-category-card__tint' />
                                                <div className='khylo-category-card__gradient' />
                                                <div className='khylo-category-card__content'>
                                                    <span className='khylo-category-card__title'>{genre}</span>
                                                    <span className='khylo-category-card__count'>
                                                        {count} {count === 1 ? 'title' : 'titles'}
                                                    </span>
                                                </div>
                                                <div className='khylo-category-card__bar' />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Dynamic Metadata Genre Rails */}
                    {topGenreRails.map(({ genre, items }) => (
                        <KhyloContentRail
                            key={genre}
                            id={`browse-genre-${genre.toLowerCase().replace(/\s+/g, '-')}`}
                            title={`${genre} ${pageTitle}`}
                            subtitle={`Popular ${genre.toLowerCase()} titles in your library`}
                            items={items}
                            variant={cardVariant}
                            headerAction={
                                <button
                                    type='button'
                                    className='khylo-browse__see-all-btn'
                                    onClick={() => {
                                        setSelectedGenre(genre);
                                        setViewMode('grid');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                >
                                    See All &rsaquo;
                                </button>
                            }
                        />
                    ))}

                    {/* Bottom Prompt: Switch to Complete Catalog Grid */}
                    <div className='khylo-browse__catalog-banner'>
                        <div className='khylo-browse__catalog-banner-text'>
                            <h3 className='khylo-browse__catalog-banner-title'>Browse Complete Catalog</h3>
                            <p className='khylo-browse__catalog-banner-desc'>
                                Explore all {allItemsData?.length || 0} {pageTitle.toLowerCase()} arranged alphabetically with full sorting.
                            </p>
                        </div>
                        <KhyloButton
                            variant='secondary'
                            icon={<GridViewIcon />}
                            onClick={() => {
                                setViewMode('grid');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            View All Titles (A–Z)
                        </KhyloButton>
                    </div>
                </div>
            ) : (
                /* 2. CURATED POSTER GRID (For Selected Genre, Collections, Playlists, or All Titles Grid mode) */
                <div className='khylo-browse__content'>
                    {selectedGenre && (
                        <div className='khylo-browse__active-filter-bar'>
                            <button
                                type='button'
                                className='khylo-browse__back-to-hub-btn'
                                onClick={() => {
                                    setSelectedGenre(null);
                                    setViewMode('curated');
                                }}
                            >
                                <ArrowBackIcon />
                                <span>Back to Featured Hub</span>
                            </button>
                            <span className='khylo-browse__filter-count'>
                                {filteredGridItems.length} {filteredGridItems.length === 1 ? 'Title' : 'Titles'}
                            </span>
                        </div>
                    )}

                    {filteredGridItems.length > 0 ? (
                        <div
                            className={classNames('khylo-browse__grid', {
                                'khylo-browse__grid--collection': isCollections,
                                'khylo-browse__grid--playlist': isPlaylists,
                                'khylo-browse__grid--music': isMusic,
                                'khylo-browse__grid--book': isBooks,
                                'khylo-browse__grid--photo': isPhotos || isHomevideos
                            })}
                        >
                            {filteredGridItems.map(item => (
                                <div key={item.Id} className='khylo-browse__card-wrapper'>
                                    <KhyloMediaCard
                                        item={item}
                                        variant={cardVariant}
                                        onDelete={isCollections ? setCollectionToDelete : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='khylo-browse__empty'>
                            <h3 className='khylo-browse__empty-title'>
                                {isPlaylists ? 'No Playlists Yet' :
                                 isCollections ? 'No Collections Yet' :
                                 isMusic ? 'No Music Found' :
                                 isAudiobooks ? 'No Audiobooks Found' :
                                 isComics ? 'No Comics Found' :
                                 isEbooks ? 'No Books Found' :
                                 isPhotosDomain ? 'No Photos Found' :
                                 'No Titles Found'}
                            </h3>
                            <p className='khylo-browse__empty-desc'>
                                {isPlaylists
                                    ? 'Create your first playlist to build your personal mixtape or marathon queue.'
                                    : isCollections
                                        ? 'Group movies and shows your way. Press New collection, or open any movie or show and press Add to collection. Only you see the collections you make.'
                                        : isMusic
                                            ? 'No songs, albums, or artists found in your music library.'
                                            : isAudiobooks
                                                ? 'No audiobooks found in your library. Add audio files or m4b books to get started.'
                                                : isComics
                                                    ? 'No comic books or manga issues found in this library.'
                                                    : isEbooks
                                                        ? 'No books or ebooks found in your library.'
                                                        : isPhotosDomain
                                                            ? 'No photos or raw images found in this library.'
                                                            : selectedGenre
                                                                    ? `No ${pageTitle.toLowerCase()} match the "${selectedGenre}" category.`
                                                                    : `No titles available in ${pageTitle}.`}
                            </p>
                            {selectedGenre && (
                                <KhyloButton
                                    variant='secondary'
                                    onClick={() => {
                                        setSelectedGenre(null);
                                        setViewMode('curated');
                                    }}
                                >
                                    Return to Featured Hub
                                </KhyloButton>
                            )}
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={collectionToDelete !== null}
                title='Delete collection'
                text={`Delete "${collectionToDelete?.Name ?? 'this collection'}"? The titles in it stay in your library.`}
                onCancel={() => setCollectionToDelete(null)}
                onConfirm={() => {
                    const target = collectionToDelete;
                    setCollectionToDelete(null);
                    if (!api || !target?.Id) return;
                    deleteCollection(api, target.Id)
                        .then(() => Promise.all(COLLECTION_QUERY_KEYS.map(key => queryClient.invalidateQueries({ queryKey: [key] }))))
                        .then(() => queryClient.invalidateQueries())
                        .catch(err => console.error('[Collections] delete failed', err));
                }}
                confirmButtonColor='error'
                confirmButtonText='Delete'
            />

            {isCollections && (
                <KhyloCollectionDialog
                    open={isNewCollectionOpen}
                    mode='create'
                    onClose={() => setIsNewCollectionOpen(false)}
                    onCreated={id => navigate(`/details?id=${id}`)}
                />
            )}
        </div>
    );
};
