import React, { useState, type FC, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AlbumIcon from '@mui/icons-material/Album';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HeadsetIcon from '@mui/icons-material/Headset';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { useApi } from 'hooks/useApi';
import {
    getItemImageUrl,
    getItemSubtitle,
    getPlaybackPercentage,
    formatTimeRemaining,
    playMediaItem,
    removeFromContinueWatching,
    isEbookMediaItem,
    isAudiobookMediaItem
} from './mediaUtils';
import { openMetadataEditor } from '../metadata/metadataApi';
import './KhyloMediaCard.scss';

export type KhyloCardVariant = 'continue' | 'poster' | 'square' | 'book' | 'boxart' | 'collection' | 'photo';

export interface KhyloMediaCardProps {
    item: BaseItemDto;
    variant?: KhyloCardVariant;
    width?: number | string;
    className?: string;
    onItemClick?: (item: BaseItemDto) => void;
    onRemoveFromContinue?: (item: BaseItemDto, mode: 'episode' | 'series') => void;
    /** Shows a small headphones / book badge, for rows that mix audiobooks and books. */
    showMediaTypeBadge?: boolean;
    /** Offers Delete on hover (e.g. collections), when the server says this person may delete it. */
    onDelete?: (item: BaseItemDto) => void;
}

export const KhyloMediaCard: FC<KhyloMediaCardProps> = ({
    item,
    variant = 'poster',
    width,
    className,
    onItemClick,
    onRemoveFromContinue,
    showMediaTypeBadge = false,
    onDelete
}) => {
    const { api, user } = useApi();
    const navigate = useNavigate();
    const [ imageLoaded, setImageLoaded ] = useState(false);
    const [ imageError, setImageError ] = useState(false);
    const [ showRemoveConfirm, setShowRemoveConfirm ] = useState(false);
    const [ isRemoved, setIsRemoved ] = useState(false);

    const progress = getPlaybackPercentage(item);
    const isContinue = variant === 'continue';

    // Determine image type based on card variant
    const imageType = (isContinue || variant === 'collection') ? 'backdrop' : 'primary';
    const imageUrl = getItemImageUrl(api, item, imageType, isContinue ? 600 : 400);
    // Wide cards show the show's or film's logo over the picture, like the TV app
    const isWide = isContinue || variant === 'collection';
    const logoUrl = isWide ? getItemImageUrl(api, item, 'logo', 400) : null;
    const [ logoLoaded, setLogoLoaded ] = useState(false);
    const [ logoFailed, setLogoFailed ] = useState(false);
    const showLogo = Boolean(logoUrl) && logoLoaded && !logoFailed;

    const displayTitle = item.Type === BaseItemKind.Episode && item.SeriesName
        ? item.SeriesName
        : item.Name;

    const episodeOrSubtitle = item.Type === BaseItemKind.Episode
        ? `${getItemSubtitle(item)} · ${item.Name}`
        : getItemSubtitle(item);

    const timeRemaining = formatTimeRemaining(item.RunTimeTicks, item.UserData?.PlaybackPositionTicks);

    const isAudioBook = isAudiobookMediaItem(item);
    const isBook = isEbookMediaItem(item);
    const playTooltip = isBook
        ? (progress > 0 ? 'Resume Reading' : 'Read')
        : isAudioBook
            ? (progress > 0 ? 'Resume Listening' : 'Start Listening')
            : (progress > 0 ? 'Resume' : 'Play');
    const removeTooltip = isBook
        ? 'Remove from Continue Reading'
        : isAudioBook
            ? 'Remove from Continue Listening'
            : 'Remove from Continue Watching';

    const openDetails = (e?: MouseEvent | React.KeyboardEvent) => {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        if (onItemClick) {
            onItemClick(item);
        } else if (item.Id) {
            navigate(`/details?id=${item.Id}`);
        }
    };

    const handlePlay = (e: MouseEvent) => {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        if (item.Id) {
            const resumeTicks = item.UserData?.PlaybackPositionTicks || 0;
            playMediaItem(item, {
                startPositionTicks: resumeTicks > 0 ? resumeTicks : undefined
            });
        }
    };

    const handleDetails = (e?: MouseEvent) => {
        openDetails(e);
    };

    const handleRemoveClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (item.Type === BaseItemKind.Episode && item.SeriesId) {
            setShowRemoveConfirm(true);
        } else {
            handleExecuteRemove(e, 'episode');
        }
    };

    const handleExecuteRemove = (e: MouseEvent, mode: 'episode' | 'series') => {
        e.stopPropagation();
        setShowRemoveConfirm(false);
        setIsRemoved(true);
        if (isBook && item.Id) {
            localStorage.removeItem(`khylo_book_cfi_${item.Id}`);
            localStorage.removeItem(`khylo_book_pct_${item.Id}`);
            localStorage.removeItem(`khylo_book_read_date_${item.Id}`);
        }
        onRemoveFromContinue?.(item, mode);
        void removeFromContinueWatching(api, user?.Id, item, mode);
    };

    const handleCardClick = (e: MouseEvent) => {
        openDetails(e);
    };

    if (isRemoved) {
        return null;
    }

    return (
        <div
            className={classNames(
                'khylo-card',
                `khylo-card--${variant}`,
                {
                    'khylo-card--in-progress': progress > 0
                },
                className
            )}
            style={width ? { width, flexShrink: 0 } : undefined}
            onClick={handleCardClick}
            role='button'
            tabIndex={0}
            aria-label={`${displayTitle} - ${episodeOrSubtitle}`}
            onKeyDown={e => {
                if (e.key === 'Enter') openDetails(e);
            }}
        >
            {/* Artwork Container */}
            <div className='khylo-card__image-container'>
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={displayTitle ?? ''}
                        className={classNames('khylo-card__image', {
                            'khylo-card__image--loaded': imageLoaded
                        })}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        loading='lazy'
                    />
                ) : (
                    <div className={classNames('khylo-card__fallback', {
                        'khylo-card__fallback--vinyl': variant === 'square' || item.Type === BaseItemKind.MusicAlbum || item.Type === BaseItemKind.Audio,
                        'khylo-card__fallback--book': variant === 'book' || item.Type === BaseItemKind.Book || item.Type === BaseItemKind.AudioBook
                    })}>
                        {(variant === 'square' || item.Type === BaseItemKind.MusicAlbum || item.Type === BaseItemKind.Audio) ? (
                            <div className='khylo-card__vinyl-record'>
                                <div className='khylo-card__vinyl-groove khylo-card__vinyl-groove--3' />
                                <div className='khylo-card__vinyl-groove khylo-card__vinyl-groove--2' />
                                <div className='khylo-card__vinyl-groove khylo-card__vinyl-groove--1' />
                                <div className='khylo-card__vinyl-center'>
                                    <AlbumIcon className='khylo-card__vinyl-icon' />
                                </div>
                            </div>
                        ) : (variant === 'book' || item.Type === BaseItemKind.Book || item.Type === BaseItemKind.AudioBook) ? (
                            <div className='khylo-card__book-cover'>
                                {item.Type === BaseItemKind.AudioBook ? (
                                    <HeadsetIcon className='khylo-card__book-icon' />
                                ) : (
                                    <MenuBookIcon className='khylo-card__book-icon' />
                                )}
                                <span className='khylo-card__book-title'>{displayTitle}</span>
                            </div>
                        ) : (
                            <span className='khylo-card__fallback-text'>{displayTitle}</span>
                        )}
                    </div>
                )}

                {/* Subtle dark gradient overlay */}
                <div className='khylo-card__overlay-gradient' />

                {logoUrl && !logoFailed && (
                    <img
                        src={logoUrl}
                        alt=''
                        aria-hidden='true'
                        className={classNames('khylo-card__logo', { 'khylo-card__logo--loaded': logoLoaded })}
                        onLoad={() => setLogoLoaded(true)}
                        onError={() => setLogoFailed(true)}
                        loading='lazy'
                    />
                )}

                {/* Edit details and artwork (admins only), tucked in the corner on hover */}
                {user?.Policy?.IsAdministrator && item.Id && !isContinue && (
                    <button
                        type='button'
                        className='khylo-card__edit'
                        onClick={e => {
                            e.stopPropagation();
                            openMetadataEditor(item.Id!);
                        }}
                        title='Edit details and artwork'
                        aria-label={`Edit ${displayTitle ?? ''}`}
                    >
                        <EditOutlinedIcon />
                    </button>
                )}

                {/* Hover Quick Action Controls (Spec 35) */}
                <div className='khylo-card__actions'>
                    <button
                        type='button'
                        className='khylo-card__action-btn khylo-card__action-btn--play'
                        onClick={handlePlay}
                        title={playTooltip}
                        aria-label={playTooltip}
                    >
                        {isBook ? <MenuBookIcon /> : isAudioBook ? <HeadsetIcon /> : <PlayArrowIcon />}
                    </button>
                    {(isContinue || onRemoveFromContinue) && (
                        <button
                            type='button'
                            className='khylo-card__action-btn khylo-card__action-btn--details'
                            onClick={handleDetails}
                            title='Details'
                            aria-label='Details'
                        >
                            <InfoOutlinedIcon />
                        </button>
                    )}
                    {onDelete && item.CanDelete && (
                        <button
                            type='button'
                            className='khylo-card__action-btn khylo-card__action-btn--remove'
                            onClick={e => {
                                e.stopPropagation();
                                onDelete(item);
                            }}
                            title='Delete'
                            aria-label={`Delete ${displayTitle ?? ''}`}
                        >
                            <DeleteOutlineIcon />
                        </button>
                    )}
                    {(isContinue || onRemoveFromContinue) && (
                        <button
                            type='button'
                            className='khylo-card__action-btn khylo-card__action-btn--remove'
                            onClick={handleRemoveClick}
                            title={removeTooltip}
                            aria-label={removeTooltip}
                        >
                            <CloseIcon />
                        </button>
                    )}
                </div>

                {/* Remove confirmation popover for TV episodes */}
                {showRemoveConfirm && (
                    <div className='khylo-card__remove-overlay' onClick={e => e.stopPropagation()}>
                        <p className='khylo-card__remove-title'>Remove from Continue Watching?</p>
                        <div className='khylo-card__remove-buttons'>
                            <button
                                type='button'
                                className='khylo-card__remove-btn khylo-card__remove-btn--ep'
                                onClick={e => handleExecuteRemove(e, 'episode')}
                            >
                                Remove Episode
                            </button>
                            <button
                                type='button'
                                className='khylo-card__remove-btn khylo-card__remove-btn--show'
                                onClick={e => handleExecuteRemove(e, 'series')}
                            >
                                Remove Entire Show
                            </button>
                            <button
                                type='button'
                                className='khylo-card__remove-btn khylo-card__remove-btn--cancel'
                                onClick={e => {
                                    e.stopPropagation();
                                    setShowRemoveConfirm(false);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Progress bar in Khylo signature orange (Spec 34, 44) */}
                {progress > 0 && (
                    <div className='khylo-card__progress-track'>
                        <div
                            className='khylo-card__progress-bar'
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {showMediaTypeBadge && (isAudioBook || isBook) && (
                    <div
                        className='khylo-card__type-badge'
                        title={isAudioBook ? 'Audiobook' : 'Book'}
                        aria-label={isAudioBook ? 'Audiobook' : 'Book'}
                    >
                        {isAudioBook ? <HeadsetIcon /> : <MenuBookIcon />}
                    </div>
                )}

                {/* Collection item count pill */}
                {variant === 'collection' && item.ChildCount && (
                    <div className='khylo-card__badge'>
                        {item.ChildCount} {item.ChildCount === 1 ? 'title' : 'titles'}
                    </div>
                )}
            </div>

            {/* Card Metadata (Spec 34, 113) */}
            <div className='khylo-card__info'>
                {/* With the logo on the picture, the line below only needs the episode */}
                {!showLogo && (
                    <div className='khylo-card__title' title={displayTitle ?? undefined}>
                        {displayTitle}
                    </div>
                )}

                <div className='khylo-card__meta'>
                    {isContinue && timeRemaining ? (
                        <>
                            <span>{getItemSubtitle(item)}</span>
                            <span className='khylo-card__dot'>·</span>
                            <span className='khylo-card__time-left'>{timeRemaining}</span>
                        </>
                    ) : (
                        <span>{episodeOrSubtitle}</span>
                    )}
                </div>
            </div>
        </div>
    );
};
