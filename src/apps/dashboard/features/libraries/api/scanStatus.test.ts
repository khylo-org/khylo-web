import { describe, expect, it } from 'vitest';

import { UNSEEN_SCAN_MS, lastScannedLabel, scanJustEnded, scanView } from './scanStatus';

const NOW = new Date('2026-11-11T16:41:00').getTime();

describe('what a library row says about scanning', () => {
    it('says nothing for a library nobody scanned', () => {
        expect(scanView(undefined, { RefreshStatus: 'Idle' }, NOW)).toEqual({ state: 'none' });
    });

    it('shows a scan the server reports as running, with its progress, even if it was not started here', () => {
        expect(scanView(undefined, { RefreshStatus: 'Active', RefreshProgress: 37.4 }, NOW)).toEqual({ state: 'scanning', percent: 37 });
        expect(scanView(undefined, { RefreshStatus: 'Active' }, NOW)).toEqual({ state: 'scanning', percent: undefined });
    });

    it('says the scan is starting between the click and the server picking it up', () => {
        expect(scanView({ startedAt: NOW - 3000, seenActive: false }, { RefreshStatus: 'Idle' }, NOW)).toEqual({ state: 'starting' });
    });

    it('says finished once a scan that was seen running stops', () => {
        expect(scanView({ startedAt: NOW - 60_000, seenActive: true }, { RefreshStatus: 'Idle' }, NOW)).toEqual({ state: 'finished' });
    });

    it('takes a scan the server never showed as running as already finished (a quick one is over between looks)', () => {
        expect(scanView({ startedAt: NOW - UNSEEN_SCAN_MS - 1, seenActive: false }, { RefreshStatus: 'Idle' }, NOW)).toEqual({ state: 'finished' });
    });

    it('announces an ended scan only when one was asked for here', () => {
        expect(scanJustEnded({ startedAt: NOW, seenActive: true }, { state: 'finished' })).toBe(true);
        expect(scanJustEnded(undefined, { state: 'finished' })).toBe(false);
        expect(scanJustEnded({ startedAt: NOW, seenActive: true }, { state: 'scanning', percent: 5 })).toBe(false);
    });
});

describe('when a library was last scanned', () => {
    it('says today, yesterday, or the date', () => {
        expect(lastScannedLabel(NOW - 60_000, NOW)).toMatch(/^today /);
        expect(lastScannedLabel(NOW - 86_400_000, NOW)).toMatch(/^yesterday /);
        expect(lastScannedLabel(NOW - 5 * 86_400_000, NOW)).toMatch(/Nov 6, /);
    });
});
