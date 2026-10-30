import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import SearchIcon from '@mui/icons-material/Search';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { NetworkConfiguration } from '@khylo/sdk/lib/generated-client/models/network-configuration';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY as CONFIG_QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { KhyloServerFileBrowserModal } from '../../components/browser/KhyloServerFileBrowserModal';
import { ActionData } from 'types/actionData';
import { encodePublishedServerUris, getPublishedServerUris, PublishedServerUris, splitString } from 'apps/dashboard/features/networking/utils';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloTabs,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge
} from '../../components/ui';

const CONFIG_KEY = 'network';

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    let newConfig: NetworkConfiguration;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        newConfig = await request.json() as NetworkConfiguration;
    } else {
        const formData = await request.formData();
        const data = Object.fromEntries(formData);

        newConfig = {
            BaseUrl: data.BaseUrl?.toString(),
            EnableHttps: data.EnableHttps?.toString() === 'on',
            RequireHttps: data.RequireHttps?.toString() === 'on',
            CertificatePath: data.CertificatePath?.toString(),
            CertificatePassword: data.CertificatePassword?.toString(),
            InternalHttpPort: parseInt(data.InternalHttpPort?.toString() || '8096', 10),
            InternalHttpsPort: parseInt(data.InternalHttpsPort?.toString() || '8920', 10),
            PublicHttpPort: parseInt(data.PublicHttpPort?.toString() || '8096', 10),
            PublicHttpsPort: parseInt(data.PublicHttpsPort?.toString() || '8920', 10),
            AutoDiscovery: data.AutoDiscovery?.toString() === 'on',
            EnableIPv4: data.EnableIPv4?.toString() === 'on',
            EnableIPv6: data.EnableIPv6?.toString() === 'on',
            EnableRemoteAccess: data.EnableRemoteAccess?.toString() === 'on',
            LocalNetworkSubnets: splitString(data.LocalNetworkSubnets?.toString()),
            LocalNetworkAddresses: splitString(data.LocalNetworkAddresses?.toString()),
            KnownProxies: splitString(data.KnownProxies?.toString()),
            RemoteIPFilter: splitString(data.RemoteIPFilter?.toString()),
            IsRemoteIPFilterBlacklist: data.IsRemoteIPFilterBlacklist?.toString() === 'blacklist'
        };

        const publishedServerUri: PublishedServerUris = {};
        if (data.PublishedServerUri) {
            publishedServerUri.all = data.PublishedServerUri?.toString();
        } else {
            publishedServerUri.internal = data.InternalPublishedServerUri?.toString();
            publishedServerUri.external = data.ExternalPublishedServerUri?.toString();
        }
        newConfig.PublishedServerUriBySubnet = encodePublishedServerUris(publishedServerUri);
    }

    await getSystemApi(api).updateNamedConfiguration({ key: CONFIG_KEY, body: newConfig });

    void queryClient.invalidateQueries({
        queryKey: [CONFIG_QUERY_KEY, CONFIG_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const { data: config, isPending, isError } = useNamedConfiguration<NetworkConfiguration>(CONFIG_KEY);
    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const [activeTab, setActiveTab] = useState<'ports' | 'tls' | 'firewall' | 'endpoints'>('ports');

    // Ports & Listeners
    const [internalHttpPort, setInternalHttpPort] = useState<number>(8096);
    const [internalHttpsPort, setInternalHttpsPort] = useState<number>(8920);
    const [publicHttpPort, setPublicHttpPort] = useState<number>(8096);
    const [publicHttpsPort, setPublicHttpsPort] = useState<number>(8920);
    const [baseUrl, setBaseUrl] = useState<string>('');
    const [localNetworkAddresses, setLocalNetworkAddresses] = useState<string>('');
    const [localNetworkSubnets, setLocalNetworkSubnets] = useState<string>('');
    const [knownProxies, setKnownProxies] = useState<string>('');
    const [enableIpv4, setEnableIpv4] = useState<boolean>(true);
    const [enableIpv6, setEnableIpv6] = useState<boolean>(false);
    const [autoDiscovery, setAutoDiscovery] = useState<boolean>(true);

    // TLS Certificate
    const [enableHttps, setEnableHttps] = useState<boolean>(false);
    const [requireHttps, setRequireHttps] = useState<boolean>(false);
    const [certificatePath, setCertificatePath] = useState<string>('');
    const [certificatePassword, setCertificatePassword] = useState<string>('');

    // Remote Access & Firewall
    const [enableRemoteAccess, setEnableRemoteAccess] = useState<boolean>(true);
    const [remoteIpFilter, setRemoteIpFilter] = useState<string>('');
    const [isBlacklist, setIsBlacklist] = useState<boolean>(false);

    // Endpoints
    const [useSameUri, setUseSameUri] = useState<boolean>(true);
    const [publishedUriAll, setPublishedUriAll] = useState<string>('');
    const [publishedUriInternal, setPublishedUriInternal] = useState<string>('');
    const [publishedUriExternal, setPublishedUriExternal] = useState<string>('');

    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);
    const [portRestartWarning, setPortRestartWarning] = useState(false);
    const [isCertPickerOpen, setIsCertPickerOpen] = useState(false);
    // Track the original port so after save we know if it changed
    const originalInternalHttpPort = config?.InternalHttpPort ?? 8096;

    useEffect(() => {
        if (config) {
            setInternalHttpPort(config.InternalHttpPort ?? 8096);
            setInternalHttpsPort(config.InternalHttpsPort ?? 8920);
            setPublicHttpPort(config.PublicHttpPort ?? 8096);
            setPublicHttpsPort(config.PublicHttpsPort ?? 8920);
            setBaseUrl(config.BaseUrl || '');
            setLocalNetworkAddresses(config.LocalNetworkAddresses?.join(', ') || '');
            setLocalNetworkSubnets(config.LocalNetworkSubnets?.join(', ') || '');
            setKnownProxies(config.KnownProxies?.join(', ') || '');
            setEnableIpv4(Boolean(config.EnableIPv4 ?? true));
            setEnableIpv6(Boolean(config.EnableIPv6 ?? false));
            setAutoDiscovery(Boolean(config.AutoDiscovery ?? true));

            setEnableHttps(Boolean(config.EnableHttps));
            setRequireHttps(Boolean(config.RequireHttps));
            setCertificatePath(config.CertificatePath || '');
            setCertificatePassword(config.CertificatePassword || '');

            setEnableRemoteAccess(Boolean(config.EnableRemoteAccess ?? true));
            setRemoteIpFilter(config.RemoteIPFilter?.join(', ') || '');
            setIsBlacklist(Boolean(config.IsRemoteIPFilterBlacklist));

            if (config.PublishedServerUriBySubnet && config.PublishedServerUriBySubnet.length > 0) {
                const uris = getPublishedServerUris(config.PublishedServerUriBySubnet);
                setPublishedUriAll(uris.all || '');
                setPublishedUriInternal(uris.internal || '');
                setPublishedUriExternal(uris.external || '');
                setUseSameUri(Boolean(uris.all));
            }
        }
    }, [config]);

    useEffect(() => {
        if (actionData?.isSaved) {
            // Check if HTTP port changed (port rebind requires server restart)
            if (internalHttpPort !== originalInternalHttpPort) {
                setPortRestartWarning(true);
            } else {
                setSavedNoticeOpen(true);
            }
        }
    }, [actionData]); // eslint-disable-line react-hooks/exhaustive-deps

    const showCertificatePicker = useCallback(() => {
        setIsCertPickerOpen(true);
    }, []);

    const isDirty = useMemo(() => {
        if (!config) return false;
        return (
            internalHttpPort !== (config.InternalHttpPort ?? 8096) ||
            internalHttpsPort !== (config.InternalHttpsPort ?? 8920) ||
            publicHttpPort !== (config.PublicHttpPort ?? 8096) ||
            publicHttpsPort !== (config.PublicHttpsPort ?? 8920) ||
            baseUrl !== (config.BaseUrl || '') ||
            localNetworkAddresses !== (config.LocalNetworkAddresses?.join(', ') || '') ||
            localNetworkSubnets !== (config.LocalNetworkSubnets?.join(', ') || '') ||
            knownProxies !== (config.KnownProxies?.join(', ') || '') ||
            enableIpv4 !== Boolean(config.EnableIPv4 ?? true) ||
            enableIpv6 !== Boolean(config.EnableIPv6 ?? false) ||
            autoDiscovery !== Boolean(config.AutoDiscovery ?? true) ||
            enableHttps !== Boolean(config.EnableHttps) ||
            requireHttps !== Boolean(config.RequireHttps) ||
            certificatePath !== (config.CertificatePath || '') ||
            certificatePassword !== (config.CertificatePassword || '') ||
            enableRemoteAccess !== Boolean(config.EnableRemoteAccess ?? true) ||
            remoteIpFilter !== (config.RemoteIPFilter?.join(', ') || '') ||
            isBlacklist !== Boolean(config.IsRemoteIPFilterBlacklist)
        );
    }, [
        config,
        internalHttpPort,
        internalHttpsPort,
        publicHttpPort,
        publicHttpsPort,
        baseUrl,
        localNetworkAddresses,
        localNetworkSubnets,
        knownProxies,
        enableIpv4,
        enableIpv6,
        autoDiscovery,
        enableHttps,
        requireHttps,
        certificatePath,
        certificatePassword,
        enableRemoteAccess,
        remoteIpFilter,
        isBlacklist
    ]);

    const handleSave = useCallback(() => {
        const publishedServerUri: PublishedServerUris = {};
        if (useSameUri) {
            publishedServerUri.all = publishedUriAll.trim();
        } else {
            publishedServerUri.internal = publishedUriInternal.trim();
            publishedServerUri.external = publishedUriExternal.trim();
        }

        const payload: NetworkConfiguration = {
            InternalHttpPort: internalHttpPort,
            InternalHttpsPort: internalHttpsPort,
            PublicHttpPort: publicHttpPort,
            PublicHttpsPort: publicHttpsPort,
            BaseUrl: baseUrl.trim() || undefined,
            LocalNetworkAddresses: splitString(localNetworkAddresses),
            LocalNetworkSubnets: splitString(localNetworkSubnets),
            KnownProxies: splitString(knownProxies),
            EnableIPv4: enableIpv4,
            EnableIPv6: enableIpv6,
            AutoDiscovery: autoDiscovery,
            EnableHttps: enableHttps,
            RequireHttps: requireHttps,
            CertificatePath: certificatePath.trim() || undefined,
            CertificatePassword: certificatePassword || undefined,
            EnableRemoteAccess: enableRemoteAccess,
            RemoteIPFilter: splitString(remoteIpFilter),
            IsRemoteIPFilterBlacklist: isBlacklist,
            PublishedServerUriBySubnet: encodePublishedServerUris(publishedServerUri)
        };

        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [
        internalHttpPort,
        internalHttpsPort,
        publicHttpPort,
        publicHttpsPort,
        baseUrl,
        localNetworkAddresses,
        localNetworkSubnets,
        knownProxies,
        enableIpv4,
        enableIpv6,
        autoDiscovery,
        enableHttps,
        requireHttps,
        certificatePath,
        certificatePassword,
        enableRemoteAccess,
        remoteIpFilter,
        isBlacklist,
        useSameUri,
        publishedUriAll,
        publishedUriInternal,
        publishedUriExternal,
        submit
    ]);

    const handleDiscard = useCallback(() => {
        if (config) {
            setInternalHttpPort(config.InternalHttpPort ?? 8096);
            setInternalHttpsPort(config.InternalHttpsPort ?? 8920);
            setPublicHttpPort(config.PublicHttpPort ?? 8096);
            setPublicHttpsPort(config.PublicHttpsPort ?? 8920);
            setBaseUrl(config.BaseUrl || '');
            setLocalNetworkAddresses(config.LocalNetworkAddresses?.join(', ') || '');
            setLocalNetworkSubnets(config.LocalNetworkSubnets?.join(', ') || '');
            setKnownProxies(config.KnownProxies?.join(', ') || '');
            setEnableIpv4(Boolean(config.EnableIPv4 ?? true));
            setEnableIpv6(Boolean(config.EnableIPv6 ?? false));
            setAutoDiscovery(Boolean(config.AutoDiscovery ?? true));
            setEnableHttps(Boolean(config.EnableHttps));
            setRequireHttps(Boolean(config.RequireHttps));
            setCertificatePath(config.CertificatePath || '');
            setCertificatePassword(config.CertificatePassword || '');
            setEnableRemoteAccess(Boolean(config.EnableRemoteAccess ?? true));
            setRemoteIpFilter(config.RemoteIPFilter?.join(', ') || '');
            setIsBlacklist(Boolean(config.IsRemoteIPFilterBlacklist));
        }
    }, [config]);

    if (isPending) return <Loading />;

    if (isError) {
        return (
            <Page id='networkingPage' title='Networking' className='type-interior mainAnimatedPage'>
                <KhyloPage>
                    <Alert severity='error'>Failed to load network bindings configuration.</Alert>
                </KhyloPage>
            </Page>
        );
    }

    return (
        <Page id='networkingPage' title='Networking' className='type-interior mainAnimatedPage'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Network' },
                        { label: 'Configuration' }
                    ]}
                    title='Network Bindings & Security'
                    subtitle='TCP socket listeners, TLS certificates, reverse proxy integration, and subnet firewall rules.'
                    badge={
                        <KhyloStatusBadge
                            label={`Port :${internalHttpPort} • ${enableHttps ? 'TLS Enabled' : 'Cleartext HTTP'}`}
                            color={enableHttps ? 'healthy' : 'degraded'}
                        />
                    }
                >
                    <KhyloTabs
                        activeTab={activeTab}
                        onChange={(tab) => setActiveTab(tab as any)}
                        tabs={[
                            { id: 'ports', label: 'Listeners & Protocols' },
                            { id: 'tls', label: 'TLS / SSL Encryption' },
                            { id: 'firewall', label: 'Access Control & Proxies' },
                            { id: 'endpoints', label: 'Published URIs' }
                        ]}
                    />
                </KhyloPageHeader>

                {/* BUG-4 FIX: Port change requires server restart banner */}
                {portRestartWarning && (
                    <Alert
                        severity='warning'
                        onClose={() => setPortRestartWarning(false)}
                        sx={{ mb: 2, bgcolor: 'rgba(217,119,50,0.12)', borderColor: 'rgba(217,119,50,0.3)', color: KHYLO_COLORS.textPrimary }}
                    >
                        <strong>Server restart required.</strong> The HTTP port binding has been updated in the configuration. The server must be restarted before it will listen on the new port. Use the Restart button in the top toolbar to apply.
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Tab 1: Listeners & Protocols */}
                    {activeTab === 'ports' && (
                        <>
                            <KhyloSettingSection
                                title='Internal Socket Ports'
                                description='Local network ports bound on the host machine.'
                            >
                                <KhyloSettingRow
                                    title='Local HTTP Port'
                                    description='Port used for standard unencrypted web and API traffic on local networks (default 8096).'
                                    control={
                                        <TextField
                                            type='number'
                                            size='small'
                                            value={internalHttpPort}
                                            onChange={(e) => setInternalHttpPort(parseInt(e.target.value || '8096', 10))}
                                            InputProps={{ inputProps: { min: 1, max: 65535 } }}
                                            sx={{ width: 140 }}
                                        />
                                    }
                                />

                                <KhyloSettingRow
                                    title='Local HTTPS Port'
                                    description='Port used for secure TLS-encrypted client communication (default 8920).'
                                    control={
                                        <TextField
                                            type='number'
                                            size='small'
                                            value={internalHttpsPort}
                                            onChange={(e) => setInternalHttpsPort(parseInt(e.target.value || '8920', 10))}
                                            InputProps={{ inputProps: { min: 1, max: 65535 } }}
                                            sx={{ width: 140 }}
                                        />
                                    }
                                />

                                <KhyloSettingRow
                                    title='Server URL Path Prefix (BaseUrl)'
                                    description='Relative URL path if Khylo is hosted behind a reverse proxy subpath (e.g. /khylo).'
                                    control={
                                        <TextField
                                            size='small'
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder='/khylo'
                                            sx={{ width: 200 }}
                                        />
                                    }
                                />
                            </KhyloSettingSection>

                            <KhyloSettingSection
                                title='Protocols & Discovery'
                                description='Network address binding and client auto-discovery broadcasts.'
                            >
                                <KhyloSettingRow
                                    title='Enable IPv4 Protocol'
                                    description='Listen for connections across IPv4 network interfaces.'
                                    control={
                                        <Switch
                                            checked={enableIpv4}
                                            onChange={(_, checked) => setEnableIpv4(checked)}
                                            color='primary'
                                        />
                                    }
                                />

                                <KhyloSettingRow
                                    title='Enable IPv6 Protocol'
                                    description='Listen for connections across IPv6 dual-stack interfaces.'
                                    control={
                                        <Switch
                                            checked={enableIpv6}
                                            onChange={(_, checked) => setEnableIpv6(checked)}
                                            color='primary'
                                        />
                                    }
                                />

                                <KhyloSettingRow
                                    title='SSDP & Local Broadcast Discovery'
                                    description='Broadcast server presence over UDP so local mobile and TV clients automatically detect this server.'
                                    control={
                                        <Switch
                                            checked={autoDiscovery}
                                            onChange={(_, checked) => setAutoDiscovery(checked)}
                                            color='primary'
                                        />
                                    }
                                />
                            </KhyloSettingSection>
                        </>
                    )}

                    {/* Tab 2: TLS Certificate */}
                    {activeTab === 'tls' && (
                        <KhyloSettingSection
                            title='Transport Layer Security (TLS/SSL)'
                            description='Configure cryptographic certificates for end-to-end HTTPS encryption.'
                        >
                            <KhyloSettingRow
                                title='Enable HTTPS Support'
                                description='Bind the HTTPS listener port and allow encrypted connections.'
                                control={
                                    <Switch
                                        checked={enableHttps}
                                        onChange={(_, checked) => setEnableHttps(checked)}
                                        color='primary'
                                    />
                                }
                            />

                            <KhyloSettingRow
                                title='Enforce HTTPS Redirection'
                                description='Automatically redirect all incoming cleartext HTTP requests to secure HTTPS.'
                                isDependent
                                disabled={!enableHttps}
                                control={
                                    <Switch
                                        checked={requireHttps}
                                        onChange={(_, checked) => setRequireHttps(checked)}
                                        color='primary'
                                    />
                                }
                            />

                            <KhyloSettingRow
                                title='Certificate Container Path (.pfx)'
                                description='Absolute path to a PKCS#12 bundle (.pfx / .p12) containing your private key and certificate chain.'
                                isDependent
                                disabled={!enableHttps}
                                control={
                                    <TextField
                                        size='small'
                                        value={certificatePath}
                                        onChange={(e) => setCertificatePath(e.target.value)}
                                        placeholder='/etc/ssl/certs/khylo.pfx'
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position='end'>
                                                    <IconButton edge='end' onClick={showCertificatePicker} size='small'>
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
                                title='Certificate Password'
                                description='Decryption passphrase for the PKCS#12 archive (if encrypted).'
                                isDependent
                                disabled={!enableHttps}
                                control={
                                    <TextField
                                        type='password'
                                        size='small'
                                        value={certificatePassword}
                                        onChange={(e) => setCertificatePassword(e.target.value)}
                                        sx={{ width: 220 }}
                                    />
                                }
                            />
                        </KhyloSettingSection>
                    )}

                    {/* Tab 3: Access Control & Proxies */}
                    {activeTab === 'firewall' && (
                        <KhyloSettingSection
                            title='Access Policies & Reverse Proxies'
                            description='Control remote WAN access, proxy header trust, and subnet CIDR ranges.'
                        >
                            <KhyloSettingRow
                                title='Allow Remote WAN Access'
                                description='Permit connections originating outside local subnets (via port forwarding or public DNS).'
                                control={
                                    <Switch
                                        checked={enableRemoteAccess}
                                        onChange={(_, checked) => setEnableRemoteAccess(checked)}
                                        color='primary'
                                    />
                                }
                            />

                            <KhyloSettingRow
                                title='Trusted Reverse Proxies'
                                description='IP addresses or CIDRs of reverse proxies (Nginx, Caddy, Traefik, Cloudflare). Trusts X-Forwarded-For headers.'
                                control={
                                    <TextField
                                        size='small'
                                        value={knownProxies}
                                        onChange={(e) => setKnownProxies(e.target.value)}
                                        placeholder='127.0.0.1, 10.0.0.1'
                                        sx={{ width: 260 }}
                                    />
                                }
                            />

                            <KhyloSettingRow
                                title='Local Network Subnets (CIDR)'
                                description='Explicit list of subnets considered local LAN (e.g. 192.168.1.0/24, 10.0.0.0/8). Local clients bypass bitrate caps.'
                                control={
                                    <TextField
                                        size='small'
                                        value={localNetworkSubnets}
                                        onChange={(e) => setLocalNetworkSubnets(e.target.value)}
                                        placeholder='192.168.1.0/24'
                                        sx={{ width: 260 }}
                                    />
                                }
                            />

                            <KhyloSettingRow
                                title='Remote IP Filter Mode'
                                description='Choose whether remote IP rules function as an allowlist (whitelist) or blocklist (blacklist).'
                                control={
                                    <TextField
                                        select
                                        size='small'
                                        value={isBlacklist ? 'blacklist' : 'whitelist'}
                                        onChange={(e) => setIsBlacklist(e.target.value === 'blacklist')}
                                        sx={{ width: 180 }}
                                    >
                                        <MenuItem value='whitelist'>Allowlist (Whitelist)</MenuItem>
                                        <MenuItem value='blacklist'>Blocklist (Blacklist)</MenuItem>
                                    </TextField>
                                }
                            />

                            <KhyloSettingRow
                                title='Remote Filter IP Addresses'
                                description='Comma-separated IP addresses or CIDR ranges to apply to the filter.'
                                control={
                                    <TextField
                                        size='small'
                                        value={remoteIpFilter}
                                        onChange={(e) => setRemoteIpFilter(e.target.value)}
                                        placeholder='198.51.100.0/24'
                                        sx={{ width: 260 }}
                                    />
                                }
                            />
                        </KhyloSettingSection>
                    )}

                    {/* Tab 4: Published URIs */}
                    {activeTab === 'endpoints' && (
                        <KhyloSettingSection
                            title='Published Endpoint URIs'
                            description='Public URLs reported to client apps for connecting and streaming.'
                        >
                            <KhyloSettingRow
                                title='Unified Endpoint URI'
                                description='Use the same URL address for both internal LAN and external WAN clients.'
                                control={
                                    <Switch
                                        checked={useSameUri}
                                        onChange={(_, checked) => setUseSameUri(checked)}
                                        color='primary'
                                    />
                                }
                            />

                            {useSameUri ? (
                                <KhyloSettingRow
                                    title='Published Server URI'
                                    description='Full public URL including protocol (e.g. https://khylo.example.com).'
                                    control={
                                        <TextField
                                            size='small'
                                            value={publishedUriAll}
                                            onChange={(e) => setPublishedUriAll(e.target.value)}
                                            placeholder='https://khylo.example.com'
                                            sx={{ width: 300 }}
                                        />
                                    }
                                />
                            ) : (
                                <>
                                    <KhyloSettingRow
                                        title='Internal LAN Server URI'
                                        description='URL advertised to clients on local subnets (e.g. http://192.168.1.50:8096).'
                                        control={
                                            <TextField
                                                size='small'
                                                value={publishedUriInternal}
                                                onChange={(e) => setPublishedUriInternal(e.target.value)}
                                                placeholder='http://192.168.1.50:8096'
                                                sx={{ width: 300 }}
                                            />
                                        }
                                    />
                                    <KhyloSettingRow
                                        title='External WAN Server URI'
                                        description='URL advertised to clients connecting from outside the LAN (e.g. https://khylo.example.com).'
                                        control={
                                            <TextField
                                                size='small'
                                                value={publishedUriExternal}
                                                onChange={(e) => setPublishedUriExternal(e.target.value)}
                                                placeholder='https://khylo.example.com'
                                                sx={{ width: 300 }}
                                            />
                                        }
                                    />
                                </>
                            )}
                        </KhyloSettingSection>
                    )}
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
                        Network configuration saved.
                    </Alert>
                </Snackbar>

                <KhyloServerFileBrowserModal
                    open={isCertPickerOpen}
                    initialPath={certificatePath}
                    title='Select PKCS#12 (.pfx / .p12) Certificate File'
                    includeFiles
                    filterExtensions={['.pfx', '.p12', '.pem', '.crt', '.cer']}
                    onClose={() => setIsCertPickerOpen(false)}
                    onSelect={(selectedPath) => {
                        setCertificatePath(selectedPath);
                        setIsCertPickerOpen(false);
                    }}
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'NetworkingPage';
export default Component;
