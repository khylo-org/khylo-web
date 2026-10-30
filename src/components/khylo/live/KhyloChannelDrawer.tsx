import React, { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { KhyloChannelEmblem } from './KhyloChannelEmblem';
import {
    formatClockTime,
    getLiveChannelDetails,
    getPosterUrl,
    getProgramImageUrl,
    getProgramSubtitle,
    getProgramTitle,
    type LiveChannel
} from './liveChannelsApi';
import './KhyloChannelDrawer.scss';

const SCHEDULE_HOURS = 12;

export interface KhyloChannelDrawerProps {
    channel: LiveChannel;
    now: number;
    isTuning: boolean;
    onWatch: () => void;
    onClose: () => void;
}

/**
 * Side panel describing a channel: what it is, what's on and coming up, and everything it rotates through.
 */
export const KhyloChannelDrawer: FC<KhyloChannelDrawerProps> = ({ channel, now, isTuning, onWatch, onClose }) => {
    const { api, user } = useApi();
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);
    const [ artFailed, setArtFailed ] = useState(false);

    const { data: details, isLoading } = useQuery({
        queryKey: [ 'KhyloLiveChannel', user?.Id, channel.Id ],
        queryFn: () => getLiveChannelDetails(api!, channel.Id, SCHEDULE_HOURS),
        enabled: Boolean(api && user?.Id),
        staleTime: 60_000
    });

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        panelRef.current?.focus();
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    useEffect(() => {
        setArtFailed(false);
    }, [channel.Id]);

    const programs = details?.Channel.Programs ?? channel.Programs;
    const current = programs.find(p => Date.parse(p.StartUtc) <= now && Date.parse(p.EndUtc) > now);
    const upcoming = programs.filter(p => Date.parse(p.StartUtc) > now);
    const art = current && !artFailed ? getProgramImageUrl(api, current, 1280) : null;
    const isTv = channel.Category !== 'Movies' && channel.Category !== 'Collections';
    let progress = 0;
    if (current) {
        const start = Date.parse(current.StartUtc);
        progress = Math.min(100, Math.max(0, ((now - start) / (Date.parse(current.EndUtc) - start)) * 100));
    }

    return (
        <div className='khylo-channel-drawer' role='presentation'>
            <button type='button' className='khylo-channel-drawer__scrim' onClick={onClose} aria-label='Close channel info' tabIndex={-1} />
            <aside
                className='khylo-channel-drawer__panel'
                role='dialog'
                aria-modal='true'
                aria-label={`Channel ${channel.Number}, ${channel.Name}`}
                ref={panelRef}
                tabIndex={-1}
            >
                <div className='khylo-channel-drawer__header'>
                    {art && <img className='khylo-channel-drawer__art' src={art} alt='' onError={() => setArtFailed(true)} />}
                    <div className='khylo-channel-drawer__header-fade' />
                    <button type='button' className='khylo-channel-drawer__close' onClick={onClose} aria-label='Close'>
                        <CloseIcon />
                    </button>
                    <div className='khylo-channel-drawer__heading'>
                        <KhyloChannelEmblem channel={channel} size='lg' className='khylo-channel-drawer__emblem' />
                        <span className='khylo-channel-drawer__kicker'>{`CH ${channel.Number} · ${channel.Category}`}</span>
                        <h2 className='khylo-channel-drawer__name'>{channel.Name}</h2>
                        <p className='khylo-channel-drawer__description'>{channel.Description}</p>
                    </div>
                </div>

                <div className='khylo-channel-drawer__body'>
                    <KhyloButton variant='primary' size='lg' icon={<PlayArrowIcon />} onClick={onWatch} disabled={isTuning} fullWidth>
                        {isTuning ? 'TUNING IN…' : 'WATCH LIVE'}
                    </KhyloButton>

                    {current && (
                        <section className='khylo-channel-drawer__section'>
                            <h3 className='khylo-channel-drawer__section-title'>On now</h3>
                            <div className='khylo-channel-drawer__now'>
                                <div className='khylo-channel-drawer__now-title'>{getProgramTitle(current)}</div>
                                <div className='khylo-channel-drawer__now-sub'>{getProgramSubtitle(current)}</div>
                                <div className='khylo-channel-drawer__now-progress'>
                                    <div className='khylo-channel-drawer__now-track'>
                                        <div className='khylo-channel-drawer__now-fill' style={{ width: `${progress}%` }} />
                                    </div>
                                    <span>{`Until ${formatClockTime(current.EndUtc)}`}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {upcoming.length > 0 && (
                        <section className='khylo-channel-drawer__section'>
                            <h3 className='khylo-channel-drawer__section-title'>Coming up</h3>
                            <ol className='khylo-channel-drawer__schedule'>
                                {upcoming.map(program => (
                                    <li key={`${program.ItemId}-${program.StartUtc}`} className='khylo-channel-drawer__slot'>
                                        <span className='khylo-channel-drawer__slot-time'>{formatClockTime(program.StartUtc)}</span>
                                        <span className='khylo-channel-drawer__slot-text'>
                                            <span className='khylo-channel-drawer__slot-title'>{getProgramTitle(program)}</span>
                                            <span className='khylo-channel-drawer__slot-sub'>{getProgramSubtitle(program)}</span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    <section className='khylo-channel-drawer__section'>
                        <h3 className='khylo-channel-drawer__section-title'>
                            {isTv ? 'Shows on this channel' : 'Movies on this channel'}
                            {details && <span className='khylo-channel-drawer__count'>{details.TitleCount}</span>}
                        </h3>
                        {isLoading && <p className='khylo-channel-drawer__muted'>Loading…</p>}
                        {details && (
                            <div className='khylo-channel-drawer__titles'>
                                {details.Titles.map(title => (
                                    <button
                                        type='button'
                                        key={title.ItemId}
                                        className='khylo-channel-drawer__title'
                                        onClick={() => navigate(`/details?id=${title.ItemId}`)}
                                        title={title.ProductionYear ? `${title.Name} (${title.ProductionYear})` : title.Name}
                                    >
                                        <span className='khylo-channel-drawer__poster'>
                                            <img src={getPosterUrl(api, title.ItemId) ?? ''} alt='' loading='lazy' />
                                        </span>
                                        <span className='khylo-channel-drawer__title-name'>{title.Name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {details && details.TitleCount > details.Titles.length && (
                            <p className='khylo-channel-drawer__muted'>{`and ${details.TitleCount - details.Titles.length} more`}</p>
                        )}
                    </section>
                </div>
            </aside>
        </div>
    );
};
