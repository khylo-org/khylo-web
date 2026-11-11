import type { LibraryOptions } from '@khylo/sdk/lib/generated-client/models/library-options';

/**
 * A library's options with automatic scanning (real-time monitoring) set and every other option exactly as it was.
 * The server replaces a library's whole options object with what it is sent, so sending only the one changed setting
 * would quietly reset everything else (folders, metadata choices, image settings) to defaults.
 */
export function withRealtimeMonitor(options: LibraryOptions | undefined, enabled: boolean): LibraryOptions {
    return { ...(options ?? {}), EnableRealtimeMonitor: enabled };
}

/** Automatic scanning is on unless the library says otherwise (it is on for every new library). */
export function isRealtimeMonitorOn(options: LibraryOptions | undefined): boolean {
    return options?.EnableRealtimeMonitor !== false;
}
