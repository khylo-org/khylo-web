import React, { useState, useMemo, type FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';

// MUI Outlined Icons
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import MovieCreationOutlined from '@mui/icons-material/MovieCreationOutlined';
import TvOutlined from '@mui/icons-material/TvOutlined';
import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import PushPin from '@mui/icons-material/PushPin';
import PushPinOutlined from '@mui/icons-material/PushPinOutlined';

import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import BookmarkBorderOutlined from '@mui/icons-material/BookmarkBorderOutlined';
import QueueMusicOutlined from '@mui/icons-material/QueueMusicOutlined';
import FolderSpecialOutlined from '@mui/icons-material/FolderSpecialOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';

import PeopleOutline from '@mui/icons-material/PeopleOutline';
import TimelineOutlined from '@mui/icons-material/TimelineOutlined';
import FolderSharedOutlined from '@mui/icons-material/FolderSharedOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import AlbumOutlined from '@mui/icons-material/AlbumOutlined';
import PodcastsOutlined from '@mui/icons-material/PodcastsOutlined';
import LibraryMusicOutlined from '@mui/icons-material/LibraryMusicOutlined';
import VideoLibraryOutlined from '@mui/icons-material/VideoLibraryOutlined';
import LiveTvOutlined from '@mui/icons-material/LiveTvOutlined';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { getUserViewApi } from '@khylo/sdk/lib/utils/api/user-view-api';
import { useApi } from 'hooks/useApi';
import { useLiveChannelsEnabled } from 'components/khylo/live/useLiveChannelsEnabled';
import khyloIcon from 'assets/img/khylo-icon.png';
import './KhyloNavRail.scss';

interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactElement;
}

const MY_STUFF_ITEMS: NavItem[] = [
    { id: 'continue', label: 'Continue', path: '/home?tab=continue', icon: <PlayCircleOutline /> },
    { id: 'watchlist', label: 'Watchlist', path: '/home?tab=1', icon: <BookmarkBorderOutlined /> },
    { id: 'playlists', label: 'Playlists', path: '/playlists', icon: <QueueMusicOutlined /> },
    { id: 'collections', label: 'Collections', path: '/boxsets', icon: <FolderSpecialOutlined /> },
    { id: 'history', label: 'History', path: '/home#history', icon: <HistoryOutlined /> }
];

const SOCIAL_ITEMS: NavItem[] = [
    { id: 'friends', label: 'Friends', path: '/social/friends', icon: <PeopleOutline /> },
    { id: 'activity', label: 'Activity', path: '/social/activity', icon: <TimelineOutlined /> },
    { id: 'shared', label: 'Shared With Me', path: '/social/shared', icon: <FolderSharedOutlined /> }
];

const PERSONAL_ITEMS: NavItem[] = [
    { id: 'settings', label: 'Settings', path: '/mypreferencesmenu', icon: <SettingsOutlined /> },
    { id: 'profile', label: 'Profile', path: '/userprofile', icon: <PersonOutline /> }
];

const getLibraryIcon = (collectionType?: string | null, name?: string | null) => {
    const lowerName = (name || '').toLowerCase();
    if (lowerName.includes('audiobook')) return <HeadphonesOutlined />;
    if (lowerName.includes('podcast')) return <PodcastsOutlined />;
    if (lowerName.includes('comic') || lowerName.includes('manga')) return <AutoStoriesOutlined />;
    if (lowerName.includes('dvd')) return <AlbumOutlined />;
    if (lowerName.includes('music video')) return <LibraryMusicOutlined />;
    if (lowerName.includes('photo') || lowerName.includes('raw')) return <ImageOutlined />;
    if (lowerName.includes('home video')) return <VideoLibraryOutlined />;

    switch (collectionType?.toLowerCase()) {
        case 'movies':
            return <MovieCreationOutlined />;
        case 'tvshows':
            return <TvOutlined />;
        case 'music':
            return <HeadphonesOutlined />;
        case 'books':
            return <MenuBookOutlined />;
        case 'boxsets':
            return <FolderSpecialOutlined />;
        case 'homevideos':
            return <VideoLibraryOutlined />;
        case 'photos':
            return <ImageOutlined />;
        case 'musicvideos':
            return <LibraryMusicOutlined />;
        case 'livetv':
            return <TvOutlined />;
        default:
            return <FolderSpecialOutlined />;
    }
};

