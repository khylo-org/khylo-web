import React, { FC, useMemo, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MemoryIcon from '@mui/icons-material/Memory';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SecurityIcon from '@mui/icons-material/Security';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useSystemInfo } from 'hooks/useSystemInfo';
import { getReadableSize } from 'utils/file';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';
import { getSessionApi } from '@khylo/sdk/lib/utils/api/session-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { useLogEntries } from '../features/activity/api/useLogEntries';

import useLiveTasks from '../features/tasks/hooks/useLiveTasks';
import { useStartTask } from '../features/tasks/api/useStartTask';
import { useStopTask } from '../features/tasks/api/useStopTask';
import { useSystemTelemetry } from '../features/system/api/useSystemTelemetry';
import { useStorageDevices } from '../features/storage/api/useStorageDevices';
import { useVirtualFolders } from '../features/libraries/api/useVirtualFolders';
import { KhyloNetworkShareDialog } from '../components/browser/KhyloNetworkShareDialog';
import { KhyloUpdatesPanel } from '../components/KhyloUpdatesPanel';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloPanel,
    KhyloStatusBadge
} from '../components/ui';

interface StorageLocation {
    Library: string;
    Path: string;
    Reachable: boolean;
    Since: string;
}

const describeLocation = (l: StorageLocation) =>
    `${l.Library} (${l.Path}) since ${new Date(l.Since).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

// A network folder like \\nas\Movies\Action lives on the share \\nas\Movies, which is what a login connects
const BACKSLASH = String.fromCharCode(92);
const shareRootOf = (path: string) => {
    const parts = path.split(BACKSLASH).filter(Boolean);
    return path.startsWith(BACKSLASH + BACKSLASH) && parts.length >= 2 ? `${BACKSLASH}${BACKSLASH}${parts[0]}${BACKSLASH}${parts[1]}` : null;
};

export const Component: FC = () => {
    const navigate = useNavigate();
    const { api } = useApi();
    const { data: systemInfo } = useSystemInfo();
    const { data: telemetry, isPending: isTelemetryPending } = useSystemTelemetry();
    const { data: tasks } = useLiveTasks({ isHidden: false });
    const { data: storageDevices } = useStorageDevices();
    const { data: virtualFolders } = useVirtualFolders();
    const startTask = useStartTask();
    const stopTask = useStopTask();

    const [connectOpen, setConnectOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('success');

    // Whether the storage behind each library can be reached (checked by the server every minute)
    const { data: storage } = useQuery({
        queryKey: ['khyloStorageStatus'],
        queryFn: async () => {
            if (!api) return [];
            const resp = await api.axiosInstance.get<StorageLocation[]>(`${api.basePath}/Khylo/Storage/Status`, { headers: { Authorization: api.authorizationHeader } });
            return resp.data;
        },
        refetchInterval: 30000
    });
    const unreachable = (storage ?? []).filter(l => !l.Reachable);
    const isLibraryReachable = (name: string) => !unreachable.some(l => l.Library === name);
    // Folders on another computer that Khylo can't open: when Khylo runs as the system account it has no login for
    // them, so offer to connect that share with one
    const unreachableShare = unreachable.map(l => shareRootOf(l.Path)).find(Boolean) ?? null;
    const queryClient = useQueryClient();

    // Query active sessions from real backend
    const { data: sessions } = useQuery({
        queryKey: ['activeSessions'],
        queryFn: async () => {
            if (!api) return [];
            const resp = await getSessionApi(api).getSessions();
            return resp?.data ?? [];
        },
        enabled: Boolean(api),
        refetchInterval: 5000
    });

    // Query recent activity logs from real backend
    const { data: activityLogData } = useLogEntries({ limit: 6 });
    const activityLogs = activityLogData?.Items ?? [];

    const librariesTask = useMemo(() => tasks?.find(v => v.Key === 'RefreshLibrary'), [tasks]);
    const isScanning = librariesTask?.State === TaskState.Running || librariesTask?.State === TaskState.Cancelling;
    const scanProgress = typeof librariesTask?.CurrentProgressPercentage === 'number'
        ? Math.min(100, Math.max(0, librariesTask.CurrentProgressPercentage))
        : 0;

    const activeLibraryTasks = useMemo(() => {
        return (tasks || []).filter(t => t.State === TaskState.Running && t.Category === 'Library' && t.Key !== 'RefreshLibrary');
    }, [tasks]);

    const handleScan = useCallback(async () => {
        try {
            if (api) {
                await getLibraryApi(api).refreshLibrary();
                setToastSeverity('success');
                setToastMessage('Library scan triggered across all storage paths.');
            } else if (librariesTask?.Id) {
                startTask.mutate({ taskId: librariesTask.Id });
                setToastSeverity('success');
                setToastMessage('Library scan scheduled task started.');
            }
        } catch (err) {
            console.error('[Dashboard] Scan error:', err);
            setToastSeverity('error');
            setToastMessage('Failed to trigger library scan. Check server connection.');
        }
    }, [api, librariesTask, startTask]);

    const handleCancelScan = useCallback(() => {
        if (!librariesTask?.Id) return;
        try {
            stopTask.mutate({ taskId: librariesTask.Id }, {
                onSuccess: () => {
                    setToastSeverity('info');
                    setToastMessage('Library scan cancellation requested.');
                },
                onError: (err) => {
                    console.error('[Dashboard] Cancel scan error:', err);
                    setToastSeverity('error');
                    setToastMessage('Failed to cancel library scan.');
                }
            });
        } catch (err) {
            console.error('[Dashboard] Stop task error:', err);
        }
    }, [librariesTask, stopTask]);

    const handleRunTask = useCallback((taskId: string, taskName: string) => {
        try {
            startTask.mutate({ taskId }, {
                onSuccess: () => {
                    setToastSeverity('success');
                    setToastMessage(`Task "${taskName}" started.`);
                },
                onError: (err) => {
                    console.error('[Dashboard] Task run error:', err);
                    setToastSeverity('error');
                    setToastMessage(`Failed to execute task "${taskName}".`);
                }
            });
        } catch (err) {
            console.error('[Dashboard] Task dispatch error:', err);
            setToastSeverity('error');
            setToastMessage(`Failed to dispatch task.`);
        }
    }, [startTask]);

    const activePlaybackSessions = useMemo(() => {
        return (sessions || []).filter((s: any) => s.NowPlayingItem != null);
    }, [sessions]);

    const cpuVal = telemetry?.CpuPercent ?? 0;
    const memUsed = telemetry?.ProcessMemoryUsedBytes ?? 0;
    const memTotal = telemetry?.TotalPhysicalMemoryBytes ?? 1;
    const memPercent = Math.min(100, Math.round((memUsed / (memTotal || 1)) * 100));

    const uptimeSeconds = telemetry?.ServerUptimeSeconds ?? 0;
    const formatUptime = (s: number) => {
        if (s <= 0) return 'Just started';
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const khyloBuild = (systemInfo as { KhyloBuild?: string } | undefined)?.KhyloBuild;

    return (
        <KhyloPage>
            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Operations' }
                ]}
                title='System Operations'
                subtitle='Monitor server status, active playback sessions, and storage.'
                badge={
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ color: KHYLO_COLORS.textSecondary }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: KHYLO_COLORS.status.healthy.fg }} />
                        <Typography variant='body2' sx={{ color: 'inherit', fontWeight: 500 }}>Running</Typography>
                        {khyloBuild && (
                            <>
                                <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>&middot;</Typography>
                                <Typography variant='body2' sx={{ color: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{khyloBuild}</Typography>
                            </>
                        )}
                    </Stack>
                }
                actions={
                    isScanning ? (
                        <Stack direction='row' spacing={1.5} alignItems='center'>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: '6px',
                                    bgcolor: 'rgba(217, 119, 50, 0.12)',
                                    border: '1px solid rgba(217, 119, 50, 0.3)'
                                }}
                            >
                                <CircularProgress size={14} sx={{ color: KHYLO_COLORS.accent }} />
                                <Typography variant='caption' sx={{ fontWeight: 700, color: KHYLO_COLORS.accent, fontFamily: 'monospace' }}>
                                    {scanProgress.toFixed(1)}%
                                </Typography>
                            </Box>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<StopCircleOutlinedIcon />}
                                onClick={handleCancelScan}
                                disabled={stopTask.isPending || librariesTask?.State === TaskState.Cancelling}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    borderColor: 'rgba(239, 68, 68, 0.4)',
                                    color: '#ef4444',
                                    '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' }
                                }}
                            >
                                {stopTask.isPending || librariesTask?.State === TaskState.Cancelling ? 'Cancelling…' : 'Cancel Scan'}
                            </Button>
                        </Stack>
                    ) : (
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<RefreshIcon />}
                            onClick={handleScan}
                            sx={{
                                textTransform: 'none',
                                bgcolor: KHYLO_COLORS.accent,
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Scan Libraries
                        </Button>
                    )
                }
            />

            {/* Library Scan Progress */}
            {isScanning && librariesTask && (
                <Box
                    sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: '8px',
                        bgcolor: KHYLO_COLORS.surfacePrimary,
                        border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                        position: 'relative'
                    }}
                >
                    <Stack spacing={1.5}>
                        {/* Header row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(217, 119, 50, 0.12)',
                                        color: KHYLO_COLORS.accent
                                    }}
                                >
                                    <RefreshIcon
                                        sx={{
                                            fontSize: 18,
                                            animation: 'spin 2s linear infinite',
                                            '@keyframes spin': {
                                                '0%': { transform: 'rotate(0deg)' },
                                                '100%': { transform: 'rotate(360deg)' }
                                            }
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant='subtitle2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                        Scanning Media Library
                                    </Typography>
                                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                        Searching for new files and updates…
                                    </Typography>
                                </Box>
                            </Box>

                            <Stack direction='row' alignItems='center' spacing={2}>
                                <Typography variant='body2' sx={{ fontWeight: 700, color: KHYLO_COLORS.accent, fontFamily: 'monospace' }}>
                                    {scanProgress.toFixed(1)}%
                                </Typography>
                                <Button
                                    variant='outlined'
                                    size='small'
                                    startIcon={<StopCircleOutlinedIcon />}
                                    onClick={handleCancelScan}
                                    disabled={stopTask.isPending || librariesTask.State === TaskState.Cancelling}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        borderColor: 'rgba(239, 68, 68, 0.4)',
                                        color: '#ef4444',
                                        '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' }
                                    }}
                                >
                                    {stopTask.isPending || librariesTask.State === TaskState.Cancelling ? 'Cancelling…' : 'Cancel'}
                                </Button>
                            </Stack>
                        </Box>

                        {/* Progress bar */}
                        <Box>
                            <LinearProgress
                                variant='determinate'
                                value={scanProgress}
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: KHYLO_COLORS.accent,
                                        borderRadius: 3,
                                        transition: 'transform 0.4s ease'
                                    }
                                }}
                            />
                        </Box>
                    </Stack>
                </Box>
            )}

            {/* Attention Strip */}
            <Box
                sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: '8px',
                    bgcolor: KHYLO_COLORS.surfacePrimary,
                    border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2
                }}
            >
                {unreachable.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ErrorOutlineIcon sx={{ color: KHYLO_COLORS.status.danger.fg, fontSize: 20 }} />
                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {unreachable.length === 1 ? 'A library’s storage can’t be reached' : `${unreachable.length} library folders can’t be reached`}
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                            {'— ' + unreachable.map(describeLocation).join(', ') + '. Khylo keeps trying to reconnect; titles there won’t play until it’s back.'}
                        </Typography>
                        {unreachableShare && (
                            <Button
                                size='small'
                                variant='contained'
                                onClick={() => setConnectOpen(true)}
                                sx={{ bgcolor: KHYLO_COLORS.accent, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                            >
                                Connect with a login
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircleOutlineIcon sx={{ color: KHYLO_COLORS.status.healthy.fg, fontSize: 20 }} />
                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            Operational State Normal
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                            {storage?.length ? '— Every library’s storage can be reached.' : '— Checking library storage…'}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>Active Streams:</Typography>
                        <Typography variant='caption' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary, fontFamily: 'monospace' }}>
                            {activePlaybackSessions.length}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>HW Transcodes:</Typography>
                        <Typography variant='caption' sx={{ fontWeight: 700, color: KHYLO_COLORS.accent, fontFamily: 'monospace' }}>
                            {telemetry?.ActiveTranscodesCount ?? 0}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>Uptime:</Typography>
                        <Typography variant='caption' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary, fontFamily: 'monospace' }}>
                            {formatUptime(uptimeSeconds)}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
                <KhyloUpdatesPanel />
            </Box>

            <Grid container spacing={3}>
                {/* Left Column: Live Operations & Hardware Engine */}
                <Grid item xs={12} lg={7}>
                    <Stack spacing={3}>
                        {/* Active Playback Sessions */}
                        <KhyloPanel
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PlayCircleOutlineIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                                    <span>Active Playback Sessions</span>
                                </Box>
                            }
                            actions={
                                <Button
                                    size='small'
                                    variant='text'
                                    onClick={() => navigate('/dashboard/playback/streaming')}
                                    sx={{
                                        color: KHYLO_COLORS.accent,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.78rem',
                                        p: '2px 8px',
                                        '&:hover': { bgcolor: 'rgba(217, 119, 50, 0.08)' }
                                    }}
                                >
                                    Streaming Settings →
                                </Button>
                            }
                        >
                            {activePlaybackSessions.length === 0 ? (
                                <Box sx={{ py: 3, textAlign: 'center' }}>
                                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>
                                        No media currently streaming. Engine idle.
                                    </Typography>
                                </Box>
                            ) : (
                                <Stack spacing={1.5}>
                                    {activePlaybackSessions.map((session: any) => (
                                        <Box
                                            key={session.Id}
                                            onClick={() => navigate('/dashboard/devices')}
                                            sx={{
                                                p: 2,
                                                borderRadius: '6px',
                                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                                border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                                cursor: 'pointer',
                                                '&:hover': { borderColor: KHYLO_COLORS.accent }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                                                    {session.NowPlayingItem?.Name || 'Unknown Title'}
                                                </Typography>
                                                <KhyloStatusBadge
                                                    label={session.PlayState?.IsPaused ? 'Paused' : 'Playing'}
                                                    color={session.PlayState?.IsPaused ? 'idle' : 'active'}
                                                />
                                            </Box>
                                            <Stack direction='row' gap={2} flexWrap='wrap'>
                                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                                    User: <strong>{session.UserName}</strong>
                                                </Typography>
                                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                                    Client: <strong>{session.Client} ({session.DeviceName})</strong>
                                                </Typography>
                                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                                    Mode: <strong>{session.PlayState?.PlayMethod || 'DirectPlay'}</strong>
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </KhyloPanel>

                        {/* Hardware Telemetry Engine */}
                        <KhyloPanel
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MemoryIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                                    <span>Server Resources</span>
                                </Box>
                            }
                            actions={
                                <Button
                                    size='small'
                                    variant='text'
                                    onClick={() => navigate('/dashboard/playback/transcoding')}
                                    sx={{
                                        color: KHYLO_COLORS.accent,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.78rem',
                                        p: '2px 8px',
                                        '&:hover': { bgcolor: 'rgba(217, 119, 50, 0.08)' }
                                    }}
                                >
                                    Transcoding Settings →
                                </Button>
                            }
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                            CPU Usage
                                        </Typography>
                                        <Typography variant='caption' sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                            {isTelemetryPending ? '—' : `${cpuVal.toFixed(1)}%`}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant='determinate'
                                        value={cpuVal}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: cpuVal > 80 ? KHYLO_COLORS.status.danger.fg : KHYLO_COLORS.accent
                                            }
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                            Memory Usage
                                        </Typography>
                                        <Typography variant='caption' sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                            {isTelemetryPending ? '—' : `${getReadableSize(memUsed)} / ${getReadableSize(memTotal)}`}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant='determinate'
                                        value={memPercent}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                                            '& .MuiLinearProgress-bar': { bgcolor: KHYLO_COLORS.accent }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </KhyloPanel>

                        {/* Scheduled Automation Tasks */}
                        <KhyloPanel
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ScheduleIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                                    <span>Background Tasks & Automation</span>
                                </Box>
                            }
                            actions={
                                <Button
                                    size='small'
                                    variant='text'
                                    onClick={() => navigate('/dashboard/tasks')}
                                    sx={{
                                        color: KHYLO_COLORS.accent,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.78rem',
                                        p: '2px 8px',
                                        '&:hover': { bgcolor: 'rgba(217, 119, 50, 0.08)' }
                                    }}
                                >
                                    Manage All Tasks →
                                </Button>
                            }
                        >
                            <Stack spacing={1}>
                                {(tasks || []).slice(0, 4).map((task) => {
                                    const isRunning = task.State === TaskState.Running;
                                    return (
                                        <Box
                                            key={task.Id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                py: 1,
                                                px: 1,
                                                borderRadius: '4px',
                                                borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                                '&:hover': { bgcolor: KHYLO_COLORS.surfaceSecondary }
                                            }}
                                        >
                                            <Box
                                                onClick={() => navigate(`/dashboard/tasks/${task.Id}`)}
                                                sx={{ maxWidth: '60%', cursor: 'pointer', flexGrow: 1 }}
                                            >
                                                <Typography
                                                    variant='body2'
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.82rem',
                                                        '&:hover': { color: KHYLO_COLORS.accent }
                                                    }}
                                                >
                                                    {task.Name}
                                                </Typography>
                                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                                                    Category: {task.Category}
                                                </Typography>
                                            </Box>
                                            <Stack direction='row' alignItems='center' spacing={1}>
                                                <KhyloStatusBadge
                                                    label={isRunning ? 'Running' : task.LastExecutionResult?.Status === 'Failed' ? 'Failed' : 'Idle'}
                                                    color={isRunning ? 'active' : task.LastExecutionResult?.Status === 'Failed' ? 'danger' : 'idle'}
                                                />
                                                <Button
                                                    size='small'
                                                    variant='outlined'
                                                    disabled={isRunning}
                                                    startIcon={<PlayArrowIcon sx={{ fontSize: 13 }} />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (task.Id) {
                                                            handleRunTask(task.Id, task.Name || 'Task');
                                                        }
                                                    }}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontSize: '0.72rem',
                                                        py: 0.25,
                                                        px: 1,
                                                        minWidth: 54,
                                                        borderColor: KHYLO_COLORS.borderDefault,
                                                        color: KHYLO_COLORS.textPrimary,
                                                        '&:hover': {
                                                            borderColor: KHYLO_COLORS.accent,
                                                            bgcolor: 'rgba(217, 119, 50, 0.08)',
                                                            color: KHYLO_COLORS.accent
                                                        }
                                                    }}
                                                >
                                                    {isRunning ? 'Busy' : 'Run'}
                                                </Button>
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </KhyloPanel>
                    </Stack>
                </Grid>

                {/* Right Column: Media Topology & Storage */}
                <Grid item xs={12} lg={5}>
                    <Stack spacing={3}>
                        {/* Media Libraries Summary */}
                        <KhyloPanel
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FolderSpecialIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                                    <span>Media Libraries ({virtualFolders?.length || 0})</span>
                                </Box>
                            }
                            actions={
                                <Button
                                    size='small'
                                    variant='text'
                                    onClick={() => navigate('/dashboard/libraries')}
                                    sx={{
                                        color: KHYLO_COLORS.accent,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.78rem',
                                        p: '2px 8px',
                                        '&:hover': { bgcolor: 'rgba(217, 119, 50, 0.08)' }
                                    }}
                                >
                                    Manage Libraries →
                                </Button>
                            }
                        >
                            <Stack spacing={1}>
                                {(virtualFolders || []).map((lib: any) => (
                                    <Box
                                        key={lib.ItemId}
                                        onClick={() => navigate(`/dashboard/libraries/${lib.ItemId}`)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            py: 1,
                                            px: 1,
                                            borderRadius: '4px',
                                            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: KHYLO_COLORS.surfaceSecondary }
                                        }}
                                    >
                                        <Box>
                                            <Typography
                                                variant='body2'
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.82rem',
                                                    '&:hover': { color: KHYLO_COLORS.accent }
                                                }}
                                            >
                                                {lib.Name}
                                            </Typography>
                                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                                                Domain: {lib.CollectionType || 'mixed'}
                                            </Typography>
                                        </Box>
                                        <Stack direction='row' alignItems='center' spacing={1}>
                                            {isLibraryReachable(lib.Name) ? (
                                                <KhyloStatusBadge label='Healthy' color='healthy' />
                                            ) : (
                                                <KhyloStatusBadge label='Unreachable' color='failed' />
                                            )}
                                            <ChevronRightIcon sx={{ fontSize: 16, color: KHYLO_COLORS.textMuted }} />
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </KhyloPanel>

                        {/* Storage Pool Safety */}
                        <KhyloPanel
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <StorageIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                                    <span>Storage Pools & Filesystems</span>
                                </Box>
                            }
                        >
                            <Stack spacing={1.5}>
                                {(storageDevices || []).slice(0, 3).map((device: any, idx: number) => {
                                    const total = device.TotalBytes ?? device.TotalSizeBytes ?? 0;
                                    const free = device.AvailableBytes ?? device.AvailableSpaceBytes ?? 0;
                                    const used = device.UsedBytes ?? Math.max(0, total - free);
                                    const pct = Math.min(100, Math.round(device.PercentUsed ?? (total > 0 ? (used / total) * 100 : 0)));
                                    const label = device.Name || device.Path || device.DriveLetter || device.DeviceName || 'Drive';

                                    return (
                                        <Box key={idx} sx={{ p: 1.5, bgcolor: KHYLO_COLORS.surfaceSecondary, borderRadius: '6px' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant='body2' sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                                    {label}
                                                </Typography>
                                                <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                                                    {getReadableSize(used)} / {getReadableSize(total)} ({pct}%)
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant='determinate'
                                                value={pct}
                                                sx={{
                                                    height: 4,
                                                    borderRadius: 2,
                                                    bgcolor: KHYLO_COLORS.surfacePrimary,
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: pct > 90 ? KHYLO_COLORS.status.danger.fg : KHYLO_COLORS.accent
                                                    }
                                                }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </KhyloPanel>

                        {/* Recent Activity Log */}
                        <KhyloPanel
                            title={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SecurityIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />
                                    <span>Recent System Activity</span>
                                </Box>
                            }
                            actions={
                                <Button
                                    size='small'
                                    variant='text'
                                    onClick={() => navigate('/dashboard/activity')}
                                    sx={{
                                        color: KHYLO_COLORS.accent,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        fontSize: '0.78rem',
                                        p: '2px 8px',
                                        '&:hover': { bgcolor: 'rgba(217, 119, 50, 0.08)' }
                                    }}
                                >
                                    Full Log →
                                </Button>
                            }
                        >
                            <Stack spacing={1}>
                                {(activityLogs || []).map((log: any) => (
                                    <Box
                                        key={log.Id}
                                        onClick={() => navigate('/dashboard/activity')}
                                        sx={{
                                            py: 0.75,
                                            px: 1,
                                            borderRadius: '4px',
                                            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: KHYLO_COLORS.surfaceSecondary }
                                        }}
                                    >
                                        <Typography variant='body2' sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                            {log.Name}
                                        </Typography>
                                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.7rem' }}>
                                            {new Date(log.Date).toLocaleString()} · User: {log.UserName || 'System'}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </KhyloPanel>
                    </Stack>
                </Grid>
            </Grid>

            {/* Toast Feedback */}
            {api && (
                <KhyloNetworkShareDialog
                    open={connectOpen}
                    access={{ base: api.basePath, token: api.accessToken ?? '' }}
                    canConnect
                    initialAddress={unreachableShare ?? undefined}
                    onClose={() => setConnectOpen(false)}
                    onConnected={() => {
                        setConnectOpen(false);
                        setToastSeverity('success');
                        setToastMessage('Connected. Khylo will pick up the libraries on it within a minute.');
                        void queryClient.invalidateQueries({ queryKey: ['khyloStorageStatus'] });
                    }}
                />
            )}
            <Snackbar
                open={Boolean(toastMessage)}
                autoHideDuration={3500}
                onClose={() => setToastMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={toastSeverity}
                    onClose={() => setToastMessage(null)}
                    sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>
        </KhyloPage>
    );
};

export default Component;
