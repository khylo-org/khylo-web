import React, { FC, useCallback, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

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
        refetchInterval: 15000,
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
                    onClick={() => navigate('/dashboard/settings')}
                    sx={{ bgcolor: KHYLO_COLORS.accent, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                >
                    View update
                </Button>
            )}
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
    const [showNotes, setShowNotes] = useState(false);

    const headers = { Authorization: `MediaBrowser Token="${api?.accessToken ?? ''}"` };
    const { data: status } = useKhyloUpdates();

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
        if (!window.confirm('Khylo will restart to update. Anyone watching will be interrupted for a minute or two. Update now?')) return;
        if (await call('install', 'Install')) {
            setMessage({ severity: 'info', text: 'Updating. Khylo restarts in a moment and will be back in a minute or two. This page reconnects by itself.' });
        }
    }, [call]);

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
                {status.UpdateAvailable && status.Latest ? (
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
                        {showNotes && (
                            <Typography
                                component='pre'
                                variant='caption'
                                sx={{ mt: 1.5, p: 1.5, maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap', bgcolor: KHYLO_COLORS.surfaceSecondary, borderRadius: '8px', color: KHYLO_COLORS.textSecondary, fontFamily: 'inherit' }}
                            >
                                {status.Latest.Notes || 'No notes for this build.'}
                            </Typography>
                        )}
                        {!status.CanInstall && status.WhyNot && <Alert severity='info' sx={{ mt: 1.5 }}>{status.WhyNot}</Alert>}
                    </Box>
                ) : (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>
                        {upToDate}
                    </Typography>
                )}

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
                {status.LastResult && <Alert severity={status.LastResult.includes('went back') || status.LastResult.includes('didn’t') ? 'warning' : 'success'}>{status.LastResult}</Alert>}
                {status.CheckError && <Alert severity='warning'>{status.CheckError}</Alert>}
                {message && <Alert severity={message.severity}>{message.text}</Alert>}
            </Stack>
        </KhyloPanel>
    );
};

export default KhyloUpdatesPanel;
