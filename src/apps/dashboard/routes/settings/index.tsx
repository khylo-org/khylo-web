import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { ServerConfiguration } from '@khylo/sdk/lib/generated-client/models/server-configuration';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY as CONFIGURATION_QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
import { QUERY_KEY as SYSTEM_INFO_QUERY_KEY } from 'hooks/useSystemInfo';
import { useLocalizationOptions } from 'apps/dashboard/features/settings/api/useLocalizationOptions';
import { queryClient } from 'utils/query/queryClient';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { KhyloServerFileBrowserModal } from '../../components/browser/KhyloServerFileBrowserModal';
import { KhyloUpdatesPanel } from '../../components/KhyloUpdatesPanel';
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

/** Khylo's own setting, not in the SDK's types. */
type KhyloServerConfiguration = ServerConfiguration & { KhyloWebAddress?: string | null; KhyloHomeAddress?: string | null };

/** Tidies a typed web address: https:// when no scheme is given, no trailing slash. */
const normalizeWebAddress = (value: string, scheme = 'https') => {
    let trimmed = value.trim();
    while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `${scheme}://${trimmed}`;
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as Partial<KhyloServerConfiguration>;

    const localeChanged = payload.UICulture !== undefined && payload.UICulture !== config.UICulture;

    if (payload.ServerName !== undefined) config.ServerName = payload.ServerName;
    if (payload.KhyloWebAddress !== undefined) (config as KhyloServerConfiguration).KhyloWebAddress = payload.KhyloWebAddress;
    if (payload.KhyloHomeAddress !== undefined) (config as KhyloServerConfiguration).KhyloHomeAddress = payload.KhyloHomeAddress;
    if (payload.UICulture !== undefined) config.UICulture = payload.UICulture;
    if (payload.CachePath !== undefined) config.CachePath = payload.CachePath;
    if (payload.MetadataPath !== undefined) config.MetadataPath = payload.MetadataPath;
    if (payload.QuickConnectAvailable !== undefined) config.QuickConnectAvailable = payload.QuickConnectAvailable;
    if (payload.LibraryScanFanoutConcurrency !== undefined) config.LibraryScanFanoutConcurrency = payload.LibraryScanFanoutConcurrency;
    if (payload.ParallelImageEncodingLimit !== undefined) config.ParallelImageEncodingLimit = payload.ParallelImageEncodingLimit;

    await getSystemApi(api).updateConfiguration({ serverConfiguration: config });

    void queryClient.invalidateQueries({ queryKey: [CONFIGURATION_QUERY_KEY] });
    void queryClient.invalidateQueries({ queryKey: [SYSTEM_INFO_QUERY_KEY] });

    return { isSaved: true, localeChanged, newLocale: payload.UICulture };
};

