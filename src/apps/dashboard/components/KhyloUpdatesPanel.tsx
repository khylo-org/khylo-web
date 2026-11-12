import React, { FC, useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { elapsedSeconds, formatElapsed } from './updateProgress';
import { useApi } from 'hooks/useApi';

import { KHYLO_COLORS, KhyloPanel } from './ui';

interface UpdateInfo {
    Build: string;
    PublishedAt?: string | null;
    Notes: string;
    Url: string;
}

interface UpdateStatus {
    CurrentBuild: string;
    Channel: 'stable' | 'dev';
    AutoInstall: boolean;
    InstallHour: number;
    Latest?: UpdateInfo | null;
    UpdateAvailable: boolean;
    LastChecked?: string | null;
    CanInstall: boolean;
    WhyNot?: string | null;
    Installing: boolean;
    LastResult?: string | null;
    CheckError?: string | null;
    Stage?: string | null;
    Percent?: number | null;
    UpdatingTo?: string | null;
    UpdateStartedAt?: string | null;
    ServerTime?: string | null;
    UpdateLog?: { At: string; Text: string }[];
}

// The choice that's on is orange
const activeSx = {
    textTransform: 'none',
    px: 2,
    '&.Mui-selected': { bgcolor: KHYLO_COLORS.accent, color: '#fff', '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }
};

const hourLabel = (hour: number) => {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h} ${hour < 12 ? 'am' : 'pm'}`;
};

/** What's known about updates, refreshed every 15 seconds. */
export const useKhyloUpdates = () => {
    const { api } = useApi();
    return useQuery({
        queryKey: ['khyloUpdates'],
        enabled: Boolean(api),
        // Quickly while an update runs or the server is restarting, so the page notices the moment it is back
        refetchInterval: query => (query.state.data?.Installing || query.state.status === 'error' ? 3000 : 15000),
        queryFn: async () => (await axios.get<UpdateStatus>(`${api?.basePath}/Khylo/Updates`, {
            headers: { Authorization: `MediaBrowser Token="${api?.accessToken ?? ''}"` }
        })).data
    });
};

/** A slim line for the Operations page, only while an update is waiting or being installed. */
export const KhyloUpdateNotice: FC = () => {
    const { data: status } = useKhyloUpdates();
    const navigate = useNavigate();
    if (!status || !(status.UpdateAvailable || status.Installing)) return null;

    return (
        <Box
            sx={{
                mb: 3,
                px: 2.5,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                borderRadius: '10px',
                bgcolor: KHYLO_COLORS.surfacePrimary,
                border: `1px solid ${KHYLO_COLORS.accent}`
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SystemUpdateAltIcon sx={{ fontSize: 20, color: KHYLO_COLORS.accent }} />
                <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                    {status.Installing ? 'Khylo is updating and will restart in a moment' : `Khylo ${status.Latest?.Build ?? ''} is available`}
                </Typography>
            </Box>
            {!status.Installing && (
                <Button
                    size='small'
                    variant='contained'
                    onClick={() => navigate('/dashboard/updates')}
                    sx={{ bgcolor: KHYLO_COLORS.accent, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                >
                    View update
                </Button>
            )}
        </Box>
    );
};

/** What's new in a build: short headings and bullets, one line each. */
const WhatsNewList: FC<{ notes: string }> = ({ notes }) => {
    const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        return <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>No notes for this build.</Typography>;
    }

    return (
        <Stack spacing={0.75} sx={{ mt: 1.5, p: 2, borderRadius: '8px', bgcolor: KHYLO_COLORS.surfaceSecondary }}>
            {lines.map((line, i) => (line.startsWith('- ') ? (
                // eslint-disable-next-line react/no-array-index-key
                <Typography key={i} variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, pl: 2, textIndent: '-12px' }}>
                    {'• ' + line.slice(2)}
                </Typography>
            ) : (
                // eslint-disable-next-line react/no-array-index-key
                <Typography key={i} variant='caption' sx={{ color: KHYLO_COLORS.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, pt: i === 0 ? 0 : 1 }}>
                    {line}
                </Typography>
            )))}
        </Stack>
    );
};

/** What the update has done so far, one line each with its time. */
const UpdateLogList: FC<{ lines: { At: string; Text: string }[] }> = ({ lines }) => (
    <Stack spacing={0.25} sx={{ mt: 1.25, p: 1.5, borderRadius: '6px', bgcolor: KHYLO_COLORS.surfacePrimary, maxHeight: 220, overflowY: 'auto' }}>
        {lines.map(line => (
            <Typography key={`${line.At}${line.Text}`} variant='caption' sx={{ color: KHYLO_COLORS.textSecondary, fontFamily: 'monospace', fontSize: '0.72rem' }}>
                {`${new Date(line.At).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}  ${line.Text}`}
            </Typography>
        ))}
    </Stack>
);

/** What an update in progress is doing, and about how long it takes. Khylo restarts partway, so the page waits for it. */
const UpdateProgress: FC<{ status: UpdateStatus; restarting: boolean; elapsed?: number }> = ({ status, restarting, elapsed }) => {
    let label = status.UpdatingTo ? `Updating to ${status.UpdatingTo}…` : 'Starting the update…';
    let value: number | undefined;
    if (restarting || status.Stage === 'Installing') {
        label = restarting ? 'Khylo is restarting with the new version…' : 'Installing…';
    } else if (status.Stage === 'Downloading') {
        label = `Downloading the update… ${status.Percent ?? 0}%`;
        value = status.Percent ?? 0;
    } else if (status.Stage === 'Checking') {
        label = 'Checking the download…';
    }

    return (
        <Box sx={{ p: 2, borderRadius: '8px', bgcolor: KHYLO_COLORS.surfaceSecondary, border: `1px solid ${KHYLO_COLORS.borderDefault}` }}>
            <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary, mb: 1.25 }}>{label}</Typography>
            <LinearProgress
                variant={value === undefined ? 'indeterminate' : 'determinate'}
                value={value}
                sx={{ height: 6, borderRadius: 3, bgcolor: KHYLO_COLORS.borderDefault, '& .MuiLinearProgress-bar': { bgcolor: KHYLO_COLORS.accent } }}
            />
            <Typography variant='caption' sx={{ display: 'block', mt: 1.25, color: KHYLO_COLORS.textMuted }}>
                This usually takes 2 to 3 minutes in all (longer the first time on a very large library).
                {elapsed === undefined ? '' : ` ${formatElapsed(elapsed)} so far.`} Anyone watching is interrupted when Khylo restarts,
                and this page reconnects by itself.
            </Typography>
            {status.UpdateLog && status.UpdateLog.length > 0 && <UpdateLogList lines={status.UpdateLog} />}
        </Box>
    );
};

/** Khylo updating itself: what's available, which releases to follow, and installing. */
// A single screen of conditions (offer, notes, settings, results), so it reads top to bottom as one piece
// eslint-disable-next-line sonarjs/cognitive-complexity
export const KhyloUpdatesPanel: FC = () => {
    const { api } = useApi();
    const queryClient = useQueryClient();
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [showNotes, setShowNotes] = useState(true);
    const [updating, setUpdating] = useState<{ since: number; fromBuild: string } | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [showLog, setShowLog] = useState(false);

    const headers = { Authorization: `MediaBrowser Token="${api?.accessToken ?? ''}"` };
    const { data: status, isError, dataUpdatedAt } = useKhyloUpdates();

    // While an update runs: count the time, and notice when the new version has come back
    const running = Boolean(updating || status?.Installing);
    useEffect(() => {
        if (!running) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [running]);

    useEffect(() => {
        if (!updating || !status || isError) return;
        if (status.CurrentBuild && status.CurrentBuild !== updating.fromBuild && !status.Installing) {
            setUpdating(null);
            setMessage({ severity: 'success', text: `Khylo is now running ${status.CurrentBuild}.` });
        }
    }, [updating, status, isError]);

    const call = useCallback(async (what: string, path: string, body?: object) => {
        setBusy(what);
        setMessage(null);
        try {
            const response = await axios.post<UpdateStatus | undefined>(`${api?.basePath}/Khylo/Updates/${path}`, body ?? {}, { headers, timeout: 600000 });
            if (response.data && 'CurrentBuild' in response.data) {
                queryClient.setQueryData(['khyloUpdates'], response.data);
            }
            return true;
        } catch (err) {
            const text = axios.isAxiosError(err) ? (err.response?.data as { Message?: string } | undefined)?.Message : undefined;
            setMessage({ severity: 'error', text: text ?? 'That didn’t work. Try again.' });
            return false;
        } finally {
            setBusy(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api, queryClient]);

    const install = useCallback(async () => {
        if (!window.confirm('Khylo will restart to update. This takes about 2 to 3 minutes, and anyone watching will be interrupted. Update now?')) return;
        if (await call('install', 'Install')) {
            setUpdating({ since: Date.now(), fromBuild: status?.CurrentBuild ?? '' });
        }
    }, [call, status]);

    const run = (what: string, path: string, body?: object) => {
        call(what, path, body).catch(() => undefined);
    };
    const runInstall = () => {
        install().catch(() => undefined);
    };

    if (!status) return null;

    let upToDate = 'Khylo is up to date.';
    if (!status.Latest && status.CurrentBuild) {
        upToDate = status.Channel === 'stable' ? 'No finished release yet on this channel.' : 'Nothing new yet.';
    }

    const sub = (
        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
            {status.CurrentBuild ? `Running ${status.CurrentBuild}` : 'A development copy of Khylo'}
            {status.LastChecked ? ` · checked ${new Date(status.LastChecked).toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}` : ''}
        </Typography>
    );

    return (
        <KhyloPanel
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SystemUpdateAltIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                    <span>Khylo updates</span>
                </Box>
            }
            subtitle={sub}
            actions={
                <Button
                    size='small'
                    variant='text'
                    disabled={busy !== null}
                    onClick={() => run('check', 'Check')}
                    sx={{ textTransform: 'none', color: KHYLO_COLORS.textSecondary }}
                >
                    {busy === 'check' ? 'Checking…' : 'Check now'}
                </Button>
            }
        >
            <Stack spacing={2}>
                {(updating || status.Installing) && <UpdateProgress status={status} restarting={isError} elapsed={elapsedSeconds(status, dataUpdatedAt, now, updating?.since)} />}
                {!updating && !status.Installing && status.UpdateAvailable && status.Latest ? (
                    <Box>
                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {status.Latest.Build} is available
                        </Typography>
                        <Stack direction='row' spacing={1.5} sx={{ mt: 1.25, flexWrap: 'wrap' }}>
                            <Button
                                variant='contained'
                                size='small'
                                disabled={!status.CanInstall || busy !== null || status.Installing}
                                startIcon={busy === 'install' || status.Installing ? <CircularProgress size={14} color='inherit' /> : undefined}
                                onClick={() => runInstall()}
                                sx={{ bgcolor: KHYLO_COLORS.accent, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                            >
                                {status.Installing ? 'Updating…' : 'Update now'}
                            </Button>
                            <Button size='small' variant='text' onClick={() => setShowNotes(v => !v)} sx={{ textTransform: 'none', color: KHYLO_COLORS.textSecondary }}>
                                {showNotes ? 'Hide what’s new' : 'What’s new'}
                            </Button>
                            <Button size='small' variant='text' disabled={busy !== null} onClick={() => run('skip', 'Skip')} sx={{ textTransform: 'none', color: KHYLO_COLORS.textSecondary }}>
                                Skip this one
                            </Button>
                        </Stack>
                        {showNotes && <WhatsNewList notes={status.Latest.Notes} />}
                        {!status.CanInstall && status.WhyNot && <Alert severity='info' sx={{ mt: 1.5 }}>{status.WhyNot}</Alert>}
                    </Box>
                ) : (!updating && !status.Installing && (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>
                        {upToDate}
                    </Typography>
                ))}

                <Stack direction='row' spacing={3} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <ToggleButtonGroup
                        exclusive
                        size='small'
                        value={status.Channel}
                        onChange={(_, value: 'stable' | 'dev' | null) => value && run('channel', 'Settings', { Channel: value, AutoInstall: status.AutoInstall })}
                    >
                        <ToggleButton value='stable' sx={activeSx}>Stable releases</ToggleButton>
                        <ToggleButton value='dev' sx={activeSx}>Every build (dev)</ToggleButton>
                    </ToggleButtonGroup>
                    <FormControlLabel
                        control={
                            <Switch
                                size='small'
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: KHYLO_COLORS.accent },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: KHYLO_COLORS.accent }
                                }}
                                checked={status.AutoInstall}
                                disabled={!status.CanInstall || busy !== null}
                                onChange={e => run('auto', 'Settings', { Channel: status.Channel, AutoInstall: e.target.checked })}
                            />
                        }
                        label={<Typography variant='body2'>Install updates by themselves at {hourLabel(status.InstallHour)}, when nobody is watching</Typography>}
                    />
                </Stack>

                {!status.CanInstall && !status.UpdateAvailable && status.WhyNot && <Alert severity='info'>{status.WhyNot}</Alert>}
                {status.LastResult && (
                    <Alert
                        severity={status.LastResult.includes('went back') || status.LastResult.includes('didn’t') ? 'warning' : 'success'}
                        onClose={() => run('dismiss', 'DismissResult')}
                    >
                        {status.LastResult}
                    </Alert>
                )}
                {!running && status.UpdateLog && status.UpdateLog.length > 0 && (
                    <Box>
                        <Button size='small' variant='text' onClick={() => setShowLog(v => !v)} sx={{ textTransform: 'none', color: KHYLO_COLORS.textSecondary }}>
                            {showLog ? 'Hide update log' : 'Show update log'}
                        </Button>
                        {showLog && <UpdateLogList lines={status.UpdateLog} />}
                    </Box>
                )}
                {status.CheckError && <Alert severity='warning'>{status.CheckError}</Alert>}
                {message && <Alert severity={message.severity}>{message.text}</Alert>}
            </Stack>
        </KhyloPanel>
    );
};

export default KhyloUpdatesPanel;
