import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

import { ChannelPicker } from 'apps/dashboard/features/livetv/components/ChannelPicker';
import {
    type PlaylistInfo,
    type Selection,
    LARGE_LINEUP,
    countSelected,
    groupChannels,
    toSelectionBody
} from 'apps/dashboard/features/livetv/utils/channelSelection';
import { hasAdmin, setupRequest, setupUpload, signInWith } from '../setupSession';

/* ── Shapes from the server ─────────────────────────────────────────────── */

interface HardwareOption { Type: string; Name: string; Works: boolean }
interface HardwareDetection { Options: HardwareOption[]; Current: string }
interface Profile { Id: string; Name: string; IsKids: boolean }
interface KidsLevel { Score: number; Ratings: string[] }
interface KidsOptions { Levels: KidsLevel[]; OwnerHasPin: boolean }
interface SourceUser { Id: string; Name: string; NeedsPin: boolean }
interface Tuner { Url: string; FriendlyName?: string; DeviceId?: string; Type?: string }

/* ── Small building blocks ─────────────────────────────────────────────── */

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

const StepHeader: FC<{ title: string; text: string }> = ({ title, text }) => (
    <Box sx={{ mb: 3 }}>
        <Typography component='h1' sx={{ fontSize: '1.6rem', fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Typography sx={{ opacity: 0.75, lineHeight: 1.6 }}>{text}</Typography>
    </Box>
);

interface StepProps {
    onNext: () => void;
}

/* ── 1. Playback ───────────────────────────────────────────────────────── */

const AWAY_LIMITS = [
    { value: 4_000_000, label: '4 Mbps · data saver' },
    { value: 8_000_000, label: '8 Mbps · sharp 1080p (recommended)' },
    { value: 15_000_000, label: '15 Mbps · high quality' },
    { value: 25_000_000, label: '25 Mbps · 4K' },
    { value: 0, label: 'No limit' }
];

const PlaybackStep: FC<StepProps> = ({ onNext }) => {
    const [ detection, setDetection ] = useState<HardwareDetection | null>(null);
    const [ hardware, setHardware ] = useState('none');
    const [ away, setAway ] = useState(8_000_000);
    const [ saving, setSaving ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    useEffect(() => {
        setupRequest<HardwareDetection>('GET', '/Khylo/Setup/Hardware')
            .then(d => {
                setDetection(d);
                setHardware(d.Options.find(o => o.Works)?.Type ?? 'none');
            })
            .catch(() => setDetection({ Options: [], Current: 'none' }));
        setupRequest<{ RemoteClientBitrateLimit?: number }>('GET', '/System/Configuration')
            .then(c => setAway(c.RemoteClientBitrateLimit ?? 8_000_000))
            .catch(() => { /* keep the default */ });
    }, []);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await setupRequest('POST', '/Khylo/Setup/Hardware', { Type: hardware, Name: '', Works: true });
            const config = await setupRequest<Record<string, unknown>>('GET', '/System/Configuration');
            await setupRequest('POST', '/System/Configuration', { ...config, RemoteClientBitrateLimit: away });
            onNext();
        } catch (e) {
            setError(errorText(e));
            setSaving(false);
        }
    };

    const working = detection?.Options.filter(o => o.Works) ?? [];

    return (
        <>
            <StepHeader
                title='Playback'
                text='When a TV or phone can’t play a file as it is, Khylo converts it on the fly. Graphics hardware does that far faster and quieter than the processor.'
            />
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Converting video</Typography>
            {!detection ? (
                <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 3 }}>
                    <CircularProgress size={18} />
                    <Typography sx={{ opacity: 0.75 }}>Checking what this computer has…</Typography>
                </Stack>
            ) : (
                <RadioGroup value={hardware} onChange={e => setHardware(e.target.value)} sx={{ mb: 3 }}>
                    {working.map(o => (
                        <FormControlLabel key={o.Type} value={o.Type} control={<Radio />} label={`${o.Name} (found)`} />
                    ))}
                    <FormControlLabel value='none' control={<Radio />} label='The processor (no graphics hardware)' />
                    {working.length === 0 && (
                        <Typography variant='body2' sx={{ opacity: 0.7, ml: 4 }}>
                            No graphics hardware Khylo can use was found. You can change this later in Dashboard → Transcoding.
                        </Typography>
                    )}
                </RadioGroup>
            )}

            <Typography sx={{ fontWeight: 600, mb: 1 }}>Watching away from home</Typography>
            <Typography variant='body2' sx={{ opacity: 0.75, mb: 1.5 }}>
                Phones and hotel Wi-Fi can’t always keep up with full quality. Away from home, video stays at this rate and music is sent at 256 kbps. At home you always get full quality.
            </Typography>
            <TextField select size='small' value={away} onChange={e => setAway(Number(e.target.value))} sx={{ minWidth: 320, mb: 2 }}>
                {AWAY_LIMITS.map(l => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
            </TextField>

            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <StepButtons onNext={() => { void save(); }} nextLabel={saving ? 'Saving…' : 'Next'} disabled={saving || !detection} />
        </>
    );
};

/* ── 2. Household ──────────────────────────────────────────────────────── */

const HouseholdStep: FC<StepProps & { onProfiles: (p: Profile[]) => void }> = ({ onNext, onProfiles }) => {
    const [ profiles, setProfiles ] = useState<Profile[]>([]);
    const [ kidsOptions, setKidsOptions ] = useState<KidsOptions | null>(null);
    const [ name, setName ] = useState('');
    const [ isKids, setIsKids ] = useState(false);
    const [ level, setLevel ] = useState<number | ''>('');
    const [ ownerPin, setOwnerPin ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const load = useCallback(async () => {
        const result = await setupRequest<{ Profiles: Profile[] }>('GET', '/Khylo/HomeProfiles');
        setProfiles(result.Profiles);
        onProfiles(result.Profiles);
    }, [onProfiles]);

    useEffect(() => {
        load().catch(e => setError(errorText(e)));
        setupRequest<KidsOptions>('GET', '/Khylo/HomeProfiles/KidsOptions').then(setKidsOptions).catch(() => { /* kids profiles need these */ });
    }, [load]);

    const add = async () => {
        setBusy(true);
        setError(null);
        try {
            await setupRequest('POST', '/Khylo/HomeProfiles', {
                Name: name.trim(),
                IsKids: isKids,
                MaxParentalRating: isKids ? level : null,
                AllowUnrated: false,
                AllowLiveTv: false,
                OwnerPin: isKids && !kidsOptions?.OwnerHasPin ? ownerPin : null
            });
            if (isKids && kidsOptions && !kidsOptions.OwnerHasPin) setKidsOptions({ ...kidsOptions, OwnerHasPin: true });
            setName('');
            setIsKids(false);
            setLevel('');
            await load();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const needsPin = isKids && kidsOptions && !kidsOptions.OwnerHasPin;
    const canAdd = name.trim() && (!isKids || level !== '') && (!needsPin || /^\d{4}$/.test(ownerPin));

    return (
        <>
            <StepHeader
                title='Your household'
                text='Give everyone at home their own profile, with their own Continue Watching, history and favorites. Kids profiles only show what you allow.'
            />
            {profiles.filter(p => p.Name).map(p => (
                <Typography key={p.Id} sx={{ mb: 0.5 }}>• {p.Name}{p.IsKids ? ' (kids)' : ''}</Typography>
            ))}
            <Stack spacing={1.5} sx={{ mt: 2, mb: 3, maxWidth: 420 }}>
                <TextField size='small' label='Name' value={name} onChange={e => setName(e.target.value)} />
                <FormControlLabel control={<Switch checked={isKids} onChange={e => setIsKids(e.target.checked)} />} label='Kids profile' />
                {isKids && (
                    <TextField select size='small' label='Can watch up to' value={level} onChange={e => setLevel(Number(e.target.value))}>
                        {(kidsOptions?.Levels ?? []).map(l => <MenuItem key={l.Score} value={l.Score}>{l.Ratings.join(', ')}</MenuItem>)}
                    </TextField>
                )}
                {needsPin && (
                    <TextField
                        size='small'
                        label='A 4-digit PIN for your own profile'
                        helperText='So kids can’t switch into your profile.'
                        value={ownerPin}
                        onChange={e => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                )}
                <Box>
                    <Button variant='outlined' disabled={!canAdd || busy} onClick={() => { void add(); }}>Add profile</Button>
                </Box>
            </Stack>
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <StepButtons onNext={onNext} nextLabel={profiles.length > 1 ? 'Next' : 'Skip for now'} />
        </>
    );
};

/* ── 3. Import ─────────────────────────────────────────────────────────── */

type Source = 'Plex' | 'Khylo';

const PLEX_TOKEN_HELP = 'In Plex Web, open any movie, choose ⋯ → Get Info → View XML; the token is the X-Plex-Token at the end of the address.';

const ImportStep: FC<StepProps & { profiles: Profile[]; adminId: string | null }> = ({ onNext, profiles, adminId }) => {
    const [ source, setSource ] = useState<Source | null>(null);
    const [ url, setUrl ] = useState('');
    const [ token, setToken ] = useState('');
    const [ users, setUsers ] = useState<SourceUser[] | null>(null);
    const [ targets, setTargets ] = useState<Record<string, string>>({});
    const [ pins, setPins ] = useState<Record<string, string>>({});
    const [ busy, setBusy ] = useState(false);
    const [ started, setStarted ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const kind = source === 'Plex' ? 'Plex' : 'Khylo';
    const people = profiles.filter(p => p.Id);

    const connect = async () => {
        setBusy(true);
        setError(null);
        try {
            const found = await setupRequest<SourceUser[]>('POST', '/Khylo/Import/Users', { Source: kind, Url: url, Token: token });
            setUsers(found);
            const initial: Record<string, string> = {};
            found.forEach((u, i) => {
                const same = people.find(p => p.Name.toLowerCase() === u.Name.toLowerCase());
                initial[u.Id] = same?.Id ?? (i === 0 && adminId ? adminId : '');
            });
            setTargets(initial);
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const start = async () => {
        if (!users) return;
        setBusy(true);
        setError(null);
        try {
            await setupRequest('POST', '/Khylo/Import/Start', {
                Source: kind,
                Url: url,
                Token: token,
                DryRun: false,
                Users: users
                    .filter(u => targets[u.Id])
                    .map(u => ({ SourceUserId: u.Id, SourceUserName: u.Name, KhyloUserId: targets[u.Id], Pin: pins[u.Id] || null }))
            });
            setStarted(true);
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <StepHeader
                title='Moving from Plex or another server?'
                text='Bring everyone’s history with you: what they’ve watched, where they stopped, the music they play and their favorites. Nothing newer in Khylo is ever replaced.'
            />
            <ToggleButtonGroup exclusive size='small' value={source} onChange={(_, v: Source | null) => setSource(v)} sx={{ mb: 2 }}>
                <ToggleButton value='Plex'>Plex</ToggleButton>
                <ToggleButton value='Khylo'>Another server</ToggleButton>
            </ToggleButtonGroup>

            {source && !started && (
                <Stack spacing={1.5} sx={{ maxWidth: 560, mb: 2 }}>
                    <TextField size='small' label='Server address' placeholder={source === 'Plex' ? '192.168.1.10:32400' : '192.168.1.10:8096'} value={url} onChange={e => setUrl(e.target.value)} />
                    <TextField
                        size='small'
                        type='password'
                        label={source === 'Plex' ? 'Plex token' : 'API key'}
                        value={token}
                        onChange={e => setToken(e.target.value)}
                        helperText={source === 'Plex' ? PLEX_TOKEN_HELP : `In ${source}, add an API key under Dashboard → API Keys.`}
                    />
                    <Box>
                        <Button variant='outlined' disabled={!url.trim() || !token.trim() || busy} onClick={() => { void connect(); }}>
                            {busy && !users ? 'Connecting…' : 'Connect'}
                        </Button>
                    </Box>
                </Stack>
            )}

            {users && !started && (
                <Stack spacing={1.25} sx={{ mb: 2 }}>
                    <Typography sx={{ fontWeight: 600 }}>Who goes where</Typography>
                    {users.map(u => (
                        <Stack key={u.Id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                            <Typography sx={{ width: 180 }}>{u.Name}</Typography>
                            <TextField select size='small' value={targets[u.Id] ?? ''} onChange={e => setTargets(t => ({ ...t, [u.Id]: e.target.value }))} sx={{ minWidth: 220 }}>
                                <MenuItem value=''>Don’t import</MenuItem>
                                {people.map(p => <MenuItem key={p.Id} value={p.Id}>{p.Name}</MenuItem>)}
                            </TextField>
                            {u.NeedsPin && (
                                <TextField size='small' type='password' label='Their Plex PIN' value={pins[u.Id] ?? ''} onChange={e => setPins(p => ({ ...p, [u.Id]: e.target.value }))} sx={{ width: 150 }} />
                            )}
                        </Stack>
                    ))}
                    <Typography variant='body2' sx={{ opacity: 0.7 }}>Need someone else? Go back and add a profile for them.</Typography>
                    <Box>
                        <Button variant='contained' disabled={busy || !Object.values(targets).some(Boolean)} onClick={() => { void start(); }}>Import</Button>
                    </Box>
                </Stack>
            )}

            {started && (
                <Alert severity='success' sx={{ mb: 2 }}>
                    Importing in the background. Carry on with setup; you can see how it went in Dashboard → Import Watch History.
                </Alert>
            )}
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <StepButtons onNext={onNext} nextLabel={started ? 'Next' : 'Skip for now'} />
        </>
    );
};

/* ── 4. Khylo TV ───────────────────────────────────────────────────────── */

const KhyloTvStep: FC<StepProps> = ({ onNext }) => {
    const [ enabled, setEnabled ] = useState(true);
    const [ saving, setSaving ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    useEffect(() => {
        setupRequest<{ Enabled: boolean }>('GET', '/LiveChannels/Status').then(s => setEnabled(s.Enabled)).catch(() => { /* default on */ });
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            await setupRequest('POST', '/LiveChannels/Admin/Enabled', { Enabled: enabled });
            onNext();
        } catch (e) {
            setError(errorText(e));
            setSaving(false);
        }
    };

    return (
        <>
            <StepHeader
                title='Khylo TV'
                text='Always-on channels made from your own movies and shows: Sitcoms, Classic TV, Kids TV, ’90s Movies and more. Tune in and join whatever’s on, like real TV. Nothing streams until someone watches.'
            />
            <FormControlLabel control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />} label='Make Khylo TV channels from my library' sx={{ mb: 3 }} />
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <StepButtons onNext={() => { void save(); }} nextLabel={saving ? 'Saving…' : 'Next'} disabled={saving} />
        </>
    );
};

/* ── 5. Live TV ────────────────────────────────────────────────────────── */

const emptySelection = (): Selection => ({ groups: new Set(), included: new Set(), excluded: new Set() });

const LiveTvStep: FC<StepProps> = ({ onNext }) => {
    const [ kind, setKind ] = useState<'none' | 'iptv' | 'antenna'>('none');
    const [ url, setUrl ] = useState('');
    const [ guideUrl, setGuideUrl ] = useState('');
    const [ playlist, setPlaylist ] = useState<PlaylistInfo | null>(null);
    const [ selection, setSelection ] = useState<Selection>(emptySelection);
    const [ tuners, setTuners ] = useState<Tuner[] | null>(null);
    const [ busy, setBusy ] = useState(false);
    const [ done, setDone ] = useState<string | null>(null);
    const [ error, setError ] = useState<string | null>(null);

    const test = async () => {
        setBusy(true);
        setError(null);
        try {
            const result = await setupRequest<PlaylistInfo>('POST', '/LiveTv/TunerHosts/TestPlaylist', { Type: 'm3u', Url: url });
            setPlaylist(result);
            setSelection(emptySelection());
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const saveIptv = async () => {
        if (!playlist) return;
        setBusy(true);
        setError(null);
        try {
            await setupRequest('POST', '/LiveTv/TunerHosts', { Type: 'm3u', Url: url, ...toSelectionBody(playlist, selection) });
            if (guideUrl.trim()) {
                await setupRequest('POST', '/LiveTv/ListingProviders', { Type: 'xmltv', Path: guideUrl.trim(), EnableAllTuners: true });
            }
            setDone('Your channels are being added, and the guide fills in over the next few minutes.');
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const uploadGuide = async (file: File) => {
        setBusy(true);
        setError(null);
        try {
            const saved = await setupUpload<{ Path: string }>('/LiveTv/ListingProviders/Xmltv/Upload', file);
            setGuideUrl(saved.Path);
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const discover = async () => {
        setBusy(true);
        setError(null);
        try {
            const found = await setupRequest<Tuner[]>('GET', '/LiveTv/Tuners/Discover?newDevicesOnly=true');
            setTuners(found.filter(t => t.Type === 'hdhomerun'));
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const addTuner = async (tuner: Tuner) => {
        setBusy(true);
        try {
            await setupRequest('POST', '/LiveTv/TunerHosts', { Type: 'hdhomerun', Url: tuner.Url, DeviceId: tuner.DeviceId, FriendlyName: tuner.FriendlyName });
            setDone(`${tuner.FriendlyName ?? 'Your tuner'} was added. Add a program guide later under Dashboard → Live TV.`);
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    const total = useMemo(() => {
        if (!playlist) return 0;
        const groups = groupChannels(playlist);
        return countSelected(groups.live.concat(groups.other), selection);
    }, [ playlist, selection ]);

    const noun = total === 1 ? 'channel' : 'channels';

    return (
        <>
            <StepHeader
                title='Live TV'
                text='Watch real live TV with a program guide, recording and Multi View, from your own TV service.'
            />
            <RadioGroup value={kind} onChange={e => setKind(e.target.value as typeof kind)} sx={{ mb: 2 }}>
                <FormControlLabel value='none' control={<Radio />} label='I don’t have a TV service' />
                <FormControlLabel value='iptv' control={<Radio />} label='An IPTV subscription (M3U playlist)' />
                <FormControlLabel value='antenna' control={<Radio />} label='An antenna or cable tuner (HDHomeRun)' />
            </RadioGroup>

            {done && <Alert severity='success' sx={{ mb: 2 }}>{done}</Alert>}

            {kind === 'iptv' && !done && (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Stack direction='row' spacing={1} alignItems='flex-start'>
                        <TextField
                            size='small'
                            fullWidth
                            label='Playlist address'
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            helperText='The M3U link from your provider. Nothing is added until you choose your channels.'
                        />
                        <Button variant='outlined' disabled={!url.trim() || busy} onClick={() => { void test(); }} sx={{ minWidth: 150, height: 40, whiteSpace: 'nowrap' }}>
                            {busy && !playlist ? 'Reading…' : 'Load channels'}
                        </Button>
                    </Stack>

                    {playlist && (
                        <>
                            <Typography variant='body2' sx={{ opacity: 0.7 }}>
                                {`${playlist.TotalCount.toLocaleString()} entries found. Search for a channel or group, or tick a whole group, then add what you picked. Movies, series and adult channels are set aside at the bottom.`}
                            </Typography>
                            <Box sx={{ maxHeight: '48vh', overflowY: 'auto', pr: 0.5 }}>
                                <ChannelPicker playlist={playlist} selection={selection} onSelectionChange={setSelection} />
                            </Box>
                            {total > LARGE_LINEUP && (
                                <Alert severity='warning'>{`${total.toLocaleString()} channels is a lot. The guide takes longer to refresh; most people pick a few hundred.`}</Alert>
                            )}
                            <Stack direction='row' spacing={1} alignItems='flex-start'>
                                <TextField
                                    size='small'
                                    fullWidth
                                    label='Program guide address or file (XMLTV, optional)'
                                    value={guideUrl}
                                    onChange={e => setGuideUrl(e.target.value)}
                                    helperText='The guide link from your provider, or upload the file.'
                                />
                                <Button component='label' variant='outlined' color='inherit' disabled={busy} sx={{ minWidth: 150, height: 40, whiteSpace: 'nowrap' }}>
                                    Upload file
                                    <input
                                        hidden
                                        type='file'
                                        accept='.xml,.gz,.xmltv'
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            if (file) void uploadGuide(file);
                                        }}
                                    />
                                </Button>
                            </Stack>
                            <Box>
                                <Button variant='contained' disabled={!total || busy} onClick={() => { void saveIptv(); }}>
                                    {busy ? 'Adding…' : `Add ${total.toLocaleString()} ${noun}`}
                                </Button>
                            </Box>
                        </>
                    )}
                </Stack>
            )}

            {kind === 'antenna' && !done && (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Button variant='outlined' disabled={busy} onClick={() => { void discover(); }}>{busy ? 'Searching…' : 'Find tuners on my network'}</Button>
                    </Box>
                    {tuners?.length === 0 && <Typography variant='body2' sx={{ opacity: 0.75 }}>No tuners found. You can add one by address later in Dashboard → Live TV.</Typography>}
                    {tuners?.map(t => (
                        <Stack key={t.Url} direction='row' spacing={1.5} alignItems='center'>
                            <Typography>{t.FriendlyName ?? t.Url}</Typography>
                            <Button size='small' variant='contained' disabled={busy} onClick={() => { void addTuner(t); }}>Add</Button>
                        </Stack>
                    ))}
                </Stack>
            )}

            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <StepButtons onNext={onNext} nextLabel={kind === 'none' || done ? 'Next' : 'Skip for now'} />
        </>
    );
};

/* ── 6. Devices ────────────────────────────────────────────────────────── */

const DevicesStep: FC<StepProps & { adminId: string | null }> = ({ onNext, adminId }) => {
    const [ code, setCode ] = useState('');
    const [ approved, setApproved ] = useState(0);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const approve = async () => {
        setBusy(true);
        setError(null);
        try {
            const forUser = adminId ? '&userId=' + adminId : '';
            await setupRequest('POST', `/QuickConnect/Authorize?code=${encodeURIComponent(code)}${forUser}`);
            setApproved(n => n + 1);
            setCode('');
        } catch {
            setError('That code didn’t work. Codes only last a few minutes; check the one on the screen and try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <StepHeader
                title='Your TVs and phones'
                text='Sign your TVs in without typing a password on the remote. Open Khylo on the TV, choose Sign in with a code, and type the code it shows here. On iPhone and iPad, enter this server’s address and sign in.'
            />
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }}>
                <TextField
                    size='small'
                    label='Code from your TV'
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase())}
                    sx={{ width: 200 }}
                />
                <Button variant='contained' disabled={code.length !== 6 || busy} onClick={() => { void approve(); }}>Sign in</Button>
            </Stack>
            {approved > 0 && <Alert severity='success' sx={{ mb: 2 }}>{approved === 1 ? 'Your device is signed in.' : `${approved} devices signed in.`} Add another, or carry on.</Alert>}
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <Typography variant='body2' sx={{ opacity: 0.7, mb: 3 }}>You can sign more devices in any time from Add a device.</Typography>
            <StepButtons onNext={onNext} nextLabel='Next' />
        </>
    );
};

/* ── Navigation buttons, matching the other setup screens ──────────────── */

export const StepButtons: FC<{ onNext: () => void; nextLabel: string; disabled?: boolean }> = ({ onNext, nextLabel, disabled }) => (
    <Stack direction='row' justifyContent='space-between' sx={{ mt: 3 }}>
        <Button variant='outlined' color='inherit' startIcon={<ArrowBackIcon />} onClick={() => window.history.back()}>Previous</Button>
        <Button variant='contained' endIcon={<ArrowForwardIcon />} disabled={disabled} onClick={onNext}>{nextLabel}</Button>
    </Stack>
);

/* ── Sign-in, when setup was reloaded and lost the admin's details ─────── */

export const SignIn: FC<{ onSignedIn: () => void }> = ({ onSignedIn }) => {
    const [ username, setUsername ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ error, setError ] = useState<string | null>(null);

    const submit = async () => {
        try {
            await signInWith(username, password);
            onSignedIn();
        } catch (e) {
            setError(errorText(e));
        }
    };

    return (
        <>
            <StepHeader title='Sign in to continue' text='Sign in with the admin account you just made to finish setting up Khylo.' />
            <Stack spacing={1.5} sx={{ maxWidth: 360, mb: 2 }}>
                <TextField size='small' label='Username' value={username} onChange={e => setUsername(e.target.value)} />
                <TextField size='small' type='password' label='Password' value={password} onChange={e => setPassword(e.target.value)} />
            </Stack>
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <StepButtons onNext={() => { void submit(); }} nextLabel='Sign in' disabled={!username} />
        </>
    );
};

/* ── The page ──────────────────────────────────────────────────────────── */

const STEP_COUNT = 6;

/**
 * Khylo's own setup steps, after the basics: playback, the household, bringing history over from Plex,
 * another server, Khylo TV, Live TV and signing TVs in. Every step can be skipped and done later from
 * the Dashboard.
 */
export const Component: FC = () => {
    const navigate = useNavigate();
    const [ signedIn, setSignedIn ] = useState(hasAdmin());
    const [ step, setStep ] = useState(0);
    const [ profiles, setProfiles ] = useState<Profile[]>([]);
    const [ adminId, setAdminId ] = useState<string | null>(null);

    useEffect(() => {
        if (!signedIn) return;
        setupRequest<{ Id: string; Name: string }>('GET', '/Users/Me')
            .then(me => {
                setAdminId(me.Id);
                setProfiles(p => (p.some(x => x.Id === me.Id) ? p : [ { Id: me.Id, Name: me.Name, IsKids: false }, ...p ]));
            })
            .catch(() => setSignedIn(false));
    }, [signedIn]);

    // Previous goes back a step here, and out to remote access from the first one
    useEffect(() => {
        const onPop = () => setStep(s => Math.max(0, s - 1));
        if (step > 0) window.addEventListener('popstate', onPop, { once: true });
        return () => window.removeEventListener('popstate', onPop);
    }, [step]);

    const next = useCallback(() => {
        if (step + 1 >= STEP_COUNT) {
            navigate('/wizard/finish');
            return;
        }
        window.history.pushState({ khyloSetupStep: step + 1 }, '');
        setStep(step + 1);
        window.scrollTo(0, 0);
    }, [ navigate, step ]);

    const onProfiles = useCallback((list: Profile[]) => {
        setProfiles(p => {
            const me = p.find(x => x.Id === adminId);
            return [ ...(me ? [me] : []), ...list.filter(x => x.Id !== adminId) ];
        });
    }, [adminId]);

    let content: React.ReactNode;
    if (!signedIn) {
        content = <SignIn onSignedIn={() => setSignedIn(true)} />;
    } else {
        content = [
            <PlaybackStep key='playback' onNext={next} />,
            <HouseholdStep key='household' onNext={next} onProfiles={onProfiles} />,
            <ImportStep key='import' onNext={next} profiles={profiles} adminId={adminId} />,
            <KhyloTvStep key='khylotv' onNext={next} />,
            <LiveTvStep key='livetv' onNext={next} />,
            <DevicesStep key='devices' onNext={next} adminId={adminId} />
        ][step];
    }

    return (
        <div className='page standalonePage wizardPage' style={{ position: 'relative', zIndex: 1 }}>
            <div className='padded-left padded-right padded-top'>
                <div className='ui-corner-all ui-shadow wizardContent'>
                    {signedIn && (
                        <Typography variant='body2' sx={{ opacity: 0.6, mb: 1 }}>{`Khylo setup · ${step + 1} of ${STEP_COUNT}`}</Typography>
                    )}
                    {content}
                </div>
            </div>
        </div>
    );
};

export default Component;
