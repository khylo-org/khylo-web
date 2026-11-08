import React, { type FC, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NameIdPair } from '@khylo/sdk/lib/generated-client/models/name-id-pair';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';

import { useApi } from 'hooks/useApi';
import { KHYLO_COLORS } from '../../../components/ui';

interface ChannelMappingDialogProps {
    open: boolean;
    providerId: string;
    onClose: () => void;
}

/**
 * Matches each channel from the tuners to a channel in the guide. Needed when the playlist and the
 * guide name their channels differently, so a channel would otherwise show "no information".
 */
const ChannelMappingDialog: FC<ChannelMappingDialogProps> = ({ open, providerId, onClose }) => {
    const { api } = useApi();
    const queryClient = useQueryClient();
    const [ search, setSearch ] = useState('');
    const [ filter, setFilter ] = useState<'all' | 'unmatched'>('all');
    const [ savingId, setSavingId ] = useState<string | null>(null);
    const [ error, setError ] = useState<string | null>(null);
    // What the person picked, shown at once; the list from the server is only reloaded in the background
    const [ picked, setPicked ] = useState<Record<string, NameIdPair>>({});

    const queryKey = [ 'LiveTvChannelMapping', providerId ];
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => (await getLiveTvApi(api!).getChannelMappingOptions({ providerId })).data,
        enabled: Boolean(open && api && providerId)
    });

    const providerChannels = useMemo(
        () => [...(data?.ProviderChannels ?? [])].sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? '')),
        [data]
    );
    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (data?.TunerChannels ?? []).filter(c =>
            (filter === 'all' || !c.ProviderChannelId || Boolean(c.Id && picked[c.Id]))
            && (!term || (c.Name ?? '').toLowerCase().includes(term) || (c.ProviderChannelName ?? '').toLowerCase().includes(term)));
    }, [ data, search, filter, picked ]);
    const unmatched = (data?.TunerChannels ?? []).filter(c => !c.ProviderChannelId && !(c.Id && picked[c.Id])).length;

    const map = async (tunerChannelId: string, guideChannel: NameIdPair | null) => {
        if (!api || !guideChannel?.Id) return;
        setSavingId(tunerChannelId);
        setError(null);
        setPicked(previous => ({ ...previous, [tunerChannelId]: guideChannel }));
        try {
            await getLiveTvApi(api).setChannelMapping({
                setChannelMappingDto: { ProviderId: providerId, TunerChannelId: tunerChannelId, ProviderChannelId: guideChannel.Id }
            });
            // Keep it in the list too, then refresh quietly in the background
            queryClient.setQueryData(queryKey, (old: typeof data) => old && ({
                ...old,
                TunerChannels: old.TunerChannels?.map(c => c.Id === tunerChannelId ?
                    { ...c, ProviderChannelId: guideChannel.Id, ProviderChannelName: guideChannel.Name } :
                    c)
            }));
            queryClient.invalidateQueries({ queryKey }).catch(() => undefined);
        } catch {
            setPicked(previous => Object.fromEntries(Object.entries(previous).filter(([ id ]) => id !== tunerChannelId)));
            setError('Couldn\'t save that match. Try again.');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth='md'
            slotProps={{ paper: { sx: { bgcolor: KHYLO_COLORS.surfacePrimary, border: `1px solid ${KHYLO_COLORS.borderDefault}`, borderRadius: '12px', backgroundImage: 'none' } } }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography component='span' sx={{ display: 'block', fontWeight: 700, fontSize: '1.05rem' }}>Match channels to the guide</Typography>
                <Typography component='span' sx={{ display: 'block', mt: 0.5, fontSize: '0.82rem', color: KHYLO_COLORS.textSecondary }}>
                    Pick the guide listing for any channel that shows no information. Most channels are matched automatically.
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2, position: 'sticky', top: 0, zIndex: 1, bgcolor: KHYLO_COLORS.surfacePrimary, py: 1 }}>
                    <TextField
                        size='small'
                        placeholder='Search channels'
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        sx={{ flex: '1 1 220px' }}
                        slotProps={{ input: { startAdornment: <InputAdornment position='start'><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                    />
                    <ToggleButtonGroup size='small' exclusive value={filter} onChange={(_, v: 'all' | 'unmatched' | null) => v && setFilter(v)}>
                        <ToggleButton value='all' sx={{ textTransform: 'none' }}>All ({data?.TunerChannels?.length ?? 0})</ToggleButton>
                        <ToggleButton value='unmatched' sx={{ textTransform: 'none' }}>Unmatched ({unmatched})</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={28} sx={{ color: KHYLO_COLORS.accent }} />
                    </Box>
                )}
                {!isLoading && visible.length === 0 && (
                    <Typography sx={{ py: 4, textAlign: 'center', color: KHYLO_COLORS.textMuted, fontSize: '0.88rem' }}>
                        {filter === 'unmatched' ? 'Every channel is matched.' : 'No channels found.'}
                    </Typography>
                )}

                {visible.map(channel => {
                    const current = (channel.Id && picked[channel.Id])
                        || providerChannels.find(p => p.Id === channel.ProviderChannelId)
                        || null;
                    return (
                        <Box
                            key={channel.Id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                py: 1.25,
                                borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                flexWrap: { xs: 'wrap', sm: 'nowrap' }
                            }}
                        >
                            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {channel.Name}
                                </Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: current ? KHYLO_COLORS.status.healthy.fg : KHYLO_COLORS.status.warning.fg }}>
                                    {current ? 'Matched' : 'Not matched'}
                                </Typography>
                            </Box>
                            <Autocomplete
                                size='small'
                                options={providerChannels}
                                value={current}
                                getOptionLabel={o => o.Name ?? ''}
                                isOptionEqualToValue={(a, b) => a.Id === b.Id}
                                onChange={(_, value) => { map(channel.Id ?? '', value).catch(() => undefined); }}
                                disabled={savingId === channel.Id}
                                renderInput={params => <TextField {...params} placeholder='Choose guide channel' />}
                                sx={{ flex: '1 1 280px', minWidth: 220 }}
                            />
                        </Box>
                    );
                })}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} variant='contained' sx={{ textTransform: 'none', bgcolor: KHYLO_COLORS.accent, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChannelMappingDialog;
