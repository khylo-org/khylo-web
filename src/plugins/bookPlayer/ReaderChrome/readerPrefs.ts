/** How someone likes to read. Saved on this device and used for every book or comic. */

export type Paper = 'white' | 'paper' | 'gray' | 'night';
export type BookFont = 'original' | 'serif' | 'sans';
export type Spacing = 'compact' | 'normal' | 'relaxed';
export type Margins = 'narrow' | 'normal' | 'wide';

export interface BookPrefs {
    fontScale: number;
    font: BookFont;
    paper: Paper;
    spacing: Spacing;
    margins: Margins;
    twoPages: boolean;
}

export interface ComicPrefs {
    fit: 'screen' | 'width';
    twoPages: boolean;
    rightToLeft: boolean;
    background: 'black' | 'gray' | 'white';
}

export const PAPERS: Record<Paper, { label: string; background: string; text: string; dark: boolean }> = {
    white: { label: 'White', background: '#FFFFFF', text: '#1C1C1E', dark: false },
    paper: { label: 'Paper', background: '#F4ECDC', text: '#3B3025', dark: false },
    gray: { label: 'Gray', background: '#2B2B2E', text: '#E4E4E8', dark: true },
    night: { label: 'Night', background: '#000000', text: '#C8C8CC', dark: true }
};

export const COMIC_BACKGROUNDS: Record<ComicPrefs['background'], { label: string; color: string; dark: boolean }> = {
    black: { label: 'Black', color: '#000000', dark: true },
    gray: { label: 'Gray', color: '#2B2B2E', dark: true },
    white: { label: 'White', color: '#FFFFFF', dark: false }
};

export const FONTS: Record<BookFont, { label: string; css?: string }> = {
    original: { label: 'Original' },
    serif: { label: 'Serif', css: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif' },
    sans: { label: 'Sans', css: '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }
};

export const LINE_HEIGHTS: Record<Spacing, number> = { compact: 1.35, normal: 1.6, relaxed: 1.9 };
export const SIDE_MARGINS: Record<Margins, string> = { narrow: '2%', normal: '6%', wide: '12%' };

const BOOK_KEY = 'khylo_reader_book_prefs';
const COMIC_KEY = 'khylo_reader_comic_prefs';

const DEFAULT_BOOK: BookPrefs = { fontScale: 1, font: 'original', paper: 'paper', spacing: 'normal', margins: 'normal', twoPages: false };
const DEFAULT_COMIC: ComicPrefs = { fit: 'screen', twoPages: false, rightToLeft: false, background: 'black' };

function load<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...fallback, ...JSON.parse(raw) as Partial<T> } : fallback;
    } catch {
        return fallback;
    }
}

function save<T>(key: string, value: T) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Private browsing: the choice just isn't remembered
    }
}

export const loadBookPrefs = () => load(BOOK_KEY, DEFAULT_BOOK);
export const saveBookPrefs = (p: BookPrefs) => save(BOOK_KEY, p);
export const loadComicPrefs = () => load(COMIC_KEY, DEFAULT_COMIC);
export const saveComicPrefs = (p: ComicPrefs) => save(COMIC_KEY, p);

/** Where the reader is: sent by the player, shown by the controls. */
export interface ReaderPosition {
    fraction: number;
    label: string;
    chapter?: string;
}

export const READER_POSITION_EVENT = 'khylo-reader-position';

export function announcePosition(position: ReaderPosition) {
    window.dispatchEvent(new CustomEvent<ReaderPosition>(READER_POSITION_EVENT, { detail: position }));
}
