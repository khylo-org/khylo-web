import React, { useEffect, useState, type FC } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';

import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ExploreIcon from '@mui/icons-material/Explore';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AlbumIcon from '@mui/icons-material/Album';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import AddIcon from '@mui/icons-material/Add';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { MediaType } from '@khylo/sdk/lib/generated-client/models/media-type';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { getArtistApi } from '@khylo/sdk/lib/utils/api/artist-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getItemImageUrl } from '../media/mediaUtils';
import { openPlaylistEditor } from './musicItems';
import './KhyloMusicView.scss';

export type MusicTab = 'listen-now' | 'artists' | 'albums' | 'songs' | 'genres';
type LibraryFilter = 'playlists' | 'artists' | 'albums';

const NAV_ITEMS: { tab: MusicTab; label: string; icon: React.ReactNode; activeIcon: React.ReactNode }[] = [
    { tab: 'listen-now', label: 'Home', icon: <HomeOutlinedIcon />, activeIcon: <HomeIcon /> },
    { tab: 'genres', label: 'Explore', icon: <ExploreOutlinedIcon />, activeIcon: <ExploreIcon /> },
    { tab: 'artists', label: 'Artists', icon: <PersonOutlineIcon />, activeIcon: <PersonIcon /> },
    { tab: 'albums', label: 'Albums', icon: <AlbumOutlinedIcon />, activeIcon: <AlbumIcon /> },
    { tab: 'songs', label: 'Songs', icon: <MusicNoteOutlinedIcon />, activeIcon: <MusicNoteIcon /> }
];

