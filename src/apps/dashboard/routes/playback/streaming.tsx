import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { ServerConfiguration } from '@khylo/sdk/lib/generated-client/models/server-configuration';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
import { queryClient } from 'utils/query/queryClient';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { ActionData } from 'types/actionData';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge
} from '../../components/ui';

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as Partial<ServerConfiguration>;

    if (payload.RemoteClientBitrateLimit !== undefined) {
        config.RemoteClientBitrateLimit = payload.RemoteClientBitrateLimit;
    }
    if (payload.InactiveSessionThreshold !== undefined) {
        config.InactiveSessionThreshold = payload.InactiveSessionThreshold;
    }
    if (payload.AllowClientLogUpload !== undefined) {
        config.AllowClientLogUpload = payload.AllowClientLogUpload;
    }
    if (payload.ParallelImageEncodingLimit !== undefined) {
        config.ParallelImageEncodingLimit = payload.ParallelImageEncodingLimit;
    }

    await getSystemApi(api).updateConfiguration({ serverConfiguration: config });

    void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const { data: defaultConfiguration, isPending, isError } = useConfiguration();

    // Local form state
    const [bitrateLimitMbps, setBitrateLimitMbps] = useState<string>('');
    const [inactiveThreshold, setInactiveThreshold] = useState<number>(0);
    const [allowLogUpload, setAllowLogUpload] = useState<boolean>(false);
    const [parallelEncodingLimit, setParallelEncodingLimit] = useState<number>(0);
    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    // Sync from server config
    useEffect(() => {
        if (defaultConfiguration) {
            setBitrateLimitMbps(
                defaultConfiguration.RemoteClientBitrateLimit
                    ? String(defaultConfiguration.RemoteClientBitrateLimit / 1e6)
                    : '0'
            );
            setInactiveThreshold(defaultConfiguration.InactiveSessionThreshold ?? 0);
            setAllowLogUpload(Boolean(defaultConfiguration.AllowClientLogUpload));
            setParallelEncodingLimit(defaultConfiguration.ParallelImageEncodingLimit ?? 0);
        }
    }, [defaultConfiguration]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const isDirty = useMemo(() => {
        if (!defaultConfiguration) return false;
        const origMbps = defaultConfiguration.RemoteClientBitrateLimit
            ? String(defaultConfiguration.RemoteClientBitrateLimit / 1e6)
            : '0';
        const origInactive = defaultConfiguration.InactiveSessionThreshold ?? 0;
        const origLog = Boolean(defaultConfiguration.AllowClientLogUpload);
        const origEncoding = defaultConfiguration.ParallelImageEncodingLimit ?? 0;

        return (
            bitrateLimitMbps !== origMbps ||
            inactiveThreshold !== origInactive ||
            allowLogUpload !== origLog ||
            parallelEncodingLimit !== origEncoding
        );
    }, [defaultConfiguration, bitrateLimitMbps, inactiveThreshold, allowLogUpload, parallelEncodingLimit]);

    const handleSave = useCallback(() => {
        const parsedMbps = parseFloat(bitrateLimitMbps || '0');
        const payload: Partial<ServerConfiguration> = {
            RemoteClientBitrateLimit: Math.trunc(1e6 * (isNaN(parsedMbps) ? 0 : parsedMbps)),
            InactiveSessionThreshold: inactiveThreshold,
            AllowClientLogUpload: allowLogUpload,
            ParallelImageEncodingLimit: parallelEncodingLimit
        };

        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [bitrateLimitMbps, inactiveThreshold, allowLogUpload, parallelEncodingLimit, submit]);

    const handleDiscard = useCallback(() => {
        if (defaultConfiguration) {
            setBitrateLimitMbps(
                defaultConfiguration.RemoteClientBitrateLimit
                    ? String(defaultConfiguration.RemoteClientBitrateLimit / 1e6)
                    : '0'
            );
            setInactiveThreshold(defaultConfiguration.InactiveSessionThreshold ?? 0);
            setAllowLogUpload(Boolean(defaultConfiguration.AllowClientLogUpload));
            setParallelEncodingLimit(defaultConfiguration.ParallelImageEncodingLimit ?? 0);
        }
    }, [defaultConfiguration]);

    if (isPending) {
        return <Loading />;
    }

    if (isError) {
        return (
            <Page id='streamingSettingsPage' title='Streaming & Limits' className='mainAnimatedPage type-interior'>
                <KhyloPage>
                    <Alert severity='error'>Failed to load server streaming configuration.</Alert>
                </KhyloPage>
            </Page>
        );
    }

    return (
        <Page id='streamingSettingsPage' title='Streaming & Limits' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Playback' },
                        { label: 'Streaming & Limits' }
                    ]}
                    title='Streaming & Bandwidth Governance'
                    subtitle='Global WAN stream bitrates, client throughput boundaries, and session connection lifecycles.'
                    badge={
                        <KhyloStatusBadge
                            label={parseFloat(bitrateLimitMbps) > 0 ? `Cap: ${bitrateLimitMbps} Mbps` : 'Unlimited Bandwidth'}
                            color={parseFloat(bitrateLimitMbps) > 0 ? 'healthy' : 'idle'}
                        />
                    }
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    <KhyloSettingSection
                        title='Remote Bandwidth Governance'
                        description='Enforce maximum transmission limits for external clients accessing media outside local subnets.'
                    >
                        <KhyloSettingRow
                            title='Remote Client Bitrate Cap'
                            description='Maximum streaming bitrate allowed per remote client. Streams exceeding this cap will be transcoded to fit within available bandwidth. Set to 0 for unlimited.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={bitrateLimitMbps}
                                    onChange={(e) => setBitrateLimitMbps(e.target.value)}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>Mbps</InputAdornment>,
                                        inputProps: { min: 0, max: 2000, step: 0.5 }
                                    }}
                                    sx={{ width: 160 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Parallel Image Encoding Limit'
                            description='Maximum number of concurrent image and thumbnail encoding worker threads. 0 defaults to automatic core allocation.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={parallelEncodingLimit}
                                    onChange={(e) => setParallelEncodingLimit(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        inputProps: { min: 0, max: 64, step: 1 }
                                    }}
                                    sx={{ width: 120 }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    <KhyloSettingSection
                        title='Session & Connection Lifecycle'
                        description='Manage timeouts and resource reclamation for inactive or orphaned playback sessions.'
                    >
                        <KhyloSettingRow
                            title='Inactive Session Disconnect Threshold'
                            description='Minutes after which an idle, paused, or non-responsive playback session is automatically closed by the server. 0 keeps sessions open indefinitely.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={inactiveThreshold}
                                    onChange={(e) => setInactiveThreshold(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>min</InputAdornment>,
                                        inputProps: { min: 0, max: 1440, step: 5 }
                                    }}
                                    sx={{ width: 140 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Allow Client Telemetry & Diagnostic Uploads'
                            description='Allows connected mobile and TV clients to transmit error logs, crash telemetry, and playback failure dumps to server diagnostics.'
                            control={
                                <Switch
                                    checked={allowLogUpload}
                                    onChange={(_, checked) => setAllowLogUpload(checked)}
                                    color='primary'
                                />
                            }
                        />
                    </KhyloSettingSection>
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
                        Streaming policies successfully saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'StreamingPage';
export default Component;
