import React, { useCallback, useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import classNames from 'classnames';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

/** A picture that fades in when it arrives, and shows a quiet tile instead of a broken image. */
export const KmxCover: FC<{ src?: string | null; alt?: string; round?: boolean; person?: boolean; className?: string }> = ({ src, alt = '', round, person, className }) => {
    const [ loaded, setLoaded ] = useState(false);
    const [ failed, setFailed ] = useState(false);

    // A new picture starts over
    useEffect(() => {
        setLoaded(false);
        setFailed(false);
    }, [ src ]);

    const showImage = Boolean(src) && !failed;
    return (
        <span className={classNames('kmx-cover', { 'kmx-cover--round': round }, className)}>
            {!showImage && <span className='kmx-cover__fallback'>{person ? <PersonIcon /> : <MusicNoteIcon />}</span>}
            {showImage && (
                <img
                    src={src!}
                    alt={alt}
                    loading='lazy'
                    decoding='async'
                    className={classNames({ 'is-loaded': loaded })}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                />
            )}
        </span>
    );
};

/** The three moving bars that mark the song playing now. They hold still when paused. */
export const KmxEqualizer: FC<{ paused?: boolean }> = ({ paused }) => (
    <span className={classNames('kmx-eq', { 'kmx-eq--paused': paused })} aria-hidden='true'>
        <i /><i /><i />
    </span>
);

/** A titled block of a page, with an optional action on the right ("Show all"). */
export const KmxSection: FC<{ title: string; action?: ReactNode; children: ReactNode; className?: string }> = ({ title, action, children, className }) => (
    <section className={classNames('kmx-section', className)}>
        <div className='kmx-section__head'>
            <h2>{title}</h2>
            {action}
        </div>
        {children}
    </section>
);

/** A row of cards that scrolls sideways, with arrows for a mouse. */
export const KmxRail: FC<{ children: ReactNode; label: string }> = ({ children, label }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [ canBack, setCanBack ] = useState(false);
    const [ canForward, setCanForward ] = useState(false);

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setCanBack(el.scrollLeft > 4);
        setCanForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    // Re-measure when the window is resized and whenever the cards change
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [ measure ]);
    useEffect(measure, [ measure, children ]);

    const scroll = (direction: 1 | -1) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.85, behavior: 'smooth' });

    return (
        <div className='kmx-rail'>
            <div className='kmx-rail__track' ref={ref} onScroll={measure} role='list' aria-label={label}>{children}</div>
            {canBack && <button type='button' className='kmx-rail__arrow kmx-rail__arrow--back' onClick={() => scroll(-1)} aria-label='Scroll back'><ChevronLeftIcon /></button>}
            {canForward && <button type='button' className='kmx-rail__arrow kmx-rail__arrow--forward' onClick={() => scroll(1)} aria-label='Scroll forward'><ChevronRightIcon /></button>}
        </div>
    );
};

/** An album, playlist or single: the picture, a name, a line under it, and a play button that appears on hover. */
export const KmxCard: FC<{
    title: string;
    subtitle?: string;
    src?: string | null;
    onOpen: () => void;
    onPlay?: () => void;
    round?: boolean;
    person?: boolean;
}> = ({ title, subtitle, src, onOpen, onPlay, round, person }) => (
    <div className={classNames('kmx-card', { 'kmx-card--artist': round })} role='listitem'>
        <div className='kmx-card__art'>
            <KmxCover src={src} alt='' round={round} person={person} />
            {onPlay && (
                <button
                    type='button'
                    className='kmx-card__play'
                    aria-label={`Play ${title}`}
                    onClick={onPlay}
                >
                    <PlayArrowIcon />
                </button>
            )}
        </div>
        {/* A real button, stretched over the whole card, so the card works with a keyboard and a screen reader */}
        <button type='button' className='kmx-card__title kmx-card__open' title={title} onClick={onOpen}>{title}</button>
        {subtitle && <div className='kmx-card__sub'>{subtitle}</div>}
    </div>
);

/** An artist: a round photo (or their album cover) and a name. */
export const KmxArtistCard: FC<{ name: string; src?: string | null; caption?: string; onOpen: () => void; onPlay?: () => void }> = ({ name, src, caption = 'Artist', onOpen, onPlay }) => (
    <KmxCard title={name} subtitle={caption} src={src} onOpen={onOpen} onPlay={onPlay} round person />
);

/**
 * The banner at the top of the music home and the artist page. Fixed height, never taller than a fraction of the
 * window. The picture is the real one; when there is only a cover (no artist photo) it is enlarged and softened
 * so a small square never looks stretched.
 */
export const KmxHero: FC<{
    image?: string | null;
    soften?: boolean;
    eyebrow?: string;
    title: string;
    meta?: ReactNode;
    actions?: ReactNode;
    tall?: boolean;
    onBack?: () => void;
    backLabel?: string;
}> = ({ image, soften, eyebrow, title, meta, actions, tall, onBack, backLabel }) => {
    const style: CSSProperties | undefined = image ? { backgroundImage: `url("${image}")` } : undefined;
    return (
        <header className={classNames('kmx-hero', { 'kmx-hero--tall': tall })}>
            <div className={classNames('kmx-hero__image', { 'kmx-hero__image--soft': soften, 'kmx-hero__image--none': !image })} style={style} />
            <div className='kmx-hero__shade' />
            {onBack && (
                <button type='button' className='kmx-hero__back' onClick={onBack} aria-label={backLabel ?? 'Back'}>
                    <ChevronLeftIcon />
                </button>
            )}
            <div className='kmx-hero__text'>
                {eyebrow && <div className='kmx-hero__eyebrow'>{eyebrow}</div>}
                <h1 title={title}>{title}</h1>
                {meta && <div className='kmx-hero__meta'>{meta}</div>}
                {actions && <div className='kmx-hero__actions'>{actions}</div>}
            </div>
        </header>
    );
};
