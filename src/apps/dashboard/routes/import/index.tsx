import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloStatusBadge
} from '../../components/ui';

type SourceChoice = 'Plex' | 'Khylo';

interface SourceUser {
    Id: string;
    Name: string;
    NeedsPin: boolean;
}

interface KhyloUser {
    Id: string;
    Name: string;
}

interface Mapping {
    khyloUserId: string;
    pin: string;
}

interface UserResult {
    SourceUserName: string;
    KhyloUserName: string;
    Found: number;
    Matched: number;
    Watched: number;
    InProgress: number;
    Plays: number;
    Favorites: number;
    KeptNewer: number;
    Unmatched: number;
    UnmatchedExamples: string[];
    Error?: string | null;
}

interface ImportStatus {
    State: 'Idle' | 'Running' | 'Done' | 'Failed';
    DryRun: boolean;
    Message: string;
    Percent: number;
    Users: UserResult[];
}

const HELP: Record<SourceChoice, { address: string; token: string; tokenLabel: string }> = {
    Plex: {
        address: 'Your Plex server, for example http://192.168.1.10:32400',
        tokenLabel: 'Plex token',
        token: 'In Plex Web, open any movie, choose ⋯ → Get Info → View XML. The token is the X-Plex-Token at the end of the address. Use the server owner\'s token to see everyone in your Plex Home.'
    },
    Khylo: {
        address: 'Your other server, for example http://192.168.1.10:8096',
        tokenLabel: 'API key',
        token: 'On the other server, go to Dashboard → API Keys and add one for Khylo.'
    }
};

const number = (n: number) => n.toLocaleString();

/**
 * Import watch history: bring everyone's progress over from Plex or another server, so they pick up
 * where they left off. Connect, choose who goes where, preview, then import.
 */
