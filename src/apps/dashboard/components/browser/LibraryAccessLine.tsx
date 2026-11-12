import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { KHYLO_COLORS } from '../ui/tokens';
import type { ServerAccess } from './KhyloNetworkShareDialog';
import { accessView, askForFolderAccess, fetchFolderAccess, waitForAccess, type AccessView } from './folderAccess';

interface LibraryAccessLineProps {
    /** The library's folders, as the server sees them. */
    locations: string[];
    /** Changes when a scan ends, which is when a folder Khylo couldn't read has just been skipped. */
    recheckKey?: unknown;
}

interface Problem {
    path: string;
    view: Extract<AccessView, { kind: 'canGive' | 'partlyBlocked' | 'blocked' }>;
}

const CHECKED_FOR_MS = 10 * 60 * 1000;
const checkedKey = (locations: string[]) => `khylo.accessChecked.${locations.join('|')}`;

const recentlyChecked = (locations: string[]) => {
    try {
        return Date.now() - Number(window.sessionStorage.getItem(checkedKey(locations)) ?? 0) < CHECKED_FOR_MS;
    } catch {
        return false;
    }
};

const markChecked = (locations: string[]) => {
    try {
        window.sessionStorage.setItem(checkedKey(locations), String(Date.now()));
    } catch {
        // Not remembered when the browser won't store it
    }
};

/**
 * Under a library: says when Khylo is not allowed into some of the library's folders (a scan skips what it can't open without a
 * word, so titles would just be missing), and fixes it with one click where it can.
 */
export const LibraryAccessLine: FC<LibraryAccessLineProps> = ({ locations, recheckKey }) => {
    const { api } = useApi();
    const [ problem, setProblem ] = useState<Problem | null>(null);
    const [ fixing, setFixing ] = useState(false);
    const [ stillLocked, setStillLocked ] = useState<number | null>(null);
    const [ failed, setFailed ] = useState(false);

    const access = useMemo<ServerAccess>(() => {
        const legacy = ServerConnections.currentApiClient();
        let base = api?.basePath || (legacy?.serverAddress ? legacy.serverAddress() : '') || '';
        while (base.endsWith('/')) base = base.slice(0, -1);
        const token = api?.accessToken || (legacy?.accessToken ? legacy.accessToken() : '') || '';
        return { base, token };
    }, [ api ]);

    const check = useCallback(async () => {
        for (const path of locations.slice(0, 6)) {
            try {
                const view = accessView(await fetchFolderAccess(access, path, false, true), path);
                if (view.kind === 'canGive' || view.kind === 'partlyBlocked' || view.kind === 'blocked') {
                    setProblem({ path, view });
                    return;
                }
            } catch {
                // An older server, or one that is busy: nothing to say
            }
        }
        setProblem(null);
    }, [ access, locations ]);

    // Once when the page opens (not again for ten minutes in this browser), and again whenever a scan of the library has just ended
    useEffect(() => {
        if (!access.token || locations.length === 0) return;
        if (recheckKey === undefined && recentlyChecked(locations)) return;
        markChecked(locations);
        void check();
    }, [ access.token, locations, recheckKey, check ]);

    const fix = useCallback(async () => {
        if (!problem) return;
        setFixing(true);
        setFailed(false);
        try {
            await askForFolderAccess(access, problem.path, false);
            const result = await waitForAccess(() => fetchFolderAccess(access, problem.path, false, true), false, undefined, undefined, undefined, setStillLocked);
            setFailed(result !== 'done');
        } catch {
            setFailed(true);
        }
        setFixing(false);
        setStillLocked(null);
        await check();
    }, [ access, check, problem ]);

    if (!problem) return null;
    const canFix = problem.view.kind === 'canGive' || (problem.view.kind === 'partlyBlocked' && problem.view.canGive);

    let label = 'Khylo isn’t allowed to read this library’s folder, so nothing in it shows.';
    if (problem.view.kind === 'partlyBlocked') {
        label = `Khylo can’t read ${problem.view.count} folder${problem.view.count === 1 ? '' : 's'} in this library, so a scan skips them.`;
    }
    if (fixing) label = stillLocked ? `Giving Khylo access… ${stillLocked} folders still locked.` : 'Giving Khylo access…';
    else if (failed) label = 'Khylo still can’t read everything here. It may still be working: check again in a few minutes.';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
            <Tooltip title={problem.view.message}>
                <Typography variant='caption' sx={{ color: KHYLO_COLORS.status.danger.fg }}>{label}</Typography>
            </Tooltip>
            {fixing && <CircularProgress size={12} sx={{ color: KHYLO_COLORS.accent }} />}
            {!fixing && canFix && (
                <Button size='small' variant='text' onClick={() => { void fix(); }} sx={{ textTransform: 'none', py: 0, minWidth: 0 }}>
                    {failed ? 'Try again' : 'Give Khylo access'}
                </Button>
            )}
        </Box>
    );
};

export default LibraryAccessLine;
