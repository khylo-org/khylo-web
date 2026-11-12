import { describe, expect, it, vi } from 'vitest';

import { accessView, waitForAccess, type FolderAccess } from './folderAccess';

const access = (over: Partial<FolderAccess>): FolderAccess => ({ CanOpen: true, CanChange: true, Account: 'NT AUTHORITY\\LOCAL SERVICE', CanGive: false, BlockedBelow: 0, ...over });
const noSleep = () => Promise.resolve();

describe('what the folder picker says about a folder', () => {
    it('says nothing when Khylo can open it, or when the server did not answer', () => {
        expect(accessView(access({}), 'D:\\DFS01').kind).toBe('fine');
        expect(accessView(null, 'D:\\DFS01').kind).toBe('fine');
        expect(accessView(undefined, 'D:\\DFS01').kind).toBe('fine');
    });

    // The bug: a folder Khylo was not allowed to open looked like an empty folder
    it('says Khylo is not allowed in, names the folder and the account, and offers to fix it', () => {
        const view = accessView(access({ CanOpen: false, CanChange: false, CanGive: true }), 'D:\\DFS01');
        expect(view.kind).toBe('canGive');
        expect(view.kind === 'canGive' && view.message).toContain('D:\\DFS01');
        expect(view.kind === 'canGive' && view.message).toContain('LOCAL SERVICE');
    });

    it('passes on the reason when Khylo may not be given that folder', () => {
        const view = accessView(access({ CanOpen: false, CanGive: false, WhyNotGive: 'That folder belongs to Windows.' }), 'C:\\Windows');
        expect(view.kind).toBe('blocked');
        expect(view.kind === 'blocked' && view.message).toContain('That folder belongs to Windows.');
    });

    it('says what the server says to do, which differs for Windows, Linux, Proxmox, Docker and Mac', () => {
        const view = accessView(access({ CanOpen: false, CanGive: false, Account: 'khylo', HowToFix: 'On the server, run: sudo setfacl -R -m u:khylo:rX "/mnt/media"' }), '/mnt/media');
        expect(view.kind).toBe('blocked');
        expect(view.kind === 'blocked' && view.message).toContain('/mnt/media');
        expect(view.kind === 'blocked' && view.message).toContain('“khylo”');
        expect(view.kind === 'blocked' && view.message).toContain('sudo setfacl');
        expect(view.kind === 'blocked' && view.message).not.toContain('Windows');
    });

    it('still says something useful to an older server that gives no steps', () => {
        const view = accessView(access({ CanOpen: false, CanGive: false }), 'D:\\DFS01');
        expect(view.kind === 'blocked' && view.message).toContain('read access');
    });

    it('offers to allow changes in a folder Khylo can open, only where access can be given from here', () => {
        expect(accessView(access({ CanChange: false, CanGive: true }), 'D:\\DVR').kind).toBe('canAllowChanges');
        expect(accessView(access({ CanChange: false, CanGive: false }), 'D:\\DVR').kind).toBe('fine');
    });

    // The bug that came next: DFS01 opened, but Movies inside it (with permissions of its own) stayed locked, and a scan would skip it
    it('says so when Khylo can open a folder but not some folders inside it, naming one', () => {
        const view = accessView(access({ BlockedBelow: 3, BlockedSample: ['D:\\DFS01\\Movies'], CanGive: true }), 'D:\\DFS01');
        expect(view.kind).toBe('partlyBlocked');
        expect(view.kind === 'partlyBlocked' && view.canGive).toBe(true);
        expect(view.kind === 'partlyBlocked' && view.message).toContain('3 folders');
        expect(view.kind === 'partlyBlocked' && view.message).toContain('D:\\DFS01\\Movies');
        expect(view.kind === 'partlyBlocked' && view.message).toContain('missing from the library');
    });

    it('gives the steps for this kind of server when the folders inside cannot be opened from here', () => {
        const view = accessView(access({ BlockedBelow: 1, BlockedSample: ['/mnt/media/Movies'], Account: 'khylo', HowToFix: 'run: sudo setfacl -R -m u:khylo:rX "/mnt/media/Movies"' }), '/mnt/media');
        expect(view.kind === 'partlyBlocked' && view.canGive).toBe(false);
        expect(view.kind === 'partlyBlocked' && view.message).toContain('sudo setfacl');
    });

    it('says "or more" when the folder was too big to look through completely', () => {
        const view = accessView(access({ BlockedBelow: 1, BlockedComplete: false }), 'D:\\Big');
        expect(view.kind === 'partlyBlocked' && view.message).toContain('1 folder or more');
    });
});

describe('waiting for access after asking', () => {
    it('is done as soon as Khylo can really open the folder and everything inside', async () => {
        const check = vi.fn()
            .mockResolvedValueOnce(access({ CanOpen: false }))
            .mockResolvedValueOnce(access({ CanOpen: false }))
            .mockResolvedValueOnce(access({ CanOpen: true, CanChange: false }));

        expect(await waitForAccess(check, false, noSleep)).toBe('done');
        expect(check).toHaveBeenCalledTimes(3);
    });

    // The bug: it said "done" when the top folder opened, while folders inside were still locked
    it('is not done while a folder inside is still locked', async () => {
        const check = vi.fn()
            .mockResolvedValueOnce(access({ BlockedBelow: 2 }))
            .mockResolvedValueOnce(access({ BlockedBelow: 1 }))
            .mockResolvedValueOnce(access({ BlockedBelow: 0 }));
        const seen: Array<number | null> = [];

        expect(await waitForAccess(check, false, noSleep, 240_000, 3_000, left => seen.push(left))).toBe('done');
        expect(check).toHaveBeenCalledTimes(3);
        expect(seen).toEqual([ 2, 1 ]);
    });

    it('keeps waiting for changes when changes were asked for', async () => {
        const check = vi.fn()
            .mockResolvedValueOnce(access({ CanOpen: true, CanChange: false }))
            .mockResolvedValueOnce(access({ CanOpen: true, CanChange: true }));

        expect(await waitForAccess(check, true, noSleep)).toBe('done');
        expect(check).toHaveBeenCalledTimes(2);
    });

    it('gives up when nothing gets better, and says it did not work, never that it did', async () => {
        const check = vi.fn().mockResolvedValue(access({ CanOpen: false }));

        expect(await waitForAccess(check, false, noSleep, 9_000, 3_000)).toBe('stalled');
        expect(check).toHaveBeenCalledTimes(4);
    });

    it('keeps waiting while the number of locked folders keeps going down, however long it takes', async () => {
        let left = 50;
        const check = vi.fn(() => Promise.resolve(access({ BlockedBelow: left-- })));

        expect(await waitForAccess(check, false, noSleep, 9_000, 3_000)).toBe('done');
        expect(check).toHaveBeenCalledTimes(51);
    });

    it('gives up when the count stops going down', async () => {
        const check = vi.fn()
            .mockResolvedValueOnce(access({ BlockedBelow: 5 }))
            .mockResolvedValueOnce(access({ BlockedBelow: 4 }))
            .mockResolvedValue(access({ BlockedBelow: 4 }));

        expect(await waitForAccess(check, false, noSleep, 9_000, 3_000)).toBe('stalled');
    });

    it('carries on when a check fails', async () => {
        const check = vi.fn().mockRejectedValueOnce(new Error('busy')).mockResolvedValueOnce(access({}));

        expect(await waitForAccess(check, false, noSleep)).toBe('done');
    });
});