const getLibraryRoute = (view: BaseItemDto) => {
    const colType = view.CollectionType?.toLowerCase();
    const nameLower = (view.Name || '').toLowerCase();
    if (colType === 'audiobooks' || nameLower.includes('audiobook')) {
        return `/books?topParentId=${view.Id}`;
    }
    switch (colType) {
        case 'movies':
            return `/movies?topParentId=${view.Id}`;
        case 'tvshows':
            return `/tv?topParentId=${view.Id}`;
        case 'music':
            return `/music?topParentId=${view.Id}`;
        case 'books':
            return `/books?topParentId=${view.Id}`;
        case 'boxsets':
            return `/boxsets?topParentId=${view.Id}`;
        case 'homevideos':
            return `/homevideos?topParentId=${view.Id}`;
        case 'photos':
            return `/photos?topParentId=${view.Id}`;
        case 'comics':
            return `/books?topParentId=${view.Id}`;
        case 'podcasts':
            return `/mixed?topParentId=${view.Id}`;
        case 'musicvideos':
            return `/musicvideos?topParentId=${view.Id}`;
        case 'livetv':
            return '/livetv';
        default:
            return `/mixed?topParentId=${view.Id}`;
    }
};

export interface KhyloNavRailProps {
    className?: string;
    isPinned?: boolean;
    onTogglePin?: () => void;
}

