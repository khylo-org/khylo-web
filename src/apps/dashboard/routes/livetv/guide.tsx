import React, { type FC, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Api } from '@khylo/sdk';
import type { ListingsProviderInfo } from '@khylo/sdk/lib/generated-client/models/listings-provider-info';
import type { LiveTvOptions } from '@khylo/sdk/lib/generated-client/models/live-tv-options';
import type { NameIdPair } from '@khylo/sdk/lib/generated-client/models/name-id-pair';
import type { TunerHostInfo } from '@khylo/sdk/lib/generated-client/models/tuner-host-info';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import { KhyloServerFileBrowserModal } from '../../components/browser/KhyloServerFileBrowserModal';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingRow,
    KhyloSettingSection,
    KhyloStickyActionBar
} from '../../components/ui';

type ProviderType = 'xmltv' | 'schedulesdirect';

const fieldSx = { width: { xs: '100%', sm: 360 } };

const toList = (value: string) => value.split(/[|,]/).map(v => v.trim()).filter(Boolean);
const fromList = (value?: string[] | null) => (value ?? []).join(', ');

interface Country {
    name: string;
    value: string;
}

const XMLTV_SUBTITLE = 'The TV guide link (EPG) from your IPTV provider, usually given alongside the M3U playlist. It fills the guide with what\'s on and what\'s next.';
const SCHEDULES_DIRECT_SUBTITLE = 'Guide listings for antenna and cable TV in North America, from a Schedules Direct subscription.';

