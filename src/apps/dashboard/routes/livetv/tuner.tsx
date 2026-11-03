import React, { type FC, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RadarIcon from '@mui/icons-material/Radar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LiveTvOptions } from '@khylo/sdk/lib/generated-client/models/live-tv-options';
import type { TunerHostInfo } from '@khylo/sdk/lib/generated-client/models/tuner-host-info';
import type { Api } from '@khylo/sdk';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { isAxiosError } from 'axios';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import { ChannelPicker } from 'apps/dashboard/features/livetv/components/ChannelPicker';
import { uploadGuideFile } from 'apps/dashboard/features/livetv/utils/guideUpload';
import {
    type PlaylistInfo,
    type Selection,
    EMPTY_SELECTION,
    LARGE_LINEUP,
    getLineupColor,
    countSelected,
    groupChannels,
    testPlaylist,
    toSelectionBody
} from 'apps/dashboard/features/livetv/utils/channelSelection';
import { KhyloServerFileBrowserModal } from '../../components/browser/KhyloServerFileBrowserModal';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingRow,
    KhyloSettingSection,
    KhyloStatusBadge,
    KhyloStickyActionBar
} from '../../components/ui';

type TunerType = 'm3u' | 'hdhomerun';

interface TunerForm {
    type: TunerType;
    url: string;
    friendlyName: string;
    deviceId: string;
    userAgent: string;
    tunerCount: string;
    fallbackBitrateMbps: string;
    importFavoritesOnly: boolean;
    allowHwTranscoding: boolean;
    enableStreamLooping: boolean;
    allowFmp4: boolean;
    allowStreamSharing: boolean;
    ignoreDts: boolean;
    readAtNativeFramerate: boolean;
}

const EMPTY_FORM: TunerForm = {
    type: 'm3u',
    url: '',
    friendlyName: '',
    deviceId: '',
    userAgent: '',
    tunerCount: '0',
    fallbackBitrateMbps: '30',
    importFavoritesOnly: false,
    allowHwTranscoding: false,
    enableStreamLooping: false,
    allowFmp4: false,
    allowStreamSharing: true,
    ignoreDts: true,
    readAtNativeFramerate: false
};

const toForm = (info: TunerHostInfo): TunerForm => ({
    type: (info.Type === 'hdhomerun' ? 'hdhomerun' : 'm3u'),
    url: info.Url ?? '',
    friendlyName: info.FriendlyName ?? '',
    deviceId: info.DeviceId ?? '',
    userAgent: info.UserAgent ?? '',
    tunerCount: String(info.TunerCount ?? 0),
    fallbackBitrateMbps: String(info.FallbackMaxStreamingBitrate ? info.FallbackMaxStreamingBitrate / 1e6 : 30),
    importFavoritesOnly: Boolean(info.ImportFavoritesOnly),
    allowHwTranscoding: Boolean(info.AllowHWTranscoding),
    enableStreamLooping: Boolean(info.EnableStreamLooping),
    allowFmp4: Boolean(info.AllowFmp4TranscodingContainer),
    allowStreamSharing: Boolean(info.AllowStreamSharing),
    ignoreDts: Boolean(info.IgnoreDts),
    readAtNativeFramerate: Boolean(info.ReadAtNativeFramerate)
});

const fieldSx = { width: { xs: '100%', sm: 360 } };

/** The tuner as the server stores it, from the form. Options that don't apply to the type are off. */
const toTunerHostInfo = (form: TunerForm, existing: TunerHostInfo | undefined, tunerId: string | null): TunerHostInfo => {
    const isM3u = form.type === 'm3u';
    return {
        ...(existing ?? {}),
        Id: tunerId ?? undefined,
        Type: form.type,
        Url: form.url.trim(),
        FriendlyName: form.friendlyName.trim() || null,
        DeviceId: form.deviceId || null,
        UserAgent: isM3u ? form.userAgent.trim() || null : null,
        TunerCount: isM3u ? Math.max(0, parseInt(form.tunerCount, 10) || 0) : 0,
        FallbackMaxStreamingBitrate: Math.round((parseFloat(form.fallbackBitrateMbps) || 30) * 1e6),
        ImportFavoritesOnly: !isM3u && form.importFavoritesOnly,
        AllowHWTranscoding: !isM3u && form.allowHwTranscoding,
        EnableStreamLooping: isM3u && form.enableStreamLooping,
        AllowFmp4TranscodingContainer: isM3u && form.allowFmp4,
        AllowStreamSharing: isM3u && form.allowStreamSharing,
        IgnoreDts: isM3u && form.ignoreDts,
        ReadAtNativeFramerate: isM3u && form.readAtNativeFramerate
    };
};

