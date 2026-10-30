import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import StreamIcon from '@mui/icons-material/Stream';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import React from 'react';

import { useSystemTelemetry } from 'apps/dashboard/features/system/api/useSystemTelemetry';
import { getReadableSize } from 'utils/file';
import Widget from './Widget';

const formatUptime = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return 'Just started';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const getCpuColor = (percent: number): 'success' | 'warning' | 'error' => {
    if (percent >= 90) return 'error';
    if (percent >= 70) return 'warning';
    return 'success';
};

const KhyloTelemetryWidget = () => {
    const { data: telemetry, isPending } = useSystemTelemetry();

    const cpuVal = telemetry?.CpuPercent ?? 0;
    const memUsed = telemetry?.ProcessMemoryUsedBytes ?? 0;
    const memTotal = telemetry?.TotalPhysicalMemoryBytes ?? 1;
    const memPercent = Math.min(100, Math.round((memUsed / (memTotal || 1)) * 100));

    return (
        <Widget
            title='System Telemetry & Health'
            href='/dashboard/settings'
        >
            <Paper sx={{ padding: 2.5, borderRadius: 2 }}>
                <Grid container spacing={2.5}>
                    {/* CPU Utilization */}
                    <Grid item xs={12} sm={6}>
                        <Paper
                            variant='outlined'
                            sx={{
                                padding: 2,
                                borderColor: 'divider',
                                backgroundColor: 'background.default'
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                                    <Stack direction='row' alignItems='center' spacing={1}>
                                        <SpeedIcon sx={{ color: 'var(--khylo-brand, #D97732)' }} />
                                        <Typography variant='subtitle2' fontWeight='bold'>
                                            CPU Load
                                        </Typography>
                                    </Stack>
                                    {isPending ? (
                                        <Skeleton width={40} />
                                    ) : (
                                        <Typography variant='h6' fontWeight='bold'>
                                            {cpuVal.toFixed(1)}%
                                        </Typography>
                                    )}
                                </Stack>
                                <LinearProgress
                                    variant={isPending ? 'indeterminate' : 'determinate'}
                                    value={cpuVal}
                                    color={getCpuColor(cpuVal)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Typography variant='caption' color='text.secondary'>
                                    {telemetry?.ThreadCount ?? 0} active worker threads
                                </Typography>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* RAM Utilization */}
                    <Grid item xs={12} sm={6}>
                        <Paper
                            variant='outlined'
                            sx={{
                                padding: 2,
                                borderColor: 'divider',
                                backgroundColor: 'background.default'
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                                    <Stack direction='row' alignItems='center' spacing={1}>
                                        <MemoryIcon sx={{ color: 'var(--khylo-brand, #D97732)' }} />
                                        <Typography variant='subtitle2' fontWeight='bold'>
                                            Memory (RAM)
                                        </Typography>
                                    </Stack>
                                    {isPending ? (
                                        <Skeleton width={70} />
                                    ) : (
                                        <Typography variant='subtitle1' fontWeight='bold'>
                                            {getReadableSize(memUsed)}
                                        </Typography>
                                    )}
                                </Stack>
                                <LinearProgress
                                    variant={isPending ? 'indeterminate' : 'determinate'}
                                    value={memPercent}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: 'var(--khylo-brand, #D97732)'
                                        }
                                    }}
                                />
                                <Typography variant='caption' color='text.secondary'>
                                    {memTotal > 1 ? `${getReadableSize(memTotal)} system capacity` : 'Server heap'}
                                </Typography>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Active Streams & Hardware Transcoding */}
                    <Grid item xs={12} sm={6}>
                        <Paper
                            variant='outlined'
                            sx={{
                                padding: 2,
                                borderColor: 'divider',
                                backgroundColor: 'background.default'
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <StreamIcon sx={{ color: 'var(--khylo-brand, #D97732)' }} />
                                    <Typography variant='subtitle2' fontWeight='bold'>
                                        Live Streams & Transcoding
                                    </Typography>
                                </Stack>
                                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                                    <Chip
                                        label={`${telemetry?.ActiveStreamsCount ?? 0} Active Stream${(telemetry?.ActiveStreamsCount ?? 0) === 1 ? '' : 's'}`}
                                        color='default'
                                        variant='outlined'
                                        size='small'
                                    />
                                    {(telemetry?.ActiveTranscodesCount ?? 0) > 0 ? (
                                        <Chip
                                            icon={<FlashOnIcon />}
                                            label={`${telemetry?.HardwareTranscodesCount ?? 0} HW Transcodes`}
                                            sx={{
                                                backgroundColor: 'rgba(217, 119, 50, 0.15)',
                                                color: 'var(--khylo-brand, #D97732)',
                                                borderColor: 'var(--khylo-brand, #D97732)',
                                                fontWeight: 'bold'
                                            }}
                                            size='small'
                                        />
                                    ) : (
                                        <Chip
                                            label='Direct Play / Idle'
                                            size='small'
                                            variant='outlined'
                                            sx={{ color: 'text.secondary' }}
                                        />
                                    )}
                                </Stack>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Server Health & Uptime */}
                    <Grid item xs={12} sm={6}>
                        <Paper
                            variant='outlined'
                            sx={{
                                padding: 2,
                                borderColor: 'divider',
                                backgroundColor: 'background.default'
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <CheckCircleOutlineIcon sx={{ color: 'var(--khylo-success, #3F7D58)' }} />
                                    <Typography variant='subtitle2' fontWeight='bold'>
                                        System Health
                                    </Typography>
                                </Stack>
                                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                    <Chip
                                        label='Healthy (Nominal)'
                                        size='small'
                                        sx={{
                                            backgroundColor: 'rgba(63, 125, 88, 0.15)',
                                            color: 'var(--khylo-success, #3F7D58)',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                    <Box textAlign='right'>
                                        <Typography variant='caption' color='text.secondary' display='block'>
                                            Uptime
                                        </Typography>
                                        <Typography variant='body2' fontWeight='bold'>
                                            {formatUptime(telemetry?.ServerUptimeSeconds)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        </Widget>
    );
};

export default KhyloTelemetryWidget;