/** Schedules Direct countries, by name. */
const useSchedulesDirectCountries = (api: Api | undefined, enabled: boolean) => useQuery({
    queryKey: ['LiveTvSdCountries'],
    queryFn: async () => {
        const response = await api!.axiosInstance.get<Record<string, { fullName: string; shortName: string }[]>>(
            `${api!.basePath}/LiveTv/ListingProviders/SchedulesDirect/Countries`,
            { headers: { Authorization: api!.authorizationHeader } }
        );
        const list: Country[] = [];
        for (const [ region, entries ] of Object.entries(response.data)) {
            if (region !== 'ZZZ') list.push(...entries.map(c => ({ name: c.fullName, value: c.shortName })));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: Boolean(api && enabled)
});

/** The server's default category names, which new XMLTV sources start from. */
const useDefaultListingProvider = (api: Api | undefined, enabled: boolean) => useQuery({
    queryKey: ['LiveTvDefaultListingProvider'],
    queryFn: async () => (await getLiveTvApi(api!).getDefaultListingProvider()).data,
    enabled: Boolean(api && enabled)
});

interface TunerPickerProps {
    tuners: TunerHostInfo[];
    allTuners: boolean;
    enabledTuners: string[];
    onAllTunersChange: (value: boolean) => void;
    onToggle: (id: string, checked: boolean) => void;
}

/** Which tuners a guide source provides listings for. */
const TunerPicker: FC<TunerPickerProps> = ({ tuners, allTuners, enabledTuners, onAllTunersChange, onToggle }) => {
    if (tuners.length === 0) return null;
    return (
        <KhyloSettingSection title='Tuners' description='Which tuners this guide provides listings for.'>
            <KhyloSettingRow
                title='All tuners'
                description='Use this guide for every tuner, including ones you add later.'
                control={<Switch checked={allTuners} onChange={(_, v) => onAllTunersChange(v)} />}
            />
            {!allTuners && (
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', flexDirection: 'column' }}>
                    {tuners.map(t => (
                        <FormControlLabel
                            key={t.Id}
                            control={<Checkbox checked={enabledTuners.includes(t.Id ?? '')} onChange={(_, checked) => onToggle(t.Id ?? '', checked)} />}
                            label={t.FriendlyName || t.Url}
                        />
                    ))}
                </Box>
            )}
        </KhyloSettingSection>
    );
};

/**
 * What the form starts from: the saved source when editing, the server's defaults for a new XMLTV
 * source, nothing for a new Schedules Direct account. Null while that isn't loaded yet.
 */
const getInitialSource = (
    providerId: string | null,
    existing: ListingsProviderInfo | undefined,
    isXmltv: boolean,
    defaults: ListingsProviderInfo | undefined
): ListingsProviderInfo | undefined | null => {
    if (providerId) return existing ?? null;
    if (isXmltv) return defaults ?? null;
    return undefined;
};

/** The form's starting values from a saved guide source (or the server's defaults for a new one). */
const readSource = (source?: ListingsProviderInfo) => ({
    path: source?.Path ?? '',
    userAgent: source?.UserAgent ?? '',
    movies: fromList(source?.MovieCategories),
    sports: fromList(source?.SportsCategories),
    kids: fromList(source?.KidsCategories),
    news: fromList(source?.NewsCategories),
    moviePrefix: source?.MoviePrefix ?? '',
    username: source?.Username ?? '',
    country: source?.Country ?? '',
    zipCode: source?.ZipCode ?? '',
    listingsId: source?.ListingsId ?? '',
    allTuners: source?.EnableAllTuners ?? true,
    enabledTuners: source?.EnabledTuners ?? []
});

export const Component: FC = () => {
    const { api } = useApi();
    const navigate = useNavigate();
    const [ searchParams ] = useSearchParams();
    const type: ProviderType = searchParams.get('type')?.toLowerCase() === 'schedulesdirect' ? 'schedulesdirect' : 'xmltv';
    const [ providerId, setProviderId ] = useState<string | null>(searchParams.get('id'));
    const isXmltv = type === 'xmltv';

    const { data: config, isPending } = useNamedConfiguration<LiveTvOptions>('livetv');
    const tuners = useMemo(() => config?.TunerHosts ?? [], [config]);
    const existing = useMemo(() => config?.ListingProviders?.find(p => p.Id === providerId), [ config, providerId ]);

    // XMLTV
    const [ path, setPath ] = useState('');
    const [ userAgent, setUserAgent ] = useState('');
    const [ movies, setMovies ] = useState('');
    const [ sports, setSports ] = useState('');
    const [ kids, setKids ] = useState('');
    const [ news, setNews ] = useState('');
    const [ moviePrefix, setMoviePrefix ] = useState('');
    // Schedules Direct
    const [ username, setUsername ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ country, setCountry ] = useState('');
    const [ zipCode, setZipCode ] = useState('');
    const [ lineups, setLineups ] = useState<NameIdPair[] | null>(null);
    const [ listingsId, setListingsId ] = useState('');
    // Both
    const [ allTuners, setAllTuners ] = useState(true);
    const [ enabledTuners, setEnabledTuners ] = useState<string[]>([]);

    const [ isBusy, setIsBusy ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);
    const [ isBrowsing, setIsBrowsing ] = useState(false);
    const [ loaded, setLoaded ] = useState(false);

    const { data: defaults } = useDefaultListingProvider(api, isXmltv && !providerId);
    const { data: countries } = useSchedulesDirectCountries(api, !isXmltv);

    useEffect(() => {
        if (loaded) return;
        const source = getInitialSource(providerId, existing, isXmltv, defaults);
        if (source === null) return;

        const values = readSource(source);
        setPath(values.path);
        setUserAgent(values.userAgent);
        setMovies(values.movies);
        setSports(values.sports);
        setKids(values.kids);
        setNews(values.news);
        setMoviePrefix(values.moviePrefix);
        setUsername(values.username);
        setCountry(values.country);
        setZipCode(values.zipCode);
        setListingsId(values.listingsId);
        setAllTuners(values.allTuners);
        setEnabledTuners(values.enabledTuners);
        setLoaded(true);
    }, [ existing, defaults, providerId, isXmltv, loaded ]);

    const toggleTuner = (id: string, checked: boolean) => {
        setEnabledTuners(prev => (checked ? [ ...prev, id ] : prev.filter(other => other !== id)));
    };

    const finish = async () => {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        navigate('/dashboard/livetv');
    };

    const saveXmltv = async () => {
        if (!api) return;
        if (!path.trim()) {
            setError('Enter the guide address or file.');
            return;
        }
        setIsBusy(true);
        setError(null);
        try {
            await getLiveTvApi(api).addListingProvider({
                validateListings: true,
                listingsProviderInfo: {
                    ...(existing ?? {}),
                    Id: providerId ?? undefined,
                    Type: 'xmltv',
                    Path: path.trim(),
                    UserAgent: userAgent.trim() || null,
                    MovieCategories: toList(movies),
                    SportsCategories: toList(sports),
                    KidsCategories: toList(kids),
                    NewsCategories: toList(news),
                    MoviePrefix: moviePrefix.trim() || null,
                    EnableAllTuners: allTuners,
                    EnabledTuners: allTuners ? [] : enabledTuners
                }
            });
            await finish();
        } catch {
            setError('Couldn\'t read that guide. Check the address and try again.');
            setIsBusy(false);
        }
    };

    const signIn = async () => {
        if (!api || !username.trim() || !password) {
            setError('Enter your Schedules Direct username and password.');
            return;
        }
        setIsBusy(true);
        setError(null);
        try {
            const result = (await getLiveTvApi(api).addListingProvider({
                validateLogin: true,
                listingsProviderInfo: {
                    ...(existing ?? {}),
                    Id: providerId ?? undefined,
                    Type: 'SchedulesDirect',
                    Username: username.trim(),
                    Password: password,
                    EnableAllTuners: true
                }
            })).data;
            setProviderId(result.Id ?? null);
            setPassword('');
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        } catch {
            setError('Schedules Direct didn\'t accept that username and password.');
        } finally {
            setIsBusy(false);
        }
    };

    const findLineups = async () => {
        if (!api || !providerId || !country || !zipCode.trim()) return;
        setIsBusy(true);
        setError(null);
        try {
            const result = (await getLiveTvApi(api).getLineups({ id: providerId, type: 'SchedulesDirect', location: zipCode.trim(), country })).data;
            setLineups(result);
            if (!result.some(l => l.Id === listingsId)) setListingsId(result[0]?.Id ?? '');
        } catch {
            setError('Couldn\'t find lineups for that location.');
            setLineups([]);
        } finally {
            setIsBusy(false);
        }
    };

    const saveSchedulesDirect = async () => {
        if (!api || !existing || !listingsId) {
            setError('Pick a lineup first.');
            return;
        }
        setIsBusy(true);
        setError(null);
        try {
            await getLiveTvApi(api).addListingProvider({
                validateListings: true,
                listingsProviderInfo: {
                    ...existing,
                    ZipCode: zipCode.trim(),
                    Country: country,
                    ListingsId: listingsId,
                    EnableAllTuners: allTuners,
                    EnabledTuners: allTuners ? [] : enabledTuners
                }
            });
            await finish();
        } catch {
            setError('Couldn\'t save the lineup. Try again.');
            setIsBusy(false);
        }
    };

    if (isPending || !loaded) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    const isSignedIn = !isXmltv && Boolean(existing?.Username);

    const tunerPicker = (
        <TunerPicker
            tuners={tuners}
            allTuners={allTuners}
            enabledTuners={enabledTuners}
            onAllTunersChange={setAllTuners}
            onToggle={toggleTuner}
        />
    );

    return (
        <Page id='liveTvGuidePage' title='Guide' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1000}>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Live TV', to: '/dashboard/livetv' }, { label: isXmltv ? 'XMLTV guide' : 'Schedules Direct' } ]}
                    title={isXmltv ? 'XMLTV guide' : 'Schedules Direct'}
                    subtitle={isXmltv ? XMLTV_SUBTITLE : SCHEDULES_DIRECT_SUBTITLE}
                />

                {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

                {isXmltv ? (
                    <>
                        <KhyloSettingSection title='Source'>
                            <KhyloSettingRow
                                title='Guide address or file'
                                description='The XMLTV / EPG link from your provider (often ending in .xml or .xml.gz), or a file on this server.'
                                control={
                                    <TextField
                                        size='small'
                                        value={path}
                                        onChange={e => setPath(e.target.value)}
                                        placeholder='https://… or a file on this server'
                                        sx={fieldSx}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position='end'>
                                                        <IconButton size='small' onClick={() => setIsBrowsing(true)} aria-label='Choose a file on the server'>
                                                            <FolderOpenIcon fontSize='small' />
                                                        </IconButton>
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                    />
                                }
                            />
                            <KhyloSettingRow
                                title='User agent'
                                description='Optional. Only needed if your provider requires a specific player.'
                                control={<TextField size='small' value={userAgent} onChange={e => setUserAgent(e.target.value)} placeholder='Leave empty for default' sx={fieldSx} />}
                            />
                        </KhyloSettingSection>

                        <KhyloSettingSection title='Categories' description='Guide categories that sort programs into Movies, Sports, Kids and News. Separate names with commas.'>
                            <KhyloSettingRow title='Movies' control={<TextField size='small' value={movies} onChange={e => setMovies(e.target.value)} sx={fieldSx} />} />
                            <KhyloSettingRow title='Sports' control={<TextField size='small' value={sports} onChange={e => setSports(e.target.value)} sx={fieldSx} />} />
                            <KhyloSettingRow title='Kids' control={<TextField size='small' value={kids} onChange={e => setKids(e.target.value)} sx={fieldSx} />} />
                            <KhyloSettingRow title='News' control={<TextField size='small' value={news} onChange={e => setNews(e.target.value)} sx={fieldSx} />} />
                            <KhyloSettingRow
                                title='Movie title prefix'
                                description='Optional. Text some guides put before movie titles, removed when shown.'
                                control={<TextField size='small' value={moviePrefix} onChange={e => setMoviePrefix(e.target.value)} sx={{ width: 160 }} />}
                            />
                        </KhyloSettingSection>
                        {tunerPicker}
                    </>
                ) : (
                    <>
                        <KhyloSettingSection title='Account'>
                            <KhyloSettingRow
                                title='Username'
                                control={<TextField size='small' value={username} onChange={e => setUsername(e.target.value)} autoComplete='username' sx={fieldSx} />}
                            />
                            <KhyloSettingRow
                                title='Password'
                                description={isSignedIn ? 'Signed in. Enter the password again only to change accounts.' : undefined}
                                control={<TextField size='small' type='password' value={password} onChange={e => setPassword(e.target.value)} autoComplete='current-password' sx={fieldSx} />}
                            />
                            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant='outlined'
                                    size='small'
                                    onClick={() => { signIn().catch(() => undefined); }}
                                    disabled={isBusy}
                                    sx={{ textTransform: 'none', borderColor: KHYLO_COLORS.borderStrong, color: KHYLO_COLORS.textPrimary }}
                                >
                                    {isSignedIn ? 'Sign in again' : 'Sign in'}
                                </Button>
                            </Box>
                        </KhyloSettingSection>

                        {isSignedIn && (
                            <KhyloSettingSection title='Lineup' description='Pick your area, then the lineup that matches your antenna or cable provider.'>
                                <KhyloSettingRow
                                    title='Country'
                                    control={
                                        <TextField select size='small' value={country} onChange={e => setCountry(e.target.value)} sx={fieldSx}>
                                            {(countries ?? []).map(c => <MenuItem key={c.value} value={c.value}>{c.name}</MenuItem>)}
                                        </TextField>
                                    }
                                />
                                <KhyloSettingRow
                                    title='ZIP or postal code'
                                    control={
                                        <Box sx={{ display: 'flex', gap: 1, ...fieldSx }}>
                                            <TextField size='small' value={zipCode} onChange={e => setZipCode(e.target.value)} fullWidth />
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                onClick={() => { findLineups().catch(() => undefined); }}
                                                disabled={isBusy || !country || !zipCode.trim()}
                                                sx={{ textTransform: 'none', whiteSpace: 'nowrap', borderColor: KHYLO_COLORS.borderStrong, color: KHYLO_COLORS.textPrimary }}
                                            >
                                                Find lineups
                                            </Button>
                                        </Box>
                                    }
                                />
                                {lineups && (
                                    <KhyloSettingRow
                                        title='Lineup'
                                        control={
                                            <TextField select size='small' value={listingsId} onChange={e => setListingsId(e.target.value)} sx={fieldSx} disabled={lineups.length === 0}>
                                                {lineups.map(l => <MenuItem key={l.Id ?? ''} value={l.Id ?? ''}>{l.Name}</MenuItem>)}
                                            </TextField>
                                        }
                                    />
                                )}
                            </KhyloSettingSection>
                        )}
                        {isSignedIn && tunerPicker}
                    </>
                )}

                {(isXmltv || isSignedIn) && (
                    <KhyloStickyActionBar
                        isDirty
                        isSaving={isBusy}
                        onSave={() => { (isXmltv ? saveXmltv() : saveSchedulesDirect()).catch(() => undefined); }}
                        onDiscard={() => navigate('/dashboard/livetv')}
                        saveLabel={providerId && !isXmltv ? 'Save lineup' : 'Save guide'}
                    />
                )}

                <KhyloServerFileBrowserModal
                    open={isBrowsing}
                    onClose={() => setIsBrowsing(false)}
                    onSelect={selected => {
                        setPath(selected);
                        setIsBrowsing(false);
                    }}
                    title='Choose a guide file'
                    includeFiles
                    filterExtensions={[ '.xml', '.gz', '.xmltv' ]}
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LiveTvGuidePage';
export default Component;
