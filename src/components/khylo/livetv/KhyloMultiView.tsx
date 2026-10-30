import React, { useEffect, useRef, useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import Hls from 'hls.js';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

import { useApi } from 'hooks/useApi';
import { getChannelLogoUrl, getChannels } from './liveTvApi';
import { closeChannelStream, openChannelStream, type MultiViewStream } from './multiViewStream';
import './KhyloMultiView.scss';

export const MULTI_VIEW_MAX = 4;

const idOf = (channel: BaseItemDto | undefined): string | null => channel?.Id ?? null;

interface TileProps {
    channel: BaseItemDto;
    hasAudio: boolean;
    isSpotlight: boolean;
    onSelectAudio: () => void;
    onToggleSpotlight: () => void;
    onChange: () => void;
    onRemove: () => void;
}

/** One channel playing in the grid. Only the tile with audio is unmuted. */
const MultiViewTile: FC<TileProps> = ({ channel, hasAudio, isSpotlight, onSelectAudio, onToggleSpotlight, onChange, onRemove }) => {
    const { api, user } = useApi();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [ status, setStatus ] = useState<'loading' | 'playing' | 'failed'>('loading');

    useEffect(() => {
        const video = videoRef.current;
        if (!api || !user?.Id || !channel.Id || !video) return;

        let stream: MultiViewStream | null = null;
        let hls: Hls | null = null;
        let isClosed = false;

        const start = async () => {
            stream = await openChannelStream(api, user.Id!, channel.Id!);
            if (isClosed) {
                closeChannelStream(api, stream);
                return;
            }

            if (Hls.isSupported()) {
                hls = new Hls({ liveSyncDurationCount: 3, manifestLoadingMaxRetry: 6, manifestLoadingRetryDelay: 1000 });
                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (data.fatal) setStatus('failed');
                });
                hls.loadSource(stream.url);
                hls.attachMedia(video);
            } else {
                // Safari plays HLS itself
                video.src = stream.url;
            }
            await video.play().catch(() => undefined);
        };

        const onPlaying = () => setStatus('playing');
        video.addEventListener('playing', onPlaying);
        start().catch(() => setStatus('failed'));

        const closeOnExit = () => stream && closeChannelStream(api, stream);
        window.addEventListener('pagehide', closeOnExit);

        return () => {
            isClosed = true;
            video.removeEventListener('playing', onPlaying);
            window.removeEventListener('pagehide', closeOnExit);
            hls?.destroy();
            video.removeAttribute('src');
            video.load();
            if (stream) closeChannelStream(api, stream);
        };
    }, [ api, user?.Id, channel.Id ]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = !hasAudio;
    }, [hasAudio]);

    const logo = getChannelLogoUrl(api, channel, 64);

    return (
        <div className={classNames('khylo-multiview__tile', { 'khylo-multiview__tile--audio': hasAudio, 'khylo-multiview__tile--spotlight': isSpotlight })}>
            <video ref={videoRef} className='khylo-multiview__video' muted playsInline onClick={onSelectAudio} />

            {status === 'loading' && <div className='khylo-multiview__state'><span className='khylo-multiview__spinner' />Tuning in…</div>}
            {status === 'failed' && (
                <div className='khylo-multiview__state'>
                    <strong>{'This channel couldn\'t start'}</strong>
                    <span>Your TV service may be out of connections. Close another view and try again.</span>
                </div>
            )}

            <div className='khylo-multiview__bar'>
                <button type='button' className='khylo-multiview__label' onClick={onSelectAudio} aria-label={`Listen to ${channel.Name ?? 'this channel'}`}>
                    {hasAudio ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    {logo && <img src={logo} alt='' />}
                    <span>{channel.ChannelNumber ? `${channel.ChannelNumber} · ${channel.Name ?? ''}` : channel.Name}</span>
                </button>
                <div className='khylo-multiview__tile-actions'>
                    <button type='button' className='khylo-multiview__change' onClick={onChange} aria-label={`Change ${channel.Name ?? 'channel'} to another channel`}>
                        <SwapHorizIcon />
                        <span>Change channel</span>
                    </button>
                    <button type='button' onClick={onToggleSpotlight} aria-label={isSpotlight ? 'Make all views the same size' : 'Make this view bigger'} title={isSpotlight ? 'Equal size' : 'Make bigger'}>
                        {isSpotlight ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
                    </button>
                    <button type='button' onClick={onRemove} aria-label={`Remove ${channel.Name ?? 'channel'}`} title='Remove'>
                        <CloseIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

/** Search for a channel to add to the grid. */
const ChannelChooser: FC<{ title: string; excludeIds: string[]; onChoose: (channel: BaseItemDto) => void; onClose: () => void }> = ({ title, excludeIds, onChoose, onClose }) => {
    const { api, user } = useApi();
    const [ search, setSearch ] = useState('');
    const [ term, setTerm ] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setTerm(search.trim()), 250);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: [ 'KhyloMultiViewChannels', user?.Id, term ],
        queryFn: () => getChannels(api!, user!.Id!, 'all', 60, term),
        enabled: Boolean(api && user?.Id)
    });
    const channels = (data?.items ?? []).filter(c => !excludeIds.includes(c.Id ?? ''));

    return (
        <div className='khylo-multiview__chooser' role='dialog' aria-label={title}>
            <div className='khylo-multiview__chooser-head'>
                <label className='khylo-multiview__search'>
                    <SearchIcon />
                    {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                    <input type='search' autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder='Find a channel' aria-label='Find a channel' />
                </label>
                <button type='button' className='khylo-multiview__icon-btn' onClick={onClose} aria-label='Cancel'><CloseIcon /></button>
            </div>
            <div className='khylo-multiview__chooser-list'>
                {isLoading && <p className='khylo-multiview__hint'>Loading channels…</p>}
                {!isLoading && channels.length === 0 && <p className='khylo-multiview__hint'>No channels match.</p>}
                {channels.map(channel => {
                    const logo = getChannelLogoUrl(api, channel, 48);
                    return (
                        <button key={channel.Id} type='button' className='khylo-multiview__chooser-item' onClick={() => onChoose(channel)}>
                            <span className='khylo-multiview__chooser-number'>{channel.ChannelNumber}</span>
                            <span className='khylo-multiview__chooser-logo'>{logo && <img src={logo} alt='' loading='lazy' />}</span>
                            <span className='khylo-multiview__chooser-name'>{channel.Name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface KhyloMultiViewProps {
    channels: BaseItemDto[];
    onChannelsChange: (channels: BaseItemDto[]) => void;
    onClose: () => void;
}

/** Up to four live channels at once, each in its own tile. */
export const KhyloMultiView: FC<KhyloMultiViewProps> = ({ channels, onChannelsChange, onClose }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [ audioId, setAudioId ] = useState<string | null>(idOf(channels[0]));
    const [ spotlightId, setSpotlightId ] = useState<string | null>(null);
    const [ isChoosing, setIsChoosing ] = useState(channels.length === 0);
    // The view being switched to another channel; null when adding a new view
    const [ replacingId, setReplacingId ] = useState<string | null>(null);
    const [ isFullscreen, setIsFullscreen ] = useState(false);

    // Sound follows the first channel until a tile is picked; a removed tile hands it on
    const audioChannelId = channels.some(c => idOf(c) === audioId) ? audioId : idOf(channels[0]);
    const spotlight = channels.length > 1 && channels.some(c => idOf(c) === spotlightId) ? spotlightId : null;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                if (isChoosing && channels.length) setIsChoosing(false);
                else onClose();
            }
        };
        // eslint-disable-next-line compat/compat
        const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('keydown', onKey);
        document.addEventListener('fullscreenchange', onFullscreen);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('fullscreenchange', onFullscreen);
        };
    }, [ isChoosing, channels.length, onClose ]);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void rootRef.current?.requestFullscreen();
        }
    };

    const startChoosing = (channelId: string | null) => {
        setReplacingId(channelId);
        setIsChoosing(true);
    };

    const choose = (channel: BaseItemDto) => {
        setIsChoosing(false);
        if (replacingId) {
            // The new channel takes the old one's place, sound and size
            onChannelsChange(channels.map(c => (idOf(c) === replacingId ? channel : c)));
            if (audioChannelId === replacingId) setAudioId(idOf(channel));
            if (spotlight === replacingId) setSpotlightId(idOf(channel));
        } else if (channels.length < MULTI_VIEW_MAX) {
            onChannelsChange([ ...channels, channel ]);
        }
        setReplacingId(null);
    };

    const remove = (channelId: string) => {
        const next = channels.filter(c => c.Id !== channelId);
        onChannelsChange(next);
        if (!next.length) setIsChoosing(true);
    };

    const canAdd = channels.length < MULTI_VIEW_MAX;

    return (
        <div ref={rootRef} className='khylo-multiview' role='dialog' aria-label='Multi View'>
            <header className='khylo-multiview__top'>
                <div>
                    <h2 className='khylo-multiview__title'>Multi View</h2>
                    <span className='khylo-multiview__subtitle'>{`${channels.length} of ${MULTI_VIEW_MAX} · click a view to hear it`}</span>
                </div>
                <div className='khylo-multiview__top-actions'>
                    {canAdd && channels.length > 0 && (
                        <button type='button' className='khylo-multiview__btn' onClick={() => startChoosing(null)}>
                            <AddIcon /> Add channel
                        </button>
                    )}
                    <button type='button' className='khylo-multiview__icon-btn' onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}>
                        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    </button>
                    <button type='button' className='khylo-multiview__icon-btn' onClick={onClose} aria-label='Close Multi View'>
                        <CloseIcon />
                    </button>
                </div>
            </header>

            <div className={classNames('khylo-multiview__grid', spotlight ? 'khylo-multiview__grid--spotlight' : `khylo-multiview__grid--${Math.max(channels.length, 1)}`)}>
                {channels.map(channel => (
                    <MultiViewTile
                        key={channel.Id}
                        channel={channel}
                        hasAudio={idOf(channel) === audioChannelId}
                        isSpotlight={idOf(channel) === spotlight}
                        onSelectAudio={() => setAudioId(idOf(channel))}
                        onToggleSpotlight={() => setSpotlightId(idOf(channel) === spotlight ? null : idOf(channel))}
                        onChange={() => startChoosing(idOf(channel))}
                        onRemove={() => remove(channel.Id!)}
                    />
                ))}
            </div>

            {isChoosing && (
                <ChannelChooser
                    title={replacingId ? 'Change channel' : 'Add a channel'}
                    excludeIds={channels.map(c => c.Id ?? '')}
                    onChoose={choose}
                    onClose={() => (channels.length ? setIsChoosing(false) : onClose())}
                />
            )}
        </div>
    );
};
