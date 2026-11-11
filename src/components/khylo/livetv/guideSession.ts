import type { LiveTvCategory } from './liveTvApi';

/** How many channels the guide shows at first, and adds each time "Show more" is pressed. */
export const GUIDE_PAGE_SIZE = 60;

/** Where someone was in the Live TV guide, so coming back from a channel puts them in the same place. */
export interface GuideSession {
    userId: string;
    view: 'guide' | 'recordings';
    category: LiveTvCategory;
    search: string;
    /** How many channels were showing (each "Show more" adds a page). */
    visibleCount: number;
    selectedId: string | null;
    /** How far down the channel list was scrolled. */
    scrollTop: number;
}

let saved: GuideSession | undefined;

/** The place this person left the guide, if they have been in it since the page opened. */
export function loadGuideSession(userId: string | undefined): GuideSession | undefined {
    return userId && saved?.userId === userId ? saved : undefined;
}

/** Remembers part of where someone is in the guide; whatever isn't mentioned is kept as it was. */
export function saveGuideSession(userId: string | undefined, changes: Partial<Omit<GuideSession, 'userId'>>): void {
    if (!userId) return;
    let base: GuideSession = { userId, view: 'guide', category: 'all', search: '', visibleCount: GUIDE_PAGE_SIZE, selectedId: null, scrollTop: 0 };
    if (saved?.userId === userId) base = saved;
    saved = { ...base, ...changes };
}

/** Forgets the place (for example once the guide has been put back, or someone else signs in). */
export function clearGuideSession(): void {
    saved = undefined;
}
