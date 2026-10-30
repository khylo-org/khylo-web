import React, { type FC, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Slider from '@mui/material/Slider';
import ArrowBackIosNewRounded from '@mui/icons-material/ArrowBackIosNewRounded';
import FormatListBulletedRounded from '@mui/icons-material/FormatListBulletedRounded';
import FullscreenRounded from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRounded from '@mui/icons-material/FullscreenExitRounded';
import TextFieldsRounded from '@mui/icons-material/TextFieldsRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client';
import Screenfull from 'screenfull';
import classNames from 'classnames';

import {
    type BookPrefs, type ComicPrefs, type ReaderPosition,
    COMIC_BACKGROUNDS, FONTS, PAPERS, READER_POSITION_EVENT,
    loadBookPrefs, loadComicPrefs, saveBookPrefs, saveComicPrefs
} from './readerPrefs';
import './ReaderChrome.scss';

interface ReaderChromeProps {
    item: BaseItemDto;
    kind: 'book' | 'comic';
    onExit: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onSeek: (fraction: number) => void;
    onOpenContents?: () => void;
    onBookPrefs?: (prefs: BookPrefs) => void;
    onComicPrefs?: (prefs: ComicPrefs) => void;
    onToggleFullscreen?: () => void;
}

const HIDE_AFTER_MS = 3500;

function Choice<T extends string | boolean>({ value, options, onChange }: Readonly<{ value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }>) {
    return (
        <div className='khylo-reader__choice' role='radiogroup'>
            {options.map(o => (
                <button
                    key={String(o.value)}
                    type='button'
                    role='radio'
                    aria-checked={o.value === value}
                    className={classNames('khylo-reader__choice-btn', { 'khylo-reader__choice-btn--on': o.value === value })}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

const Row: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
    <div className='khylo-reader__row'>
        <div className='khylo-reader__row-label'>{label}</div>
        {children}
    </div>
);

/**
 * The reader's controls, shared by books and comics: a quiet top bar, a progress bar you can drag, tap the
 * sides of the page to turn it, and an appearance panel. Everything fades away while you read.
 */
const ReaderChrome: FC<ReaderChromeProps> = ({ item, kind, onExit, onPrevious, onNext, onSeek, onOpenContents, onBookPrefs, onComicPrefs, onToggleFullscreen }) => {
    const [ visible, setVisible ] = useState(true);
    const [ panelOpen, setPanelOpen ] = useState(false);
    const [ position, setPosition ] = useState<ReaderPosition>({ fraction: 0, label: '' });
    const [ dragging, setDragging ] = useState<number | null>(null);
    const [ fullscreen, setFullscreen ] = useState(false);
    const [ bookPrefs, setBookPrefs ] = useState<BookPrefs>(loadBookPrefs);
    const [ comicPrefs, setComicPrefs ] = useState<ComicPrefs>(loadComicPrefs);
    const hideTimer = useRef<ReturnType<typeof setTimeout>>();
    const rootRef = useRef<HTMLDivElement>(null);

    const dark = kind === 'book' ? PAPERS[bookPrefs.paper].dark : COMIC_BACKGROUNDS[comicPrefs.background].dark;

    const scheduleHide = useCallback(() => {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    }, []);

    const updateBook = (change: Partial<BookPrefs>) => {
        const next = { ...bookPrefs, ...change };
        setBookPrefs(next);
        saveBookPrefs(next);
        onBookPrefs?.(next);
    };

    const updateComic = (change: Partial<ComicPrefs>) => {
        const next = { ...comicPrefs, ...change };
        setComicPrefs(next);
        saveComicPrefs(next);
        onComicPrefs?.(next);
    };

    // The player says where the reader is
    useEffect(() => {
        const onPosition = (e: Event) => setPosition((e as CustomEvent<ReaderPosition>).detail);
        window.addEventListener(READER_POSITION_EVENT, onPosition);
        return () => window.removeEventListener(READER_POSITION_EVENT, onPosition);
    }, []);

    // Taps: left side back, right side forward, middle shows or hides the controls
    useEffect(() => {
        let downAt: { x: number; y: number } | null = null;
        const onPointerDown = (e: PointerEvent) => {
            downAt = { x: e.clientX, y: e.clientY };
        };
        const onClick = (e: MouseEvent) => {
            // A swipe or drag is not a tap
            if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;
            // Contents list and other dialogs above the reader
            if ((e.target as Element | null)?.closest?.('#dialogToc')) return;
            if ((e.target as Element | null)?.closest?.('.khylo-reader__bar, .khylo-reader__panel')) {
                scheduleHide();
                return;
            }
            if (panelOpen) {
                setPanelOpen(false);
                return;
            }
            const width = window.innerWidth || 1;
            const x = e.clientX / width;
            if (x < 0.28) {
                onPrevious();
            } else if (x > 0.72) {
                onNext();
            } else {
                setVisible(v => !v);
                scheduleHide();
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return;
            if (e.clientY < 90 || e.clientY > window.innerHeight - 110) {
                setVisible(true);
                scheduleHide();
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('click', onClick);
        document.addEventListener('pointermove', onPointerMove);
        scheduleHide();
        return () => {
            clearTimeout(hideTimer.current);
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('click', onClick);
            document.removeEventListener('pointermove', onPointerMove);
        };
    }, [ onNext, onPrevious, panelOpen, scheduleHide ]);

    // Keep the controls up while the panel is open
    useEffect(() => {
        if (panelOpen) {
            clearTimeout(hideTimer.current);
            setVisible(true);
        } else {
            scheduleHide();
        }
    }, [ panelOpen, scheduleHide ]);

    // Leave full screen when the reader closes
    useEffect(() => () => {
        if (Screenfull.isEnabled && Screenfull.isFullscreen) void Screenfull.exit();
    }, []);

    const toggleFullscreen = () => {
        if (Screenfull.isEnabled) {
            void Screenfull.toggle();
        } else if (window.NativeShell) {
            if (fullscreen) window.NativeShell.disableFullscreen();
            else window.NativeShell.enableFullscreen();
        }
        setFullscreen(f => !f);
        onToggleFullscreen?.();
    };

    const shown = visible || panelOpen;
    const fraction = dragging ?? position.fraction;
    const author = item.Artists?.[0] || item.AlbumArtist || item.People?.find(p => p.Type === 'Author' || p.Type === 'Writer')?.Name;

    return (
        <div ref={rootRef} className={classNames('khylo-reader', { 'khylo-reader--dark': dark, 'khylo-reader--hidden': !shown })}>
            <div className='khylo-reader__bar khylo-reader__bar--top'>
                <button type='button' className='khylo-reader__icon' onClick={onExit} aria-label='Close'>
                    <ArrowBackIosNewRounded />
                </button>
                <div className='khylo-reader__heading'>
                    <div className='khylo-reader__title'>{item.Name}</div>
                    <div className='khylo-reader__subtitle'>{position.chapter || author || ''}</div>
                </div>
                {onOpenContents && (
                    <button type='button' className='khylo-reader__icon' onClick={onOpenContents} aria-label='Contents' title='Contents'>
                        <FormatListBulletedRounded />
                    </button>
                )}
                <button
                    type='button'
                    className={classNames('khylo-reader__icon', { 'khylo-reader__icon--on': panelOpen })}
                    onClick={() => setPanelOpen(o => !o)}
                    aria-label={kind === 'book' ? 'Text and paper' : 'Reading options'}
                    title={kind === 'book' ? 'Text and paper' : 'Reading options'}
                >
                    {kind === 'book' ? <TextFieldsRounded /> : <TuneRounded />}
                </button>
                {(Screenfull.isEnabled || window.NativeShell) && (
                    <button type='button' className='khylo-reader__icon' onClick={toggleFullscreen} aria-label='Full screen' title='Full screen'>
                        {fullscreen ? <FullscreenExitRounded /> : <FullscreenRounded />}
                    </button>
                )}
            </div>

            <div className='khylo-reader__bar khylo-reader__bar--bottom'>
                <span className='khylo-reader__position'>{position.label}</span>
                <Slider
                    className='khylo-reader__progress'
                    size='small'
                    min={0}
                    max={1}
                    step={0.001}
                    value={fraction}
                    onChange={(_, v) => setDragging(v as number)}
                    onChangeCommitted={(_, v) => {
                        setDragging(null);
                        onSeek(v as number);
                    }}
                    aria-label='Reading progress'
                />
                <span className='khylo-reader__percent'>{`${Math.round(fraction * 100)}%`}</span>
            </div>

            {panelOpen && kind === 'book' && (
                <div className='khylo-reader__panel' role='dialog' aria-label='Text and paper'>
                    <Row label='Text size'>
                        <div className='khylo-reader__size'>
                            <button type='button' className='khylo-reader__size-btn khylo-reader__size-btn--small' onClick={() => updateBook({ fontScale: Math.max(0.8, +(bookPrefs.fontScale - 0.1).toFixed(1)) })} aria-label='Smaller text'>A</button>
                            <Slider size='small' min={0.8} max={2} step={0.1} value={bookPrefs.fontScale} onChange={(_, v) => updateBook({ fontScale: v as number })} aria-label='Text size' />
                            <button type='button' className='khylo-reader__size-btn khylo-reader__size-btn--large' onClick={() => updateBook({ fontScale: Math.min(2, +(bookPrefs.fontScale + 0.1).toFixed(1)) })} aria-label='Larger text'>A</button>
                        </div>
                    </Row>
                    <Row label='Paper'>
                        <div className='khylo-reader__papers'>
                            {(Object.keys(PAPERS) as (keyof typeof PAPERS)[]).map(key => (
                                <button
                                    key={key}
                                    type='button'
                                    className={classNames('khylo-reader__paper', { 'khylo-reader__paper--on': bookPrefs.paper === key })}
                                    onClick={() => updateBook({ paper: key })}
                                    aria-label={PAPERS[key].label}
                                >
                                    <span className='khylo-reader__swatch' style={{ background: PAPERS[key].background, color: PAPERS[key].text }}>Aa</span>
                                    <span>{PAPERS[key].label}</span>
                                </button>
                            ))}
                        </div>
                    </Row>
                    <Row label='Font'>
                        <Choice value={bookPrefs.font} onChange={font => updateBook({ font })} options={(Object.keys(FONTS) as (keyof typeof FONTS)[]).map(k => ({ value: k, label: <span style={{ fontFamily: FONTS[k].css }}>{FONTS[k].label}</span> }))} />
                    </Row>
                    <Row label='Line spacing'>
                        <Choice value={bookPrefs.spacing} onChange={spacing => updateBook({ spacing })} options={[ { value: 'compact', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Roomy' } ]} />
                    </Row>
                    <Row label='Margins'>
                        <Choice value={bookPrefs.margins} onChange={margins => updateBook({ margins })} options={[ { value: 'narrow', label: 'Narrow' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' } ]} />
                    </Row>
                    <Row label='Pages'>
                        <Choice value={bookPrefs.twoPages} onChange={twoPages => updateBook({ twoPages })} options={[ { value: false, label: 'One page' }, { value: true, label: 'Two pages' } ]} />
                    </Row>
                </div>
            )}

            {panelOpen && kind === 'comic' && (
                <div className='khylo-reader__panel' role='dialog' aria-label='Reading options'>
                    <Row label='Fit'>
                        <Choice value={comicPrefs.fit} onChange={fit => updateComic({ fit })} options={[ { value: 'screen', label: 'Whole page' }, { value: 'width', label: 'Fill width' } ]} />
                    </Row>
                    <Row label='Pages'>
                        <Choice value={comicPrefs.twoPages} onChange={twoPages => updateComic({ twoPages })} options={[ { value: false, label: 'One page' }, { value: true, label: 'Two pages' } ]} />
                    </Row>
                    <Row label='Reading direction'>
                        <Choice value={comicPrefs.rightToLeft} onChange={rightToLeft => updateComic({ rightToLeft })} options={[ { value: false, label: 'Left to right' }, { value: true, label: 'Right to left (manga)' } ]} />
                    </Row>
                    <Row label='Background'>
                        <Choice value={comicPrefs.background} onChange={background => updateComic({ background })} options={(Object.keys(COMIC_BACKGROUNDS) as (keyof typeof COMIC_BACKGROUNDS)[]).map(k => ({ value: k, label: COMIC_BACKGROUNDS[k].label }))} />
                    </Row>
                </div>
            )}
        </div>
    );
};

export default ReaderChrome;
