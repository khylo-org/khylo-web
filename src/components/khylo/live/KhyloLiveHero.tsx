import React, { useEffect, useState, type FC } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { AmbientBackdrop } from '../ui/AmbientBackdrop';
import {
    formatClockTime,
    getProgramImageUrl,
    getProgramLogoUrl,
    getProgramSubtitle,
    getProgramTitle,
    type LiveChannel,
    type LiveChannelProgram
} from './liveChannelsApi';
import '../home/KhyloHero.scss';
import './KhyloLiveHero.scss';

const MINUTE_MS = 60_000;

export interface KhyloLiveHeroProps {
    channel: LiveChannel;
    program: LiveChannelProgram;
    next?: LiveChannelProgram;
    /** True when showing a program that hasn't aired yet (picked in the guide). */
    isUpcoming: boolean;
    now: number;
    isTuning: boolean;
    onWatch: () => void;
    onChannelInfo: () => void;
}

/**
 * The Live Channels billboard: the same cinematic hero as the Movies and TV pages, showing what's
 * on the selected channel.
 */
export const KhyloLiveHero: FC<KhyloLiveHeroProps> = ({ channel, program, next, isUpcoming, now, isTuning, onWatch, onChannelInfo }) => {
    const { api } = useApi();
    const [ logoFailed, setLogoFailed ] = useState(false);
    const [ imageFailed, setImageFailed ] = useState(false);

    useEffect(() => {
        setLogoFailed(false);
        setImageFailed(false);
    }, [program.ItemId]);

    const backdropUrl = imageFailed ? null : getProgramImageUrl(api, program, 1920);
    const logoUrl = logoFailed ? null : getProgramLogoUrl(api, program);
    const title = getProgramTitle(program);
    const subtitle = getProgramSubtitle(program);

    const startMs = Date.parse(program.StartUtc);
    const endMs = Date.parse(program.EndUtc);
    const progress = Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100));
    const minutesLeft = Math.max(1, Math.round((endMs - now) / MINUTE_MS));

    const metadata = [
        program.SeriesName ? null : program.ProductionYear,
        program.OfficialRating,
        isUpcoming ? `${formatClockTime(program.StartUtc)} – ${formatClockTime(program.EndUtc)}` : `Until ${formatClockTime(program.EndUtc)}`
    ].filter(Boolean);

    return (
        <section className='khylo-hero khylo-live-hero' aria-label={`${channel.Name}: ${title}`}>
            <AmbientBackdrop imageUrl={backdropUrl} opacity={0.08} />

            <div className='khylo-hero__backdrop-wrapper'>
                <div className='khylo-hero__backdrop-slide khylo-hero__backdrop-slide--active' key={program.ItemId}>
                    {backdropUrl && (
                        <img
                            src={backdropUrl}
                            alt=''
                            className='khylo-hero__backdrop-img'
                            onError={() => setImageFailed(true)}
                        />
                    )}
                </div>
                <div className='khylo-hero__gradient-left' />
                <div className='khylo-hero__gradient-bottom' />
                <div className='khylo-hero__gradient-top' />
                <div className='khylo-hero__gradient-right' />
            </div>

            <div className='khylo-hero__content-container'>
                <div className='khylo-hero__content' key={`${channel.Id}-${program.ItemId}-${program.StartUtc}`}>
                    <div className='khylo-hero__context-tag'>
                        {isUpcoming ? (
                            <span className='khylo-live-hero__later'>{`AIRS AT ${formatClockTime(program.StartUtc).toUpperCase()}`}</span>
                        ) : (
                            <>
                                <span className='khylo-live-hero__live-dot' />
                                <span>LIVE NOW</span>
                            </>
                        )}
                        <span className='khylo-live-hero__channel'>{`CH ${channel.Number} · ${channel.Name.toUpperCase()}`}</span>
                    </div>

                    {logoUrl ? (
                        <div className='khylo-hero__logo-wrap'>
                            <img
                                src={logoUrl}
                                alt={title}
                                className='khylo-hero__logo-img'
                                onError={() => setLogoFailed(true)}
                            />
                        </div>
                    ) : (
                        <h1 className='khylo-hero__title'>{title}</h1>
                    )}

                    {program.SeriesName && subtitle && (
                        <div className='khylo-hero__episode-title'>{subtitle}</div>
                    )}

                    {metadata.length > 0 && (
                        <div className='khylo-hero__metadata'>
                            {metadata.map((part, index) => (
                                <React.Fragment key={String(part)}>
                                    {index > 0 && <span className='khylo-hero__metadata-sep'>·</span>}
                                    <span>{part}</span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {!isUpcoming && (
                        <div className='khylo-hero__progress-container'>
                            <div className='khylo-hero__progress-track'>
                                <div className='khylo-hero__progress-fill' style={{ width: `${progress}%` }} />
                            </div>
                            <span className='khylo-hero__progress-label'>{`${minutesLeft} min left`}</span>
                        </div>
                    )}

                    {program.Overview && <p className='khylo-hero__summary'>{program.Overview}</p>}

                    <div className='khylo-hero__actions'>
                        <KhyloButton
                            variant='primary'
                            size='lg'
                            icon={<PlayArrowIcon />}
                            onClick={onWatch}
                            disabled={isTuning}
                            className='khylo-hero__play-btn'
                        >
                            {isTuning ? 'TUNING IN…' : 'WATCH LIVE'}
                        </KhyloButton>
                        <KhyloButton
                            variant='secondary'
                            size='lg'
                            icon={<InfoOutlinedIcon />}
                            onClick={onChannelInfo}
                            className='khylo-hero__details-btn'
                        >
                            CHANNEL INFO
                        </KhyloButton>
                    </div>

                    {!isUpcoming && next && (
                        <p className='khylo-live-hero__up-next'>
                            <span>UP NEXT</span>
                            {`${formatClockTime(next.StartUtc)} · ${getProgramTitle(next)}`}
                        </p>
                    )}
                </div>
            </div>

            {program.OfficialRating && (
                <div className='khylo-hero__maturity-badge'>
                    <span className='khylo-hero__maturity-text'>{program.OfficialRating}</span>
                </div>
            )}
        </section>
    );
};