const FILTERS: { id: LibraryFilter; label: string }[] = [
    { id: 'playlists', label: 'Playlists' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' }
];

// The music library the user last opened, so album and artist pages can link back to it
const LIBRARY_KEY = 'khylo_music_library';

const readStoredLibrary = (): string | null => {
    try {
        return sessionStorage.getItem(LIBRARY_KEY);
    } catch {
        return null;
    }
};

/**
 * The music section's sidebar. The app shell shows it in place of the app rail while the
 * music section (or one of its album, artist, song or playlist pages) is open.
 */
export const KhyloMusicSidebar: FC = () => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [ searchParams ] = useSearchParams();
    const [ filter, setFilter ] = useState<LibraryFilter>('playlists');

    const onMusicPage = pathname === '/music';
    const urlLibraryId = onMusicPage ? searchParams.get('topParentId') : null;
    const libraryId = urlLibraryId || readStoredLibrary();
    const activeTab = onMusicPage ? ((searchParams.get('tab') as MusicTab | null) || 'listen-now') : null;

    useEffect(() => {
        if (!urlLibraryId) return;
        try {
            sessionStorage.setItem(LIBRARY_KEY, urlLibraryId);
        } catch {
            // Storage unavailable (private mode): links fall back to all music
        }
    }, [urlLibraryId]);

    const goToTab = (tab: MusicTab) => {
        const params = new URLSearchParams();
        if (libraryId) params.set('topParentId', libraryId);
        params.set('tab', tab);
        navigate(`/music?${params.toString()}`);
    };

    // Audio playlists only; video playlists belong to the rest of the app
    const { data: playlists } = useQuery({
        queryKey: ['KhyloMusicPlaylists', userId],
        // The playlist editor closes without telling us, so the list is kept fresh by polling
        refetchInterval: 10000,
        queryFn: async () => {
            if (!api) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                includeItemTypes: [BaseItemKind.Playlist],
                recursive: true,
                fields: [ItemFields.ChildCount, ItemFields.PrimaryImageAspectRatio],
                sortBy: [ItemSortBy.SortName]
            });
            return (res.data.Items || []).filter((p: BaseItemDto) => p.MediaType === MediaType.Audio);
        },
        enabled: Boolean(api)
    });

    const { data: artists } = useQuery({
        queryKey: ['KhyloMusicSideArtists', libraryId, userId],
        queryFn: async () => {
            if (!api) return [];
            const res = await getArtistApi(api).getAlbumArtists({
                userId: userId || undefined,
                parentId: libraryId || undefined,
                fields: [ItemFields.PrimaryImageAspectRatio],
                sortBy: [ItemSortBy.SortName],
                limit: 200
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api) && filter === 'artists'
    });

    const { data: albums } = useQuery({
        queryKey: ['KhyloMusicSideAlbums', libraryId, userId],
        queryFn: async () => {
            if (!api) return [];
            const res = await getLibraryApi(api).getItems({
                userId: userId || undefined,
                parentId: libraryId || undefined,
                includeItemTypes: [BaseItemKind.MusicAlbum],
                recursive: true,
                fields: [ItemFields.PrimaryImageAspectRatio],
                sortBy: [ItemSortBy.DateCreated],
                sortOrder: [SortOrder.Descending],
                limit: 200
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api) && filter === 'albums'
    });

    let entries: BaseItemDto[] | undefined;
    if (filter === 'playlists') entries = playlists;
    else if (filter === 'artists') entries = artists;
    else entries = albums;

    const getSubtitle = (entry: BaseItemDto): string => {
        if (filter === 'playlists') {
            const count = entry.ChildCount ?? 0;
            return `Playlist · ${count} ${count === 1 ? 'song' : 'songs'}`;
        }
        if (filter === 'artists') return 'Artist';
        return `Album · ${entry.AlbumArtist || entry.Artists?.[0] || 'Various Artists'}`;
    };

    let emptyText = 'No albums yet.';
    if (filter === 'playlists') emptyText = 'No playlists yet. Use + to make one.';
    else if (filter === 'artists') emptyText = 'No artists yet.';

    return (
        <aside className='khylo-music-side'>
            <nav className='khylo-music-side__card khylo-music-side__card--nav' aria-label='Music sections'>
                <div className='khylo-music-side__brand'>
                    <LibraryMusicIcon className='khylo-music-side__brand-icon' />
                    <span>Music</span>
                </div>

                {NAV_ITEMS.map(item => {
                    const isActive = activeTab === item.tab;
                    return (
                        <button
                            key={item.tab}
                            type='button'
                            className={classNames('khylo-music-side__item', {
                                'khylo-music-side__item--active': isActive
                            })}
                            onClick={() => goToTab(item.tab)}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {isActive ? item.activeIcon : item.icon}
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <section className='khylo-music-side__card khylo-music-side__card--library'>
                <div className='khylo-music-side__library-head'>
                    <LibraryMusicOutlinedIcon />
                    <span>Your Library</span>
                    <button
                        type='button'
                        className='khylo-music-side__create'
                        aria-label='Create playlist'
                        title='Create playlist'
                        onClick={() => openPlaylistEditor({ items: [], serverId: ServerConnections.currentApiClient()?.serverId() })}
                    >
                        <AddIcon />
                    </button>
                </div>

                <div className='khylo-music-side__pills' role='tablist' aria-label='Show in Your Library'>
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            type='button'
                            role='tab'
                            aria-selected={filter === f.id}
                            className={classNames('khylo-music-side__pill', {
                                'khylo-music-side__pill--active': filter === f.id
                            })}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className='khylo-music-side__playlists'>
                    {(entries || []).map(entry => {
                        const cover = getItemImageUrl(api, entry, 'primary', 120);
                        return (
                            <button
                                key={entry.Id}
                                type='button'
                                className='khylo-music-side__playlist'
                                onClick={() => navigate(`/details?id=${entry.Id}`)}
                            >
                                {cover ? (
                                    <img
                                        src={cover}
                                        alt=''
                                        className={classNames('khylo-music-side__playlist-cover', {
                                            'khylo-music-side__playlist-cover--round': filter === 'artists'
                                        })}
                                        loading='lazy'
                                    />
                                ) : (
                                    <span
                                        className={classNames('khylo-music-side__playlist-cover', 'khylo-music-side__playlist-cover--fallback', {
                                            'khylo-music-side__playlist-cover--round': filter === 'artists'
                                        })}
                                    >
                                        <MusicNoteIcon />
                                    </span>
                                )}
                                <span className='khylo-music-side__playlist-text'>
                                    <span className='khylo-music-side__playlist-name'>{entry.Name}</span>
                                    <span className='khylo-music-side__playlist-sub'>{getSubtitle(entry)}</span>
                                </span>
                            </button>
                        );
                    })}
                    {entries && entries.length === 0 && (
                        <p className='khylo-music-side__empty'>{emptyText}</p>
                    )}
                </div>
            </section>

            <button type='button' className='khylo-music-side__card khylo-music-side__back' onClick={() => navigate('/home')}>
                <ArrowBackIosNewIcon />
                <span>Back to Khylo</span>
            </button>
        </aside>
    );
};
