import React, { useState, useMemo, useEffect, type FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';

// MUI Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AlbumIcon from '@mui/icons-material/Album';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getArtistApi } from '@khylo/sdk/lib/utils/api/artist-api';
import { getUserDataApi } from '@khylo/sdk/lib/utils/api/user-data-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { KhyloSkeleton } from '../ui/KhyloSkeleton';
import {
    getItemImageUrl,
    playMediaItem,
    formatTicksToTrackTime
} from '../media/mediaUtils';
import { useSetKhyloMusicMode } from '../shell/KhyloMusicModeContext';
import { type MusicTab } from './KhyloMusicSidebar';
import { KhyloMusicLayout } from './KhyloMusicLayout';
import { KhyloMusicPanel } from './KhyloMusicPanel';
import { KhyloAddToPlaylistButton } from './KhyloAddToPlaylistButton';
import { scrollMusicPanelToTop } from './musicItems';
import './KhyloMusicView.scss';

export interface KhyloMusicViewProps {
    parentId?: string | null;
}

type AlbumSortOption = 'recent' | 'release' | 'title' | 'artist';

const MUSIC_ITEM_FIELDS = [
    ItemFields.PrimaryImageAspectRatio,
    ItemFields.Overview,
    ItemFields.Genres,
    ItemFields.People,
    ItemFields.CumulativeRunTimeTicks,
    ItemFields.ChildCount
];

const CURATED_GENRE_PALETTE: string[] = [
    'linear-gradient(135deg, #BE123C 0%, #4C0519 100%)', // Rose Crimson
    'linear-gradient(135deg, #4338CA 0%, #1E1B4B 100%)', // Deep Indigo
    'linear-gradient(135deg, #047857 0%, #064E3B 100%)', // Emerald Forest
    'linear-gradient(135deg, #D97706 0%, #78350F 100%)', // Rich Amber
    'linear-gradient(135deg, #7C3AED 0%, #3B0764 100%)', // Violet Amethyst
    'linear-gradient(135deg, #0284C7 0%, #082F49 100%)', // Ocean Blue
    'linear-gradient(135deg, #BE185D 0%, #700735 100%)', // Vibrant Magenta
    'linear-gradient(135deg, #0F766E 0%, #134E4A 100%)', // Teal Lagoon
    'linear-gradient(135deg, #C2410C 0%, #7C2D12 100%)', // Burnt Orange
    'linear-gradient(135deg, #334155 0%, #0F172A 100%)', // Slate Obsidian
    'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)', // Royal Electric
    'linear-gradient(135deg, #B91C1C 0%, #450A0A 100%)' // Ruby Shadow
];

const getGenreGradient = (genre: string): string => {
    const lower = genre.toLowerCase();
    if (lower.includes('metal') || lower.includes('hard rock') || lower.includes('punk')) {
        return 'linear-gradient(135deg, #3B0764 0%, #1F1235 60%, #110726 100%)';
    }
    if (lower.includes('rock')) {
        return 'linear-gradient(135deg, #BE123C 0%, #4C0519 100%)';
    }
    if (lower.includes('hip-hop') || lower.includes('rap')) {
        return 'linear-gradient(135deg, #9333EA 0%, #4C1D95 100%)';
    }
    if (lower.includes('pop')) {
        return 'linear-gradient(135deg, #DB2777 0%, #5B082B 100%)';
    }
    if (lower.includes('electronic') || lower.includes('dance') || lower.includes('techno') || lower.includes('house') || lower.includes('edm')) {
        return 'linear-gradient(135deg, #0284C7 0%, #0369A1 50%, #082F49 100%)';
    }
    if (lower.includes('chill') || lower.includes('lounge') || lower.includes('trip-hop') || lower.includes('ambient')) {
        return 'linear-gradient(135deg, #0D9488 0%, #115E59 60%, #042F2E 100%)';
    }
    if (lower.includes('blues')) {
        return 'linear-gradient(135deg, #1D4ED8 0%, #172554 100%)';
    }
    if (lower.includes('jazz')) {
        return 'linear-gradient(135deg, #D97732 0%, #7C2D12 100%)';
    }
    if (lower.includes('classical')) {
        return 'linear-gradient(135deg, #334155 0%, #0F172A 100%)';
    }
    if (lower.includes('country') || lower.includes('folk')) {
        return 'linear-gradient(135deg, #B45309 0%, #451A03 100%)';
    }
    if (lower.includes('r&b') || lower.includes('soul')) {
        return 'linear-gradient(135deg, #7C3AED 0%, #2E1065 100%)';
    }
    if (lower.includes('soundtrack') || lower.includes('score')) {
        return 'linear-gradient(135deg, #475569 0%, #1E293B 100%)';
    }

    // Hash-based deterministic gradient selection for all other genres
    let hash = 0;
    for (let i = 0; i < genre.length; i++) {
        hash = (hash << 5) - hash + genre.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % CURATED_GENRE_PALETTE.length;
    return CURATED_GENRE_PALETTE[idx];
};

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

export const KhyloMusicView: FC<KhyloMusicViewProps> = ({ parentId }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [ searchParams, setSearchParams ] = useSearchParams();

    // URL or state routing
    const initialArtistId = searchParams.get('artistId') || null;
    const initialGenre = searchParams.get('genre') || null;
    const initialTab = (searchParams.get('tab') as MusicTab) || 'listen-now';

    const [ activeTab, setActiveTab ] = useState<MusicTab>(initialTab);
    const [ selectedArtistId, setSelectedArtistId ] = useState<string | null>(initialArtistId);
    const [ selectedGenre, setSelectedGenre ] = useState<string | null>(initialGenre);
    const [ searchQuery, setSearchQuery ] = useState('');
    const [ albumSort, setAlbumSort ] = useState<AlbumSortOption>('recent');
    const [ favoritedIds, setFavoritedIds ] = useState<Set<string>>(() => new Set());

    const artistRailRef = React.useRef<HTMLDivElement>(null);
    const albumRailRef = React.useRef<HTMLDivElement>(null);

    // Replace the app rail with the music sidebar while this view is open
    const setMusicMode = useSetKhyloMusicMode();
    // Stays on while the music section is open (album and artist pages included); the shell clears it on leaving
    useEffect(() => {
        setMusicMode(true);
    }, [setMusicMode]);

    const scrollRail = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (ref.current) {
            const offset = direction === 'left' ? -650 : 650;
            ref.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    // A new section, artist or genre starts at the top of the main panel
    useEffect(() => {
        scrollMusicPanelToTop();
    }, [activeTab, selectedArtistId, selectedGenre]);

    // Sync tab and parameters from URL if changed externally
    useEffect(() => {
        const urlArtist = searchParams.get('artistId');
        if (urlArtist !== selectedArtistId) {
            setSelectedArtistId(urlArtist);
        }
        const urlGenre = searchParams.get('genre');
        if (urlGenre !== selectedGenre) {
            setSelectedGenre(urlGenre);
        }
        const urlTab = searchParams.get('tab') as MusicTab;
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [searchParams]);

    const handleSelectTab = (tab: MusicTab) => {
        setActiveTab(tab);
        setSelectedArtistId(null);
        setSelectedGenre(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('tab', tab);
            next.delete('artistId');
            next.delete('genre');
            return next;
        });
    };

    const handleOpenArtist = (artistId: string) => {
        setSelectedArtistId(artistId);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('artistId', artistId);
            return next;
        });
    };

    const handleBackFromArtist = () => {
        setSelectedArtistId(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('artistId');
            return next;
        });
    };

    const handleOpenGenre = (genre: string) => {
        setSelectedGenre(genre);
        setSelectedArtistId(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('genre', genre);
            next.delete('artistId');
            return next;
        });
    };

    const handleBackFromGenre = () => {
        setSelectedGenre(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('genre');
            return next;
        });
    };

    // 1. Fetch All Albums
    const { data: allAlbums, isLoading: isAlbumsLoading } = useQuery({
        queryKey: ['KhyloMusicAlbums', parentId, userId],
        queryFn: async () => {
            if (!api) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                parentId: parentId || undefined,
                includeItemTypes: [BaseItemKind.MusicAlbum],
                recursive: true,
                fields: MUSIC_ITEM_FIELDS,
                sortBy: [ItemSortBy.SortName]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api)
    });

    // 2. Fetch All Artists
    const { data: allArtists, isLoading: isArtistsLoading } = useQuery({
        queryKey: ['KhyloMusicArtists', parentId, userId],
        queryFn: async () => {
            if (!api) return [];
            try {
                const res = await getArtistApi(api).getAlbumArtists({
                    userId: userId || undefined,
                    parentId: parentId || undefined,
                    fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview, ItemFields.Genres],
                    sortBy: [ItemSortBy.SortName]
                });
                return res.data.Items || [];
            } catch {
                // Fallback to library getItems
                const fallbackRes = await getLibraryApi(api).getItems({
                    userId: userId || undefined,
                    parentId: parentId || undefined,
                    includeItemTypes: [BaseItemKind.MusicArtist],
                    recursive: true,
                    fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview, ItemFields.Genres],
                    sortBy: [ItemSortBy.SortName]
                });
                return fallbackRes.data.Items || [];
            }
        },
        enabled: Boolean(api)
    });

    // 3. Fetch All Songs
    const { data: allSongs, isLoading: isSongsLoading } = useQuery({
        queryKey: ['KhyloMusicSongs', parentId, userId],
        queryFn: async () => {
            if (!api) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                parentId: parentId || undefined,
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                fields: MUSIC_ITEM_FIELDS,
                sortBy: [ItemSortBy.SortName],
                limit: 500
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api)
    });

    // 4. Fetch Selected Artist Details (if in Artist Hub mode)
    const { data: selectedArtist } = useQuery({
        queryKey: ['KhyloArtistDetails', selectedArtistId, userId],
        queryFn: async () => {
            if (!api || !selectedArtistId) return null;
            const res = await getLibraryApi(api).getItem({
                userId: userId || undefined,
                itemId: selectedArtistId
            });
            return res.data as BaseItemDto;
        },
        enabled: Boolean(api && selectedArtistId)
    });

    // 5. Fetch Selected Artist's Albums
    const { data: artistAlbums } = useQuery({
        queryKey: ['KhyloArtistAlbums', selectedArtistId, userId],
        queryFn: async () => {
            if (!api || !selectedArtistId) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                artistIds: [selectedArtistId],
                includeItemTypes: [BaseItemKind.MusicAlbum],
                recursive: true,
                fields: MUSIC_ITEM_FIELDS,
                sortBy: [ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName],
                sortOrder: [SortOrder.Descending]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && selectedArtistId)
    });

    // 6. Fetch Selected Artist's Popular Tracks
    const { data: artistTopTracks } = useQuery({
        queryKey: ['KhyloArtistTopTracks', selectedArtistId, userId],
        queryFn: async () => {
            if (!api || !selectedArtistId) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                artistIds: [selectedArtistId],
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                fields: MUSIC_ITEM_FIELDS,
                sortBy: [ItemSortBy.PlayCount, ItemSortBy.SortName],
                sortOrder: [SortOrder.Descending],
                limit: 10
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && selectedArtistId)
    });

    // 7. Most Played Songs (Listen Now chart)
    const { data: topSongs } = useQuery({
        queryKey: ['KhyloMusicTopSongs', parentId, userId],
        queryFn: async () => {
            if (!api) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                parentId: parentId || undefined,
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                fields: MUSIC_ITEM_FIELDS,
                sortBy: [ItemSortBy.PlayCount, ItemSortBy.SortName],
                sortOrder: [SortOrder.Descending],
                limit: 8
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api)
    });

    // Toggle Favorite helper
    const handleToggleFavorite = async (e: React.MouseEvent, targetItem: BaseItemDto) => {
        e.stopPropagation();
        if (!api || !userId || !targetItem.Id) return;

        const isCurrentlyFav = favoritedIds.has(targetItem.Id) || Boolean(targetItem.UserData?.IsFavorite);
        setFavoritedIds(prev => {
            const next = new Set(prev);
            if (isCurrentlyFav) next.delete(targetItem.Id!);
            else next.add(targetItem.Id!);
            return next;
        });

        try {
            if (isCurrentlyFav) {
                await getUserDataApi(api).unmarkFavoriteItem({ userId, itemId: targetItem.Id });
            } else {
                await getUserDataApi(api).markFavoriteItem({ userId, itemId: targetItem.Id });
            }
            queryClient.invalidateQueries({ queryKey: ['KhyloMusic'] });
        } catch {
            // rollback
            setFavoritedIds(prev => {
                const next = new Set(prev);
                if (isCurrentlyFav) next.add(targetItem.Id!);
                else next.delete(targetItem.Id!);
                return next;
            });
        }
    };

    // Helper to test if a genre string matches the target genre
    const genreMatches = (g?: string | null, target?: string | null) => {
        if (!g || !target) return false;
        const a = g.toLowerCase().trim();
        const b = target.toLowerCase().trim();
        return a === b || a.includes(b) || b.includes(a);
    };

    // Extract Music Genres
    const availableGenres = useMemo(() => {
        const set = new Set<string>();
        for (const alb of allAlbums || []) {
            alb.Genres?.forEach(g => set.add(g.trim()));
        }
        for (const s of allSongs || []) {
            s.Genres?.forEach(g => set.add(g.trim()));
        }
        return Array.from(set).filter(Boolean).sort();
    }, [allAlbums, allSongs]);

    // Pre-calculate track count and album count for each genre
    const genreStats = useMemo(() => {
        const map = new Map<string, { count: number; albums: number }>();
        for (const s of allSongs || []) {
            s.Genres?.forEach(g => {
                const trimmed = g.trim();
                if (!trimmed) return;
                const prev = map.get(trimmed) || { count: 0, albums: 0 };
                map.set(trimmed, { ...prev, count: prev.count + 1 });
            });
        }
        for (const a of allAlbums || []) {
            a.Genres?.forEach(g => {
                const trimmed = g.trim();
                if (!trimmed) return;
                const prev = map.get(trimmed) || { count: 0, albums: 0 };
                map.set(trimmed, { ...prev, albums: prev.albums + 1 });
            });
        }
        return map;
    }, [allSongs, allAlbums]);

    // Songs for the active genre category
    const genreSongs = useMemo(() => {
        if (!selectedGenre || !allSongs) return [];
        return allSongs.filter(s => s.Genres?.some(g => genreMatches(g, selectedGenre)));
    }, [allSongs, selectedGenre]);

    // Albums for the active genre category (matches album tags OR contains tracks in this genre)
    const genreAlbums = useMemo(() => {
        if (!selectedGenre || !allAlbums) return [];
        const albumIdsFromSongs = new Set<string>();
        const albumNamesFromSongs = new Set<string>();
        genreSongs.forEach(s => {
            if (s.AlbumId) albumIdsFromSongs.add(s.AlbumId);
            if (s.Album) albumNamesFromSongs.add(s.Album.toLowerCase().trim());
        });

        return allAlbums.filter(a => {
            if (a.Genres?.some(g => genreMatches(g, selectedGenre))) return true;
            if (a.Id && albumIdsFromSongs.has(a.Id)) return true;
            if (a.Name && albumNamesFromSongs.has(a.Name.toLowerCase().trim())) return true;
            return false;
        });
    }, [allAlbums, selectedGenre, genreSongs]);

    // Artists associated with the active genre category
    const genreArtists = useMemo(() => {
        if (!selectedGenre || !allArtists) return [];
        const artistNames = new Set<string>();
        genreAlbums.forEach(a => {
            if (a.AlbumArtist) artistNames.add(a.AlbumArtist.toLowerCase().trim());
            a.Artists?.forEach(art => artistNames.add(art.toLowerCase().trim()));
        });
        genreSongs.forEach(s => {
            if (s.AlbumArtist) artistNames.add(s.AlbumArtist.toLowerCase().trim());
            s.Artists?.forEach(art => artistNames.add(art.toLowerCase().trim()));
        });

        return allArtists.filter(art => {
            if (art.Genres?.some(g => genreMatches(g, selectedGenre))) return true;
            if (art.Name && artistNames.has(art.Name.toLowerCase().trim())) return true;
            return false;
        });
    }, [allArtists, selectedGenre, genreAlbums, genreSongs]);

    // Filtered / Sorted Albums
    const displayedAlbums = useMemo(() => {
        let pool = allAlbums || [];
        if (selectedGenre) {
            pool = genreAlbums;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(a =>
                (a.Name && a.Name.toLowerCase().includes(q))
                || (a.AlbumArtist && a.AlbumArtist.toLowerCase().includes(q))
                || (a.Artists && a.Artists.some(art => art.toLowerCase().includes(q)))
            );
        }

        const sorted = [...pool];
        if (albumSort === 'title') {
            sorted.sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));
        } else if (albumSort === 'artist') {
            sorted.sort((a, b) => (a.AlbumArtist || a.Artists?.[0] || '').localeCompare(b.AlbumArtist || b.Artists?.[0] || ''));
        } else if (albumSort === 'release') {
            sorted.sort((a, b) => (b.ProductionYear || 0) - (a.ProductionYear || 0));
        } else {
            // recent
            sorted.sort((a, b) => {
                const dateA = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
                const dateB = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
                return dateB - dateA;
            });
        }
        return sorted;
    }, [allAlbums, selectedGenre, genreAlbums, searchQuery, albumSort]);

    // Filtered Artists
    const displayedArtists = useMemo(() => {
        let pool = allArtists || [];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(a => a.Name && a.Name.toLowerCase().includes(q));
        }
        return pool;
    }, [allArtists, searchQuery]);

    // Filtered Songs
    const displayedSongs = useMemo(() => {
        let pool = allSongs || [];
        if (selectedGenre) {
            pool = genreSongs;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(s =>
                (s.Name && s.Name.toLowerCase().includes(q))
                || (s.Album && s.Album.toLowerCase().includes(q))
                || (s.Artists && s.Artists.some(art => art.toLowerCase().includes(q)))
            );
        }
        return pool;
    }, [allSongs, selectedGenre, genreSongs, searchQuery]);

    // Spotlight Album for Listen Now Hero
    const spotlightAlbum = useMemo(() => {
        if (!allAlbums || allAlbums.length === 0) return null;
        // Prioritize album with backdrop or primary image
        return allAlbums.find(a => (a.BackdropImageTags && a.BackdropImageTags.length > 0) || a.ImageTags?.Primary) || allAlbums[0];
    }, [allAlbums]);

    // Recently added albums (New Releases)
    const recentlyAddedAlbums = useMemo(() => {
        if (!allAlbums) return [];
        return [...allAlbums]
            .sort((a, b) => {
                const dateA = a.DateCreated ? new Date(a.DateCreated).getTime() : 0;
                const dateB = b.DateCreated ? new Date(b.DateCreated).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 14);
    }, [allAlbums]);

    // Top featured artists
    const featuredArtists = useMemo(() => {
        if (!allArtists) return [];
        return allArtists.slice(0, 14);
    }, [allArtists]);

    const getArtistPhoto = (artist: BaseItemDto): string | null => {
        const direct = getItemImageUrl(api, artist, 'primary', 400);
        if (direct) return direct;
        const album = allAlbums?.find(a =>
            a.AlbumArtist === artist.Name
            || a.ArtistItems?.some(ai => ai.Id === artist.Id || ai.Name === artist.Name)
            || a.Artists?.includes(artist.Name!)
        );
        return album ? getItemImageUrl(api, album, 'primary', 400) : null;
    };

    const getArtistInitials = (name?: string | null): string => {
        if (!name) return '♪';
        const clean = name.trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    };

    const hubBackdrop = selectedArtist ? (
        getItemImageUrl(api, selectedArtist, 'backdrop', 1920)
        || (artistAlbums && artistAlbums[0] ? getItemImageUrl(api, artistAlbums[0], 'backdrop', 1920) || getItemImageUrl(api, artistAlbums[0], 'primary', 1920) : null)
    ) : null;

    const hubAvatar = selectedArtist ? getArtistPhoto(selectedArtist) : null;

    return (
        <KhyloMusicLayout panel={<KhyloMusicPanel featuredAlbum={spotlightAlbum} />}>

            {/* ARTIST HUB MODE (When an Artist is selected) */}
            {selectedArtistId && selectedArtist ? (
                <div className='khylo-music__artist-hub'>
                    {/* Floating Back Navigation Pill */}
                    <button
                        type='button'
                        className='khylo-music__back-btn'
                        onClick={handleBackFromArtist}
                        aria-label='Back to music'
                    >
                        <ArrowBackIcon />
                        <span>All Artists</span>
                    </button>

                    {/* Panoramic Artist Header */}
                    <div className='khylo-artist-header'>
                        {hubBackdrop && (
                            <img
                                src={hubBackdrop}
                                alt={selectedArtist.Name ?? ''}
                                className='khylo-artist-header__backdrop'
                            />
                        )}
                        <div className='khylo-artist-header__gradient' />

                        <div className='khylo-artist-header__content'>
                            <div className='khylo-artist-header__avatar-box'>
                                {hubAvatar ? (
                                    <img
                                        src={hubAvatar}
                                        alt={selectedArtist.Name ?? ''}
                                        className='khylo-artist-header__avatar'
                                    />
                                ) : (
                                    <div className='khylo-artist-card__avatar-monogram' style={{ fontSize: '3.2rem' }}>
                                        {getArtistInitials(selectedArtist.Name)}
                                    </div>
                                )}
                            </div>

                            <div className='khylo-artist-header__details'>
                                <h1 className='khylo-artist-header__name'>{selectedArtist.Name}</h1>

                                <div className='khylo-artist-header__meta'>
                                    {artistAlbums && artistAlbums.length > 0 && (
                                        <span>{artistAlbums.length} {artistAlbums.length === 1 ? 'Album' : 'Albums'}</span>
                                    )}
                                    {selectedArtist.Genres && selectedArtist.Genres.length > 0 && (
                                        <>
                                            <span className='khylo-artist-header__meta-sep'>·</span>
                                            <span>{selectedArtist.Genres.slice(0, 3).join(', ')}</span>
                                        </>
                                    )}
                                </div>

                                <div className='khylo-artist-header__actions'>
                                    <KhyloButton
                                        variant='primary'
                                        size='lg'
                                        icon={<PlayArrowIcon />}
                                        onClick={() => playMediaItem(selectedArtist)}
                                    >
                                        PLAY ARTIST
                                    </KhyloButton>
                                    <KhyloButton
                                        variant='secondary'
                                        size='lg'
                                        icon={<ShuffleIcon />}
                                        onClick={() => playMediaItem(selectedArtist, { shuffle: true })}
                                    >
                                        SHUFFLE
                                    </KhyloButton>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Artist Content: Popular Songs + Albums Discography */}
                    <div className='khylo-music__artist-body'>
                        {/* Popular Tracks */}
                        {artistTopTracks && artistTopTracks.length > 0 && (
                            <section className='khylo-music__section'>
                                <h2 className='khylo-music__section-title'>Popular Tracks</h2>
                                <div className='khylo-track-table'>
                                    <div className='khylo-track-table__header'>
                                        <div className='khylo-track-table__col khylo-track-table__col--num'>#</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--title'>Title</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--album'>Album</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--time'>
                                            <AccessTimeIcon fontSize='small' />
                                        </div>
                                        <div className='khylo-track-table__col khylo-track-table__col--actions' />
                                    </div>

                                    {artistTopTracks.map((track, idx) => {
                                        const isFav = favoritedIds.has(track.Id!) || Boolean(track.UserData?.IsFavorite);
                                        return (
                                            <div
                                                key={track.Id}
                                                className='khylo-track-row'
                                                onClick={() => playMediaItem(track, { items: artistTopTracks, startIndex: idx })}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') playMediaItem(track, { items: artistTopTracks, startIndex: idx });
                                                }}
                                            >
                                                <div className='khylo-track-row__col khylo-track-row__col--num'>
                                                    <span className='khylo-track-row__index'>{idx + 1}</span>
                                                    <button
                                                        type='button'
                                                        className='khylo-track-row__play-btn'
                                                        aria-label={`Play ${track.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(track, { items: artistTopTracks, startIndex: idx });
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--title'>
                                                    <div className='khylo-track-row__name'>{track.Name}</div>
                                                    {track.Artists && track.Artists.length > 0 && (
                                                        <div className='khylo-track-row__artist'>{track.Artists.join(', ')}</div>
                                                    )}
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--album'>
                                                    <span
                                                        className='khylo-track-row__album-link'
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            if (track.AlbumId) navigate(`/details?id=${track.AlbumId}`);
                                                        }}
                                                    >
                                                        {track.Album || 'Single'}
                                                    </span>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--time'>
                                                    {formatTicksToTrackTime(track.RunTimeTicks)}
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--actions'><KhyloAddToPlaylistButton item={track} />
                                                    <button
                                                        type='button'
                                                        className={classNames('khylo-track-row__fav-btn', {
                                                            'khylo-track-row__fav-btn--active': isFav
                                                        })}
                                                        onClick={e => handleToggleFavorite(e, track)}
                                                        aria-label='Favorite track'
                                                    >
                                                        {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Albums Discography */}
                        <section className='khylo-music__section'>
                            <h2 className='khylo-music__section-title'>Albums Discography</h2>
                            {artistAlbums && artistAlbums.length > 0 ? (
                                <div className='khylo-album-grid'>
                                    {artistAlbums.map(album => {
                                        const cover = getItemImageUrl(api, album, 'primary', 400);
                                        return (
                                            <div
                                                key={album.Id}
                                                className='khylo-album-card'
                                                onClick={() => navigate(`/details?id=${album.Id}`)}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') navigate(`/details?id=${album.Id}`);
                                                }}
                                            >
                                                <div className='khylo-album-card__cover-box'>
                                                    {cover ? (
                                                        <img
                                                            src={cover}
                                                            alt={album.Name ?? ''}
                                                            className='khylo-album-card__cover-img'
                                                            loading='lazy'
                                                        />
                                                    ) : (
                                                        <div className='khylo-album-card__vinyl-fallback'>
                                                            <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--3' />
                                                            <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--2' />
                                                            <div className='khylo-album-card__vinyl-center'>
                                                                <AlbumIcon />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        type='button'
                                                        className='khylo-album-card__play-btn'
                                                        aria-label={`Play ${album.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(album);
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>
                                                <div className='khylo-album-card__info'>
                                                    <div className='khylo-album-card__title'>{album.Name}</div>
                                                    <div className='khylo-album-card__meta'>
                                                        {album.ProductionYear ? `${album.ProductionYear} · ` : ''}Album
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className='khylo-music__empty-text'>No albums found for this artist.</p>
                            )}
                        </section>
                    </div>
                </div>
            ) : selectedGenre ? (
                <div className='khylo-music__genre-hub'>
                    {/* Floating Back Navigation Pill */}
                    <button
                        type='button'
                        className='khylo-music__back-btn'
                        onClick={handleBackFromGenre}
                        aria-label='Back to music'
                    >
                        <ArrowBackIcon />
                        <span>Back to Music</span>
                    </button>

                    {/* Panoramic Genre / Category Header */}
                    <div className='khylo-genre-header'>
                        <div
                            className='khylo-genre-header__gradient-bg'
                            style={{ background: getGenreGradient(selectedGenre) }}
                        />
                        <div className='khylo-genre-header__vignette' />
                        <MusicNoteIcon className='khylo-genre-header__watermark-icon' />

                        <div className='khylo-genre-header__content'>
                            <span className='khylo-genre-header__kicker'>MUSIC CATEGORY</span>
                            <h1 className='khylo-genre-header__name'>{selectedGenre}</h1>

                            <div className='khylo-genre-header__meta'>
                                {genreAlbums.length > 0 && (
                                    <span>{genreAlbums.length} {genreAlbums.length === 1 ? 'Album' : 'Albums'}</span>
                                )}
                                {genreAlbums.length > 0 && genreSongs.length > 0 && (
                                    <span className='khylo-genre-header__meta-sep'>·</span>
                                )}
                                {genreSongs.length > 0 && (
                                    <span>{genreSongs.length} {genreSongs.length === 1 ? 'Track' : 'Tracks'}</span>
                                )}
                                {(genreAlbums.length > 0 || genreSongs.length > 0) && genreArtists.length > 0 && (
                                    <span className='khylo-genre-header__meta-sep'>·</span>
                                )}
                                {genreArtists.length > 0 && (
                                    <span>{genreArtists.length} {genreArtists.length === 1 ? 'Artist' : 'Artists'}</span>
                                )}
                            </div>

                            <div className='khylo-genre-header__actions'>
                                {genreSongs.length > 0 && (
                                    <>
                                        <KhyloButton
                                            variant='primary'
                                            size='lg'
                                            icon={<PlayArrowIcon />}
                                            onClick={() => playMediaItem(genreSongs[0], { items: genreSongs })}
                                        >
                                            PLAY ALL
                                        </KhyloButton>
                                        <KhyloButton
                                            variant='secondary'
                                            size='lg'
                                            icon={<ShuffleIcon />}
                                            onClick={() => {
                                                const rand = genreSongs[Math.floor(Math.random() * genreSongs.length)];
                                                playMediaItem(rand, { items: genreSongs, shuffle: true });
                                            }}
                                        >
                                            SHUFFLE
                                        </KhyloButton>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Genre Body: Tracks, Albums, Artists */}
                    <div className='khylo-music__genre-body'>
                        {/* 1. Tracks in Genre */}
                        {genreSongs.length > 0 && (
                            <section className='khylo-music__section'>
                                <div className='khylo-music__section-head'>
                                    <h2 className='khylo-music__section-title'>Tracks in {selectedGenre}</h2>
                                    <span className='khylo-music__section-count'>
                                        {genreSongs.length} {genreSongs.length === 1 ? 'Track' : 'Tracks'}
                                    </span>
                                </div>
                                <div className='khylo-track-table'>
                                    <div className='khylo-track-table__head'>
                                        <div className='khylo-track-table__th khylo-track-table__th--num'>#</div>
                                        <div className='khylo-track-table__th khylo-track-table__th--title'>Title</div>
                                        <div className='khylo-track-table__th khylo-track-table__th--album'>Album</div>
                                        <div className='khylo-track-table__th khylo-track-table__th--time'>
                                            <AccessTimeIcon />
                                        </div>
                                        <div className='khylo-track-table__th khylo-track-table__th--actions' />
                                    </div>

                                    {genreSongs.slice(0, 100).map((song, idx) => {
                                        const isFav = favoritedIds.has(song.Id!) || Boolean(song.UserData?.IsFavorite);
                                        const cover = getItemImageUrl(api, song, 'primary', 100);
                                        return (
                                            <div
                                                key={song.Id}
                                                className='khylo-track-row'
                                                onClick={() => playMediaItem(song, { items: genreSongs, startIndex: idx })}
                                            >
                                                <div className='khylo-track-row__col khylo-track-row__col--num'>
                                                    <span className='khylo-track-row__index'>{idx + 1}</span>
                                                    <button
                                                        type='button'
                                                        className='khylo-track-row__play-btn'
                                                        aria-label={`Play ${song.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(song, { items: genreSongs, startIndex: idx });
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--title'>
                                                    {cover ? (
                                                        <img
                                                            src={cover}
                                                            alt={song.Name ?? ''}
                                                            className='khylo-track-row__thumb'
                                                            loading='lazy'
                                                        />
                                                    ) : (
                                                        <div className='khylo-track-row__thumb-fallback'>
                                                            <MusicNoteIcon />
                                                        </div>
                                                    )}
                                                    <div className='khylo-track-row__title-wrap'>
                                                        <span className='khylo-track-row__name'>{song.Name}</span>
                                                        <span className='khylo-track-row__artist'>
                                                            {song.AlbumArtist || song.Artists?.[0] || 'Unknown Artist'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--album'>
                                                    <span
                                                        className='khylo-track-row__album-link'
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            if (song.AlbumId) navigate(`/details?id=${song.AlbumId}`);
                                                        }}
                                                    >
                                                        {song.Album || 'Single'}
                                                    </span>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--time'>
                                                    {formatTicksToTrackTime(song.RunTimeTicks)}
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--actions'><KhyloAddToPlaylistButton item={song} />
                                                    <button
                                                        type='button'
                                                        className={classNames('khylo-track-row__fav-btn', {
                                                            'khylo-track-row__fav-btn--active': isFav
                                                        })}
                                                        onClick={e => handleToggleFavorite(e, song)}
                                                        aria-label='Favorite track'
                                                    >
                                                        {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* 2. Albums in Genre */}
                        {genreAlbums.length > 0 && (
                            <section className='khylo-music__section'>
                                <div className='khylo-music__section-head'>
                                    <h2 className='khylo-music__section-title'>{selectedGenre} Albums</h2>
                                    <span className='khylo-music__section-count'>
                                        {genreAlbums.length} {genreAlbums.length === 1 ? 'Album' : 'Albums'}
                                    </span>
                                </div>
                                <div className='khylo-album-grid'>
                                    {genreAlbums.map(album => {
                                        const cover = getItemImageUrl(api, album, 'primary', 400);
                                        const artistName = album.AlbumArtist || album.Artists?.[0] || 'Various Artists';
                                        return (
                                            <div
                                                key={album.Id}
                                                className='khylo-album-card'
                                                onClick={() => navigate(`/details?id=${album.Id}`)}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') navigate(`/details?id=${album.Id}`);
                                                }}
                                            >
                                                <div className='khylo-album-card__cover-box'>
                                                    {cover ? (
                                                        <img
                                                            src={cover}
                                                            alt={album.Name ?? ''}
                                                            className='khylo-album-card__cover-img'
                                                            loading='lazy'
                                                        />
                                                    ) : (
                                                        <div className='khylo-album-card__vinyl-fallback'>
                                                            <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--3' />
                                                            <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--2' />
                                                            <div className='khylo-album-card__vinyl-center'>
                                                                <AlbumIcon />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        type='button'
                                                        className='khylo-album-card__play-btn'
                                                        aria-label={`Play ${album.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(album);
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>
                                                <div className='khylo-album-card__info'>
                                                    <div className='khylo-album-card__title'>{album.Name}</div>
                                                    <div className='khylo-album-card__meta'>
                                                        {album.ProductionYear ? `${album.ProductionYear} · ` : ''}{artistName}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* 3. Artists in Genre */}
                        {genreArtists.length > 0 && (
                            <section className='khylo-music__section'>
                                <div className='khylo-music__section-head'>
                                    <h2 className='khylo-music__section-title'>Artists in {selectedGenre}</h2>
                                    <span className='khylo-music__section-count'>
                                        {genreArtists.length} {genreArtists.length === 1 ? 'Artist' : 'Artists'}
                                    </span>
                                </div>
                                <div className='khylo-artist-grid'>
                                    {genreArtists.map(artist => {
                                        const photo = getArtistPhoto(artist);
                                        return (
                                            <div
                                                key={artist.Id}
                                                className='khylo-artist-card'
                                                onClick={() => handleOpenArtist(artist.Id!)}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleOpenArtist(artist.Id!);
                                                }}
                                            >
                                                <div className='khylo-artist-card__avatar-box'>
                                                    {photo ? (
                                                        <img
                                                            src={photo}
                                                            alt={artist.Name ?? ''}
                                                            className='khylo-artist-card__avatar-img'
                                                            loading='lazy'
                                                        />
                                                    ) : (
                                                        <div className='khylo-artist-card__avatar-monogram'>
                                                            {getArtistInitials(artist.Name)}
                                                        </div>
                                                    )}
                                                    <button
                                                        type='button'
                                                        className='khylo-artist-card__play-btn'
                                                        aria-label={`Play ${artist.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(artist);
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>
                                                <div className='khylo-artist-card__name'>{artist.Name}</div>
                                                <div className='khylo-artist-card__role'>Artist</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {genreSongs.length === 0 && genreAlbums.length === 0 && genreArtists.length === 0 && (
                            <div className='khylo-music__empty'>
                                <h3>No Media Found in {selectedGenre}</h3>
                                <p>No tracks, albums, or artists are tagged with this category in your library.</p>
                                <KhyloButton
                                    variant='secondary'
                                    size='md'
                                    onClick={handleBackFromGenre}
                                    style={{ marginTop: '16px' }}
                                >
                                    BACK TO ALL MUSIC
                                </KhyloButton>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
            /* MAIN STREAMING INTERFACE (Tabs: Listen Now, Artists, Albums, Songs, Genres) */
                <div className='khylo-music__main'>
                    {/* Music Service Top Bar */}
                    <div className='khylo-music-nav'>
                        <div className='khylo-music-nav__left'>
                            {/* Subtabs Pill Switcher */}
                            <div className='khylo-music-nav__tabs'>
                                <button
                                    type='button'
                                    className={classNames('khylo-music-nav__tab', {
                                        'khylo-music-nav__tab--active': activeTab === 'listen-now'
                                    })}
                                    onClick={() => handleSelectTab('listen-now')}
                                >
                                    Listen Now
                                </button>
                                <button
                                    type='button'
                                    className={classNames('khylo-music-nav__tab', {
                                        'khylo-music-nav__tab--active': activeTab === 'artists'
                                    })}
                                    onClick={() => handleSelectTab('artists')}
                                >
                                    Artists
                                </button>
                                <button
                                    type='button'
                                    className={classNames('khylo-music-nav__tab', {
                                        'khylo-music-nav__tab--active': activeTab === 'albums'
                                    })}
                                    onClick={() => handleSelectTab('albums')}
                                >
                                    Albums
                                </button>
                                <button
                                    type='button'
                                    className={classNames('khylo-music-nav__tab', {
                                        'khylo-music-nav__tab--active': activeTab === 'songs'
                                    })}
                                    onClick={() => handleSelectTab('songs')}
                                >
                                    Songs
                                </button>
                                <button
                                    type='button'
                                    className={classNames('khylo-music-nav__tab', {
                                        'khylo-music-nav__tab--active': activeTab === 'genres'
                                    })}
                                    onClick={() => handleSelectTab('genres')}
                                >
                                    Genres
                                </button>
                            </div>
                        </div>

                        {/* Search & Actions Right */}
                        <div className='khylo-music-nav__right'>
                            <div className='khylo-music-search'>
                                <SearchIcon className='khylo-music-search__icon' />
                                <input
                                    type='text'
                                    className='khylo-music-search__input'
                                    placeholder={
                                        activeTab === 'artists' ?
                                            'Search artists...' :
                                            activeTab === 'albums' ?
                                                'Search albums...' :
                                                activeTab === 'songs' ?
                                                    'Search songs...' :
                                                    'Search music...'
                                    }
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    aria-label='Search music library'
                                />
                                {searchQuery && (
                                    <button
                                        type='button'
                                        className='khylo-music-search__clear'
                                        onClick={() => setSearchQuery('')}
                                        aria-label='Clear search'
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>

                            {activeTab === 'albums' && (
                                <div className='khylo-music-sort'>
                                    <select
                                        className='khylo-music-sort__select'
                                        value={albumSort}
                                        onChange={e => setAlbumSort(e.target.value as AlbumSortOption)}
                                        aria-label='Sort albums'
                                    >
                                        <option value='recent'>Recently Added</option>
                                        <option value='release'>Release Year</option>
                                        <option value='title'>Album Title (A–Z)</option>
                                        <option value='artist'>Artist (A–Z)</option>
                                    </select>
                                </div>
                            )}

                            {allSongs && allSongs.length > 0 && (
                                <button
                                    type='button'
                                    className='khylo-music-quickplay-btn'
                                    onClick={() => {
                                        const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
                                        playMediaItem(randomSong, { items: allSongs, shuffle: true });
                                    }}
                                    title='Shuffle entire music library'
                                >
                                    <ShuffleIcon />
                                    <span>Shuffle</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Genre Filter Tag */}
                    {selectedGenre && (
                        <div className='khylo-music-genre-active'>
                            <span>Genre: <strong>{selectedGenre}</strong></span>
                            <button
                                type='button'
                                className='khylo-music-genre-active__clear'
                                onClick={() => setSelectedGenre(null)}
                            >
                                Clear Filter
                            </button>
                        </div>
                    )}

                    {/* TAB 1: LISTEN NOW (Home Discovery Hub) */}
                    {activeTab === 'listen-now' && (
                        <div className='khylo-music-tab-listen'>
                            {/* Header: greeting and quick picks over the featured album's artwork */}
                            {spotlightAlbum && (
                                <div className='khylo-music-hero'>
                                    {getItemImageUrl(api, spotlightAlbum, 'backdrop', 1280) && (
                                        <img
                                            src={getItemImageUrl(api, spotlightAlbum, 'backdrop', 1280)!}
                                            alt=''
                                            className='khylo-music-hero__backdrop'
                                        />
                                    )}
                                    <div className='khylo-music-hero__shade' />
                                    <h1 className='khylo-music-hero__greeting'>{getGreeting()}</h1>
                                    <div className='khylo-music-hero__picks'>
                                        {recentlyAddedAlbums.slice(0, 6).map(album => {
                                            const cover = getItemImageUrl(api, album, 'primary', 120);
                                            return (
                                                <button
                                                    key={album.Id}
                                                    type='button'
                                                    className='khylo-music-chip'
                                                    onClick={() => navigate(`/details?id=${album.Id}`)}
                                                >
                                                    {cover ? (
                                                        <img src={cover} alt='' className='khylo-music-chip__cover' loading='lazy' />
                                                    ) : (
                                                        <span className='khylo-music-chip__cover khylo-music-chip__cover--fallback'>
                                                            <AlbumIcon />
                                                        </span>
                                                    )}
                                                    <span className='khylo-music-chip__name'>{album.Name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Top Songs: the most played tracks, two columns, only once something has been played */}
                            {topSongs && topSongs.some(s => (s.UserData?.PlayCount ?? 0) > 0) && (
                                <section className='khylo-music__section'>
                                    <div className='khylo-music__section-head'>
                                        <h2 className='khylo-music__section-title'>Top songs</h2>
                                    </div>
                                    <div className='khylo-track-table khylo-track-table--top'>
                                        {topSongs
                                            .filter(s => (s.UserData?.PlayCount ?? 0) > 0)
                                            .map((song, idx, played) => {
                                                const isFav = favoritedIds.has(song.Id!) || Boolean(song.UserData?.IsFavorite);
                                                const thumb = getItemImageUrl(api, song, 'primary', 96);
                                                return (
                                                    <div
                                                        key={song.Id}
                                                        className='khylo-track-row khylo-track-row--top'
                                                        onClick={() => playMediaItem(song, { items: played, startIndex: idx })}
                                                        role='button'
                                                        tabIndex={0}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') playMediaItem(song, { items: played, startIndex: idx });
                                                        }}
                                                    >
                                                        {thumb ? (
                                                            <img src={thumb} alt='' className='khylo-track-row__thumb' loading='lazy' />
                                                        ) : (
                                                            <div className='khylo-track-row__thumb-fallback'>
                                                                <MusicNoteIcon />
                                                            </div>
                                                        )}
                                                        <div className='khylo-track-row__title-wrap'>
                                                            <span className='khylo-track-row__name'>{song.Name}</span>
                                                            <span className='khylo-track-row__artist'>
                                                                {song.Artists?.join(', ') || song.AlbumArtist || 'Unknown Artist'}
                                                            </span>
                                                        </div>
                                                        <div className='khylo-track-row__col khylo-track-row__col--time'>
                                                            {song.UserData?.PlayCount} {song.UserData?.PlayCount === 1 ? 'play' : 'plays'}
                                                        </div>
                                                        <div className='khylo-track-row__col khylo-track-row__col--actions'><KhyloAddToPlaylistButton item={song} />
                                                            <button
                                                                type='button'
                                                                className={classNames('khylo-track-row__fav-btn', {
                                                                    'khylo-track-row__fav-btn--active': isFav
                                                                })}
                                                                onClick={e => handleToggleFavorite(e, song)}
                                                                aria-label='Favorite track'
                                                            >
                                                                {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </section>
                            )}

                            {/* Top Artists Rail */}
                            {featuredArtists && featuredArtists.length > 0 && (
                                <section className='khylo-music__section'>
                                    <div className='khylo-music__section-head'>
                                        <h2 className='khylo-music__section-title'>Top Artists</h2>
                                        <div className='khylo-music__section-actions'>
                                            <button
                                                type='button'
                                                className='khylo-music__rail-nav-btn'
                                                onClick={() => scrollRail(artistRailRef, 'left')}
                                                aria-label='Scroll artists left'
                                                title='Previous'
                                            >
                                                <ChevronLeftIcon />
                                            </button>
                                            <button
                                                type='button'
                                                className='khylo-music__rail-nav-btn'
                                                onClick={() => scrollRail(artistRailRef, 'right')}
                                                aria-label='Scroll artists right'
                                                title='Next'
                                            >
                                                <ChevronRightIcon />
                                            </button>
                                            <button
                                                type='button'
                                                className='khylo-music__section-more'
                                                onClick={() => handleSelectTab('artists')}
                                            >
                                                See All &rsaquo;
                                            </button>
                                        </div>
                                    </div>
                                    <div className='khylo-artist-rail' ref={artistRailRef}>
                                        {featuredArtists.map(artist => {
                                            const photo = getArtistPhoto(artist);
                                            return (
                                                <div
                                                    key={artist.Id}
                                                    className='khylo-artist-card'
                                                    onClick={() => handleOpenArtist(artist.Id!)}
                                                    role='button'
                                                    tabIndex={0}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleOpenArtist(artist.Id!);
                                                    }}
                                                >
                                                    <div className='khylo-artist-card__avatar-box'>
                                                        {photo ? (
                                                            <img
                                                                src={photo}
                                                                alt={artist.Name ?? ''}
                                                                className='khylo-artist-card__avatar-img'
                                                                loading='lazy'
                                                            />
                                                        ) : (
                                                            <div className='khylo-artist-card__avatar-monogram'>
                                                                {getArtistInitials(artist.Name)}
                                                            </div>
                                                        )}
                                                        <button
                                                            type='button'
                                                            className='khylo-artist-card__play-btn'
                                                            aria-label={`Play ${artist.Name}`}
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                playMediaItem(artist);
                                                            }}
                                                        >
                                                            <PlayArrowIcon />
                                                        </button>
                                                    </div>
                                                    <div className='khylo-artist-card__name'>{artist.Name}</div>
                                                    <div className='khylo-artist-card__role'>Artist</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* New Releases & Recently Added Albums Rail */}
                            {recentlyAddedAlbums && recentlyAddedAlbums.length > 0 && (
                                <section className='khylo-music__section'>
                                    <div className='khylo-music__section-head'>
                                        <h2 className='khylo-music__section-title'>Recently Added Albums</h2>
                                        <div className='khylo-music__section-actions'>
                                            <button
                                                type='button'
                                                className='khylo-music__rail-nav-btn'
                                                onClick={() => scrollRail(albumRailRef, 'left')}
                                                aria-label='Scroll albums left'
                                                title='Previous'
                                            >
                                                <ChevronLeftIcon />
                                            </button>
                                            <button
                                                type='button'
                                                className='khylo-music__rail-nav-btn'
                                                onClick={() => scrollRail(albumRailRef, 'right')}
                                                aria-label='Scroll albums right'
                                                title='Next'
                                            >
                                                <ChevronRightIcon />
                                            </button>
                                            <button
                                                type='button'
                                                className='khylo-music__section-more'
                                                onClick={() => handleSelectTab('albums')}
                                            >
                                                See All &rsaquo;
                                            </button>
                                        </div>
                                    </div>
                                    <div className='khylo-album-rail' ref={albumRailRef}>
                                        {recentlyAddedAlbums.map(album => {
                                            const cover = getItemImageUrl(api, album, 'primary', 400);
                                            return (
                                                <div
                                                    key={album.Id}
                                                    className='khylo-album-card'
                                                    onClick={() => navigate(`/details?id=${album.Id}`)}
                                                    role='button'
                                                    tabIndex={0}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') navigate(`/details?id=${album.Id}`);
                                                    }}
                                                >
                                                    <div className='khylo-album-card__cover-box'>
                                                        {cover ? (
                                                            <img
                                                                src={cover}
                                                                alt={album.Name ?? ''}
                                                                className='khylo-album-card__cover-img'
                                                                loading='lazy'
                                                            />
                                                        ) : (
                                                            <div className='khylo-album-card__vinyl-fallback'>
                                                                <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--3' />
                                                                <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--2' />
                                                                <div className='khylo-album-card__vinyl-center'>
                                                                    <AlbumIcon />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button
                                                            type='button'
                                                            className='khylo-album-card__play-btn'
                                                            aria-label={`Play ${album.Name}`}
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                playMediaItem(album);
                                                            }}
                                                        >
                                                            <PlayArrowIcon />
                                                        </button>
                                                    </div>
                                                    <div className='khylo-album-card__info'>
                                                        <div className='khylo-album-card__title'>{album.Name}</div>
                                                        <div className='khylo-album-card__meta'>
                                                            {album.AlbumArtist || album.Artists?.[0] || 'Artist'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Music Genres Rail */}
                            {availableGenres && availableGenres.length > 0 && (
                                <section className='khylo-music__section'>
                                    <div className='khylo-music__section-head'>
                                        <h2 className='khylo-music__section-title'>Music Categories &amp; Genres</h2>
                                        <button
                                            type='button'
                                            className='khylo-music__section-more'
                                            onClick={() => handleSelectTab('genres')}
                                        >
                                            Browse All &rsaquo;
                                        </button>
                                    </div>
                                    <div
                                        className='khylo-music-genres-grid'
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                            gap: '20px',
                                            width: '100%'
                                        }}
                                    >
                                        {availableGenres.slice(0, 10).map(genre => {
                                            const bg = getGenreGradient(genre);
                                            const stats = genreStats.get(genre);
                                            const countText = stats?.count ?
                                                `${stats.count} ${stats.count === 1 ? 'Track' : 'Tracks'}` :
                                                (stats?.albums ? `${stats.albums} ${stats.albums === 1 ? 'Album' : 'Albums'}` : 'Category');

                                            return (
                                                <div
                                                    key={genre}
                                                    className='khylo-music-genre-card'
                                                    style={{
                                                        background: bg,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        minHeight: '120px',
                                                        borderRadius: '16px',
                                                        padding: '18px 20px',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    onClick={() => handleOpenGenre(genre)}
                                                    role='button'
                                                    tabIndex={0}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            handleOpenGenre(genre);
                                                        }
                                                    }}
                                                >
                                                    <div className='khylo-music-genre-card__info'>
                                                        <span className='khylo-music-genre-card__title'>{genre}</span>
                                                        <span className='khylo-music-genre-card__badge'>{countText}</span>
                                                    </div>
                                                    <MusicNoteIcon className='khylo-music-genre-card__icon' />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* TAB 2: ARTISTS (A-Z Circular Artists Directory) */}
                    {activeTab === 'artists' && (
                        <div className='khylo-music-tab-artists'>
                            <div className='khylo-music__section-head'>
                                <div>
                                    <h2 className='khylo-music__section-title'>All Artists</h2>
                                    <span className='khylo-music__section-count'>
                                        {displayedArtists.length} {displayedArtists.length === 1 ? 'Artist' : 'Artists'}
                                    </span>
                                </div>
                            </div>

                            {isArtistsLoading ? (
                                <div className='khylo-artist-grid'>
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <div key={i} className='khylo-artist-card'>
                                            <KhyloSkeleton variant='card' aspectRatio='1:1' />
                                            <KhyloSkeleton variant='text' width='70%' />
                                        </div>
                                    ))}
                                </div>
                            ) : displayedArtists.length > 0 ? (
                                <div className='khylo-artist-grid'>
                                    {displayedArtists.map(artist => {
                                        const photo = getArtistPhoto(artist);
                                        return (
                                            <div
                                                key={artist.Id}
                                                className='khylo-artist-card'
                                                onClick={() => handleOpenArtist(artist.Id!)}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleOpenArtist(artist.Id!);
                                                }}
                                            >
                                                <div className='khylo-artist-card__avatar-box'>
                                                    {photo ? (
                                                        <img
                                                            src={photo}
                                                            alt={artist.Name ?? ''}
                                                            className='khylo-artist-card__avatar-img'
                                                            loading='lazy'
                                                        />
                                                    ) : (
                                                        <div className='khylo-artist-card__avatar-monogram'>
                                                            {getArtistInitials(artist.Name)}
                                                        </div>
                                                    )}
                                                    <button
                                                        type='button'
                                                        className='khylo-artist-card__play-btn'
                                                        aria-label={`Play ${artist.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(artist);
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>
                                                <div className='khylo-artist-card__name'>{artist.Name}</div>
                                                <div className='khylo-artist-card__role'>Artist</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className='khylo-music__empty'>
                                    <h3>No Artists Found</h3>
                                    <p>No artists match your search query.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: ALBUMS (1:1 Square Cover Grid) */}
                    {activeTab === 'albums' && (
                        <div className='khylo-music-tab-albums'>
                            <div className='khylo-music__section-head'>
                                <div>
                                    <h2 className='khylo-music__section-title'>
                                        {selectedGenre ? `${selectedGenre} Albums` : 'All Albums'}
                                    </h2>
                                    <span className='khylo-music__section-count'>
                                        {displayedAlbums.length} {displayedAlbums.length === 1 ? 'Album' : 'Albums'}
                                    </span>
                                </div>
                            </div>
                            {isAlbumsLoading ? (
                                <div className='khylo-album-grid'>
                                    {Array.from({ length: 18 }).map((_, i) => (
                                        <div key={i} className='khylo-album-card'>
                                            <KhyloSkeleton variant='card' aspectRatio='1:1' />
                                            <KhyloSkeleton variant='text' width='80%' />
                                        </div>
                                    ))}
                                </div>
                            ) : displayedAlbums.length > 0 ? (
                                <div className='khylo-album-grid'>
                                    {displayedAlbums.map(album => {
                                        const cover = getItemImageUrl(api, album, 'primary', 400);
                                        const artistName = album.AlbumArtist || album.Artists?.[0] || 'Various Artists';
                                        return (
                                            <div
                                                key={album.Id}
                                                className='khylo-album-card'
                                                onClick={() => navigate(`/details?id=${album.Id}`)}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') navigate(`/details?id=${album.Id}`);
                                                }}
                                            >
                                                <div className='khylo-album-card__cover-box'>
                                                    {cover ? (
                                                        <img
                                                            src={cover}
                                                            alt={album.Name ?? ''}
                                                            className='khylo-album-card__cover-img'
                                                            loading='lazy'
                                                        />
                                                    ) : (
                                                        <div className='khylo-album-card__vinyl-fallback'>
                                                            <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--3' />
                                                            <div className='khylo-album-card__vinyl-groove khylo-album-card__vinyl-groove--2' />
                                                            <div className='khylo-album-card__vinyl-center'>
                                                                <AlbumIcon />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        type='button'
                                                        className='khylo-album-card__play-btn'
                                                        aria-label={`Play ${album.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(album);
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>
                                                <div className='khylo-album-card__info'>
                                                    <div className='khylo-album-card__title'>{album.Name}</div>
                                                    <div className='khylo-album-card__meta'>
                                                        <span
                                                            className='khylo-album-card__artist-link'
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                if (album.AlbumArtists?.[0]?.Id) {
                                                                    handleOpenArtist(album.AlbumArtists[0].Id);
                                                                }
                                                            }}
                                                        >
                                                            {artistName}
                                                        </span>
                                                        {album.ProductionYear && <span> · {album.ProductionYear}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className='khylo-music__empty'>
                                    <h3>No Albums Found</h3>
                                    <p>No albums found matching your current filter.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: SONGS (Tracklist Table) */}
                    {activeTab === 'songs' && (
                        <div className='khylo-music-tab-songs'>
                            <div className='khylo-music__section-head'>
                                <div>
                                    <h2 className='khylo-music__section-title'>
                                        {selectedGenre ? `${selectedGenre} Songs` : 'All Songs'}
                                    </h2>
                                    <span className='khylo-music__section-count'>
                                        {displayedSongs.length} {displayedSongs.length === 1 ? 'Song' : 'Songs'}
                                    </span>
                                </div>
                            </div>
                            {isSongsLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <KhyloSkeleton key={i} variant='text' width='100%' height={48} />
                                    ))}
                                </div>
                            ) : displayedSongs.length > 0 ? (
                                <div className='khylo-track-table khylo-track-table--with-artist'>
                                    <div className='khylo-track-table__header'>
                                        <div className='khylo-track-table__col khylo-track-table__col--num'>#</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--title'>Title</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--artist'>Artist</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--album'>Album</div>
                                        <div className='khylo-track-table__col khylo-track-table__col--time'>
                                            <AccessTimeIcon fontSize='small' />
                                        </div>
                                        <div className='khylo-track-table__col khylo-track-table__col--actions' />
                                    </div>

                                    {displayedSongs.map((song, idx) => {
                                        const isFav = favoritedIds.has(song.Id!) || Boolean(song.UserData?.IsFavorite);
                                        const artistName = song.Artists?.join(', ') || song.AlbumArtist || 'Unknown Artist';

                                        return (
                                            <div
                                                key={song.Id}
                                                className='khylo-track-row'
                                                onClick={() => playMediaItem(song, { items: displayedSongs, startIndex: idx })}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') playMediaItem(song, { items: displayedSongs, startIndex: idx });
                                                }}
                                            >
                                                <div className='khylo-track-row__col khylo-track-row__col--num'>
                                                    <span className='khylo-track-row__index'>{idx + 1}</span>
                                                    <button
                                                        type='button'
                                                        className='khylo-track-row__play-btn'
                                                        aria-label={`Play ${song.Name}`}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            playMediaItem(song, { items: displayedSongs, startIndex: idx });
                                                        }}
                                                    >
                                                        <PlayArrowIcon />
                                                    </button>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--title'>
                                                    <div className='khylo-track-row__name'>{song.Name}</div>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--artist'>
                                                    <span>{artistName}</span>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--album'>
                                                    <span
                                                        className='khylo-track-row__album-link'
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            if (song.AlbumId) navigate(`/details?id=${song.AlbumId}`);
                                                        }}
                                                    >
                                                        {song.Album || 'Single'}
                                                    </span>
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--time'>
                                                    {formatTicksToTrackTime(song.RunTimeTicks)}
                                                </div>

                                                <div className='khylo-track-row__col khylo-track-row__col--actions'><KhyloAddToPlaylistButton item={song} />
                                                    <button
                                                        type='button'
                                                        className={classNames('khylo-track-row__fav-btn', {
                                                            'khylo-track-row__fav-btn--active': isFav
                                                        })}
                                                        onClick={e => handleToggleFavorite(e, song)}
                                                        aria-label='Favorite track'
                                                    >
                                                        {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className='khylo-music__empty'>
                                    <h3>No Songs Found</h3>
                                    <p>No songs found matching your search.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: GENRES (Vibrant visual cards) */}
                    {activeTab === 'genres' && (
                        <div className='khylo-music-tab-genres'>
                            <div className='khylo-music__section-head'>
                                <div>
                                    <h2 className='khylo-music__section-title'>Music Genres &amp; Categories</h2>
                                    <span className='khylo-music__section-count'>
                                        {availableGenres.length} {availableGenres.length === 1 ? 'Category' : 'Categories'}
                                    </span>
                                </div>
                            </div>
                            <div
                                className='khylo-music-genres-grid khylo-music-genres-grid--full'
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                    gap: '22px',
                                    width: '100%'
                                }}
                            >
                                {availableGenres.map(genre => {
                                    const bg = getGenreGradient(genre);
                                    const stats = genreStats.get(genre);
                                    const countText = stats?.count ?
                                        `${stats.count} ${stats.count === 1 ? 'Track' : 'Tracks'}` :
                                        (stats?.albums ? `${stats.albums} ${stats.albums === 1 ? 'Album' : 'Albums'}` : 'Category');

                                    return (
                                        <div
                                            key={genre}
                                            className='khylo-music-genre-card khylo-music-genre-card--large'
                                            style={{
                                                background: bg,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '140px',
                                                borderRadius: '18px',
                                                padding: '22px',
                                                boxSizing: 'border-box'
                                            }}
                                            onClick={() => handleOpenGenre(genre)}
                                            role='button'
                                            tabIndex={0}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    handleOpenGenre(genre);
                                                }
                                            }}
                                        >
                                            <div className='khylo-music-genre-card__info'>
                                                <span className='khylo-music-genre-card__title'>{genre}</span>
                                                <span className='khylo-music-genre-card__badge'>{countText}</span>
                                            </div>
                                            <MusicNoteIcon className='khylo-music-genre-card__icon' />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </KhyloMusicLayout>
    );
};
