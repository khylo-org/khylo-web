import React, { FC, useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LiveTvOptions } from '@khylo/sdk/lib/generated-client/models/live-tv-options';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import TextField from '@mui/material/TextField';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { QUERY_KEY as CONFIG_QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import Provider from 'apps/dashboard/features/livetv/components/Provider';
import TunerDeviceCard from 'apps/dashboard/features/livetv/components/TunerDeviceCard';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import TaskProgress from 'apps/dashboard/features/tasks/components/TaskProgress';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingRow,
    KhyloSettingSection,
    KhyloStatusBadge
} from '../../components/ui';

const CONFIG_KEY = 'livetv';

const primaryButtonSx = {
    textTransform: 'none',
    bgcolor: KHYLO_COLORS.accent,
    color: '#fff',
    fontSize: '0.82rem',
    fontWeight: 600,
    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
} as const;

const secondaryButtonSx = {
    textTransform: 'none',
    borderColor: KHYLO_COLORS.borderStrong,
    color: KHYLO_COLORS.textPrimary,
    fontSize: '0.82rem',
    fontWeight: 600,
    '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: KHYLO_COLORS.surfaceHover }
} as const;

// How many days of listings to download. Each day multiplies the guide data for every channel.
const GUIDE_DAY_OPTIONS = [ 1, 2, 3, 5, 7, 14 ];
const DEFAULT_GUIDE_DAYS = 7;

const STEPS = [
    { title: 'Add a tuner', text: 'Paste the M3U playlist link from your IPTV provider, or connect an HDHomeRun.' },
    { title: 'Add a guide', text: 'Paste the XMLTV (EPG) link from your provider so the guide knows what\'s on.' },
    { title: 'Refresh the guide', text: 'Khylo loads your channels and listings. Viewers find them under Live TV.' }
];