export const KhyloNavRail: FC<KhyloNavRailProps> = ({ className, isPinned = false, onTogglePin }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { api, user } = useApi();
    const userId = user?.Id;
    const isLiveEnabled = useLiveChannelsEnabled();

    const [ isHovered, setIsHovered ] = useState(false);
    const [ internalPinned, setInternalPinned ] = useState(() => {
        try {
            return localStorage.getItem('khylo_nav_pinned') === 'true';
        } catch {
            return false;
        }
    });

    const pinned = onTogglePin ? isPinned : internalPinned;
    const isExpanded = isHovered || pinned;

    // Dynamically fetch user libraries so only actual mounted media appears in Browse
    const { data: userViews } = useQuery({
        queryKey: ['KhyloUserLibraries', userId],
        queryFn: async () => {
            if (!api || !userId) return [];
            const res = await getUserViewApi(api).getUserViews({ userId });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId)
    });

    const mediaNavItems = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [
            { id: 'home', label: 'Home', path: '/home', icon: <HomeOutlined /> }
        ];
        // Hidden only once the server says it's off, so the link doesn't flicker in on load
        if (isLiveEnabled !== false) {
            items.push({ id: 'live', label: 'Khylo TV', path: '/live', icon: <LiveTvOutlined /> });
        }

        if (userViews && userViews.length > 0) {
            // Filter out Playlists from Browse since Playlists is in My Stuff
            const browseViews = userViews.filter(v => v.CollectionType?.toLowerCase() !== 'playlists');
            for (const view of browseViews) {
                if (view.Id && view.Name) {
                    items.push({
                        id: `lib-${view.Id}`,
                        label: view.Name,
                        path: getLibraryRoute(view),
                        icon: getLibraryIcon(view.CollectionType, view.Name)
                    });
                }
            }
        }

        return items;
    }, [ userViews, isLiveEnabled ]);

    const isAdmin = Boolean(user?.Policy?.IsAdministrator);

    const personalNavItems = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [...PERSONAL_ITEMS];
        if (isAdmin) {
            items.push(
                { id: 'admin', label: 'Admin Portal', path: '/dashboard', icon: <AdminPanelSettingsOutlined /> },
                { id: 'metadata', label: 'Meta Manager', path: '/dashboard/metadata', icon: <EditOutlined /> }
            );
        }
        return items;
    }, [isAdmin]);

    const isActive = (item: NavItem) => {
        if (item.path.startsWith('/home') && location.pathname === '/home') {
            if (item.id === 'continue') {
                return location.search.includes('tab=continue');
            }
            if (item.id === 'watchlist') {
                return location.search.includes('tab=1');
            }
            if (item.id === 'history') {
                return location.hash === '#history';
            }
            return !location.search.includes('tab=') && !location.hash;
        }

        if (item.id === 'settings') {
            return location.pathname.includes('mypreferences') || location.pathname.includes('settings');
        }

        if (item.id === 'profile') {
            return location.pathname.includes('userprofile') || location.pathname.includes('profile');
        }

        const [ itemPathname, itemSearch ] = item.path.split('?');

        if (location.pathname !== itemPathname) {
            return false;
        }

        if (itemSearch) {
            const itemParams = new URLSearchParams(itemSearch);
            const currentParams = new URLSearchParams(location.search);
            const itemTopParentId = itemParams.get('topParentId');
            if (itemTopParentId) {
                return currentParams.get('topParentId') === itemTopParentId;
            }
        }

        const currentTopParentId = new URLSearchParams(location.search).get('topParentId');
        if (currentTopParentId) {
            return false;
        }

        return true;
    };

    const handleNavigate = (path: string) => {
        if (path.startsWith('/home#')) {
            const hash = path.substring(5);
            navigate('/home');
            setTimeout(() => {
                const targetId = hash.replace('#', '');
                const el = document.getElementById(targetId === 'continue' ? 'continue-watching' : targetId);
                el?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
            return;
        }
        navigate(path);
    };

    const togglePin = () => {
        if (onTogglePin) {
            onTogglePin();
        } else {
            setInternalPinned(p => {
                const next = !p;
                try {
                    localStorage.setItem('khylo_nav_pinned', String(next));
                } catch {
                    // ignore
                }
                return next;
            });
        }
    };

    return (
        <aside
            className={classNames(
                'khylo-nav-rail',
                {
                    'khylo-nav-rail--expanded': isExpanded,
                    'khylo-nav-rail--pinned': pinned
                },
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label='Main Navigation'
        >
            {/* Top Brand Mark + Pin Toggle */}
            <div className='khylo-nav-rail__header'>
                <div
                    className='khylo-nav-rail__brand-mark'
                    onClick={() => navigate('/home')}
                    role='button'
                    tabIndex={0}
                >
                    <img src={khyloIcon} alt='Khylo' className='khylo-nav-rail__logo-img' />
                </div>
                {isExpanded && (
                    <>
                        <span
                            className='khylo-nav-rail__brand-name'
                            onClick={() => navigate('/home')}
                            role='button'
                            tabIndex={0}
                        >
                            KHYLO
                        </span>
                        <button
                            type='button'
                            className='khylo-nav-rail__pin-btn'
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePin();
                            }}
                            title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
                            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
                        >
                            {pinned ? (
                                <PushPin fontSize='small' />
                            ) : (
                                <PushPinOutlined fontSize='small' style={{ transform: 'rotate(45deg)' }} />
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Scrollable Navigation Items */}
            <nav className='khylo-nav-rail__scroll-container'>
                {/* Section: Media (Dynamic based on mounted libraries) */}
                <div className='khylo-nav-rail__section'>
                    {isExpanded && <div className='khylo-nav-rail__section-title'>Browse</div>}
                    {mediaNavItems.map((item) => {
                        const active = isActive(item);
                        return (
                            <button
                                key={item.id}
                                type='button'
                                onClick={() => handleNavigate(item.path)}
                                className={classNames('khylo-nav-rail__item', {
                                    'khylo-nav-rail__item--active': active
                                })}
                                title={!isExpanded ? item.label : undefined}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className='khylo-nav-rail__item-indicator' />
                                <span className='khylo-nav-rail__item-icon'>{item.icon}</span>
                                {isExpanded && <span className='khylo-nav-rail__item-label'>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className='khylo-nav-rail__divider' />

                {/* Section: My Stuff */}
                <div className='khylo-nav-rail__section'>
                    {isExpanded && <div className='khylo-nav-rail__section-title'>My Stuff</div>}
                    {MY_STUFF_ITEMS.map((item) => {
                        const active = isActive(item);
                        return (
                            <button
                                key={item.id}
                                type='button'
                                onClick={() => handleNavigate(item.path)}
                                className={classNames('khylo-nav-rail__item', {
                                    'khylo-nav-rail__item--active': active
                                })}
                                title={!isExpanded ? item.label : undefined}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className='khylo-nav-rail__item-indicator' />
                                <span className='khylo-nav-rail__item-icon'>{item.icon}</span>
                                {isExpanded && <span className='khylo-nav-rail__item-label'>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className='khylo-nav-rail__divider' />

                {/* Section: Social */}
                <div className='khylo-nav-rail__section'>
                    {isExpanded && <div className='khylo-nav-rail__section-title'>Social</div>}
                    {SOCIAL_ITEMS.map((item) => {
                        const active = isActive(item);
                        return (
                            <button
                                key={item.id}
                                type='button'
                                onClick={() => handleNavigate(item.path)}
                                className={classNames('khylo-nav-rail__item', {
                                    'khylo-nav-rail__item--active': active
                                })}
                                title={!isExpanded ? item.label : undefined}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className='khylo-nav-rail__item-indicator' />
                                <span className='khylo-nav-rail__item-icon'>{item.icon}</span>
                                {isExpanded && <span className='khylo-nav-rail__item-label'>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className='khylo-nav-rail__divider' />

                {/* Section: Personal (Spec 16) */}
                <div className='khylo-nav-rail__section khylo-nav-rail__section--personal'>
                    {isExpanded && <div className='khylo-nav-rail__section-title'>Personal</div>}
                    {personalNavItems.map((item) => {
                        const active = isActive(item);
                        return (
                            <button
                                key={item.id}
                                type='button'
                                onClick={() => handleNavigate(item.path)}
                                className={classNames('khylo-nav-rail__item', {
                                    'khylo-nav-rail__item--active': active
                                })}
                                title={!isExpanded ? item.label : undefined}
                                aria-current={active ? 'page' : undefined}
                            >
                                <span className='khylo-nav-rail__item-indicator' />
                                <span className='khylo-nav-rail__item-icon'>{item.icon}</span>
                                {isExpanded && <span className='khylo-nav-rail__item-label'>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
};
