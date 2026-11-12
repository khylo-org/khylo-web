/** A scan someone asked for from this page. */
export interface ScanRequest {
    startedAt: number;
    /** Whether the server has been seen scanning it since. */
    seenActive: boolean;
}

/** What the library's row says about scanning. */
export type ScanView =
    | { state: 'none' }
    | { state: 'starting' }
    | { state: 'scanning'; percent?: number }
    | { state: 'finished' };

/** How long a requested scan may go unseen on the server before it is taken as already finished (a quick one can be over between looks). */
export const UNSEEN_SCAN_MS = 15_000;

interface ServerFolder {
    RefreshStatus?: string | null;
    RefreshProgress?: number | null;
}

/** What to show for a library, from what the server says now and what was asked from this page. */
export function scanView(request: ScanRequest | undefined, folder: ServerFolder | undefined, now: number): ScanView {
    const active = folder?.RefreshStatus === 'Active';
    const percent = typeof folder?.RefreshProgress === 'number' ? Math.round(folder.RefreshProgress) : undefined;

    if (active) return { state: 'scanning', percent };
    if (!request) return { state: 'none' };
    if (request.seenActive) return { state: 'finished' };
    return now - request.startedAt < UNSEEN_SCAN_MS ? { state: 'starting' } : { state: 'finished' };
}

/** Whether a scan asked for here has now ended, so it can be announced once. */
export function scanJustEnded(request: ScanRequest | undefined, view: ScanView): boolean {
    return Boolean(request) && view.state === 'finished';
}

/** "today 4:41 PM", "yesterday 9:05 AM" or "Nov 3, 9:05 AM" for when a library was last scanned. */
export function lastScannedLabel(at: number, now: number): string {
    const time = new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const day = (t: number) => new Date(t).toDateString();
    if (day(at) === day(now)) return `today ${time}`;
    if (day(at) === day(now - 86_400_000)) return `yesterday ${time}`;
    return `${new Date(at).toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}
