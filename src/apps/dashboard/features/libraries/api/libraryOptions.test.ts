import { describe, expect, it } from 'vitest';

import { isRealtimeMonitorOn, withRealtimeMonitor } from './libraryOptions';

describe('library options and automatic scanning', () => {
    const options = {
        EnableRealtimeMonitor: true,
        EnablePhotos: true,
        SaveLocalMetadata: true,
        AutomaticRefreshIntervalDays: 30,
        PathInfos: [ { Path: '/media/movies' }, { Path: '/media/more' } ],
        TypeOptions: [ { Type: 'Movie', MetadataFetchers: [ 'TheMovieDb' ] } ]
    };

    it('turns automatic scanning off and leaves every other setting as it was', () => {
        const changed = withRealtimeMonitor(options, false);

        expect(changed.EnableRealtimeMonitor).toBe(false);
        expect(changed).toEqual({ ...options, EnableRealtimeMonitor: false });
        expect(changed.PathInfos).toEqual(options.PathInfos);
        expect(changed.TypeOptions).toEqual(options.TypeOptions);
    });

    it('turns it back on', () => {
        expect(withRealtimeMonitor({ ...options, EnableRealtimeMonitor: false }, true).EnableRealtimeMonitor).toBe(true);
    });

    it('does not change the settings it was given', () => {
        withRealtimeMonitor(options, false);

        expect(options.EnableRealtimeMonitor).toBe(true);
    });

    it('works on a library with no stored options', () => {
        expect(withRealtimeMonitor(undefined, false)).toEqual({ EnableRealtimeMonitor: false });
    });

    it('treats a library as scanning automatically unless it says it is off', () => {
        expect(isRealtimeMonitorOn(undefined)).toBe(true);
        expect(isRealtimeMonitorOn({})).toBe(true);
        expect(isRealtimeMonitorOn({ EnableRealtimeMonitor: true })).toBe(true);
        expect(isRealtimeMonitorOn({ EnableRealtimeMonitor: false })).toBe(false);
    });
});