export const Component: FC = () => {
    const { data: config, isPending: isConfigPending, isError: isConfigError } = useConfiguration();
    const { data: languageOptions, isPending: isLocPending } = useLocalizationOptions();

    const navigation = useNavigation();
    const actionData = useActionData() as (ActionData & { localeChanged?: boolean; newLocale?: string }) | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const [serverName, setServerName] = useState('');
    const [webAddress, setWebAddress] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [uiCulture, setUiCulture] = useState('');
    const [cachePath, setCachePath] = useState('');
    const [metadataPath, setMetadataPath] = useState('');
    const [quickConnect, setQuickConnect] = useState(false);
    const [scanConcurrency, setScanConcurrency] = useState(0);
    const [encodingLimit, setEncodingLimit] = useState(0);

    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);
    const [localeReloadNoticeOpen, setLocaleReloadNoticeOpen] = useState(false);
    const [browserTarget, setBrowserTarget] = useState<'cache' | 'metadata' | null>(null);

    useEffect(() => {
        if (config) {
            setServerName(config.ServerName || '');
            setWebAddress((config as KhyloServerConfiguration).KhyloWebAddress || '');
            setHomeAddress((config as KhyloServerConfiguration).KhyloHomeAddress || '');
            setUiCulture(config.UICulture || 'en-US');
            setCachePath(config.CachePath || '');
            setMetadataPath(config.MetadataPath || '');
            setQuickConnect(Boolean(config.QuickConnectAvailable));
            setScanConcurrency(config.LibraryScanFanoutConcurrency ?? 0);
            setEncodingLimit(config.ParallelImageEncodingLimit ?? 0);
        }
    }, [config]);

    useEffect(() => {
        if (actionData?.isSaved) {
            if (actionData.localeChanged) {
                // Locale changed on the server — reload the page to apply it
                setLocaleReloadNoticeOpen(true);
            } else {
                setSavedNoticeOpen(true);
            }
        }
    }, [actionData]);

    const showCachePathPicker = useCallback(() => {
        setBrowserTarget('cache');
    }, []);

    const showMetadataPathPicker = useCallback(() => {
        setBrowserTarget('metadata');
    }, []);

    const isDirty = useMemo(() => {
        if (!config) return false;
        return (
            serverName !== (config.ServerName || '') ||
            webAddress !== ((config as KhyloServerConfiguration).KhyloWebAddress || '') ||
            homeAddress !== ((config as KhyloServerConfiguration).KhyloHomeAddress || '') ||
            uiCulture !== (config.UICulture || 'en-US') ||
            cachePath !== (config.CachePath || '') ||
            metadataPath !== (config.MetadataPath || '') ||
            quickConnect !== Boolean(config.QuickConnectAvailable) ||
            scanConcurrency !== (config.LibraryScanFanoutConcurrency ?? 0) ||
            encodingLimit !== (config.ParallelImageEncodingLimit ?? 0)
        );
    }, [config, serverName, webAddress, homeAddress, uiCulture, cachePath, metadataPath, quickConnect, scanConcurrency, encodingLimit]);

    const handleSave = useCallback(() => {
        const payload: Partial<KhyloServerConfiguration> = {
            ServerName: serverName.trim(),
            KhyloWebAddress: normalizeWebAddress(webAddress),
            KhyloHomeAddress: normalizeWebAddress(homeAddress, 'http'),
            UICulture: uiCulture,
            CachePath: cachePath.trim() || null,
            MetadataPath: metadataPath.trim() || undefined,
            QuickConnectAvailable: quickConnect,
            LibraryScanFanoutConcurrency: scanConcurrency,
            ParallelImageEncodingLimit: encodingLimit
        };

        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [serverName, webAddress, homeAddress, uiCulture, cachePath, metadataPath, quickConnect, scanConcurrency, encodingLimit, submit]);

    const handleDiscard = useCallback(() => {
        if (config) {
            setServerName(config.ServerName || '');
            setWebAddress((config as KhyloServerConfiguration).KhyloWebAddress || '');
            setHomeAddress((config as KhyloServerConfiguration).KhyloHomeAddress || '');
            setUiCulture(config.UICulture || 'en-US');
            setCachePath(config.CachePath || '');
            setMetadataPath(config.MetadataPath || '');
            setQuickConnect(Boolean(config.QuickConnectAvailable));
            setScanConcurrency(config.LibraryScanFanoutConcurrency ?? 0);
            setEncodingLimit(config.ParallelImageEncodingLimit ?? 0);
        }
    }, [config]);

    if (isConfigPending || isLocPending) {
        return <Loading />;
    }

    if (isConfigError) {
        return (
            <Page id='dashboardGeneralPage' title='Server Settings' className='type-interior mainAnimatedPage'>
                <KhyloPage>
                    <Alert severity='error'>Failed to load server general configuration.</Alert>
                </KhyloPage>
            </Page>
        );
    }

    return (
        <Page id='dashboardGeneralPage' title='Server Settings' className='type-interior mainAnimatedPage'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'System' },
                        { label: 'General' }
                    ]}
                    title='Server Identity & Environment'
                    subtitle='Public server name, regional localization, cache storage paths, and library processing concurrency.'
                    badge={
                        <KhyloStatusBadge
                            label={serverName || 'Khylo Server'}
                            color='healthy'
                        />
                    }
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Khylo itself: updates */}
                    <KhyloUpdatesPanel />

                    {/* Identity & Localization */}
                    <KhyloSettingSection
                        title='Server Identity & Localization'
                        description='Configure how this server node presents itself across local networks and player applications.'
                    >
                        <KhyloSettingRow
                            title='Server Display Name'
                            description='Public node identifier advertised to client applications, SSDP discovery, and web interfaces.'
                            control={
                                <TextField
                                    size='small'
                                    value={serverName}
                                    onChange={(e) => setServerName(e.target.value)}
                                    placeholder='Khylo Media Node'
                                    sx={{ width: 240 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Web Address'
                            description='Where people reach Khylo from anywhere, like https://khylo.example.com. Sign-in QR codes on TVs use it, so they work on a phone away from home. Khylo fills this in by itself the first time it’s opened through a web address.'
                            control={
                                <TextField
                                    size='small'
                                    value={webAddress}
                                    onChange={(e) => setWebAddress(e.target.value)}
                                    placeholder='https://khylo.example.com'
                                    sx={{ width: 300 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Home Address'
                            description='Optional. A name for this server on your home network, like http://khylo.mydomain.internal:8096. Apps connect directly at home and use the Web Address when away, switching by themselves. Leave it empty to use this server’s home IP address.'
                            control={
                                <TextField
                                    size='small'
                                    value={homeAddress}
                                    onChange={(e) => setHomeAddress(e.target.value)}
                                    placeholder='http://khylo.home.internal:8096'
                                    sx={{ width: 300 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Preferred UI Localization'
                            description='Default language and regional locale for system messaging, dates, and administrative interfaces.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={uiCulture}
                                    onChange={(e) => setUiCulture(e.target.value)}
                                    sx={{ width: 240 }}
                                >
                                    {(languageOptions || []).map((lang) => (
                                        <MenuItem key={lang.Name} value={lang.Value || ''}>
                                            {lang.Name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            }
                        />

                        <KhyloSettingRow
                            title='Quick Connect PIN Pairing'
                            description='Enable rapid 6-digit code authentication for smart TV and media box clients without typing passwords.'
                            control={
                                <Switch
                                    checked={quickConnect}
                                    onChange={(_, checked) => setQuickConnect(checked)}
                                    color='primary'
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Operational Storage Paths */}
                    <KhyloSettingSection
                        title='Operational Storage Directories'
                        description='Filesystem mount paths for temporary transcoding files, artwork caches, and persistent metadata.'
                    >
                        <KhyloSettingRow
                            title='Transcoding & Runtime Cache Path'
                            description='Directory used for HLS stream segments, temporary transcoded buffers, and image thumbnails. Leave blank to use server default.'
                            control={
                                <TextField
                                    size='small'
                                    value={cachePath}
                                    onChange={(e) => setCachePath(e.target.value)}
                                    placeholder='Default cache directory'
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position='end'>
                                                <IconButton edge='end' onClick={showCachePathPicker} size='small'>
                                                    <SearchIcon fontSize='small' />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ width: { xs: '100%', sm: 340 } }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Media Metadata Directory'
                            description='Dedicated storage path for cached provider metadata, downloaded actor headshots, and backdrop art.'
                            control={
                                <TextField
                                    size='small'
                                    value={metadataPath}
                                    onChange={(e) => setMetadataPath(e.target.value)}
                                    placeholder='Default metadata directory'
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position='end'>
                                                <IconButton edge='end' onClick={showMetadataPathPicker} size='small'>
                                                    <SearchIcon fontSize='small' />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ width: { xs: '100%', sm: 340 } }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Concurrency & Performance */}
                    <KhyloSettingSection
                        title='Processing Concurrency'
                        description='Tune CPU thread parallelism for filesystem crawling and artwork extraction.'
                    >
                        <KhyloSettingRow
                            title='Library Scan Fanout Concurrency'
                            description='Maximum number of parallel directories traversed simultaneously during library ingestion scans. 0 allocates threads automatically.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={scanConcurrency}
                                    onChange={(e) => setScanConcurrency(parseInt(e.target.value || '0', 10))}
                                    InputProps={{ inputProps: { min: 0, max: 64, step: 1 } }}
                                    sx={{ width: 120 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Parallel Image Encoding Worker Limit'
                            description='Number of concurrent worker threads allocated to generating posters and chapter thumbnails.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={encodingLimit}
                                    onChange={(e) => setEncodingLimit(parseInt(e.target.value || '0', 10))}
                                    InputProps={{ inputProps: { min: 0, max: 32, step: 1 } }}
                                    sx={{ width: 120 }}
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
                        Server general settings saved.
                    </Alert>
                </Snackbar>

                {/* BUG-3 FIX: Locale change requires page reload to take effect */}
                <Snackbar
                    open={localeReloadNoticeOpen}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity='info'
                        onClose={() => setLocaleReloadNoticeOpen(false)}
                        action={
                            <Button
                                color='inherit'
                                size='small'
                                onClick={() => window.location.reload()}
                                sx={{ fontWeight: 700, textTransform: 'none' }}
                            >
                                Reload Page
                            </Button>
                        }
                        sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                    >
                        Language setting saved. Reload the page to apply the new locale.
                    </Alert>
                </Snackbar>

                <KhyloServerFileBrowserModal
                    open={browserTarget !== null}
                    initialPath={browserTarget === 'cache' ? cachePath : metadataPath}
                    title={browserTarget === 'cache' ? 'Select Transcoding & Runtime Cache Directory' : 'Select Media Metadata Storage Directory'}
                    includeFiles={false}
                    onClose={() => setBrowserTarget(null)}
                    onSelect={(selectedPath) => {
                        if (browserTarget === 'cache') {
                            setCachePath(selectedPath);
                        } else if (browserTarget === 'metadata') {
                            setMetadataPath(selectedPath);
                        }
                        setBrowserTarget(null);
                    }}
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'SettingsPage';
export default Component;
