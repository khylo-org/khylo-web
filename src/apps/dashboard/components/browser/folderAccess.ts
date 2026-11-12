import axios from 'axios';

import type { ServerAccess } from './KhyloNetworkShareDialog';

/** What the server says about a folder: can Khylo open it, and can it be given access from here. */
export interface FolderAccess {
    CanOpen: boolean;
    CanChange: boolean;
    Account?: string | null;
    /** What to do about it, for the way this server is installed (Windows, Linux, Proxmox, Docker, Mac). */
    HowToFix?: string | null;
    CanGive: boolean;
    WhyNotGive?: string | null;
}

const headers = (token: string) => ({ Authorization: `MediaBrowser Token="${token}"` });

/** checkChanges also finds out whether Khylo can add files there; the server tries, so only ask after a request for it. */
export const fetchFolderAccess = async ({ base, token }: ServerAccess, path: string, checkChanges = false) => (
    (await axios.get<FolderAccess>(`${base}/Environment/FolderAccess`, { params: { path, checkChanges }, headers: headers(token) })).data
);

export const askForFolderAccess = async ({ base, token }: ServerAccess, path: string, allowChanges: boolean) => {
    await axios.post(`${base}/Environment/FolderAccess`, { Path: path, AllowChanges: allowChanges }, { headers: headers(token) });
};

/** What the folder picker shows about a folder Khylo was asked to list. */
export type AccessView =
    | { kind: 'fine' }
    /** Khylo can open it; it could also be allowed to add and delete files there (recordings, deleting from Khylo). */
    | { kind: 'canAllowChanges' }
    /** Khylo can't open it, and a button can fix that. */
    | { kind: 'canGive'; message: string }
    /** Khylo can't open it, and the owner has to fix it in Windows (or pick another folder). */
    | { kind: 'blocked'; message: string };

const account = (access: FolderAccess) => (access.Account ? `“${access.Account}”` : 'an account');

export const accessView = (access: FolderAccess | null | undefined, path: string): AccessView => {
    if (!access) return { kind: 'fine' };
    if (access.CanOpen) return access.CanGive ? { kind: 'canAllowChanges' } : { kind: 'fine' };

    const cant = `Khylo isn’t allowed to open ${path}. It runs as ${account(access)}, which isn’t let into this folder.`;
    if (access.CanGive) return { kind: 'canGive', message: cant };
    // Why the button isn't offered for this folder comes first, then what to do, in the words for this kind of server
    const rest = [ access.WhyNotGive, access.HowToFix ?? 'Give that account read access to the folder on the server, then press refresh.' ];
    return { kind: 'blocked', message: [ cant, ...rest.filter(Boolean) ].join(' ') };
};

/** How long to wait for the part of Khylo that runs as the system: it looks for requests about once a minute. */
export const ACCESS_WAIT_MS = 150_000;
export const ACCESS_POLL_MS = 3_000;

/**
 * Waits until Khylo can really open (or change) the folder. The answer is what the server finds when it tries, never a
 * "done" from the helper, so it can't say it worked when it didn't.
 */
export const waitForAccess = async (
    check: () => Promise<FolderAccess>,
    wantChanges: boolean,
    sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => { window.setTimeout(resolve, ms); }),
    waitMs = ACCESS_WAIT_MS,
    pollMs = ACCESS_POLL_MS
): Promise<boolean> => {
    for (let waited = 0; waited <= waitMs; waited += pollMs) {
        await sleep(pollMs);
        try {
            const access = await check();
            if (access.CanOpen && (!wantChanges || access.CanChange)) return true;
        } catch {
            // The server may be busy; the next check tells
        }
    }
    return false;
};