type PlaylistTest =
    | { status: 'idle' }
    | { status: 'testing' }
    | { status: 'failed'; message: string }
    | { status: 'passed'; playlist: PlaylistInfo };

const describePlaylist = (playlist: PlaylistInfo) => {
    const groups = groupChannels(playlist);
    const live = groups.live.reduce((sum, g) => sum + g.count, 0);
    const groupLabel = groups.live.length === 1 ? 'group' : 'groups';
    const parts = [ `${live.toLocaleString()} live channels in ${groups.live.length.toLocaleString()} ${groupLabel}` ];
    if (playlist.TotalCount > live) {
        parts.push(`${(playlist.TotalCount - live).toLocaleString()} on-demand and adult entries`);
    }
    return `Connected. ${parts.join(', ')}.`;
};

const M3U_ADDRESS_HELP = 'The M3U link from your IPTV provider, or a playlist file on this server.';
const HDHOMERUN_ADDRESS_HELP = 'The HDHomeRun\'s address on your network (shown in the HDHomeRun app), or search your network for it.';

/** What the save bar says: a new playlist needs a passed test and at least one channel first. */
const getSaveText = (isEditing: boolean, isNewPlaylist: boolean, isTested: boolean, selectedCount: number) => {
    if (!isNewPlaylist) return { saveLabel: isEditing ? 'Save tuner' : 'Add tuner', actionMessage: undefined };
    if (!isTested) return { saveLabel: 'Add tuner', actionMessage: 'Test the playlist, then pick your channels' };
    if (selectedCount === 0) return { saveLabel: 'Add tuner', actionMessage: 'Pick at least one channel' };
    return { saveLabel: `Add tuner with ${selectedCount.toLocaleString()} channels`, actionMessage: 'Only the picked channels are imported' };
};

const PlaylistTestControl: FC<{ test: PlaylistTest; onTest: () => void }> = ({ test, onTest }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...fieldSx }}>
        <Button
            variant='outlined'
            size='small'
            startIcon={test.status === 'testing' ? <CircularProgress size={14} color='inherit' /> : undefined}
            onClick={onTest}
            disabled={test.status === 'testing'}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', borderColor: KHYLO_COLORS.borderDefault, color: KHYLO_COLORS.textPrimary }}
        >
            {test.status === 'testing' ? 'Testing…' : 'Test playlist'}
        </Button>
        {test.status === 'testing' && (
            <Typography sx={{ fontSize: '0.8rem', color: KHYLO_COLORS.textMuted }}>Downloading the playlist from your provider…</Typography>
        )}
        {test.status === 'passed' && (
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                <CheckCircleIcon sx={{ fontSize: 16, mt: '2px', color: KHYLO_COLORS.status.healthy.fg }} />
                <Typography sx={{ fontSize: '0.8rem', color: KHYLO_COLORS.textSecondary }}>{describePlaylist(test.playlist)}</Typography>
            </Box>
        )}
        {test.status === 'failed' && (
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                <ErrorOutlineIcon sx={{ fontSize: 16, mt: '2px', color: KHYLO_COLORS.status.danger.fg }} />
                <Typography sx={{ fontSize: '0.8rem', color: KHYLO_COLORS.textSecondary }}>{test.message}</Typography>
            </Box>
        )}
    </Box>
);

/** Why a guide upload failed, in the server's words when it gave them. */
function uploadErrorText(err: unknown): string {
    const reason = isAxiosError(err) && typeof err.response?.data === 'string' ? err.response.data : null;
    return reason || 'Couldn\'t upload that guide file.';
}

/** Uploading a guide file from this computer. */
function useGuideUpload(api: Api | undefined, onSaved: (path: string) => void, onError: (message: string) => void) {
    const [ uploading, setUploading ] = useState(false);

    const upload = async (file: File) => {
        if (!api) return;
        setUploading(true);
        try {
            onSaved(await uploadGuideFile(api.basePath, api.authorizationHeader, file));
        } catch (err) {
            onError(uploadErrorText(err));
        } finally {
            setUploading(false);
        }
    };

    return { uploading, upload };
}

