import React, { FC } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

// Icons — Khylo IA sections
import DatasetIcon from '@mui/icons-material/Dataset';
import PeopleIcon from '@mui/icons-material/People';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RouterIcon from '@mui/icons-material/Router';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StorageIcon from '@mui/icons-material/Storage';
import TuneIcon from '@mui/icons-material/Tune';
import ShieldIcon from '@mui/icons-material/Shield';
import ExtensionIcon from '@mui/icons-material/Extension';
import BugReportIcon from '@mui/icons-material/BugReport';

import DrawerHeaderLink from 'apps/modern/components/drawers/DrawerHeaderLink';
import ResponsiveDrawer, { ResponsiveDrawerProps } from 'components/ResponsiveDrawer';
import ListItemLink from 'components/ListItemLink';
import KhyloNavSection from './sections/KhyloNavSection';
import { useConfigurationPages } from '../../features/plugins/api/useConfigurationPages';
import Dashboard from 'utils/dashboard';
import Icon from '@mui/material/Icon';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

const AppDrawer: FC<ResponsiveDrawerProps> = ({
    open = false,
    onClose,
    onOpen
}) => {
    const { data: pluginPages } = useConfigurationPages({ enableInMainMenu: true });

    return (
        <ResponsiveDrawer
            open={open}
            onClose={onClose}
            onOpen={onOpen}
        >
            {/* Header — Khylo logo + server identity */}
            <List disablePadding>
                <ListItem disablePadding>
                    <DrawerHeaderLink />
                </ListItem>
            </List>

            {/* Overview — top-level, not nested */}
            <Box sx={{ px: 1, py: 0.5 }}>
                <ListItemLink
                    to='/dashboard'
                    sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: '6px',
                        '&.Mui-selected': {
                            bgcolor: 'rgba(217, 119, 50, 0.12)',
                            borderLeft: '2px solid #D97732',
                            px: '14px',
                            '& .MuiListItemText-primary': {
                                color: '#D97732',
                                fontWeight: 700
                            }
                        },
                        '&:hover': { bgcolor: 'rgba(217, 119, 50, 0.07)' }
                    }}
                >
                    <ListItemText
                        primary='Overview'
                        primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}
                    />
                </ListItemLink>
            </Box>

            <Divider sx={{ mx: 2, my: 0.5, borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* MEDIA */}
            <KhyloNavSection
                label='Media'
                icon={<DatasetIcon fontSize='small' />}
                items={[
                    {
                        label: 'Libraries',
                        to: '/dashboard/libraries',
                        includePaths: [
                            '/dashboard/libraries/display',
                            '/dashboard/libraries/nfo'
                        ]
                    },
                    { label: 'Metadata Manager', to: '/dashboard/metadata' },
                    { label: 'Metadata Defaults', to: '/dashboard/libraries/metadata' },
                    { label: 'Import Watch History', to: '/dashboard/import' }
                ]}
            />

            {/* USERS */}
            <KhyloNavSection
                label='Users'
                icon={<PeopleIcon fontSize='small' />}
                items={[
                    { label: 'Accounts', to: '/dashboard/users' },
                    { label: 'Invitations', to: '/dashboard/invitations' },
                    { label: 'Home Profiles', to: '/dashboard/homeprofiles' }
                ]}
            />

            {/* PLAYBACK */}
            <KhyloNavSection
                label='Playback'
                icon={<PlayCircleOutlineIcon fontSize='small' />}
                items={[
                    { label: 'Transcoding', to: '/dashboard/playback/transcoding' },
                    { label: 'Streaming', to: '/dashboard/playback/streaming' },
                    { label: 'Resume', to: '/dashboard/playback/resume' },
                    { label: 'Trickplay', to: '/dashboard/playback/trickplay' }
                ]}
            />

            {/* ACCESS */}
            <KhyloNavSection
                label='Access'
                icon={<RouterIcon fontSize='small' />}
                items={[
                    { label: 'Devices', to: '/dashboard/devices' }
                ]}
            />

            {/* AUTOMATION */}
            <KhyloNavSection
                label='Automation'
                icon={<ScheduleIcon fontSize='small' />}
                items={[
                    { label: 'Scheduled Tasks', to: '/dashboard/tasks' }
                ]}
            />

            <Divider sx={{ mx: 2, my: 0.5, borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* SYSTEM */}
            <KhyloNavSection
                label='System'
                icon={<TuneIcon fontSize='small' />}
                items={[
                    { label: 'General', to: '/dashboard/settings' },
                    { label: 'Appearance', to: '/dashboard/branding' },
                    { label: 'Network', to: '/dashboard/networking' },
                    { label: 'Webhooks', to: '/dashboard/webhooks' },
                    { label: 'Backups', to: '/dashboard/backups' },
                    { label: 'API Keys', to: '/dashboard/keys' }
                ]}
            />

            {/* SECURITY */}
            <KhyloNavSection
                label='Security'
                icon={<ShieldIcon fontSize='small' />}
                items={[
                    { label: 'Activity Log', to: '/dashboard/activity' }
                ]}
            />

            {/* EXTENSIONS */}
            <KhyloNavSection
                label='Extensions'
                icon={<ExtensionIcon fontSize='small' />}
                items={[
                    {
                        label: 'Plugins',
                        to: '/dashboard/plugins',
                        includePaths: [
                            '/configurationpage',
                            '/dashboard/plugins/repositories'
                        ],
                        excludePaths: pluginPages?.map(p => `/${Dashboard.getPluginUrl(p.Name)}`)
                    },
                    ...(pluginPages?.map(p => ({
                        label: p.DisplayName ?? p.Name ?? 'Plugin',
                        to: `/${Dashboard.getPluginUrl(p.Name)}`
                    })) ?? [])
                ]}
            />

            {/* DIAGNOSTICS */}
            <KhyloNavSection
                label='Diagnostics'
                icon={<BugReportIcon fontSize='small' />}
                items={[
                    { label: 'Logs', to: '/dashboard/logs' }
                ]}
            />

            {/* Storage — bottom, less frequently accessed */}
            <KhyloNavSection
                label='Storage'
                icon={<StorageIcon fontSize='small' />}
                items={[
                    { label: 'Paths', to: '/dashboard/libraries' }
                ]}
            />
        </ResponsiveDrawer>
    );
};

export default AppDrawer;
