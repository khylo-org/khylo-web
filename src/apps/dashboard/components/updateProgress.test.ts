import { describe, expect, it } from 'vitest';

import { elapsedSeconds, formatElapsed } from './updateProgress';

describe('how long an update has been running', () => {
    const status = { UpdateStartedAt: '2026-11-11T04:00:00Z', ServerTime: '2026-11-11T04:02:05Z' };

    it('is counted by the server\'s clock, whatever this computer\'s clock says', () => {
        // This computer thinks it is the year 2000, yet the answer is the server's 2 minutes 5 seconds
        expect(elapsedSeconds(status, Date.parse('2000-01-01T00:00:00Z'), Date.parse('2000-01-01T00:00:00Z'))).toBe(125);
    });

    it('keeps counting between refreshes of the status', () => {
        const received = Date.parse('2026-11-11T09:00:00Z');

        expect(elapsedSeconds(status, received, received + 7000)).toBe(132);
    });

    it('is right after the page is reloaded mid-update (nothing is remembered in the page)', () => {
        const received = 1_000_000;

        expect(elapsedSeconds(status, received, received)).toBe(125);
    });

    it('never goes backwards or below zero', () => {
        expect(elapsedSeconds({ UpdateStartedAt: '2026-11-11T04:10:00Z', ServerTime: '2026-11-11T04:00:00Z' }, 0, 0)).toBe(0);
    });

    it('falls back to when this page started the update, and otherwise has no count', () => {
        expect(elapsedSeconds({}, 0, 90_000, 0)).toBe(90);
        expect(elapsedSeconds({}, 0, 90_000)).toBeUndefined();
        expect(elapsedSeconds(undefined, 0, 0)).toBeUndefined();
    });

    it('shows minutes and seconds', () => {
        expect(formatElapsed(0)).toBe('0:00');
        expect(formatElapsed(125)).toBe('2:05');
        expect(formatElapsed(3599)).toBe('59:59');
    });
});