/** Adds the program guide with the tuner, unless that guide is already set up. Resolves to false when it can't be read. */
async function addGuide(api: Api, providers: LiveTvOptions['ListingProviders'], guidePath: string, isPlaylist: boolean): Promise<boolean> {
    const guide = guidePath.trim();
    if (!isPlaylist || !guide || providers?.some(p => p.Type?.toLowerCase() === 'xmltv' && p.Path === guide)) return true;

    try {
        await getLiveTvApi(api).addListingProvider({
            validateListings: true,
            listingsProviderInfo: { Type: 'xmltv', Path: guide, EnableAllTuners: true }
        });
        return true;
    } catch {
        return false;
    }
}

interface GuideSectionProps {
    /** Guides go with IPTV playlists; an antenna tuner doesn't have one. */
    visible: boolean;
    value: string;
    onChange: (value: string) => void;
    onBrowse: () => void;
    uploading: boolean;
    onUpload: (file: File) => void;
}

/** The optional program guide: its link, a file on the server, or a file from this computer. */
const GuideSection: FC<GuideSectionProps> = ({ visible, value, onChange, onBrowse, uploading, onUpload }) => (visible ? (
    <KhyloSettingSection title='Program guide'>
        <KhyloSettingRow
            title='Guide address or file'
            description='Optional. The TV guide (XMLTV) from your provider gives channels their schedules. Paste its link, upload the file, or choose one already on the server. You can add or change guides later on the Live TV page.'
            control={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...fieldSx }}>
                    <TextField
                        size='small'
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder='https://… or a file on this server'
                        fullWidth
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <IconButton size='small' onClick={onBrowse} aria-label='Choose a guide file on the server'>
                                            <FolderOpenIcon fontSize='small' />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
                    <Button
                        component='label'
                        size='small'
                        disabled={uploading}
                        startIcon={uploading ? <CircularProgress size={14} /> : <UploadFileIcon />}
                        sx={{ alignSelf: 'flex-start', textTransform: 'none', color: KHYLO_COLORS.textSecondary }}
                    >
                        {uploading ? 'Uploading…' : 'Upload a guide file from this computer'}
                        <input
                            hidden
                            type='file'
                            accept='.xml,.gz,.xmltv'
                            onChange={e => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) onUpload(file);
                            }}
                        />
                    </Button>
                </Box>
            }
        />
    </KhyloSettingSection>
) : null);

