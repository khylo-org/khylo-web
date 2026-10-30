import React, { useState, useRef, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SwitchAccountOutlinedIcon from '@mui/icons-material/SwitchAccountOutlined';
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined';

import { useApi } from 'hooks/useApi';
import { logout } from 'utils/dashboard';
import UserAvatar from 'components/UserAvatar';
import { KhyloSearchModal } from './KhyloSearchModal';
import { KhyloProfilePicker } from '../profiles/KhyloProfilePicker';
import { KhyloNotificationCenter } from './KhyloNotificationCenter';
import { KhyloHandoff } from './KhyloHandoff';
import { KhyloSignInAnotherDevice } from '../signin/KhyloSignInAnotherDevice';
import './KhyloTopBar.scss';

export interface KhyloTopBarProps {
    className?: string;
    onMenuToggle?: () => void;
}

export const KhyloTopBar: FC<KhyloTopBarProps> = ({ className }) => {
    const { user } = useApi();
    const navigate = useNavigate();

    const [ isSearchOpen, setIsSearchOpen ] = useState(false);
    const [ isProfileMenuOpen, setIsProfileMenuOpen ] = useState(false);
    const [ isProfilePickerOpen, setIsProfilePickerOpen ] = useState(false);
    const [ isSignInAnotherOpen, setIsSignInAnotherOpen ] = useState(false);
    const [ isNotifOpen, setIsNotifOpen ] = useState(false);
    const [ unreadCount, setUnreadCount ] = useState(0);
    // Clear over the artwork at the top of a page; a dark frosted bar once you scroll
    const [ isScrolled, setIsScrolled ] = useState(false);

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notifWrapperRef = useRef<HTMLDivElement>(null);

    const isAdmin = Boolean(user?.Policy?.IsAdministrator);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global keyboard shortcut '/' or 'Ctrl+K' / 'Cmd+K' to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) && !isSearchOpen) {
                const activeTag = document.activeElement?.tagName.toLowerCase();
                if (activeTag !== 'input' && activeTag !== 'textarea') {
                    e.preventDefault();
                    setIsSearchOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen]);

    const handleLogout = () => {
        setIsProfileMenuOpen(false);
        logout();
    };

    return (
        <>
            <header className={`khylo-topbar ${isScrolled ? 'khylo-topbar--scrolled' : ''} ${className ?? ''}`} role='banner'>
                {/* Center / Search Input (Specs 26–28: 520–600px wide, 44–48px high) */}
                <div className='khylo-topbar__search-container'>
                    <button
                        type='button'
                        onClick={() => setIsSearchOpen(true)}
                        className='khylo-topbar__search-trigger'
                        aria-label='Search movies, shows, music, games, and more'
                    >
                        <SearchIcon className='khylo-topbar__search-icon' />
                        <span className='khylo-topbar__search-placeholder'>
                            Search movies, shows, music, games, and more...
                        </span>
                        <kbd className='khylo-topbar__search-kbd'>/</kbd>
                    </button>
                </div>

                {/* Right Utility Section (Specs 29, 31, 32, 109, 110) */}
                <div className='khylo-topbar__actions'>
                    {/* Handoff: move playback between your devices */}
                    <KhyloHandoff />

                    {/* Notification Center Trigger & Popover (Specs 29, 31) */}
                    <div className='khylo-topbar__notif-wrapper' ref={notifWrapperRef}>
                        <button
                            type='button'
                            className={`khylo-topbar__action-btn ${isNotifOpen ? 'khylo-topbar__action-btn--active' : ''}`}
                            title='Notifications'
                            aria-label='Notifications'
                            onClick={() => {
                                setIsNotifOpen(prev => !prev);
                                setIsProfileMenuOpen(false);
                            }}
                        >
                            {unreadCount > 0 ? (
                                <NotificationsActiveOutlined />
                            ) : (
                                <NotificationsNoneOutlined />
                            )}
                            {unreadCount > 0 && <span className='khylo-topbar__notif-dot' />}
                        </button>

                        <KhyloNotificationCenter
                            isOpen={isNotifOpen}
                            onClose={() => setIsNotifOpen(false)}
                            onUnreadCountChange={setUnreadCount}
                        />
                    </div>

                    {/* Compact Profile Avatar Trigger & Popover (Specs 29, 32) */}
                    <div className='khylo-topbar__profile-wrapper' ref={profileMenuRef}>
                        <button
                            type='button'
                            className={`khylo-topbar__avatar-btn ${isProfileMenuOpen ? 'khylo-topbar__avatar-btn--active' : ''}`}
                            onClick={() => {
                                setIsProfileMenuOpen(prev => !prev);
                                setIsNotifOpen(false);
                            }}
                            aria-expanded={isProfileMenuOpen}
                            aria-haspopup='true'
                            aria-label='User profile menu'
                        >
                            <div className='khylo-topbar__avatar'>
                                <UserAvatar user={user} size={36} />
                            </div>
                        </button>

                        {/* Floating Liquid-Glass Profile Menu */}
                        {isProfileMenuOpen && (
                            <div className='khylo-topbar__dropdown' role='menu'>
                                <div className='khylo-topbar__dropdown-user-info'>
                                    <UserAvatar user={user} size={42} />
                                    <div className='khylo-topbar__dropdown-user-text'>
                                        <div className='khylo-topbar__dropdown-name'>{user?.Name || 'User'}</div>
                                        <div className='khylo-topbar__dropdown-sub'>
                                            {isAdmin ? 'Administrator' : 'Khylo Member'}
                                        </div>
                                    </div>
                                </div>

                                <div className='khylo-topbar__dropdown-divider' />

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item'
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        setIsProfilePickerOpen(true);
                                    }}
                                >
                                    <SwitchAccountOutlinedIcon />
                                    <span>Switch profile</span>
                                </button>

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item'
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        navigate('/userprofile');
                                    }}
                                >
                                    <PersonOutlineIcon />
                                    <span>Profile</span>
                                </button>

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item'
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        navigate('/mypreferencesmenu');
                                    }}
                                >
                                    <SettingsOutlinedIcon />
                                    <span>Settings Hub</span>
                                </button>

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item'
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        navigate('/mypreferencesdisplay');
                                    }}
                                >
                                    <TuneOutlinedIcon />
                                    <span>Display & Audio</span>
                                </button>

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item'
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        navigate('/quickconnect');
                                    }}
                                >
                                    <DevicesOutlinedIcon />
                                    <span>Add a device</span>
                                </button>

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item'
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        setIsSignInAnotherOpen(true);
                                    }}
                                >
                                    <QrCode2Outlined />
                                    <span>Sign in another device</span>
                                </button>

                                {isAdmin && (
                                    <>
                                        <button
                                            type='button'
                                            role='menuitem'
                                            className='khylo-topbar__dropdown-item'
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                navigate('/dashboard');
                                            }}
                                        >
                                            <AdminPanelSettingsOutlined />
                                            <span>Server Dashboard</span>
                                        </button>
                                        <button
                                            type='button'
                                            role='menuitem'
                                            className='khylo-topbar__dropdown-item'
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                navigate('/dashboard/metadata');
                                            }}
                                        >
                                            <EditOutlined />
                                            <span>Metadata Manager</span>
                                        </button>
                                    </>
                                )}

                                <div className='khylo-topbar__dropdown-divider' />

                                <button
                                    type='button'
                                    role='menuitem'
                                    className='khylo-topbar__dropdown-item khylo-topbar__dropdown-item--logout'
                                    onClick={handleLogout}
                                >
                                    <LogoutOutlinedIcon />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Focused Search Modal */}
            <KhyloSearchModal
                open={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />

            {isProfilePickerOpen && <KhyloProfilePicker onClose={() => setIsProfilePickerOpen(false)} />}

            {isSignInAnotherOpen && <KhyloSignInAnotherDevice open onClose={() => setIsSignInAnotherOpen(false)} />}
        </>
    );
};
