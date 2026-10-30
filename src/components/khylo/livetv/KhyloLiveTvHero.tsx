import React, { useEffect, useState, type FC } from 'react';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { AmbientBackdrop } from '../ui/AmbientBackdrop';
import { formatClock, getChannelLogoUrl, getProgramImageUrl, getProgramSubtitle } from './liveTvApi';
import '../home/KhyloHero.scss';
import '../live/KhyloLiveHero.scss';
import './KhyloLiveTvView.scss';

const MINUTE_MS = 60_000;

/** How far into the program, and minutes left; null without guide times. */
const getProgress = (program: BaseItemDto | undefined, now: number) => {
    const startMs = Date.parse(program?.StartDate ?? '');
    const endMs = Date.parse(program?.EndDate ?? '');
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
    return {
        percent: Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100)),
        minutesLeft: Math.max(1, Math.round((endMs - now) / MINUTE_MS))
    };
};

/** Rating, airing time and Live / Premiere tags. */
const getMetadata = (program: BaseItemDto | undefined, isUpcoming: boolean): string[] => {
    if (!program) return [];
    const timing = isUpcoming ? `${formatClock(program.StartDate)} – ${formatClock(program.EndDate)}` : `Until ${formatClock(program.EndDate)}`;
    return [
        program.OfficialRating,
        program.StartDate && program.EndDate ? timing : null,
        program.IsLive ? 'Live' : null,
        program.IsPremiere ? 'Premiere' : null
    ].filter(Boolean) as string[];
};

export interface KhyloLiveTvHeroProps {
    channel: BaseItemDto;
    /** What's on now, or a later program the viewer picked in the guide. */
    program?: BaseItemDto;
    next?: BaseItemDto;
    isUpcoming: boolean;
    now: number;
    canRecord: boolean;
    isFavorite: boolean;
    onWatch: () => void;
    onDetails: () => void;
    onToggleFavorite: () => void;
}

/** The Live TV billboard: what's on the selected channel, in the same hero as the other pages. */
export const KhyloLiveTvHero: FC<KhyloLiveTvHeroProps> = ({ channel, program, next, isUpcoming, now, canRecord, isFavorite, onWatch, onDetails, onToggleFavorite }) => {
    const { api } = useApi();
    const [ imageFailed, setImageFailed ] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [program?.Id]);

    const backdropUrl = imageFailed ? null : getProgramImageUrl(api, program, 1920);
    const channelLogo = getChannelLogoUrl(api, channel, 120);
    const title = program?.Name ?? channel.Name ?? '';
    const subtitle = program ? getProgramSubtitle(program) : '';

    const progress = getProgress(program, now);
    const metadata = getMetadata(program, isUpcoming);
    const isRecording = Boolean(program?.TimerId || program?.SeriesTimerId);

    return (
        <section className='khylo-hero khylo-live-hero' aria-label={`${channel.Name}: ${title}`}>
            <AmbientBackdrop imageUrl={backdropUrl} opacity={0.08} />

            <div className='khylo-hero__backdrop-wrapper'>
                <div className='khylo-hero__backdrop-slide khylo-hero__backdrop-slide--active' key={program?.Id ?? channel.Id}>
                    {backdropUrl && (
                        <img src={backdropUrl} alt='' className='khylo-hero__backdrop-img' onError={() => setImageFailed(true)} />
                    )}
                </div>
                <div className='khylo-hero__gradient-left' />
                <div className='khylo-hero__gradient-bottom' />
                <div className='khylo-hero__gradient-top' />
                <div className='khylo-hero__gradient-right' />
            </div>

            <div className='khylo-hero__content-container'>
                <div className='khylo-hero__content' key={`${channel.Id}-${program?.Id ?? ''}`}>
                    <div className='khylo-hero__context-tag'>
                        {isUpcoming && program ? (
                            <span className='khylo-live-hero__later'>{`AIRS AT ${formatClock(program.StartDate).toUpperCase()}`}</span>
                        ) : (
                            <>
                                <span className='khylo-live-hero__live-dot' />
                                <span>LIVE NOW</span>
                            </>
                        )}
                        <span className='khylo-live-hero__channel'>{`CH ${channel.ChannelNumber ?? channel.Number ?? ''} · ${(channel.Name ?? '').toUpperCase()}`}</span>
                    </div>

                    {channelLogo && !program && (
                        <img className='khylo-livetv-hero__channel-logo' src={channelLogo} alt='' />
                    )}
                    <h1 className='khylo-hero__title'>{title}</h1>
                    {subtitle && <div className='khylo-hero__episode-title'>{subtitle}</div>}

                    {metadata.length > 0 && (
                        <div className='khylo-hero__metadata'>
                            {metadata.map((part, index) => (
                                <React.Fragment key={part}>
                                    {index > 0 && <span className='khylo-hero__metadata-sep'>·</span>}
                                    <span>{part}</span>
                                </React.Fragment>
                            ))}
                            {isRecording && (
                                <span className='khylo-livetv-hero__recording'>
                                    <FiberManualRecordIcon /> Recording
                                </span>
                            )}
                        </div>
                    )}

                    {!isUpcoming && progress && (
                        <div className='khylo-hero__progress-container'>
                            <div className='khylo-hero__progress-track'>
                                <div className='khylo-hero__progress-fill' style={{ width: `${progress.percent}%` }} />
                            </div>
                            <span className='khylo-hero__progress-label'>{`${progress.minutesLeft} min left`}</span>
                        </div>
                    )}

                    {program?.Overview && <p className='khylo-hero__summary'>{program.Overview}</p>}
                    {!program && <p className='khylo-hero__summary'>No guide information for this channel right now.</p>}

                    <div className='khylo-hero__actions'>
                        {!isUpcoming && (
                            <KhyloButton variant='primary' size='lg' icon={<PlayArrowIcon />} onClick={onWatch} className='khylo-hero__play-btn'>
                                WATCH LIVE
                            </KhyloButton>
                        )}
                        {program && (canRecord || isUpcoming) && (
                            <KhyloButton
                                variant='secondary'
                                size='lg'
                                icon={canRecord ? <FiberManualRecordIcon /> : undefined}
                                onClick={onDetails}
                                className='khylo-hero__details-btn'
                            >
                                {canRecord ? 'RECORD' : 'DETAILS'}
                            </KhyloButton>
                        )}
                        <KhyloButton
                            variant='icon'
                            size='lg'
                            icon={isFavorite ? <StarIcon className='khylo-livetv-hero__star-on' /> : <StarBorderIcon />}
                            onClick={onToggleFavorite}
                            aria-label={isFavorite ? `Remove ${channel.Name ?? 'channel'} from favorites` : `Add ${channel.Name ?? 'channel'} to favorites`}
                            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        />
                    </div>

                    {!isUpcoming && next && (
                        <p className='khylo-live-hero__up-next'>
                            <span>UP NEXT</span>
                            {`${formatClock(next.StartDate)} · ${next.Name ?? ''}`}
                        </p>
                    )}
                </div>
            </div>

            {program?.OfficialRating && (
                <div className='khylo-hero__maturity-badge'>
                    <span className='khylo-hero__maturity-text'>{program.OfficialRating}</span>
                </div>
            )}
        </section>
    );
};