export const Component: FC = () => {
    const { api } = useApi();
    const { data: config, isPending: isConfigPending, isError: isConfigError } = useNamedConfiguration<LiveTvOptions>(CONFIG_KEY);
    const { data: tasks } = useLiveTasks({ isHidden: false });
    const startTask = useStartTask();
    const [ providerMenuAnchor, setProviderMenuAnchor ] = useState<HTMLElement | null>(null);

    const refreshGuideTask = useMemo(() => tasks?.find(v => v.Key === 'RefreshGuide'), [tasks]);
    const isRefreshing = refreshGuideTask?.State === TaskState.Running;

    const tuners = config?.TunerHosts ?? [];
    const providers = config?.ListingProviders ?? [];

    const { data: channelCount } = useQuery({
        queryKey: [ 'LiveTvChannelCount', tuners.length, isRefreshing ],
        queryFn: async () => (await getLiveTvApi(api!).getLiveTvChannels({ limit: 0 })).data.TotalRecordCount ?? 0,
        enabled: Boolean(api && tuners.length)
    });

    const [ isSavingDays, setIsSavingDays ] = useState(false);
    const saveGuideDays = useCallback(async (days: number) => {
        if (!api || !config) return;
        setIsSavingDays(true);
        try {
            await getSystemApi(api).updateNamedConfiguration({ key: CONFIG_KEY, body: JSON.stringify({ ...config, GuideDays: days }) });
            await queryClient.invalidateQueries({ queryKey: [CONFIG_QUERY_KEY] });
        } finally {
            setIsSavingDays(false);
        }
    }, [ api, config ]);

    const refreshGuide = useCallback(() => {
        if (refreshGuideTask?.Id) startTask.mutate({ taskId: refreshGuideTask.Id });
    }, [ startTask, refreshGuideTask ]);

    if (isConfigPending) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    const isSetUp = tuners.length > 0 && providers.length > 0;

    return (
        <Page id='liveTvStatusPage' title='Live TV' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1100}>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Live TV' }, { label: 'Tuners & Guide' } ]}
                    title='Live TV'
                    subtitle='Real live television from your IPTV service or an HDHomeRun tuner, with a full program guide and recording.'
                    badge={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <KhyloStatusBadge label={`${tuners.length} ${tuners.length === 1 ? 'tuner' : 'tuners'}`} color={tuners.length ? 'healthy' : 'idle'} />
                            {channelCount !== undefined && <KhyloStatusBadge label={`${channelCount.toLocaleString()} channels`} color={channelCount ? 'healthy' : 'warning'} />}
                        </Box>
                    }
                    actions={
                        <>
                            <Button component={Link} to='/livetv' size='small' startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />} disabled={!channelCount} sx={{ textTransform: 'none', color: KHYLO_COLORS.textSecondary, fontWeight: 600, fontSize: '0.82rem' }}>
                                Open Live TV
                            </Button>
                            <Button size='small' variant='outlined' startIcon={<RefreshIcon />} onClick={refreshGuide} disabled={isRefreshing || !tuners.length} sx={secondaryButtonSx}>
                                {isRefreshing ? 'Refreshing guide…' : 'Refresh guide'}
                            </Button>
                        </>
                    }
                />

                {isConfigError && <Alert severity='error' sx={{ mb: 3 }}>Couldn&apos;t load the Live TV settings from the server.</Alert>}

                {isRefreshing && refreshGuideTask && (
                    <Box sx={{ mb: 3 }}>
                        <TaskProgress task={refreshGuideTask} />
                    </Box>
                )}

                {!isSetUp && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                        {STEPS.map((step, i) => {
                            const done = (i === 0 && tuners.length > 0) || (i === 1 && providers.length > 0);
                            return (
                                <Box key={step.title} sx={{ p: 2.25, borderRadius: '10px', border: `1px solid ${KHYLO_COLORS.borderDefault}`, bgcolor: KHYLO_COLORS.surfacePrimary }}>
                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: done ? KHYLO_COLORS.status.healthy.fg : KHYLO_COLORS.accent }}>
                                        {done ? 'DONE' : `STEP ${i + 1}`}
                                    </Typography>
                                    <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.95rem' }}>{step.title}</Typography>
                                    <Typography sx={{ mt: 0.5, fontSize: '0.8rem', color: KHYLO_COLORS.textSecondary, lineHeight: 1.5 }}>{step.text}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                <KhyloSettingSection
                    title='Tuners'
                    description='Where channels come from.'
                    action={
                        <Button component={Link} to='/dashboard/livetv/tuner' size='small' variant='contained' startIcon={<AddIcon />} sx={primaryButtonSx}>
                            Add tuner
                        </Button>
                    }
                >
                    {tuners.length === 0 ? (
                        <Typography sx={{ px: 2.5, py: 3, fontSize: '0.85rem', color: KHYLO_COLORS.textMuted }}>
                            No tuners yet. Add your IPTV playlist or an HDHomeRun to get channels.
                        </Typography>
                    ) : tuners.map(tunerHost => <TunerDeviceCard key={tunerHost.Id} tunerHost={tunerHost} />)}
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Program guide'
                    description='Where listings come from: what&apos;s on now and next for every channel.'
                    action={
                        <Button size='small' variant='outlined' startIcon={<AddIcon />} onClick={e => setProviderMenuAnchor(e.currentTarget)} sx={secondaryButtonSx}>
                            Add guide
                        </Button>
                    }
                >
                    {providers.length === 0 ? (
                        <Typography sx={{ px: 2.5, py: 3, fontSize: '0.85rem', color: KHYLO_COLORS.textMuted }}>
                            No guide yet. Without one, channels play but show no program information.
                        </Typography>
                    ) : providers.map(provider => <Provider key={provider.Id} provider={provider} />)}
                </KhyloSettingSection>

                <KhyloSettingSection title='Guide settings'>
                    <KhyloSettingRow
                        title='Days of listings'
                        description='How far ahead the guide goes. Fewer days means a faster refresh and a smaller database, especially with big IPTV lineups. Takes effect at the next guide refresh.'
                        control={
                            <TextField
                                select
                                size='small'
                                value={config?.GuideDays ?? DEFAULT_GUIDE_DAYS}
                                onChange={e => { saveGuideDays(Number(e.target.value)).catch(() => undefined); }}
                                disabled={isSavingDays}
                                sx={{ width: 140 }}
                            >
                                {GUIDE_DAY_OPTIONS.map(days => (
                                    <MenuItem key={days} value={days}>{days === 1 ? '1 day' : `${days} days`}</MenuItem>
                                ))}
                            </TextField>
                        }
                    />
                </KhyloSettingSection>

                <Menu
                    anchorEl={providerMenuAnchor}
                    open={Boolean(providerMenuAnchor)}
                    onClose={() => setProviderMenuAnchor(null)}
                    slotProps={{ paper: { sx: { bgcolor: KHYLO_COLORS.surfacePrimary, border: `1px solid ${KHYLO_COLORS.borderDefault}`, backgroundImage: 'none' } } }}
                >
                    <MenuItem component={Link} to='/dashboard/livetv/guide?type=xmltv' onClick={() => setProviderMenuAnchor(null)}>
                        <ListItemText primary='XMLTV / EPG link' secondary='From your IPTV provider' />
                    </MenuItem>
                    <MenuItem component={Link} to='/dashboard/livetv/guide?type=schedulesdirect' onClick={() => setProviderMenuAnchor(null)}>
                        <ListItemText primary='Schedules Direct' secondary='Antenna and cable, North America' />
                    </MenuItem>
                </Menu>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LiveTvStatusPage';
export default Component;
