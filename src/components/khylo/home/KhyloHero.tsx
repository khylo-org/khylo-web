import React, { useState, useEffect, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HeadsetIcon from '@mui/icons-material/Headset';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { useApi } from 'hooks/useApi';
import { useToggleFavoriteMutation } from 'hooks/useFetchItems';
import { KhyloButton } from '../ui/KhyloButton';
import { AmbientBackdrop } from '../ui/AmbientBackdrop';
import {
    getItemImageUrl,
    getItemSubtitle,
    getPlaybackPercentage,
    formatTicksToDuration,
    formatTimeRemaining,
    playMediaItem,
    isEbookMediaItem,
    isAudiobookMediaItem
} from '../media/mediaUtils';
import './KhyloHero.scss';

export interface KhyloHeroProps {
    items: BaseItemDto[];
    contextTag?: string;
    className?: string;
    isLoading?: boolean;
    onItemClick?: (item: BaseItemDto) => void;
}

export const KhyloHero: FC<KhyloHeroProps> = ({
    items,
    contextTag = 'Featured',
    className,
    isLoading = false,
    onItemClick
}) => {
    const { api } = useApi();
    const navigate = useNavigate();
    const [ currentIndex, setCurrentIndex ] = useState(0);
    const [ isHovered, setIsHovered ] = useState(false);

    const toggleFavoriteMutation = useToggleFavoriteMutation();

    // Clamp currentIndex if items change
    useEffect(() => {
        if (items && items.length > 0 && currentIndex >= items.length) {
            setCurrentIndex(0);
        }
    }, [items, currentIndex]);

    const currentItem = items && items.length > 0 ? items[currentIndex] : null;

    const [ isFavorite, setIsFavorite ] = useState(Boolean(currentItem?.UserData?.IsFavorite));
    const [ logoFailed, setLogoFailed ] = useState(false);

    useEffect(() => {
        setIsFavorite(Boolean(currentItem?.UserData?.IsFavorite));
        setLogoFailed(false);
    }, [currentItem?.Id, currentItem?.UserData?.IsFavorite]);

    const logoUrl = (!logoFailed && currentItem) ? getItemImageUrl(api, currentItem, 'logo', 600) : null;

    // Handle slide navigation
    const handlePrev = useCallback(() => {
        if (!items || items.length <= 1) return;
        setCurrentIndex(prev => (prev === 0 ? items.length - 1 : prev - 1));
    }, [items]);

    const handleNext = useCallback(() => {
        if (!items || items.length <= 1) return;
        setCurrentIndex(prev => (prev + 1) % items.length);
    }, [items]);

    // Smooth auto-advance carousel timer (paused on hover)
    useEffect(() => {
        if (!items || items.length <= 1 || isHovered) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [items, isHovered]);

    // Skeleton loading state (eliminates layout shifts)
    if (isLoading && (!items || items.length === 0)) {
        return (
            <section
                className={classNames('khylo-hero', 'khylo-hero--skeleton', className)}
                aria-label='Loading featured media'
            >
                <div className='khylo-hero__content-container'>
                    <div className='khylo-hero__content'>
                        <div className='khylo-skeleton khylo-skeleton--text' style={{ width: 140, height: 18 }} />
                        <div className='khylo-skeleton khylo-skeleton--text' style={{ width: '70%', height: 52, margin: '8px 0' }} />
                        <div className='khylo-skeleton khylo-skeleton--text' style={{ width: 280, height: 20 }} />
                        <div className='khylo-skeleton khylo-skeleton--text' style={{ width: '85%', height: 16, marginTop: 12 }} />
                        <div className='khylo-skeleton khylo-skeleton--text' style={{ width: '65%', height: 16 }} />
                        <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
                            <div className='khylo-skeleton' style={{ width: 165, height: 48, borderRadius: 10 }} />
                            <div className='khylo-skeleton' style={{ width: 130, height: 48, borderRadius: 10 }} />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!currentItem) {
        return null;
    }

    const currentBackdropUrl = getItemImageUrl(api, currentItem, 'backdrop', 1920)
        || getItemImageUrl(api, currentItem, 'primary', 1200);

    const progress = getPlaybackPercentage(currentItem);
    const isResume = progress > 0;

    const isHeroBook = isEbookMediaItem(currentItem);
    const isHeroAudioBook = isAudiobookMediaItem(currentItem);

    // Title formatting
    const isEpisode = currentItem.Type === BaseItemKind.Episode;
    const heroTitle = isEpisode && currentItem.SeriesName ? currentItem.SeriesName : currentItem.Name;
    const episodeTitle = isEpisode ? `${getItemSubtitle(currentItem)} · ${currentItem.Name}` : null;

    // Quality badges
    const is4K = Boolean(currentItem.Width && currentItem.Width >= 3840);
    const isHD = Boolean(currentItem.IsHD || (currentItem.Width && currentItem.Width >= 1280));

    // Metadata compact row (Spec 42)
    const metadataParts: (string | React.ReactNode)[] = [];
    if (isEpisode && currentItem.ParentIndexNumber != null) {
        metadataParts.push(`Season ${currentItem.ParentIndexNumber}`);
    } else if (currentItem.ProductionYear) {
        metadataParts.push(String(currentItem.ProductionYear));
    }

    if (currentItem.OfficialRating) {
        metadataParts.push(
            <span key='rating' className='khylo-hero__rating-badge'>
                {currentItem.OfficialRating}
            </span>
        );
    }

    if (currentItem.Genres && currentItem.Genres.length > 0) {
        metadataParts.push(currentItem.Genres.slice(0, 2).join(' / '));
    }

    if (currentItem.RunTimeTicks) {
        metadataParts.push(formatTicksToDuration(currentItem.RunTimeTicks));
    }

    const videoStream = currentItem.MediaStreams?.find(s => s.Type === 'Video');
    const audioStream = currentItem.MediaStreams?.find(s => s.Type === 'Audio');
    const isHDR = Boolean(videoStream?.VideoRange && videoStream.VideoRange.includes('HDR'));
    const isDolbyVision = Boolean(videoStream?.VideoRange && (videoStream.VideoRange.toLowerCase().includes('dovi') || videoStream.VideoRange.toLowerCase().includes('vision')));
    const audioChannels = audioStream?.Channels;
    const audioBadge = audioChannels === 8 ? '7.1 Surround' : audioChannels === 6 ? '5.1 Surround' : null;

    if (is4K) {
        metadataParts.push(
            <span key='4k' className='khylo-hero__quality-badge'>4K UHD</span>
        );
    } else if (isHD) {
        metadataParts.push(
            <span key='hd' className='khylo-hero__quality-badge'>HD</span>
        );
    }

    if (isDolbyVision) {
        metadataParts.push(
            <span key='dv' className='khylo-hero__quality-badge'>Dolby Vision</span>
        );
    } else if (isHDR) {
        metadataParts.push(
            <span key='hdr' className='khylo-hero__quality-badge'>HDR10</span>
        );
    }

    if (audioBadge) {
        metadataParts.push(
            <span key='audio' className='khylo-hero__audio-badge'>{audioBadge}</span>
        );
    }

    // Remaining time for in-progress media
    const remainingTime = isResume
        ? formatTimeRemaining(currentItem.RunTimeTicks, currentItem.UserData?.PlaybackPositionTicks)
        : '';

    // Summary / Synopsis (Specs 44: 2–3 lines max)
    const summary = currentItem.Overview || 'Explore this title and stream in high fidelity on your personal Khylo media library.';

    const handlePlayOrResume = () => {
        if (currentItem.Id) {
            playMediaItem(currentItem, {
                startPositionTicks: isResume ? currentItem.UserData?.PlaybackPositionTicks || 0 : 0
            });
        }
    };

    const handleDetails = () => {
        if (onItemClick) {
            onItemClick(currentItem);
        } else {
            navigate(`/details?id=${currentItem.Id}`);
        }
    };

    const handleToggleBookmark = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentItem.Id) return;
        const nextFavorite = !isFavorite;
        setIsFavorite(nextFavorite);
        toggleFavoriteMutation.mutate({
            itemId: currentItem.Id,
            isFavorite: isFavorite
        });
    };

    return (
        <section
            className={classNames('khylo-hero', className)}
            aria-label='Featured Media'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Ambient Lighting Field (Spec 8: subtle 5-10% intensity) */}
            <AmbientBackdrop imageUrl={currentBackdropUrl} opacity={0.08} />

            {/* Seamless Crossfade Backdrop Container (Specs 38–41) */}
            <div className='khylo-hero__backdrop-wrapper'>
                {items.slice(0, 7).map((item, idx) => {
                    const backdropUrl = getItemImageUrl(api, item, 'backdrop', 1920)
                        || getItemImageUrl(api, item, 'primary', 1200);
                    const isActive = idx === currentIndex;

                    return (
                        <div
                            key={item.Id || idx}
                            className={classNames('khylo-hero__backdrop-slide', {
                                'khylo-hero__backdrop-slide--active': isActive
                            })}
                        >
                            {backdropUrl && (
                                <img
                                    src={backdropUrl}
                                    alt={item.Name || ''}
                                    className='khylo-hero__backdrop-img'
                                    loading={idx === 0 ? 'eager' : 'lazy'}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Triple-Fade Edge Dissolves into #090A0B canvas (Specs 38–41) */}
                <div className='khylo-hero__gradient-left' />
                <div className='khylo-hero__gradient-bottom' />
                <div className='khylo-hero__gradient-top' />
                <div className='khylo-hero__gradient-right' />
            </div>

            {/* Left Content Column (Specs 42–47) */}
            <div className='khylo-hero__content-container'>
                <div className='khylo-hero__content' key={currentItem.Id}>
                    {/* Small Orange Kicker / Context Tag */}
                    <div className='khylo-hero__context-tag'>
                        <span className='khylo-hero__context-dot' />
                        <span>
                            {isResume
                                ? (isHeroBook ? 'CONTINUE READING' : isHeroAudioBook ? 'CONTINUE LISTENING' : 'CONTINUE WATCHING')
                                : (isHeroBook ? 'BOOK' : isHeroAudioBook ? 'AUDIOBOOK' : contextTag.toUpperCase())}
                        </span>
                    </div>

                    {/* Title: Transparent Logo Image if available, or Bold Typographic Title */}
                    {logoUrl ? (
                        <div className='khylo-hero__logo-wrap'>
                            <img
                                src={logoUrl}
                                alt={heroTitle ?? ''}
                                className='khylo-hero__logo-img'
                                onError={() => setLogoFailed(true)}
                            />
                        </div>
                    ) : (
                        <h1 className='khylo-hero__title'>
                            {heroTitle}
                        </h1>
                    )}

                    {/* Episode subtitle if series */}
                    {episodeTitle && (
                        <div className='khylo-hero__episode-title'>
                            {episodeTitle}
                        </div>
                    )}

                    {/* Metadata Compact Row */}
                    {metadataParts.length > 0 && (
                        <div className='khylo-hero__metadata'>
                            {metadataParts.map((part, index) => (
                                <React.Fragment key={index}>
                                    {index > 0 && <span className='khylo-hero__metadata-sep'>·</span>}
                                    {part}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Playback Progress Bar (Spec 45) */}
                    {isResume && (
                        <div className='khylo-hero__progress-container'>
                            <div className='khylo-hero__progress-track'>
                                <div
                                    className='khylo-hero__progress-fill'
                                    style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                                />
                            </div>
                            <span className='khylo-hero__progress-label'>
                                {remainingTime || `${Math.round(progress)}% completed`}
                            </span>
                        </div>
                    )}

                    {/* Synopsis (2-3 lines max, Spec 44) */}
                    <p className='khylo-hero__summary'>
                        {summary}
                    </p>

                    {/* Action Controls (Specs 46–47) */}
                    <div className='khylo-hero__actions'>
                        {/* Primary Solid Khylo Orange Button */}
                        <KhyloButton
                            variant='primary'
                            size='lg'
                            icon={isHeroBook ? <MenuBookIcon /> : isHeroAudioBook ? <HeadsetIcon /> : <PlayArrowIcon />}
                            onClick={handlePlayOrResume}
                            className='khylo-hero__play-btn'
                        >
                            {isHeroBook
                                ? (isResume ? 'RESUME READING' : 'READ')
                                : isHeroAudioBook
                                    ? (isResume ? 'RESUME LISTENING' : 'START LISTENING')
                                    : (isResume ? 'RESUME' : 'PLAY')}
                        </KhyloButton>

                        {/* Secondary Liquid-Glass Details Button */}
                        <KhyloButton
                            variant='secondary'
                            size='lg'
                            icon={<InfoOutlinedIcon />}
                            onClick={handleDetails}
                            className='khylo-hero__details-btn'
                        >
                            DETAILS
                        </KhyloButton>

                        {/* Watchlist / Bookmark Action */}
                        <KhyloButton
                            variant='icon'
                            size='lg'
                            onClick={handleToggleBookmark}
                            title={isFavorite ? 'In Watchlist' : 'Add to Watchlist'}
                            aria-label='Watchlist'
                            className='khylo-hero__bookmark-btn'
                        >
                            {isFavorite ? (
                                <BookmarkIcon style={{ color: '#D97732' }} />
                            ) : (
                                <BookmarkBorderIcon />
                            )}
                        </KhyloButton>
                    </div>
                </div>
            </div>

            {/* Understated Carousel Controls (Specs 30, 47) */}
            {items && items.length > 1 && (
                <div className='khylo-hero__carousel-controls'>
                    <button
                        type='button'
                        className='khylo-hero__carousel-arrow'
                        onClick={handlePrev}
                        aria-label='Previous slide'
                    >
                        <ChevronLeftIcon />
                    </button>

                    <div className='khylo-hero__carousel-dots'>
                        {items.slice(0, 7).map((item, idx) => (
                            <button
                                key={item.Id || idx}
                                type='button'
                                className={classNames('khylo-hero__dot', {
                                    'khylo-hero__dot--active': idx === currentIndex
                                })}
                                onClick={() => setCurrentIndex(idx)}
                                aria-label={`Slide ${idx + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        type='button'
                        className='khylo-hero__carousel-arrow'
                        onClick={handleNext}
                        aria-label='Next slide'
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            )}

            {/* Netflix-style Maturity Rating Badge on the right edge */}
            {currentItem.OfficialRating && (
                <div className='khylo-hero__maturity-badge'>
                    <span className='khylo-hero__maturity-text'>{currentItem.OfficialRating}</span>
                </div>
            )}
        </section>
    );
};