export const Component: FC = () => {
    const { api } = useApi();
    const [ source, setSource ] = useState<SourceChoice>('Plex');
    const [ url, setUrl ] = useState('');
    const [ token, setToken ] = useState('');
    const [ connecting, setConnecting ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);
    const [ sourceUsers, setSourceUsers ] = useState<SourceUser[] | null>(null);
    const [ khyloUsers, setKhyloUsers ] = useState<KhyloUser[]>([]);
    const [ mappings, setMappings ] = useState<Record<string, Mapping>>({});
    const [ status, setStatus ] = useState<ImportStatus | null>(null);
    const [ expanded, setExpanded ] = useState<string | null>(null);
    const poll = useRef<number | null>(null);

    const headers = useMemo(() => ({ Authorization: api?.authorizationHeader ?? '' }), [api]);
    const base = api ? `${api.basePath}/Khylo/Import` : '';

    const loadStatus = useCallback(async () => {
        if (!api) return null;
        const response = await api.axiosInstance.get<ImportStatus>(`${base}/Status`, { headers });
        setStatus(response.data);
        return response.data;
    }, [ api, base, headers ]);

    const startPolling = useCallback(() => {
        if (poll.current) window.clearInterval(poll.current);
        poll.current = window.setInterval(() => {
            loadStatus().then(s => {
                if (s && s.State !== 'Running' && poll.current) {
                    window.clearInterval(poll.current);
                    poll.current = null;
                }
            }).catch(() => { /* try again next tick */ });
        }, 1500);
    }, [loadStatus]);

    useEffect(() => {
        if (!api) return;
        api.axiosInstance.get<KhyloUser[]>(`${api.basePath}/Users`, { headers })
            .then(r => setKhyloUsers(r.data.map(u => ({ Id: u.Id, Name: u.Name }))))
            .catch(() => setError('Couldn\'t load your Khylo users.'));
        loadStatus().then(s => {
            if (s?.State === 'Running') startPolling();
        }).catch(() => { /* none yet */ });
        return () => {
            if (poll.current) window.clearInterval(poll.current);
        };
    }, [ api, headers, loadStatus, startPolling ]);

    const connect = useCallback(async () => {
        if (!api) return;
        setConnecting(true);
        setError(null);
        setSourceUsers(null);
        try {
            const response = await api.axiosInstance.post<SourceUser[]>(`${base}/Users`, {
                Source: source === 'Plex' ? 'Plex' : 'Khylo', Url: url, Token: token
            }, { headers });
            setSourceUsers(response.data);

            // Same name on both sides goes together to start with
            const initial: Record<string, Mapping> = {};
            for (const user of response.data) {
                const same = khyloUsers.find(k => k.Name.trim().toLowerCase() === user.Name.trim().toLowerCase());
                initial[user.Id] = { khyloUserId: same?.Id ?? '', pin: '' };
            }
            setMappings(initial);
        } catch (e) {
            const message = (e as { response?: { data?: unknown } }).response?.data;
            setError(typeof message === 'string' && message ? message : 'Couldn\'t connect. Check the address and key.');
        } finally {
            setConnecting(false);
        }
    }, [ api, base, headers, khyloUsers, source, token, url ]);

    const run = useCallback(async (dryRun: boolean) => {
        if (!api || !sourceUsers) return;
        setError(null);
        try {
            await api.axiosInstance.post(`${base}/Start`, {
                Source: source === 'Plex' ? 'Plex' : 'Khylo',
                Url: url,
                Token: token,
                DryRun: dryRun,
                Users: sourceUsers
                    .filter(u => mappings[u.Id]?.khyloUserId)
                    .map(u => ({ SourceUserId: u.Id, SourceUserName: u.Name, KhyloUserId: mappings[u.Id].khyloUserId, Pin: mappings[u.Id].pin || null }))
            }, { headers });
            await loadStatus();
            startPolling();
        } catch {
            setError('Couldn\'t start. Another import may already be running.');
        }
    }, [ api, base, headers, loadStatus, mappings, source, sourceUsers, startPolling, token, url ]);

    const mappedCount = sourceUsers?.filter(u => mappings[u.Id]?.khyloUserId).length ?? 0;
    const running = status?.State === 'Running';
    const help = HELP[source];

    return (
        <Page id='importHistoryPage' title='Import Watch History' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Media' }, { label: 'Import Watch History' } ]}
                    title='Import Watch History'
                    subtitle='Moving from Plex or another server? Bring everyone’s history with you: what they’ve watched, where they stopped, the music they play and their favorites. Nothing newer in Khylo is ever replaced, and you can run it again any time.'
                />

                <KhyloSettingSection title='1. Connect' description='The server you’re moving from. It only needs to be reachable from this Khylo server.'>
                    <Stack spacing={2} sx={{ p: 2.5, maxWidth: 640 }}>
                        <ToggleButtonGroup exclusive size='small' value={source} onChange={(_, v: SourceChoice | null) => {
                            if (!v) return;
                            setSource(v);
                            setSourceUsers(null);
                        }}>
                            <ToggleButton value='Plex'>Plex</ToggleButton>
                            <ToggleButton value='Khylo'>Another server</ToggleButton>
                        </ToggleButtonGroup>
                        <TextField label='Server address' size='small' value={url} onChange={e => setUrl(e.target.value)} helperText={help.address} />
                        <TextField label={help.tokenLabel} size='small' type='password' value={token} onChange={e => setToken(e.target.value)} helperText={help.token} />
                        <Box>
                            <Button variant='contained' disabled={!url.trim() || !token.trim() || connecting || running} onClick={() => { void connect(); }}>
                                {connecting ? 'Connecting…' : 'Connect'}
                            </Button>
                        </Box>
                        {error && <Alert severity='error'>{error}</Alert>}
                    </Stack>
                </KhyloSettingSection>

                {sourceUsers && (
                    <KhyloSettingSection title='2. Who goes where' description={`Choose the Khylo user or home profile for each person on ${source}. Leave someone on “Don’t import” to skip them.`}>
                        <Stack spacing={1.5} sx={{ p: 2.5 }}>
                            {sourceUsers.map(user => (
                                <Stack key={user.Id} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                                    <Typography sx={{ width: 220, fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>{user.Name}</Typography>
                                    <Typography sx={{ color: KHYLO_COLORS.textMuted }}>→</Typography>
                                    <Select
                                        size='small'
                                        displayEmpty
                                        value={mappings[user.Id]?.khyloUserId ?? ''}
                                        onChange={e => setMappings(m => ({ ...m, [user.Id]: { ...m[user.Id], khyloUserId: e.target.value } }))}
                                        sx={{ minWidth: 240 }}
                                    >
                                        <MenuItem value=''>Don’t import</MenuItem>
                                        {khyloUsers.map(k => <MenuItem key={k.Id} value={k.Id}>{k.Name}</MenuItem>)}
                                    </Select>
                                    {user.NeedsPin && (
                                        <TextField
                                            size='small'
                                            label='Their Plex PIN'
                                            type='password'
                                            value={mappings[user.Id]?.pin ?? ''}
                                            onChange={e => setMappings(m => ({ ...m, [user.Id]: { ...m[user.Id], pin: e.target.value } }))}
                                            sx={{ width: 150 }}
                                        />
                                    )}
                                </Stack>
                            ))}
                            <Stack direction='row' spacing={1.5} sx={{ pt: 1 }}>
                                <Button variant='outlined' disabled={!mappedCount || running} onClick={() => { void run(true); }}>Preview</Button>
                                <Button variant='contained' disabled={!mappedCount || running} onClick={() => { void run(false); }}>Import</Button>
                            </Stack>
                            <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                Preview shows what would come across without changing anything.
                            </Typography>
                        </Stack>
                    </KhyloSettingSection>
                )}

                {status && status.State !== 'Idle' && (
                    <KhyloSettingSection
                        title={status.DryRun ? '3. Preview' : '3. Import'}
                        description={status.Message}
                    >
                        <Stack spacing={2} sx={{ p: 2.5 }}>
                            {running && <LinearProgress variant='determinate' value={Math.min(100, status.Percent)} />}
                            {status.State === 'Failed' && <Alert severity='error'>{status.Message}</Alert>}
                            {status.Users.map(result => {
                                const percent = result.Found ? Math.round(100 * result.Matched / result.Found) : 0;
                                return (
                                    <Box key={result.SourceUserName} sx={{ p: 2, borderRadius: 2, bgcolor: KHYLO_COLORS.surfaceSecondary }}>
                                        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
                                            <Typography sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                                {result.SourceUserName} → {result.KhyloUserName || '…'}
                                            </Typography>
                                            {result.Error ? <KhyloStatusBadge label='Problem' color='failed' /> : result.Found > 0 && <KhyloStatusBadge label={`${percent}% found`} color={percent >= 90 ? 'healthy' : 'warning'} />}
                                        </Stack>
                                        {result.Error ? (
                                            <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>{result.Error}</Typography>
                                        ) : (
                                            <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                                {`${number(result.Matched)} of ${number(result.Found)} titles found · ${number(result.Watched)} watched · ${number(result.InProgress)} in progress · ${number(result.Plays)} plays · ${number(result.Favorites)} favorites`}
                                                {result.KeptNewer > 0 && ` · ${number(result.KeptNewer)} already newer in Khylo (kept)`}
                                            </Typography>
                                        )}
                                        {result.Unmatched > 0 && (
                                            <>
                                                <Button size='small' sx={{ mt: 1, px: 0 }} onClick={() => setExpanded(expanded === result.SourceUserName ? null : result.SourceUserName)}>
                                                    {`${number(result.Unmatched)} not in your Khylo library`}
                                                </Button>
                                                <Collapse in={expanded === result.SourceUserName}>
                                                    <Box component='ul' sx={{ m: 0, pl: 2.5, color: KHYLO_COLORS.textSecondary, fontSize: '0.85rem' }}>
                                                        {result.UnmatchedExamples.map(title => <li key={title}>{title}</li>)}
                                                        {result.Unmatched > result.UnmatchedExamples.length && <li>{`…and ${number(result.Unmatched - result.UnmatchedExamples.length)} more`}</li>}
                                                    </Box>
                                                </Collapse>
                                            </>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>
                    </KhyloSettingSection>
                )}
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'ImportHistoryPage';
export default Component;