// The tuner form is one page: its source, channels, guide and save steps stay together
// eslint-disable-next-line sonarjs/cognitive-complexity
export const Component: FC = () => {
    const { api } = useApi();
    const navigate = useNavigate();
    const [ searchParams ] = useSearchParams();
    const tunerId = searchParams.get('id');
    const isEditing = Boolean(tunerId);

    const { data: config, isPending } = useNamedConfiguration<LiveTvOptions>('livetv');
    const existing = useMemo(
        () => config?.TunerHosts?.find(t => t.Id === tunerId),
        [ config, tunerId ]
    );

    const [ form, setForm ] = useState<TunerForm>(EMPTY_FORM);
    const [ initial, setInitial ] = useState<TunerForm>(EMPTY_FORM);
    const [ isSaving, setIsSaving ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);
    const [ isBrowsing, setIsBrowsing ] = useState(false);
    const [ isDiscovering, setIsDiscovering ] = useState(false);
    const [ discovered, setDiscovered ] = useState<TunerHostInfo[] | null>(null);
    const [ test, setTest ] = useState<PlaylistTest>({ status: 'idle' });
    const [ selection, setSelection ] = useState<Selection>(EMPTY_SELECTION);
    // An optional program guide, added with the tuner (the guide itself is a source of its own on the Live TV page)
    const [ guidePath, setGuidePath ] = useState('');
    const [ isBrowsingGuide, setIsBrowsingGuide ] = useState(false);
    const { uploading: isUploadingGuide, upload: uploadGuide } = useGuideUpload(api, setGuidePath, setError);

    useEffect(() => {
        if (existing) {
            const loaded = toForm(existing);
            setForm(loaded);
            setInitial(loaded);
        }
    }, [existing]);

    const { data: types } = useQuery({
        queryKey: ['LiveTvTunerTypes'],
        queryFn: async () => (await getLiveTvApi(api!).getTunerHostTypes()).data,
        enabled: Boolean(api)
    });

    const set = <K extends keyof TunerForm>(key: K, value: TunerForm[K]) => setForm(prev => ({ ...prev, [key]: value }));
    const isM3u = form.type === 'm3u';
    const isDirty = JSON.stringify(form) !== JSON.stringify(initial);
    // A new playlist is tested and its channels picked before it's added: IPTV playlists often
    // hold tens of thousands of entries, and importing them all would bog the server down
    const isNewPlaylist = !isEditing && isM3u;
    const testedPlaylist = test.status === 'passed' ? test.playlist : null;

    // A different address or player identity is a different playlist
    useEffect(() => {
        setTest({ status: 'idle' });
        setSelection(EMPTY_SELECTION);
    }, [ form.type, form.url, form.userAgent ]);

    const selectedCount = useMemo(() => {
        if (!testedPlaylist) return 0;
        const groups = groupChannels(testedPlaylist);
        return countSelected(groups.live.concat(groups.other), selection);
    }, [ testedPlaylist, selection ]);

    const runTest = async () => {
        if (!api) return;
        if (!form.url.trim()) {
            setTest({ status: 'failed', message: 'Enter the playlist address or file first.' });
            return;
        }

        setTest({ status: 'testing' });
        try {
            const playlist = await testPlaylist(api, toTunerHostInfo(form, existing, tunerId));
            setTest({ status: 'passed', playlist });
        } catch (err) {
            const reason = isAxiosError(err) && typeof err.response?.data === 'string' ? err.response.data : null;
            setTest({ status: 'failed', message: reason || 'Couldn\'t read that playlist. Check the address and try again.' });
        }
    };

    const discover = async () => {
        if (!api) return;
        setIsDiscovering(true);
        setError(null);
        try {
            const result = (await getLiveTvApi(api).discoverTuners({ newDevicesOnly: true })).data;
            setDiscovered(result.filter(d => d.Type === 'hdhomerun'));
        } catch {
            setError('Couldn\'t search the network for tuners.');
        } finally {
            setIsDiscovering(false);
        }
    };

    const save = async () => {
        if (!api) return;
        if (!form.url.trim()) {
            setError(isM3u ? 'Enter the playlist address or file.' : 'Enter the tuner\'s address.');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            // The guide first: if it can't be read, nothing else has been added yet
            if (!(await addGuide(api, config?.ListingProviders, guidePath, isM3u))) {
                setError('Couldn\'t read that program guide. Check the address or file, or clear it to add the tuner without a guide.');
                setIsSaving(false);
                return;
            }

            const info = toTunerHostInfo(form, existing, tunerId);
            const body = isNewPlaylist && testedPlaylist ? { ...info, ...toSelectionBody(testedPlaylist, selection) } : info;
            await getLiveTvApi(api).addTunerHost({ tunerHostInfo: body });
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            navigate('/dashboard/livetv');
        } catch {
            setError('Couldn\'t save the tuner. Check the address and try again.');
            setIsSaving(false);
        }
    };

    if (isPending) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    const { saveLabel, actionMessage } = getSaveText(isEditing, isNewPlaylist, Boolean(testedPlaylist), selectedCount);
    const countColor = getLineupColor(selectedCount);

    const typeOptions = types?.length ? types : [ { Id: 'm3u', Name: 'M3U Tuner' }, { Id: 'hdhomerun', Name: 'HDHomeRun' } ];

    return (
        <Page id='liveTvTunerPage' title='Tuner' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1000}>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Live TV', to: '/dashboard/livetv' }, { label: isEditing ? 'Edit tuner' : 'Add tuner' } ]}
                    title={isEditing ? 'Edit tuner' : 'Add a tuner'}
                    subtitle='A tuner is where live channels come from: an IPTV playlist (M3U) from your provider, or an HDHomeRun antenna or cable box on your network.'
                />

                {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

                <KhyloSettingSection title='Source'>
                    <KhyloSettingRow
                        title='Tuner type'
                        description='IPTV services give you an M3U playlist link. HDHomeRun is a network box for antenna or cable TV.'
                        control={
                            <TextField
                                select
                                size='small'
                                value={form.type}
                                onChange={e => set('type', e.target.value as TunerType)}
                                disabled={isEditing}
                                sx={fieldSx}
                            >
                                {typeOptions.map(t => (
                                    <MenuItem key={t.Id ?? ''} value={t.Id ?? ''}>
                                        {t.Id === 'm3u' ? 'IPTV playlist (M3U)' : t.Name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        }
                    />
                    <KhyloSettingRow
                        title={isM3u ? 'Playlist address or file' : 'Tuner address'}
                        description={isM3u ? M3U_ADDRESS_HELP : HDHOMERUN_ADDRESS_HELP}
                        control={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...fieldSx }}>
                                <TextField
                                    size='small'
                                    value={form.url}
                                    onChange={e => set('url', e.target.value)}
                                    placeholder={isM3u ? 'https://… or a file on this server' : 'Tuner address'}
                                    fullWidth
                                    slotProps={isM3u ? {
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position='end'>
                                                    <IconButton size='small' onClick={() => setIsBrowsing(true)} aria-label='Choose a file on the server'>
                                                        <FolderOpenIcon fontSize='small' />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }
                                    } : undefined}
                                />
                                {!isM3u && !isEditing && (
                                    <Button
                                        size='small'
                                        startIcon={isDiscovering ? <CircularProgress size={14} /> : <RadarIcon />}
                                        onClick={() => { discover().catch(() => undefined); }}
                                        disabled={isDiscovering}
                                        sx={{ alignSelf: 'flex-start', textTransform: 'none', color: KHYLO_COLORS.textSecondary }}
                                    >
                                        Find tuners on my network
                                    </Button>
                                )}
                                {discovered?.length === 0 && (
                                    <Typography sx={{ fontSize: '0.8rem', color: KHYLO_COLORS.textMuted }}>No new HDHomeRun devices found.</Typography>
                                )}
                                {discovered?.map(d => (
                                    <Button
                                        key={d.DeviceId ?? d.Url}
                                        variant='outlined'
                                        size='small'
                                        onClick={() => setForm(prev => ({ ...prev, url: d.Url ?? '', deviceId: d.DeviceId ?? '', friendlyName: prev.friendlyName || d.FriendlyName || '' }))}
                                        sx={{ justifyContent: 'flex-start', textTransform: 'none', borderColor: KHYLO_COLORS.borderDefault, color: KHYLO_COLORS.textPrimary }}
                                    >
                                        {d.FriendlyName || 'HDHomeRun'} · {d.Url}
                                    </Button>
                                ))}
                            </Box>
                        }
                    />
                    <KhyloSettingRow
                        title='Name'
                        description='Optional. Shown in the admin list so you can tell tuners apart.'
                        control={
                            <TextField size='small' value={form.friendlyName} onChange={e => set('friendlyName', e.target.value)} placeholder={isM3u ? 'My IPTV' : 'Living room HDHomeRun'} sx={fieldSx} />
                        }
                    />
                    {isM3u && (
                        <KhyloSettingRow
                            title='Test playlist'
                            description='Downloads the playlist to check it works. Big IPTV playlists can take a minute.'
                            control={<PlaylistTestControl test={test} onTest={() => { runTest().catch(() => undefined); }} />}
                        />
                    )}
                </KhyloSettingSection>

                {isNewPlaylist && testedPlaylist && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                            <Box sx={{ flex: '1 1 300px' }}>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', color: KHYLO_COLORS.textPrimary }}>CHANNELS</Typography>
                                <Typography sx={{ fontSize: '0.82rem', color: KHYLO_COLORS.textMuted }}>
                                    Pick what to bring into Live TV. Only these are imported, get guide listings and show up for viewers. You can change this later from Live TV.
                                </Typography>
                            </Box>
                            <KhyloStatusBadge label={`${selectedCount.toLocaleString()} selected`} color={countColor} />
                        </Box>
                        {selectedCount > LARGE_LINEUP && (
                            <Alert severity='warning' sx={{ mb: 2 }}>
                                {`${selectedCount.toLocaleString()} channels is a lot. The guide takes longer to refresh and uses more space; most people pick a few hundred.`}
                            </Alert>
                        )}
                        <ChannelPicker playlist={testedPlaylist} selection={selection} onSelectionChange={setSelection} />
                    </Box>
                )}

                <GuideSection
                    visible={isM3u}
                    value={guidePath}
                    onChange={setGuidePath}
                    onBrowse={() => setIsBrowsingGuide(true)}
                    uploading={isUploadingGuide}
                    onUpload={file => { uploadGuide(file).catch(() => undefined); }}
                />

                <KhyloSettingSection title='Streaming'>
                    {isM3u && (
                        <KhyloSettingRow
                            title='Simultaneous streams'
                            description='How many channels your IPTV plan lets you watch at once. 0 means no limit.'
                            control={<TextField size='small' type='number' value={form.tunerCount} onChange={e => set('tunerCount', e.target.value)} slotProps={{ htmlInput: { min: 0 } }} sx={{ width: 120 }} />}
                        />
                    )}
                    <KhyloSettingRow
                        title='Fallback bitrate (Mbps)'
                        description={'Used when a channel doesn\'t report its quality. Lower it if channels stutter on slow connections.'}
                        control={<TextField size='small' type='number' value={form.fallbackBitrateMbps} onChange={e => set('fallbackBitrateMbps', e.target.value)} slotProps={{ htmlInput: { min: 1 } }} sx={{ width: 120 }} />}
                    />
                    {isM3u && (
                        <KhyloSettingRow
                            title='User agent'
                            description='Optional. Some IPTV providers only work when requests identify as a specific player.'
                            control={<TextField size='small' value={form.userAgent} onChange={e => set('userAgent', e.target.value)} placeholder='Leave empty for default' sx={fieldSx} />}
                        />
                    )}
                    {!isM3u && (
                        <>
                            <KhyloSettingRow
                                title='Favorite channels only'
                                description='Only bring in channels marked as favorites on the HDHomeRun.'
                                control={<Switch checked={form.importFavoritesOnly} onChange={(_, v) => set('importFavoritesOnly', v)} />}
                            />
                            <KhyloSettingRow
                                title='Let the tuner convert video'
                                description='Supported HDHomeRun models can convert streams themselves, which saves work on this server.'
                                control={<Switch checked={form.allowHwTranscoding} onChange={(_, v) => set('allowHwTranscoding', v)} />}
                            />
                        </>
                    )}
                </KhyloSettingSection>

                {isM3u && (
                    <KhyloSettingSection title='Troubleshooting' description='Leave these alone unless channels have problems.'>
                        <KhyloSettingRow
                            title='Share streams between viewers'
                            description='Several people watching the same channel use one connection to your provider.'
                            control={<Switch checked={form.allowStreamSharing} onChange={(_, v) => set('allowStreamSharing', v)} />}
                        />
                        <KhyloSettingRow
                            title='Ignore stream timestamps'
                            description='Fixes channels with missing sound or out-of-sync audio.'
                            control={<Switch checked={form.ignoreDts} onChange={(_, v) => set('ignoreDts', v)} />}
                        />
                        <KhyloSettingRow
                            title='Read at native frame rate'
                            description='Fixes channels that stop playing after a few seconds.'
                            control={<Switch checked={form.readAtNativeFramerate} onChange={(_, v) => set('readAtNativeFramerate', v)} />}
                        />
                        <KhyloSettingRow
                            title='Loop short streams'
                            description='For providers whose streams only contain a few seconds at a time. Turning this on when not needed can cause problems.'
                            control={<Switch checked={form.enableStreamLooping} onChange={(_, v) => set('enableStreamLooping', v)} />}
                        />
                        <KhyloSettingRow
                            title='Allow fMP4 for HEVC and HDR'
                            description='Lets HEVC and HDR channels play without conversion. Not every provider supports it.'
                            control={<Switch checked={form.allowFmp4} onChange={(_, v) => set('allowFmp4', v)} />}
                        />
                    </KhyloSettingSection>
                )}

                <KhyloStickyActionBar
                    isDirty={isDirty || !isEditing}
                    isSaving={isSaving}
                    onSave={() => { save().catch(() => undefined); }}
                    onDiscard={() => navigate('/dashboard/livetv')}
                    saveLabel={saveLabel}
                    saveDisabled={isNewPlaylist && selectedCount === 0}
                    statusMessage={actionMessage}
                />

                <KhyloServerFileBrowserModal
                    open={isBrowsing}
                    initialPath={form.url && !form.url.startsWith('http') ? form.url : undefined}
                    onClose={() => setIsBrowsing(false)}
                    onSelect={path => {
                        set('url', path);
                        setIsBrowsing(false);
                    }}
                    title='Choose a playlist file'
                    includeFiles
                    filterExtensions={[ '.m3u', '.m3u8' ]}
                />

                <KhyloServerFileBrowserModal
                    open={isBrowsingGuide}
                    initialPath={guidePath && !guidePath.startsWith('http') ? guidePath : undefined}
                    onClose={() => setIsBrowsingGuide(false)}
                    onSelect={path => {
                        setGuidePath(path);
                        setIsBrowsingGuide(false);
                    }}
                    title='Choose a guide file'
                    includeFiles
                    filterExtensions={[ '.xml', '.gz', '.xmltv' ]}
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LiveTvTunerPage';
export default Component;
