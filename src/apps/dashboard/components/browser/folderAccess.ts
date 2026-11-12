import axios from 'axios';

import type { ServerAccess } from './KhyloNetworkShareDialog';

/** What the server says about a folder: can Khylo open it, and can it be given access from here. */
export interface FolderAccess {
    CanOpen: boolean;
    CanChange: boolean;
    Account?: string | null;
    /** What to do about it, for the way this server is installed (Windows, Linux, Proxmox, Docker, Mac). */
    HowToFix?: string | null;
    /** Folders inside this one that Khylo may not open (only when asked for): a scan skips them without a word. */
    BlockedBelow?: number;
    BlockedSample?: string[] | null;
    /** False when the folder was too big to look through completely, so the count may be low. */
    BlockedComplete?: boolean;
    CanGive: boolean;
    WhyNotGive?: string | null;
}

const headers = (token: string) => ({ Authorization: `MediaBrowser Token="${token}"` });

/**
 * checkChanges also finds out whether Khylo can add files there (the server tries, so only ask after a request for it).
 * deep also looks through every folder inside for ones Khylo may not open, which takes a little on a big library.
 */
export const fetchFolderAccess = async ({ base, token }: ServerAccess, path: string, checkChanges = false, deep = false) => (
    (await axios.get<FolderAccess>(`${base}/Environment/FolderAccess`, { params: { path, checkChanges, deep }, headers: headers(token) })).data
);

export const askForFolderAccess = async ({ base, token }: ServerAccess, path: string, allowChanges: boolean) => {
    await axios.post(`${base}/Environment/FolderAccess`, { Path: path, AllowChanges: allowChanges }, { headers: headers(token) });
};

/** What the folder picker (and a library's row) shows about a folder. */
export type AccessView =
    | { kind: 'fine' }
    /** Khylo can open it; it could also be allowed to add and delete files there (recordings, deleting from Khylo). */
    | { kind: 'canAllowChanges' }
    /** Khylo can't open it, and a button can fix that. */
    | { kind: 'canGive'; message: string }
    /** Khylo can open the folder but not some folders inside it, which a scan would skip without a word. */
    | { kind: 'partlyBlocked'; message: string; canGive: boolean; count: number }
    /** Khylo can't open it, and the owner has to fix it on the server (or pick another folder). */
    | { kind: 'blocked'; message: string };

const account = (access: FolderAccess) => (access.Account ? `“${access.Account}”` : 'an account');

const steps = (access: FolderAccess) => [
    access.WhyNotGive,
    access.HowToFix ?? 'Give that account read access to the folder on the server, then press refresh here.'
].filter(Boolean).join(' ');

/** The folder opens, but some folders inside it don't: what to say. */
const partlyBlockedView = (access: FolderAccess, path: string, count: number): AccessView => {
    const sample = access.BlockedSample?.[0];
    const some = `${count} folder${count === 1 ? '' : 's'}${access.BlockedComplete === false ? ' or more' : ''}`;
    const example = sample ? `, for example ${sample}` : '';
    const message = `Khylo can open ${path}, but isn’t allowed into ${some} inside it${example}. A scan skips what it can’t open, so those would be missing from the library.`;
    return { kind: 'partlyBlocked', message: access.CanGive ? message : `${message} ${steps(access)}`, canGive: access.CanGive, count };
};

export const accessView = (access: FolderAccess | null | undefined, path: string): AccessView => {
    if (!access) return { kind: 'fine' };

    if (access.CanOpen) {
        const count = access.BlockedBelow ?? 0;
        if (count > 0) return partlyBlockedView(access, path, count);
        return access.CanGive ? { kind: 'canAllowChanges' } : { kind: 'fine' };
    }

    const cant = `Khylo isn’t allowed to open ${path}. It runs as ${account(access)}, which isn’t let into this folder.`;
    if (access.CanGive) return { kind: 'canGive', message: cant };
    return { kind: 'blocked', message: `${cant} ${steps(access)}` };
};

/** How long to wait with no sign of progress before saying it did not work (the helper looks for requests about once a minute). */
export const ACCESS_STALL_MS = 240_000;
export const ACCESS_POLL_MS = 3_000;

export type AccessWait = 'done' | 'stalled';

/**
 * Waits until Khylo can really open the folder and every folder inside it (and change files, when that was asked for). The answer is
 * what the server finds when it tries, never a "done" from the helper, so it can't say it worked when it didn't. A very big folder
 * takes Windows a long while, so it keeps waiting as long as the number of folders still locked keeps going down.
 */
export const waitForAccess = async (
    check: () => Promise<FolderAccess>,
    wantChanges: boolean,
    sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => { window.setTimeout(resolve, ms); }),
    stallMs = ACCESS_STALL_MS,
    pollMs = ACCESS_POLL_MS,
    onProgress?: (stillLocked: number | null) => void
): Promise<AccessWait> => {
    let best = Number.POSITIVE_INFINITY;
    let quiet = 0;
    for (;;) {
        await sleep(pollMs);
        try {
            const access = await check();
            const locked = access.CanOpen ? (access.BlockedBelow ?? 0) : Number.POSITIVE_INFINITY;
            if (access.CanOpen && locked === 0 && (!wantChanges || access.CanChange)) return 'done';
            onProgress?.(access.CanOpen ? locked : null);
            if (locked < best) {
                best = locked;
                quiet = 0;
            } else {
                quiet += pollMs;
            }
        } catch {
            // The server may be busy; the next check tells
            quiet += pollMs;
        }
        if (quiet > stallMs) return 'stalled';
    }
};
