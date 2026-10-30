import React, { FC, useState, useCallback, useMemo } from 'react';
import { PluginStatus } from '@khylo/sdk/lib/generated-client/models/plugin-status';
import type { VersionInfo } from '@khylo/sdk/lib/generated-client/models/version-info';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import FormControlLabel from '@mui/material/FormControlLabel';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExtensionIcon from '@mui/icons-material/Extension';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSearchParams, Link as RouterLink, useParams, useNavigate } from 'react-router-dom';

import { findBestConfigurationPage } from 'apps/dashboard/features/plugins/api/configurationPage';
import { findBestPluginInfo } from 'apps/dashboard/features/plugins/api/pluginInfo';
import { useConfigurationPages } from 'apps/dashboard/features/plugins/api/useConfigurationPages';
import { useDisablePlugin } from 'apps/dashboard/features/plugins/api/useDisablePlugin';
import { useEnablePlugin } from 'apps/dashboard/features/plugins/api/useEnablePlugin';
import { useInstallPackage } from 'apps/dashboard/features/plugins/api/useInstallPackage';
import { usePackageInfo } from 'apps/dashboard/features/plugins/api/usePackageInfo';
import { usePlugins } from 'apps/dashboard/features/plugins/api/usePlugins';
import { useUninstallPlugin } from 'apps/dashboard/features/plugins/api/useUninstallPlugin';
import PluginDetailsTable from 'apps/dashboard/features/plugins/components/PluginDetailsTable';
import PluginRevisions from 'apps/dashboard/features/plugins/components/PluginRevisions';
import type { PluginDetails } from 'apps/dashboard/features/plugins/types/PluginDetails';

import ConfirmDialog from 'components/ConfirmDialog';
import Image from 'components/Image';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import { getPluginUrl } from 'utils/dashboard';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloPanel,
    KhyloStatusBadge
} from '../../components/ui';

