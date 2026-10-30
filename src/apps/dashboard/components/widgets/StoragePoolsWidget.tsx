import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import React from 'react';

import { useStorageDevices } from 'apps/dashboard/features/storage/api/useStorageDevices';
import { getReadableSize } from 'utils/file';
import Widget from './Widget';

const getProgressColor = (percent: number): 'success' | 'warning' | 'error' => {
    if (percent >= 95) return 'error';
    if (percent >= 85) return 'warning';
    return 'success';
};

const StoragePoolsWidget = () => {
    const { data: devices, isPending, isError } = useStorageDevices();

    const criticalDevices = devices?.filter(d => d.WarningState === 'Critical') ?? [];
    const warningDevices = devices?.filter(d => d.WarningState === 'Warning') ?? [];

    return (
        <Widget
            title='Storage Pools & Volume Safety'
            href='/dashboard/settings'
        >
            <Paper sx={{ padding: 2.5, borderRadius: 2 }}>
                <Stack spacing={2.5}>
                    {/* Alerts Banner */}
                    {criticalDevices.length > 0 && (
                        <Alert
                            severity='error'
                            icon={<ErrorOutlineIcon />}
                            sx={{
                                backgroundColor: 'rgba(184, 74, 66, 0.12)',
                                color: 'var(--khylo-error, #B84A42)',
                                border: '1px solid var(--khylo-error, #B84A42)'
                            }}
                        >
                            <strong>Critical Storage Alert:</strong> Volume{' '}
                            {criticalDevices.map(d => d.Path).join(', ')} has exceeded 95% capacity (&lt; 5% remaining). Free space immediately to prevent database corruption.
                        </Alert>
                    )}

                    {warningDevices.length > 0 && criticalDevices.length === 0 && (
                        <Alert
                            severity='warning'
                            icon={<WarningAmberIcon />}
                            sx={{
                                backgroundColor: 'rgba(183, 121, 31, 0.12)',
                                color: 'var(--khylo-warning, #B7791F)',
                                border: '1px solid var(--khylo-warning, #B7791F)'
                            }}
                        >
                            <strong>Storage Capacity Warning:</strong> Volume{' '}
                            {warningDevices.map(d => d.Path).join(', ')} has less than 15% free space remaining.
                        </Alert>
                    )}

                    {/* Volume Grid */}
                    {isPending ? (
                        <Grid container spacing={2}>
                            {[1, 2].map((k) => (
                                <Grid item xs={12} sm={6} key={k}>
                                    <Skeleton variant='rectangular' height={100} sx={{ borderRadius: 1.5 }} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : isError || !devices || devices.length === 0 ? (
                        <Typography variant='body2' color='text.secondary'>
                            No storage volume telemetry available.
                        </Typography>
                    ) : (
                        <Grid container spacing={2}>
                            {devices.map((device) => {
                                const percent = Math.min(100, Math.max(0, device.PercentUsed));
                                const progressColor = getProgressColor(percent);

                                return (
                                    <Grid item xs={12} sm={6} md={devices.length > 2 ? 4 : 6} key={device.Path}>
                                        <Paper
                                            variant='outlined'
                                            sx={{
                                                padding: 2,
                                                borderColor: device.WarningState === 'Critical'
                                                    ? 'var(--khylo-error, #B84A42)'
                                                    : device.WarningState === 'Warning'
                                                        ? 'var(--khylo-warning, #B7791F)'
                                                        : 'divider',
                                                backgroundColor: 'background.default'
                                            }}
                                        >
                                            <Stack spacing={1.5}>
                                                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                                                    <Stack direction='row' alignItems='center' spacing={1} sx={{ overflow: 'hidden' }}>
                                                        <StorageIcon sx={{ color: 'var(--khylo-brand, #D97732)', flexShrink: 0 }} />
                                                        <Box sx={{ overflow: 'hidden' }}>
                                                            <Typography variant='subtitle2' fontWeight='bold' noWrap>
                                                                {device.Name || device.Path}
                                                            </Typography>
                                                            <Typography variant='caption' color='text.secondary' noWrap display='block'>
                                                                {device.Path} ({device.FileSystem})
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                    <Chip
                                                        label={device.WarningState === 'Critical' ? 'Critical' : device.WarningState === 'Warning' ? 'Low Space' : 'Healthy'}
                                                        size='small'
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            height: 22,
                                                            backgroundColor: device.WarningState === 'Critical'
                                                                ? 'rgba(184, 74, 66, 0.15)'
                                                                : device.WarningState === 'Warning'
                                                                    ? 'rgba(183, 121, 31, 0.15)'
                                                                    : 'rgba(63, 125, 88, 0.15)',
                                                            color: device.WarningState === 'Critical'
                                                                ? 'var(--khylo-error, #B84A42)'
                                                                : device.WarningState === 'Warning'
                                                                    ? 'var(--khylo-warning, #B7791F)'
                                                                    : 'var(--khylo-success, #3F7D58)'
                                                        }}
                                                    />
                                                </Stack>

                                                <LinearProgress
                                                    variant='determinate'
                                                    value={percent}
                                                    color={progressColor}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />

                                                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                                    <Typography variant='caption' color='text.secondary'>
                                                        {percent.toFixed(1)}% Used
                                                    </Typography>
                                                    <Typography variant='caption' fontWeight='bold'>
                                                        {getReadableSize(device.AvailableBytes)} Free / {getReadableSize(device.TotalBytes)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </Stack>
            </Paper>
        </Widget>
    );
};

export default StoragePoolsWidget;
