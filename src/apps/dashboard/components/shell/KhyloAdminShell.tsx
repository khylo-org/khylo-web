import React, { FC, ReactNode, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArticleIcon from '@mui/icons-material/Article';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import LabelIcon from '@mui/icons-material/Label';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import MemoryIcon from '@mui/icons-material/Memory';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import FastForwardIcon from '@mui/icons-material/FastForward';
import GroupIcon from '@mui/icons-material/Group';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import DevicesIcon from '@mui/icons-material/Devices';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SettingsIcon from '@mui/icons-material/Settings';
import WebhookIcon from '@mui/icons-material/Webhook';
import BackupIcon from '@mui/icons-material/Backup';
import ExtensionIcon from '@mui/icons-material/Extension';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PaletteIcon from '@mui/icons-material/Palette';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type Theme } from '@mui/material/styles';

import khyloLogo from 'assets/img/khylo-logo.png';
import { useSystemInfo } from 'hooks/useSystemInfo';
import { useApi } from 'hooks/useApi';
import { useSystemTelemetry } from 'apps/dashboard/features/system/api/useSystemTelemetry';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';
import useRestartServer from 'apps/dashboard/features/system/api/useRestartServer';
import useShutdownServer from 'apps/dashboard/features/system/api/useShutdownServer';
import ConfirmDialog from 'components/ConfirmDialog';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';
import { logout } from 'utils/dashboard';

import { KHYLO_COLORS, KHYLO_SPACING } from '../ui/tokens';

interface NavItem {
    label: string;
    path: string;
    icon: ReactNode;
    badge?: string;
    matchExact?: boolean;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Operations',
        items: [
            { label: 'Overview', path: '/dashboard', icon: <DashboardIcon sx={{ fontSize: 18 }} />, matchExact: true },
            { label: 'Scheduled Tasks', path: '/dashboard/tasks', icon: <ScheduleIcon sx={{ fontSize: 18 }} />, matchExact: true },
            { label: 'Activity & Logs', path: '/dashboard/activity', icon: <ArticleIcon sx={{ fontSize: 18 }} />, matchExact: true },
            { label: 'Update', path: '/dashboard/updates', icon: <SystemUpdateAltIcon sx={{ fontSize: 18 }} />, matchExact: true }
        ]
    },
    {
        title: 'Media & Storage',
        items: [
            { label: 'Media Libraries', path: '/dashboard/libraries', icon: <FolderSpecialIcon sx={{ fontSize: 18 }} />, matchExact: true },
            { label: 'Metadata & NFO', path: '/dashboard/libraries/metadata', icon: <LabelIcon sx={{ fontSize: 18 }} /> },
            { label: 'Import Watch History', path: '/dashboard/import', icon: <MoveDownIcon sx={{ fontSize: 18 }} /> },
            { label: 'Khylo TV', path: '/dashboard/livechannels', icon: <LiveTvIcon sx={{ fontSize: 18 }} /> }
        ]
    },
    {
        title: 'Live TV',
        items: [
            { label: 'Tuners & Guide', path: '/dashboard/livetv', icon: <SettingsInputAntennaIcon sx={{ fontSize: 18 }} />, matchExact: true },
            { label: 'DVR & Recordings', path: '/dashboard/livetv/recordings', icon: <FiberManualRecordIcon sx={{ fontSize: 18 }} /> }
        ]
    },
    {
        title: 'Playback Engine',
        items: [
            { label: 'Hardware Transcoding', path: '/dashboard/playback/transcoding', icon: <MemoryIcon sx={{ fontSize: 18 }} /> },
            { label: 'Streaming & Network', path: '/dashboard/playback/streaming', icon: <WifiTetheringIcon sx={{ fontSize: 18 }} /> },
            { label: 'Playback & Resume', path: '/dashboard/playback/resume', icon: <PlayCircleOutlineIcon sx={{ fontSize: 18 }} /> },
            { label: 'Trickplay Generator', path: '/dashboard/playback/trickplay', icon: <FastForwardIcon sx={{ fontSize: 18 }} /> }
        ]
    },
    {
        title: 'Access Control',
        items: [
            { label: 'User Accounts', path: '/dashboard/users', icon: <GroupIcon sx={{ fontSize: 18 }} />, matchExact: true },
            { label: 'Invitations', path: '/dashboard/invitations', icon: <MarkEmailReadIcon sx={{ fontSize: 18 }} /> },
            { label: 'Home Profiles', path: '/dashboard/homeprofiles', icon: <FamilyRestroomIcon sx={{ fontSize: 18 }} /> },
            { label: 'Devices & Sessions', path: '/dashboard/devices', icon: <DevicesIcon sx={{ fontSize: 18 }} /> },
            { label: 'API Keys', path: '/dashboard/keys', icon: <VpnKeyIcon sx={{ fontSize: 18 }} /> }
        ]
    },
    {
        title: 'Infrastructure',
        items: [
            { label: 'Server Settings', path: '/dashboard/settings', icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
            { label: 'Network & TLS', path: '/dashboard/networking', icon: <WifiTetheringIcon sx={{ fontSize: 18 }} /> },
            { label: 'Branding & Theme', path: '/dashboard/branding', icon: <PaletteIcon sx={{ fontSize: 18 }} /> },
            { label: 'Webhooks', path: '/dashboard/webhooks', icon: <WebhookIcon sx={{ fontSize: 18 }} /> },
            { label: 'System Backups', path: '/dashboard/backups', icon: <BackupIcon sx={{ fontSize: 18 }} /> },
            { label: 'Plugins', path: '/dashboard/plugins', icon: <ExtensionIcon sx={{ fontSize: 18 }} />, matchExact: true }
        ]
    }
];