export const Component: FC = () => {
    const { api } = useApi();
    const navigate = useNavigate();
    const { pluginId } = useParams<{ pluginId: string }>();
    const [searchParams] = useSearchParams();

    const disablePlugin = useDisablePlugin();
    const enablePlugin = useEnablePlugin();
    const installPlugin = useInstallPackage();
    const uninstallPlugin = useUninstallPlugin();

    const [isEnabledOverride, setIsEnabledOverride] = useState<boolean>();
    const [isInstallConfirmOpen, setIsInstallConfirmOpen] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false);
    const [pendingInstallVersion, setPendingInstallVersion] = useState<VersionInfo>();

    const pluginName = searchParams.get('name') ?? undefined;

    const {
        data: configurationPages,
        isError: isConfigurationPagesError,
        isPending: isConfigurationPagesLoading
    } = useConfigurationPages();

    const {
        data: packageInfo,
        isError: isPackageInfoError,
        isPending: isPackageInfoLoading
    } = usePackageInfo(pluginName ? {
        name: pluginName,
        assemblyGuid: pluginId
    } : undefined);

    const {
        data: plugins,
        isError: isPluginsError,
        isPending: isPluginsLoading
    } = usePlugins();

    const isLoading = isConfigurationPagesLoading || isPackageInfoLoading || isPluginsLoading;

    const pluginDetails = useMemo<PluginDetails | undefined>(() => {
        if (pluginId && !isPluginsLoading) {
            const pluginInfo = findBestPluginInfo(pluginId, plugins);

            let version;
            if (pluginInfo) {
                const repoVersion = packageInfo?.versions?.find(v => v.version === pluginInfo.Version);
                version = repoVersion || {
                    version: pluginInfo.Version,
                    VersionNumber: pluginInfo.Version
                };
            } else {
                version = packageInfo?.versions?.[0];
            }

            let imageUrl;
            if (pluginInfo?.HasImage) {
                imageUrl = api?.getUri(`/Plugins/${pluginInfo.Id}/${pluginInfo.Version}/Image`);
            }

            return {
                canUninstall: !!pluginInfo?.CanUninstall,
                description: pluginInfo?.Description || packageInfo?.description || packageInfo?.overview,
                id: pluginId,
                imageUrl: imageUrl || packageInfo?.imageUrl || undefined,
                isEnabled: (isEnabledOverride && pluginInfo?.Status === PluginStatus.Restart)
                    ?? pluginInfo?.Status !== PluginStatus.Disabled,
                name: pluginName || pluginInfo?.Name || packageInfo?.name,
                owner: pluginInfo?.CanUninstall === false ? 'khylo' : packageInfo?.owner,
                status: pluginInfo?.Status,
                configurationPage: findBestConfigurationPage(configurationPages || [], pluginId),
                version,
                versions: packageInfo?.versions || []
            };
        }
    }, [
        api,
        configurationPages,
        isEnabledOverride,
        isPluginsLoading,
        packageInfo?.description,
        packageInfo?.imageUrl,
        packageInfo?.name,
        packageInfo?.overview,
        packageInfo?.owner,
        packageInfo?.versions,
        pluginId,
        pluginName,
        plugins
    ]);

    const toggleEnabled = useCallback(() => {
        if (!pluginDetails?.version?.version) return;

        if (pluginDetails.isEnabled) {
            disablePlugin.mutate({
                pluginId: pluginDetails.id,
                version: pluginDetails.version.version
            }, {
                onSuccess: () => setIsEnabledOverride(false),
                onSettled: () => {
                    installPlugin.reset();
                    enablePlugin.reset();
                    uninstallPlugin.reset();
                }
            });
        } else {
            enablePlugin.mutate({
                pluginId: pluginDetails.id,
                version: pluginDetails.version.version
            }, {
                onSuccess: () => setIsEnabledOverride(true),
                onSettled: () => {
                    installPlugin.reset();
                    disablePlugin.reset();
                    uninstallPlugin.reset();
                }
            });
        }
    }, [disablePlugin, enablePlugin, installPlugin, pluginDetails, uninstallPlugin]);

    const onInstall = useCallback((version?: VersionInfo, isConfirmed = false) => () => {
        if (!pluginDetails?.name) return;
        const installVersion = version || pluginDetails.version;
        if (!installVersion) return;

        if (!isConfirmed) {
            setPendingInstallVersion(installVersion);
            setIsInstallConfirmOpen(true);
            return;
        }

        setIsInstalling(true);
        installPlugin.mutate({
            name: pluginDetails.name,
            assemblyGuid: pluginDetails.id,
            version: installVersion.version,
            repositoryUrl: installVersion.repositoryUrl
        }, {
            onSettled: () => {
                setIsInstalling(false);
                setPendingInstallVersion(undefined);
                disablePlugin.reset();
                enablePlugin.reset();
                uninstallPlugin.reset();
            }
        });
    }, [disablePlugin, enablePlugin, installPlugin, pluginDetails, uninstallPlugin]);

    const onConfirmInstall = useCallback(() => {
        setIsInstallConfirmOpen(false);
        onInstall(pendingInstallVersion, true)();
    }, [onInstall, pendingInstallVersion]);

    const onUninstall = useCallback(() => {
        if (!pluginDetails?.version?.version) return;
        setIsUninstallConfirmOpen(false);

        uninstallPlugin.mutate({
            pluginId: pluginDetails.id,
            version: pluginDetails.version.version
        }, {
            onSettled: () => {
                disablePlugin.reset();
                enablePlugin.reset();
                installPlugin.reset();
            }
        });
    }, [disablePlugin, enablePlugin, installPlugin, pluginDetails, uninstallPlugin]);

    const isInstalled = Boolean(pluginDetails?.status);

    return (
        <KhyloPage>
            <ConfirmDialog
                open={isInstallConfirmOpen}
                title='Confirm Plugin Installation'
                text='This package originates from an external third-party repository. Only install plugins from trusted sources.'
                onCancel={() => {
                    setPendingInstallVersion(undefined);
                    setIsInstallConfirmOpen(false);
                }}
                onConfirm={onConfirmInstall}
                confirmButtonText='Install'
            />

            <ConfirmDialog
                open={isUninstallConfirmOpen}
                title='Uninstall Plugin'
                text={`Are you sure you want to uninstall "${pluginDetails?.name || pluginName}"? Associated configuration files may remain in the data directory.`}
                onCancel={() => setIsUninstallConfirmOpen(false)}
                onConfirm={onUninstall}
                confirmButtonColor='error'
                confirmButtonText='Uninstall'
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Extensions' },
                    { label: 'Plugins & Extensions', href: '/dashboard/plugins' },
                    { label: pluginDetails?.name || pluginName || 'Plugin' }
                ]}
                title={pluginDetails?.name || pluginName || 'Plugin Details'}
                subtitle={pluginDetails?.owner ? `Maintained by ${pluginDetails.owner}` : 'Khylo Server Extension'}
                badge={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KhyloStatusBadge
                            label={isInstalled ? (pluginDetails?.isEnabled ? 'Installed & Active' : 'Disabled') : 'Available in Catalog'}
                            color={isInstalled ? (pluginDetails?.isEnabled ? 'healthy' : 'warning') : 'idle'}
                        />
                        {pluginDetails?.version?.version && (
                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontFamily: 'monospace' }}>
                                v{pluginDetails.version.version}
                            </Typography>
                        )}
                    </Box>
                }
                actions={
                    <Button
                        size='small'
                        variant='outlined'
                        startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                        onClick={() => navigate('/dashboard/plugins')}
                        sx={{
                            textTransform: 'none',
                            borderColor: KHYLO_COLORS.borderDefault,
                            color: KHYLO_COLORS.textSecondary,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            '&:hover': { color: KHYLO_COLORS.textPrimary }
                        }}
                    >
                        All Plugins
                    </Button>
                }
            />

            {installPlugin.isSuccess && (
                <Alert severity='success' sx={{ mb: 3 }}>
                    Plugin installed successfully. Restart the Khylo server daemon to activate new assemblies.
                </Alert>
            )}

            {(isPluginsError || isPackageInfoError) && (
                <Alert severity='warning' sx={{ mb: 3 }}>
                    Could not query remote plugin repository catalog. Displaying cached local manifest.
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Left Column: Description, Graphic & Changelog */}
                <Grid item xs={12} lg={8}>
                    <Stack spacing={3}>
                        <KhyloPanel>
                            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                                <Box
                                    sx={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: '8px',
                                        bgcolor: KHYLO_COLORS.surfaceSecondary,
                                        border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: KHYLO_COLORS.accent,
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}
                                >
                                    {pluginDetails?.imageUrl ? (
                                        <Image
                                            isLoading={isLoading}
                                            alt={pluginDetails?.name}
                                            url={pluginDetails?.imageUrl}
                                            FallbackIcon={ExtensionIcon}
                                        />
                                    ) : (
                                        <ExtensionIcon sx={{ fontSize: 36 }} />
                                    )}
                                </Box>

                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant='h6' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary, mb: 1 }}>
                                        About this Extension
                                    </Typography>
                                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, lineHeight: 1.6 }}>
                                        {isLoading && !pluginDetails?.description ? (
                                            <>
                                                <Skeleton />
                                                <Skeleton />
                                                <Skeleton width='60%' />
                                            </>
                                        ) : (
                                            pluginDetails?.description || 'No description provided by package author.'
                                        )}
                                    </Typography>
                                </Box>
                            </Box>
                        </KhyloPanel>

                        {Boolean(pluginDetails?.versions?.length) && (
                            <KhyloPanel sx={{ p: 0, overflow: 'hidden' }}>
                                <Box
                                    sx={{
                                        px: 3,
                                        py: 2,
                                        borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                                        bgcolor: KHYLO_COLORS.surfaceSecondary
                                    }}
                                >
                                    <Typography variant='subtitle2' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary }}>
                                        Revision History & Updates
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 2.5 }}>
                                    <PluginRevisions
                                        pluginDetails={pluginDetails}
                                        onInstall={onInstall}
                                    />
                                </Box>
                            </KhyloPanel>
                        )}
                    </Stack>
                </Grid>

                {/* Right Column: Actions & Technical Specs */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={3}>
                        <KhyloPanel>
                            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary, mb: 2 }}>
                                Actions & Controls
                            </Typography>

                            <Stack spacing={2}>
                                {!isLoading && !pluginDetails?.status && (
                                    <Button
                                        variant='contained'
                                        startIcon={<DownloadIcon />}
                                        onClick={onInstall()}
                                        disabled={isInstalling}
                                        sx={{
                                            bgcolor: KHYLO_COLORS.accent,
                                            color: '#FFFFFF',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                        }}
                                    >
                                        {isInstalling ? 'Installing Package…' : 'Install Plugin'}
                                    </Button>
                                )}

                                {!isLoading && pluginDetails?.canUninstall && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: 1.5,
                                            borderRadius: '6px',
                                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                                            border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                                        }}
                                    >
                                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                            Enable Plugin
                                        </Typography>
                                        <Switch
                                            checked={pluginDetails.isEnabled}
                                            onChange={toggleEnabled}
                                            disabled={pluginDetails.status === PluginStatus.Restart}
                                            color='warning'
                                        />
                                    </Box>
                                )}

                                {!isLoading && pluginDetails?.configurationPage?.Name && (
                                    <Button
                                        component={RouterLink}
                                        to={`/${getPluginUrl(pluginDetails.configurationPage.Name)}`}
                                        startIcon={<SettingsIcon />}
                                        variant='outlined'
                                        sx={{
                                            textTransform: 'none',
                                            borderColor: KHYLO_COLORS.borderDefault,
                                            color: KHYLO_COLORS.textPrimary,
                                            fontWeight: 600,
                                            '&:hover': { borderColor: KHYLO_COLORS.accent }
                                        }}
                                    >
                                        Extension Settings
                                    </Button>
                                )}

                                {!isLoading && pluginDetails?.canUninstall && (
                                    <Button
                                        variant='outlined'
                                        color='error'
                                        startIcon={<DeleteOutlineIcon />}
                                        onClick={() => setIsUninstallConfirmOpen(true)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderColor: 'rgba(239, 68, 68, 0.4)',
                                            color: KHYLO_COLORS.status.danger.fg,
                                            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)', borderColor: KHYLO_COLORS.status.danger.fg }
                                        }}
                                    >
                                        Uninstall Plugin
                                    </Button>
                                )}
                            </Stack>
                        </KhyloPanel>

                        <KhyloPanel sx={{ p: 0, overflow: 'hidden' }}>
                            <Box
                                sx={{
                                    px: 2.5,
                                    py: 1.5,
                                    borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                                    bgcolor: KHYLO_COLORS.surfaceSecondary
                                }}
                            >
                                <Typography variant='caption' sx={{ fontWeight: 700, color: KHYLO_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Technical Specifications
                                </Typography>
                            </Box>
                            <PluginDetailsTable
                                isPluginLoading={isPluginsLoading}
                                isRepositoryLoading={isPackageInfoLoading}
                                pluginDetails={pluginDetails}
                                sx={{
                                    bgcolor: 'transparent',
                                    '& .MuiTableCell-root': {
                                        borderColor: KHYLO_COLORS.borderSubtle,
                                        fontSize: '0.8rem',
                                        py: 1.25,
                                        px: 2.5
                                    },
                                    '& .MuiTableCell-head': {
                                        color: KHYLO_COLORS.textMuted,
                                        fontWeight: 600
                                    }
                                }}
                            />
                        </KhyloPanel>
                    </Stack>
                </Grid>
            </Grid>
        </KhyloPage>
    );
};

export default Component;
