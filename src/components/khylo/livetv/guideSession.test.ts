import { beforeEach, describe, expect, it } from 'vitest';

import { GUIDE_PAGE_SIZE, clearGuideSession, loadGuideSession, saveGuideSession } from './guideSession';

describe('remembering where someone was in the Live TV guide', () => {
    beforeEach(() => clearGuideSession());

    it('has nothing before anyone has been in the guide', () => {
        expect(loadGuideSession('ann')).toBeUndefined();
    });

    it('gives back the place they left, after any number of channel pages', () => {
        saveGuideSession('ann', { category: 'sports', search: 'espn', visibleCount: GUIDE_PAGE_SIZE * 10, selectedId: 'chan-412', scrollTop: 18_400 });

        expect(loadGuideSession('ann')).toEqual({
            userId: 'ann',
            view: 'guide',
            category: 'sports',
            search: 'espn',
            visibleCount: 600,
            selectedId: 'chan-412',
            scrollTop: 18_400
        });
    });

    it('keeps the scroll position when only something else changes', () => {
        saveGuideSession('ann', { scrollTop: 9_000 });
        saveGuideSession('ann', { selectedId: 'chan-7' });

        expect(loadGuideSession('ann')?.scrollTop).toBe(9_000);
        expect(loadGuideSession('ann')?.selectedId).toBe('chan-7');
    });

    it('starts at the top of the first page for someone new', () => {
        saveGuideSession('ann', { selectedId: 'chan-7' });

        expect(loadGuideSession('ann')).toMatchObject({ category: 'all', search: '', visibleCount: GUIDE_PAGE_SIZE, scrollTop: 0, view: 'guide' });
    });

    it('does not hand one profile\'s place to another', () => {
        saveGuideSession('ann', { scrollTop: 9_000, selectedId: 'chan-7' });

        expect(loadGuideSession('ben')).toBeUndefined();

        saveGuideSession('ben', { selectedId: 'chan-2' });

        expect(loadGuideSession('ben')?.scrollTop).toBe(0);
        expect(loadGuideSession('ann')).toBeUndefined();
    });

    it('ignores a save with no profile', () => {
        saveGuideSession(undefined, { scrollTop: 5 });

        expect(loadGuideSession(undefined)).toBeUndefined();
    });
});
