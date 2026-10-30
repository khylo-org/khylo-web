import React, { useRef, useState, useEffect, type FC, type ReactNode } from 'react';
import classNames from 'classnames';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { KhyloMediaCard, type KhyloCardVariant } from './KhyloMediaCard';
import { KhyloSkeleton } from '../ui/KhyloSkeleton';
import './KhyloContentRail.scss';

export interface KhyloContentRailProps {
    id?: string;
    title: string;
    subtitle?: string;
    items?: BaseItemDto[];
    variant?: KhyloCardVariant;
    isLoading?: boolean;
    headerAction?: ReactNode;
    emptyMessage?: string;
    className?: string;
    onItemClick?: (item: BaseItemDto) => void;
    onRemoveFromContinue?: (item: BaseItemDto, mode: 'episode' | 'series') => void;
    showMediaTypeBadge?: boolean;
}

export const KhyloContentRail: FC<KhyloContentRailProps> = ({
    id,
    title,
    subtitle,
    items,
    variant = 'poster',
    isLoading = false,
    headerAction,
    emptyMessage,
    className,
    onItemClick,
    onRemoveFromContinue,
    showMediaTypeBadge
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [ canScrollLeft, setCanScrollLeft ] = useState(false);
    const [ canScrollRight, setCanScrollRight ] = useState(false);
    const [ isHovered, setIsHovered ] = useState(false);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [items, isLoading]);

    // Desktop mouse wheel horizontal navigation support
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0 && !e.shiftKey) {
                const canScrollRightNow = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
                const canScrollLeftNow = el.scrollLeft > 0;
                if ((e.deltaY > 0 && canScrollRightNow) || (e.deltaY < 0 && canScrollLeftNow)) {
                    el.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const scrollAmount = el.clientWidth * 0.75;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // If not loading and no items exist: naturally compress/hide section per Spec 99
    if (!isLoading && (!items || items.length === 0)) {
        if (!emptyMessage) return null;
    }

    // Determine skeleton aspect ratio
    const skeletonRatio = (variant === 'continue' || variant === 'photo') ? '16:9'
        : variant === 'square' ? '1:1'
        : variant === 'collection' ? 'wide'
        : '2:3';

    return (
        <section
            id={id}
            className={classNames('khylo-rail', `khylo-rail--${variant}`, className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={title}
        >
            {/* Header */}
            <div className='khylo-rail__header'>
                <div className='khylo-rail__title-group'>
                    <h2 className='khylo-rail__title'>{title}</h2>
                    {subtitle && <p className='khylo-rail__subtitle'>{subtitle}</p>}
                </div>
                {headerAction && <div className='khylo-rail__action'>{headerAction}</div>}
            </div>

            {/* Rail Container */}
            <div className='khylo-rail__viewport'>
                {/* Left Arrow (Spec 97) */}
                {canScrollLeft && (
                    <button
                        type='button'
                        className={classNames('khylo-rail__arrow khylo-rail__arrow--left', {
                            'khylo-rail__arrow--visible': isHovered
                        })}
                        onClick={() => scroll('left')}
                        aria-label='Scroll left'
                    >
                        <ChevronLeftIcon />
                    </button>
                )}

                {/* Right Arrow (Spec 97) */}
                {canScrollRight && (
                    <button
                        type='button'
                        className={classNames('khylo-rail__arrow khylo-rail__arrow--right', {
                            'khylo-rail__arrow--visible': isHovered
                        })}
                        onClick={() => scroll('right')}
                        aria-label='Scroll right'
                    >
                        <ChevronRightIcon />
                    </button>
                )}

                {/* Scrollable Items Container */}
                <div
                    ref={scrollRef}
                    className='khylo-rail__track'
                    onScroll={checkScroll}
                >
                    {isLoading ? (
                        // Skeletons during loading
                        Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className='khylo-rail__item-wrapper'>
                                <KhyloSkeleton
                                    variant='card'
                                    aspectRatio={skeletonRatio}
                                />
                                <div style={{ marginTop: 10 }}>
                                    <KhyloSkeleton variant='text' width='80%' />
                                    <KhyloSkeleton variant='text' width='50%' />
                                </div>
                            </div>
                        ))
                    ) : items && items.length > 0 ? (
                        items.map(item => (
                            <div key={item.Id} className='khylo-rail__item-wrapper'>
                                <KhyloMediaCard
                                    item={item}
                                    variant={variant}
                                    onItemClick={onItemClick}
                                    onRemoveFromContinue={onRemoveFromContinue}
                                    showMediaTypeBadge={showMediaTypeBadge}
                                />
                            </div>
                        ))
                    ) : (
                        emptyMessage && (
                            <div className='khylo-rail__empty'>
                                {emptyMessage}
                            </div>
                        )
                    )}
                </div>
            </div>
        </section>
    );
};
