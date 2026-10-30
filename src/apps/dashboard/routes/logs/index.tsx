import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ArticleIcon from '@mui/icons-material/Article';
import { Link, type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { ServerConfiguration } from '@khylo/sdk/lib/generated-client/models/server-configuration';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
import { queryClient } from 'utils/query/queryClient';
import { useServerLogs } from 'apps/dashboard/features/logs/api/useServerLogs';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import datetime from 'scripts/datetime';
import { ActionData } from 'types/actionData';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloSectionPanel,
    KhyloStickyActionBar,
    KhyloStatusBadge,
    KhyloEmptyState
} from '../../components/ui';

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as Partial<ServerConfiguration>;

    if (payload.EnableSlowResponseWarning !== undefined) {
        config.EnableSlowResponseWarning = payload.EnableSlowResponseWarning;
    }
    if (payload.SlowResponseThresholdMs !== undefined) {
        config.SlowResponseThresholdMs = payload.SlowResponseThresholdMs;
    }

    await getSystemApi(api).updateConfiguration({ serverConfiguration: config });

    void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const { data: logs, isPending: isLogsPending } = useServerLogs();
    const { data: config, isPending: isConfigPending } = useConfiguration();

    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const [enableSlowWarning, setEnableSlowWarning] = useState(false);
    const [slowThresholdMs, setSlowThresholdMs] = useState(500);
    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    useEffect(() => {
        if (config) {
            setEnableSlowWarning(Boolean(config.EnableSlowResponseWarning));
            setSlowThresholdMs(config.SlowResponseThresholdMs ?? 500);
        }
    }, [config]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const isDirty = useMemo(() => {
        if (!config) return false;
        return (
            enableSlowWarning !== Boolean(config.EnableSlowResponseWarning) ||
            slowThresholdMs !== (config.SlowResponseThresholdMs ?? 500)
        );
    }, [config, enableSlowWarning, slowThresholdMs]);

    const handleSave = useCallback(() => {
        const payload: Partial<ServerConfiguration> = {
            EnableSlowResponseWarning: enableSlowWarning,
            SlowResponseThresholdMs: slowThresholdMs
        };
        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [enableSlowWarning, slowThresholdMs, submit]);

    const handleDiscard = useCallback(() => {
        if (config) {
            setEnableSlowWarning(Boolean(config.EnableSlowResponseWarning));
            setSlowThresholdMs(config.SlowResponseThresholdMs ?? 500);
        }
    }, [config]);

    const logList = useMemo(() => logs || [], [logs]);

    if (isLogsPending || isConfigPending) return <Loading />;

    return (
        <Page id='logPage' title='System Diagnostic Logs' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Diagnostics' },
                        { label: 'System Logs' }
                    ]}
                    title='System Diagnostic Logs'
                    subtitle='Raw server application logs, FFmpeg transcoding traces, and performance telemetry.'
                    badge={
                        <KhyloStatusBadge
                            label={`${logList.length} Log Files`}
                            color='idle'
                        />
                    }
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Slow Response Profiler */}
                    <KhyloSettingSection
                        title='Performance & Slow Response Profiling'
                        description='Log diagnostic warnings when HTTP request handlers or database queries exceed latency thresholds.'
                    >
                        <KhyloSettingRow
                            title='Enable Slow Response Warnings'
                            description='Write diagnostic warnings to system logs whenever API endpoints respond slower than the defined latency threshold.'
                            control={
                                <Switch
                                    checked={enableSlowWarning}
                                    onChange={(_, checked) => setEnableSlowWarning(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Slow Response Latency Threshold'
                            description='Response time threshold in milliseconds. Requests taking longer than this duration will generate a log warning.'
                            isDependent
                            disabled={!enableSlowWarning}
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={slowThresholdMs}
                                    onChange={(e) => setSlowThresholdMs(parseInt(e.target.value || '500', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>ms</InputAdornment>,
                                        inputProps: { min: 50, max: 60000, step: 50 }
                                    }}
                                    sx={{ width: 140 }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Log Files Archive */}
                    <KhyloSectionPanel title='Archived Server Log Files' accent>
                        {logList.length === 0 ? (
                            <KhyloEmptyState
                                icon={<ArticleIcon />}
                                title='No log files generated'
                                description='Log files will appear here once the server daemon writes startup and operational records.'
                            />
                        ) : (
                            <List sx={{ p: 0 }}>
                                {logList.map(log => {
                                    const parsedDate = datetime.parseISO8601Date(log.DateModified, true);
                                    const dateStr = datetime.toLocaleDateString(parsedDate) + ' ' + datetime.getDisplayTime(parsedDate);
                                    const isFfmpeg = log.Name?.toLowerCase().includes('ffmpeg');

                                    return (
                                        <ListItem
                                            key={log.Name}
                                            disablePadding
                                            sx={{
                                                borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                                '&:last-child': { borderBottom: 'none' }
                                            }}
                                        >
                                            <ListItemButton
                                                component={Link}
                                                to={`/dashboard/logs/${log.Name}`}
                                                sx={{
                                                    py: 1.5,
                                                    px: 2,
                                                    '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover }
                                                }}
                                            >
                                                <Stack direction='row' alignItems='center' spacing={2} sx={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <Box sx={{ overflow: 'hidden' }}>
                                                        <Typography
                                                            variant='body2'
                                                            sx={{
                                                                fontWeight: 600,
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.82rem',
                                                                color: KHYLO_COLORS.textPrimary
                                                            }}
                                                        >
                                                            {log.Name}
                                                        </Typography>
                                                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                                            Last modified: {dateStr}
                                                        </Typography>
                                                    </Box>
                                                    <KhyloStatusBadge
                                                        label={isFfmpeg ? 'FFmpeg Transcode' : 'Core Daemon'}
                                                        color={isFfmpeg ? 'degraded' : 'idle'}
                                                    />
                                                </Stack>
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}
                    </KhyloSectionPanel>
                </Box>

                <KhyloStickyActionBar
                    isDirty={isDirty}
                    isSaving={isSubmitting}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                />

                <Snackbar
                    open={savedNoticeOpen}
                    autoHideDuration={3000}
                    onClose={() => setSavedNoticeOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity='success'
                        onClose={() => setSavedNoticeOpen(false)}
                        sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                    >
                        Log profiling configuration saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LogPage';
export default Component;
