import React, { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import axios from 'axios';

import { useApi } from 'hooks/useApi';
import './KhyloNotificationCenter.scss';

export interface KhyloNotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadCountChange?: (count: number) => void;
}

interface KhyloNotification {
    Id: string;
    Kind: string;
    Title: string;
    Text?: string | null;
    ItemId?: string | null;
    ImageItemId?: string | null;
    Date: string;
    Read: boolean;
}

interface NotificationList {
    Items: KhyloNotification[];
    UnreadCount: number;
}

const POLL_MS = 60_000;

const timeAgo = (iso: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
};

/**
 * The bell's panel: new things in your libraries. Kept on the server, so reading or clearing them here does
 * the same everywhere you're signed in.
 */
export const KhyloNotificationCenter: FC<KhyloNotificationCenterProps> = ({
    isOpen,
    onClose,
    onUnreadCountChange
}) => {
    const { api, user } = useApi();
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);
    const [ notifications, setNotifications ] = useState<KhyloNotification[]>([]);
    const [ unreadCount, setUnreadCount ] = useState(0);

    const request = useCallback(async (method: 'get' | 'post' | 'delete', path = '') => {
        if (!api) return null;
        const response = await axios.request<NotificationList>({
            method,
            url: `${api.basePath}/Khylo/Notifications${path}`,
            headers: { Authorization: `MediaBrowser Token="${api.accessToken}"` }
        });
        return response.data;
    }, [ api ]);

    const refresh = useCallback(async () => {
        try {
            const list = await request('get');
            if (list) {
                setNotifications(list.Items ?? []);
                setUnreadCount(list.UnreadCount ?? 0);
            }
        } catch (err) {
            console.warn('[KhyloNotificationCenter] failed to load notifications', err);
        }
    }, [ request ]);

    // Load now, every minute, and whenever the panel opens
    useEffect(() => {
        if (!api || !user?.Id) return undefined;
        void refresh();
        const timer = setInterval(() => void refresh(), POLL_MS);
        return () => clearInterval(timer);
    }, [ api, user?.Id, refresh ]);

    useEffect(() => {
        if (isOpen) void refresh();
    }, [ isOpen, refresh ]);

    useEffect(() => {
        onUnreadCountChange?.(unreadCount);
    }, [ unreadCount, onUnreadCountChange ]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ isOpen, onClose ]);

    const act = useCallback(async (method: 'post' | 'delete', path: string, local: (list: KhyloNotification[]) => KhyloNotification[]) => {
        // Change it on screen straight away, then on the server
        setNotifications(prev => {
            const next = local(prev);
            setUnreadCount(next.filter(n => !n.Read).length);
            return next;
        });
        try {
            await request(method, path);
        } catch (err) {
            console.warn('[KhyloNotificationCenter] update failed', err);
            void refresh();
        }
    }, [ request, refresh ]);

    const markAllRead = () => void act('post', '/Read', list => list.map(n => ({ ...n, Read: true })));
    const clearAll = () => void act('delete', '', () => []);
    const remove = (id: string) => void act('delete', `/${id}`, list => list.filter(n => n.Id !== id));

    const open = (n: KhyloNotification) => {
        if (!n.Read) void act('post', `/${n.Id}/Read`, list => list.map(x => (x.Id === n.Id ? { ...x, Read: true } : x)));
        onClose();
        if (n.ItemId) navigate(`/details?id=${n.ItemId}`);
    };

    if (!isOpen) return null;

    return (
        <div className='khylo-notif-panel' ref={panelRef} role='dialog' aria-label='Notifications'>
            <div className='khylo-notif-panel__header'>
                <div className='khylo-notif-panel__title-wrap'>
                    <h3 className='khylo-notif-panel__title'>Notifications</h3>
                    {unreadCount > 0 && <span className='khylo-notif-panel__badge'>{unreadCount} new</span>}
                </div>
                {notifications.length > 0 && (
                    <div style={{ display: 'flex', gap: 4 }}>
                        {unreadCount > 0 && (
                            <button type='button' className='khylo-notif-panel__mark-read-btn' onClick={markAllRead} title='Mark all as read'>
                                <DoneAllOutlined style={{ fontSize: '1rem' }} />
                                <span>Mark all read</span>
                            </button>
                        )}
                        <button type='button' className='khylo-notif-panel__mark-read-btn' onClick={clearAll} title='Clear all notifications'>
                            <DeleteSweepOutlined style={{ fontSize: '1rem' }} />
                            <span>Clear all</span>
                        </button>
                    </div>
                )}
            </div>

            <div className='khylo-notif-panel__list'>
                {notifications.length === 0 ? (
                    <div className='khylo-notif-panel__empty'>
                        <CheckCircleOutline style={{ fontSize: '2.5rem', color: '#858079', marginBottom: '8px' }} />
                        <div className='khylo-notif-panel__empty-title'>You&apos;re all caught up</div>
                        <div className='khylo-notif-panel__empty-desc'>New movies, shows, music and more will show up here.</div>
                    </div>
                ) : notifications.map(n => {
                    const imageUrl = n.ImageItemId && api ? `${api.basePath}/Items/${n.ImageItemId}/Images/Primary?maxWidth=120&quality=85` : null;
                    return (
                        <div
                            key={n.Id}
                            className={`khylo-notif-item ${n.Read ? 'khylo-notif-item--read' : 'khylo-notif-item--unread'}`}
                            onClick={() => open(n)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') open(n);
                            }}
                            role='button'
                            tabIndex={0}
                        >
                            <div className='khylo-notif-item__thumb'>
                                {imageUrl ? (
                                    <img src={imageUrl} alt='' onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                ) : (
                                    <div className='khylo-notif-item__thumb-fallback'><NotificationsNoneOutlined /></div>
                                )}
                            </div>
                            <div className='khylo-notif-item__content'>
                                <div className='khylo-notif-item__top'>
                                    <span className='khylo-notif-item__type'>{timeAgo(n.Date)}</span>
                                    {!n.Read && <span className='khylo-notif-item__dot' />}
                                </div>
                                <div className='khylo-notif-item__title'>{n.Title}</div>
                                {n.Text && <div className='khylo-notif-item__meta'>{n.Text}</div>}
                            </div>
                            <button
                                type='button'
                                aria-label='Remove notification'
                                title='Remove'
                                onClick={e => {
                                    e.stopPropagation();
                                    remove(n.Id);
                                }}
                                style={{ alignSelf: 'center', background: 'transparent', border: 'none', color: '#858079', cursor: 'pointer', padding: 4, display: 'flex' }}
                            >
                                <CloseRounded style={{ fontSize: '1rem' }} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KhyloNotificationCenter;