interface KhyloAdminShellProps {
    children: ReactNode;
}

export const KhyloAdminShell: FC<KhyloAdminShellProps> = ({ children }) => {
    const location = useLocation();
    const isDesktop = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user } = useApi();
    const { data: systemInfo } = useSystemInfo();
    const khyloBuild = (systemInfo as { KhyloBuild?: string } | undefined)?.KhyloBuild;
    const { data: telemetry } = useSystemTelemetry();
    const { data: tasks } = useLiveTasks({ isHidden: false });
    const startTask = useStartTask();
    const restartServer = useRestartServer();
    const shutdownServer = useShutdownServer();

    const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);
    const [isShutdownConfirmOpen, setIsShutdownConfirmOpen] = useState(false);

    const librariesTask = useMemo(() => tasks?.find(v => v.Key === 'RefreshLibrary'), [tasks]);
    const isScanning = librariesTask?.State !== TaskState.Idle;

    const handleScan = useCallback(() => {
        if (librariesTask?.Id) {
            startTask.mutate({ taskId: librariesTask.Id });
        }
    }, [librariesTask, startTask]);

    const isPathActive = useCallback((item: NavItem) => {
        if (item.matchExact) {
            return location.pathname === item.path || location.pathname === `${item.path}/`;
        }
        return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    }, [location.pathname]);

    const sidebarContent = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                bgcolor: KHYLO_COLORS.surfacePrimary,
                borderRight: `1px solid ${KHYLO_COLORS.borderDefault}`,
                userSelect: 'none'
            }}
        >
            {/* Brand Header */}
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <RouterLink to='/dashboard' style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <Box
                        component='img'
                        src={khyloLogo}
                        alt='Khylo Server'
                        sx={{ height: 26, width: 'auto', objectFit: 'contain' }}
                    />
                </RouterLink>
                {khyloBuild && (
                    <Typography
                        variant='caption'
                        title='Khylo build'
                        sx={{
                            color: KHYLO_COLORS.textMuted,
                            fontSize: '0.68rem',
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            fontVariantNumeric: 'tabular-nums'
                        }}
                    >
                        {khyloBuild}
                    </Typography>
                )}
            </Box>

            {/* Navigation Sections */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    py: 2,
                    px: 1.5,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }
                }}
            >
                {NAV_SECTIONS.map((section, sIdx) => (
                    <Box key={sIdx} sx={{ mb: 2.5 }}>
                        <Typography
                            variant='caption'
                            sx={{
                                px: 1.5,
                                mb: 0.5,
                                display: 'block',
                                color: KHYLO_COLORS.textMuted,
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase'
                            }}
                        >
                            {section.title}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {section.items.map((item) => {
                                const active = isPathActive(item);
                                return (
                                    <RouterLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => !isDesktop && setMobileOpen(false)}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: '6px',
                                                bgcolor: active ? KHYLO_COLORS.surfaceActive : 'transparent',
                                                color: active ? KHYLO_COLORS.accent : KHYLO_COLORS.textSecondary,
                                                borderLeft: active ? `3px solid ${KHYLO_COLORS.accent}` : '3px solid transparent',
                                                transition: 'all 0.15s ease',
                                                '&:hover': {
                                                    bgcolor: active ? KHYLO_COLORS.surfaceActive : KHYLO_COLORS.surfaceHover,
                                                    color: active ? KHYLO_COLORS.accent : KHYLO_COLORS.textPrimary
                                                }
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    color: active ? KHYLO_COLORS.accent : KHYLO_COLORS.textMuted,
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                {item.icon}
                                            </Box>
                                            <Typography
                                                variant='body2'
                                                sx={{
                                                    fontSize: '0.82rem',
                                                    fontWeight: active ? 600 : 500
                                                }}
                                            >
                                                {item.label}
                                            </Typography>
                                        </Box>
                                    </RouterLink>
                                );
                            })}
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Bottom User / Quick Action Bar */}
            <Box
                sx={{
                    p: 1.5,
                    borderTop: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                    bgcolor: KHYLO_COLORS.surfaceSecondary
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography
                            variant='body2'
                            noWrap
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                color: KHYLO_COLORS.textPrimary
                            }}
                        >
                            {user?.Name || 'Administrator'}
                        </Typography>
                        <Typography
                            variant='caption'
                            sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.7rem' }}
                        >
                            Server Console
                        </Typography>
                    </Box>

                    <Button
                        size='small'
                        variant='text'
                        startIcon={<ExitToAppIcon sx={{ fontSize: 15 }} />}
                        onClick={() => logout()}
                        sx={{
                            color: KHYLO_COLORS.textSecondary,
                            textTransform: 'none',
                            fontSize: '0.72rem',
                            py: 0.25,
                            px: 1,
                            minWidth: 'auto',
                            '&:hover': { color: KHYLO_COLORS.accent }
                        }}
                    >
                        Log Out
                    </Button>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: KHYLO_COLORS.bgApp, color: KHYLO_COLORS.textPrimary }}>
            <ConfirmDialog
                open={isRestartConfirmOpen}
                title='Restart Server'
                text='Are you sure you want to restart the Khylo server daemon? Active playback sessions will be interrupted.'
                onConfirm={() => {
                    restartServer.mutate();
                    setIsRestartConfirmOpen(false);
                }}
                onCancel={() => setIsRestartConfirmOpen(false)}
                confirmButtonText='Restart'
                confirmButtonColor='error'
            />
            <ConfirmDialog
                open={isShutdownConfirmOpen}
                title='Shutdown Server'
                text='Are you sure you want to shutdown the Khylo server daemon? The server process will terminate.'
                onConfirm={() => {
                    shutdownServer.mutate();
                    setIsShutdownConfirmOpen(false);
                }}
                onCancel={() => setIsShutdownConfirmOpen(false)}
                confirmButtonText='Shutdown'
                confirmButtonColor='error'
            />

            {/* Desktop Fixed Sidebar */}
            {isDesktop ? (
                <Box
                    component='nav'
                    sx={{
                        width: KHYLO_SPACING.sidebarWidth,
                        flexShrink: 0,
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        zIndex: 1200
                    }}
                >
                    {sidebarContent}
                </Box>
            ) : (
                /* Mobile Drawer */
                <Drawer
                    variant='temporary'
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: KHYLO_SPACING.sidebarWidth,
                            bgcolor: KHYLO_COLORS.surfacePrimary
                        }
                    }}
                >
                    {sidebarContent}
                </Drawer>
            )}

            {/* Main Application Column */}
            <Box
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    ml: isDesktop ? `${KHYLO_SPACING.sidebarWidth}px` : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh'
                }}
            >
                {/* Persistent Top Navigation Bar */}
                <Box
                    component='header'
                    sx={{
                        height: KHYLO_SPACING.headerHeight,
                        px: { xs: 2, md: 3.5 },
                        borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                        bgcolor: KHYLO_COLORS.surfacePrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1100,
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {!isDesktop && (
                            <IconButton
                                size='small'
                                onClick={() => setMobileOpen(!mobileOpen)}
                                sx={{ color: KHYLO_COLORS.textPrimary }}
                            >
                                {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                            </IconButton>
                        )}

                        <Typography
                            variant='body2'
                            sx={{
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                color: KHYLO_COLORS.textPrimary,
                                fontSize: '0.875rem'
                            }}
                        >
                            {systemInfo?.ServerName || 'Khylo Server'}
                        </Typography>
                    </Box>

                    {/* Operational Quick Actions (No decorative marketing text) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {telemetry && (
                            <Box
                                sx={{
                                    display: { xs: 'none', sm: 'flex' },
                                    alignItems: 'center',
                                    gap: 2,
                                    mr: 1.5,
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: '6px',
                                    bgcolor: KHYLO_COLORS.surfaceSecondary,
                                    border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                                        CPU
                                    </Typography>
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            color: telemetry.CpuPercent > 80 ? KHYLO_COLORS.status.warning.fg : KHYLO_COLORS.textPrimary,
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace'
                                        }}
                                    >
                                        {telemetry.CpuPercent.toFixed(0)}%
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                                        Streams
                                    </Typography>
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            color: KHYLO_COLORS.textPrimary,
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace'
                                        }}
                                    >
                                        {telemetry.ActiveStreamsCount}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                            onClick={handleScan}
                            disabled={isScanning}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                py: 0.5,
                                px: 1.5,
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textPrimary,
                                display: { xs: 'none', sm: 'inline-flex' },
                                '&:hover': {
                                    borderColor: KHYLO_COLORS.accent,
                                    bgcolor: KHYLO_COLORS.surfaceHover
                                }
                            }}
                        >
                            {isScanning ? 'Scanning…' : 'Scan'}
                        </Button>

                        <IconButton
                            size='small'
                            title='Restart Server'
                            onClick={() => setIsRestartConfirmOpen(true)}
                            sx={{
                                color: KHYLO_COLORS.textSecondary,
                                '&:hover': { color: KHYLO_COLORS.accent, bgcolor: KHYLO_COLORS.surfaceHover }
                            }}
                        >
                            <RestartAltIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        <IconButton
                            size='small'
                            title='Shutdown Server'
                            onClick={() => setIsShutdownConfirmOpen(true)}
                            sx={{
                                color: KHYLO_COLORS.status.danger.fg,
                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
                            }}
                        >
                            <PowerSettingsNewIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Main Workspace Body */}
                <Box
                    component='main'
                    sx={{
                        flexGrow: 1,
                        p: { xs: 2, sm: 3, md: 3.5 },
                        maxWidth: 1400,
                        width: '100%',
                        boxSizing: 'border-box',
                        margin: '0 auto'
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default KhyloAdminShell;
