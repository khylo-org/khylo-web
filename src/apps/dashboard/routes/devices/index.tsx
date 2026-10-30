import React, { FC, useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import DevicesIcon from '@mui/icons-material/Devices';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import ComputerIcon from '@mui/icons-material/Computer';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TvIcon from '@mui/icons-material/Tv';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';

import type { DeviceInfoDto } from '@khylo/sdk/lib/generated-client/models/device-info-dto';
import type { SessionInfoDto } from '@khylo/sdk/lib/generated-client/models/session-info-dto';
import { PlaystateCommand } from '@khylo/sdk/lib/generated-client/models/playstate-command';

import Page from 'components/Page';
import ConfirmDialog from 'components/ConfirmDialog';
import UserAvatarButton from 'apps/dashboard/components/UserAvatarButton';
import { useApi } from 'hooks/useApi';
import { useLocale } from 'hooks/useLocale';
import { useUsersDetails } from 'hooks/useUsers';
import { useDevices } from 'apps/dashboard/features/devices/api/useDevices';
import { useDeleteDevice } from 'apps/dashboard/features/devices/api/useDeleteDevice';
import { useUpdateDevice } from 'apps/dashboard/features/devices/api/useUpdateDevice';
import { useSessions } from 'apps/dashboard/features/sessions/api/useSessions';
import { useSendPlayStateCommand } from 'apps/dashboard/features/sessions/api/usePlayPauseSession';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloTabs,
    KhyloDataTable,
    KhyloStatusBadge,
    KhyloEmptyState,
    type ColumnDef
} from '../../components/ui';

function getDeviceIcon(client?: string | null, deviceName?: string | null) {
    const text = `${client || ''} ${deviceName || ''}`.toLowerCase();
    if (text.includes('tv') || text.includes('roku') || text.includes('fire') || text.includes('chromecast') || text.includes('webos') || text.includes('tizen')) {
        return <TvIcon sx={{ fontSize: 18, color: KHYLO_COLORS.accent }} />;
    }
    if (text.includes('android') || text.includes('ios') || text.includes('iphone') || text.includes('mobile') || text.includes('phone') || text.includes('expo')) {
        return <SmartphoneIcon sx={{ fontSize: 18, color: '#3B82F6' }} />;
    }
    return <ComputerIcon sx={{ fontSize: 18, color: KHYLO_COLORS.textSecondary }} />;
}

export const Component: FC = () => {
    const { api } = useApi();
    const { dateFnsLocale } = useLocale();

    const [activeTab, setActiveTab] = useState<'sessions' | 'devices'>('sessions');
    const [searchTerm, setSearchTerm] = useState('');

    // Devices query
    const { data: devicesData, isLoading: isDevicesLoading } = useDevices({});
    const devices = useMemo(() => devicesData?.Items || [], [devicesData]);

    // Sessions query
    const { data: sessionsData, isLoading: isSessionsLoading, refetch: refetchSessions } = useSessions({});
    const sessions = useMemo(() => sessionsData || [], [sessionsData]);

    // Users lookup
    const { usersById: users } = useUsersDetails();

    // Mutations
    const deleteDevice = useDeleteDevice();
    const updateDevice = useUpdateDevice();
    const sendPlayState = useSendPlayStateCommand();

    // Dialogs state
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<DeviceInfoDto | null>(null);
    const [editNameValue, setEditNameValue] = useState('');

    // Filter devices based on search
    const filteredDevices = useMemo(() => {
        if (!searchTerm.trim()) return devices;
        const term = searchTerm.toLowerCase();
        return devices.filter(d =>
            (d.Name && d.Name.toLowerCase().includes(term)) ||
            (d.CustomName && d.CustomName.toLowerCase().includes(term)) ||
            (d.AppName && d.AppName.toLowerCase().includes(term)) ||
            (d.LastUserName && d.LastUserName.toLowerCase().includes(term))
        );
    }, [devices, searchTerm]);

    // Filter sessions based on search
    const filteredSessions = useMemo(() => {
        if (!searchTerm.trim()) return sessions;
        const term = searchTerm.toLowerCase();
        return sessions.filter(s =>
            (s.DeviceName && s.DeviceName.toLowerCase().includes(term)) ||
            (s.Client && s.Client.toLowerCase().includes(term)) ||
            (s.UserName && s.UserName.toLowerCase().includes(term)) ||
            (s.NowPlayingItem?.Name && s.NowPlayingItem.Name.toLowerCase().includes(term))
        );
    }, [sessions, searchTerm]);

    const handleStopPlayback = useCallback(async (sessionId: string) => {
        try {
            await sendPlayState.mutateAsync({
                sessionId,
                command: PlaystateCommand.Stop
            });
            setTimeout(() => void refetchSessions(), 500);
        } catch (err) {
            console.error('[DevicesPage] failed stopping playback', err);
        }
    }, [sendPlayState, refetchSessions]);

    const handleSaveDeviceName = useCallback(async () => {
        if (!editingDevice?.Id) return;
        try {
            await updateDevice.mutateAsync({
                id: editingDevice.Id,
                deviceOptionsDto: {
                    CustomName: editNameValue.trim() || undefined
                }
            });
            setEditingDevice(null);
        } catch (err) {
            console.error('[DevicesPage] failed updating device name', err);
        }
    }, [editingDevice, editNameValue, updateDevice]);

    const handleDeleteSingleDevice = useCallback(() => {
        if (pendingDeleteId) {
            deleteDevice.mutate({ id: [pendingDeleteId] }, {
                onSettled: () => setPendingDeleteId(null)
            });
        }
    }, [deleteDevice, pendingDeleteId]);

    const handleDeleteAllDevices = useCallback(async () => {
        try {
            await Promise.all(
                devices.map(item => {
                    if (api && item.Id && api.deviceInfo.id !== item.Id) {
                        return deleteDevice.mutateAsync({ id: [item.Id] });
                    }
                    return Promise.resolve();
                })
            );
        } finally {
            setIsDeleteAllOpen(false);
        }
    }, [api, devices, deleteDevice]);

    // Session Table Columns
    const sessionColumns = useMemo<ColumnDef<SessionInfoDto>[]>(() => [
        {
            id: 'client',
            header: 'Client & Endpoint',
            width: '260px',
            render: (row) => (
                <Stack direction='row' alignItems='center' spacing={1.5}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                        }}
                    >
                        {getDeviceIcon(row.Client, row.DeviceName)}
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant='body2' noWrap sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {row.DeviceName || row.Client || 'Unknown Device'}
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, display: 'block', fontSize: '0.72rem' }}>
                            {[row.Client, row.ApplicationVersion].filter(Boolean).join(' · ')}
                        </Typography>
                    </Box>
                </Stack>
            )
        },
        {
            id: 'user',
            header: 'User Account',
            width: '180px',
            render: (row) => {
                const user = row.UserId && users ? users[row.UserId] : undefined;
                return (
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <UserAvatarButton user={user} sx={{ width: 26, height: 26 }} />
                        <Typography variant='body2' sx={{ fontWeight: 500, color: KHYLO_COLORS.textPrimary }}>
                            {row.UserName || 'Anonymous'}
                        </Typography>
                    </Stack>
                );
            }
        },
        {
            id: 'activity',
            header: 'Current Activity',
            render: (row) => {
                if (row.NowPlayingItem) {
                    const isTranscoding = row.PlayState?.PlayMethod === 'Transcode';
                    return (
                        <Stack spacing={0.5}>
                            <Stack direction='row' alignItems='center' spacing={1}>
                                <PlayCircleOutlineIcon sx={{ fontSize: 16, color: KHYLO_COLORS.accent }} />
                                <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                    {row.NowPlayingItem.Name}
                                </Typography>
                                <KhyloStatusBadge
                                    label={isTranscoding ? 'Transcoding' : 'Direct Play'}
                                    color={isTranscoding ? 'degraded' : 'healthy'}
                                />
                            </Stack>
                            {row.NowPlayingItem.SeriesName && (
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                    {row.NowPlayingItem.SeriesName} {row.NowPlayingItem.IndexNumber != null && `• Ep ${row.NowPlayingItem.IndexNumber}`}
                                </Typography>
                            )}
                        </Stack>
                    );
                }
                return (
                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontStyle: 'italic' }}>
                        Connected / Browsing
                    </Typography>
                );
            }
        },
        {
            id: 'network',
            header: 'Network Address',
            width: '160px',
            render: (row) => (
                <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: KHYLO_COLORS.textSecondary }}>
                    {row.RemoteEndPoint || 'Local'}
                </Typography>
            )
        },
        {
            id: 'actions',
            header: 'Actions',
            width: '100px',
            align: 'right',
            render: (row) => (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {row.NowPlayingItem && row.Id && (
                        <Tooltip title='Stop Playback'>
                            <IconButton
                                size='small'
                                onClick={() => void handleStopPlayback(row.Id!)}
                                sx={{ color: KHYLO_COLORS.accent }}
                            >
                                <StopCircleOutlinedIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ], [users, handleStopPlayback]);

    // Authorized Devices Columns
    const deviceColumns = useMemo<ColumnDef<DeviceInfoDto>[]>(() => [
        {
            id: 'name',
            header: 'Device & Client',
            width: '280px',
            render: (row) => (
                <Stack direction='row' alignItems='center' spacing={1.5}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                        }}
                    >
                        {getDeviceIcon(row.AppName, row.Name)}
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {row.CustomName || row.Name || 'Unnamed Device'}
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, display: 'block', fontSize: '0.72rem' }}>
                            {[row.AppName, row.AppVersion].filter(Boolean).join(' ')}
                        </Typography>
                    </Box>
                </Stack>
            )
        },
        {
            id: 'user',
            header: 'Last Active User',
            width: '200px',
            render: (row) => {
                const user = row.LastUserId && users ? users[row.LastUserId] : undefined;
                return (
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <UserAvatarButton user={user} sx={{ width: 24, height: 24 }} />
                        <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>
                            {row.LastUserName || '—'}
                        </Typography>
                    </Stack>
                );
            }
        },
        {
            id: 'lastActive',
            header: 'Last Seen',
            width: '200px',
            render: (row) => {
                if (!row.DateLastActivity) {
                    return <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>Never</Typography>;
                }
                const formatted = format(parseISO(row.DateLastActivity), 'Pp', { locale: dateFnsLocale });
                return (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.8rem' }}>
                        {formatted}
                    </Typography>
                );
            }
        },
        {
            id: 'status',
            header: 'Status',
            width: '130px',
            render: (row) => {
                const isCurrent = api && row.Id && api.deviceInfo.id === row.Id;
                if (isCurrent) {
                    return <KhyloStatusBadge label='Current Client' color='healthy' />;
                }
                return <KhyloStatusBadge label='Authorized' color='idle' />;
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            width: '120px',
            align: 'right',
            render: (row) => {
                const isCurrent = api && row.Id && api.deviceInfo.id === row.Id;
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title='Rename Device'>
                            <IconButton
                                size='small'
                                onClick={() => {
                                    setEditingDevice(row);
                                    setEditNameValue(row.CustomName || row.Name || '');
                                }}
                                sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.textPrimary } }}
                            >
                                <EditOutlinedIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={isCurrent ? 'Current Session Cannot Be Revoked' : 'Revoke Device'}>
                            <span>
                                <IconButton
                                    size='small'
                                    disabled={Boolean(isCurrent)}
                                    onClick={() => row.Id && setPendingDeleteId(row.Id)}
                                    sx={{
                                        color: KHYLO_COLORS.status.danger.fg,
                                        opacity: isCurrent ? 0.3 : 0.8,
                                        '&:hover': { opacity: 1 }
                                    }}
                                >
                                    <DeleteOutlineIcon fontSize='small' />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                );
            }
        }
    ], [api, users, dateFnsLocale]);

    return (
        <Page id='devicesPage' title='Devices & Sessions' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Access' },
                        { label: 'Devices & Sessions' }
                    ]}
                    title='Devices & Sessions'
                    subtitle='Inspect live media playback streams, authorized client devices, and revoke stale endpoints.'
                    badge={
                        <KhyloStatusBadge
                            label={`${sessions.length} Active • ${devices.length} Registered`}
                            color={sessions.length > 0 ? 'active' : 'idle'}
                        />
                    }
                    actions={
                        activeTab === 'devices' && devices.length > 1 ? (
                            <Button
                                variant='outlined'
                                color='error'
                                size='small'
                                startIcon={<DeleteOutlineIcon />}
                                onClick={() => setIsDeleteAllOpen(true)}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                            >
                                Revoke Other Devices
                            </Button>
                        ) : undefined
                    }
                >
                    <KhyloTabs
                        activeTab={activeTab}
                        onChange={(tab) => setActiveTab(tab as 'sessions' | 'devices')}
                        tabs={[
                            { id: 'sessions', label: 'Active Sessions', count: sessions.length },
                            { id: 'devices', label: 'Authorized Endpoints', count: devices.length }
                        ]}
                    />
                </KhyloPageHeader>

                {activeTab === 'sessions' && (
                    <>
                        {sessions.length === 0 && !isSessionsLoading ? (
                            <KhyloEmptyState
                                icon={<DevicesIcon />}
                                title='No active playback sessions'
                                description='Active client streams and connected player sessions will appear here in real time.'
                            />
                        ) : (
                            <KhyloDataTable
                                columns={sessionColumns}
                                data={filteredSessions}
                                keyExtractor={(item) => item.Id || String(Math.random())}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                searchPlaceholder='Search active sessions…'
                                emptyMessage='No matching active sessions'
                                isLoading={isSessionsLoading}
                            />
                        )}
                    </>
                )}

                {activeTab === 'devices' && (
                    <>
                        {devices.length === 0 && !isDevicesLoading ? (
                            <KhyloEmptyState
                                icon={<DevicesIcon />}
                                title='No authorized devices'
                                description='No client applications have registered with this server yet.'
                            />
                        ) : (
                            <KhyloDataTable
                                columns={deviceColumns}
                                data={filteredDevices}
                                keyExtractor={(item) => item.Id || String(Math.random())}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                searchPlaceholder='Search registered devices…'
                                emptyMessage='No matching registered devices'
                                isLoading={isDevicesLoading}
                            />
                        )}
                    </>
                )}

                {/* Edit Device Name Dialog */}
                <Dialog
                    open={Boolean(editingDevice)}
                    onClose={() => setEditingDevice(null)}
                    PaperProps={{
                        sx: {
                            bgcolor: KHYLO_COLORS.surfacePrimary,
                            border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                            borderRadius: '8px',
                            minWidth: 400
                        }
                    }}
                >
                    <DialogTitle sx={{ color: KHYLO_COLORS.textPrimary, fontSize: '1rem', fontWeight: 600 }}>
                        Rename Device
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 1 }}>
                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, mb: 1, display: 'block' }}>
                                Original Hardware Identifier: {editingDevice?.Name || 'Unknown'}
                            </Typography>
                            <TextField
                                fullWidth
                                size='small'
                                label='Display Name'
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                autoFocus
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={() => setEditingDevice(null)}
                            sx={{ color: KHYLO_COLORS.textSecondary, textTransform: 'none' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={() => void handleSaveDeviceName()}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Save Name
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Revoke Single Device Dialog */}
                <ConfirmDialog
                    open={Boolean(pendingDeleteId)}
                    title='Revoke Device Authorization'
                    text='Are you sure you want to revoke this device? The client will be disconnected and required to re-authenticate.'
                    onCancel={() => setPendingDeleteId(null)}
                    onConfirm={handleDeleteSingleDevice}
                    confirmButtonColor='error'
                    confirmButtonText='Revoke Access'
                />

                {/* Revoke All Devices Dialog */}
                <ConfirmDialog
                    open={isDeleteAllOpen}
                    title='Revoke All Other Devices'
                    text='Are you sure you want to revoke all other client devices? All active sessions except your current workstation will be terminated immediately.'
                    onCancel={() => setIsDeleteAllOpen(false)}
                    onConfirm={() => void handleDeleteAllDevices()}
                    confirmButtonColor='error'
                    confirmButtonText='Revoke All Others'
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'DevicesPage';
export default Component;
