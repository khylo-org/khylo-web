import React, { type FC, useCallback, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink } from 'react-router-dom';

import Page from 'components/Page';
import ConfirmDialog from 'components/ConfirmDialog';
import Loading from 'components/loading/LoadingComponent';
import { KhyloChannelEmblem } from 'components/khylo/live/KhyloChannelEmblem';
import {
    type LiveChannelAdminChannel,
    type LiveChannelAdminState,
    useLiveChannelsAdmin,
    useRebuildLiveChannelSchedules,
    useSetChannelsEnabled,
    useSetLiveChannelsEnabled
} from 'apps/dashboard/features/liveChannels/api/useLiveChannelsAdmin';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingRow,
    KhyloSettingSection,
    KhyloStatusBadge,
    type KhyloStatusColor
} from '../../components/ui';

type StatusFilter = 'all' | 'onair' | 'off' | 'attention';

const GROUPS: { id: string; title: string; description: string }[] = [
    {
        id: 'TV',
        title: 'TV channels',
        description: 'Category channels for series. Each show airs on one channel only. Turn one off and its shows move to the next channel that fits them, if there is one.'
    },
    {
        id: 'Movies',
        title: 'Movie channels',
        description: 'Category channels for movies. Each movie airs on one channel only. Turn one off and its movies move to the next channel that fits them, if there is one.'
    },
    {
        id: 'Seasonal',
        title: 'Seasonal channels',
        description: 'Holiday channels that only air in their months, drawing from the whole movie library.'
    },
    {
        id: 'Networks',
        title: 'Networks',
        description: 'One channel for each TV network in your library, showing its official logo.'
    },
    {
        id: 'Collections',
        title: 'Collections',
        description: 'One channel for each movie collection, airing its films back to back.'
    }
];

const STATE_BADGES: Record<LiveChannelAdminState, { label: string; color: KhyloStatusColor }> = {
    OnAir: { label: 'On air', color: 'healthy' },
    Off: { label: 'Off', color: 'idle' },
    NotEnoughContent: { label: 'Needs more content', color: 'warning' },
    OutOfSeason: { label: 'Out of season', color: 'info' }
};

const MONTHS = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

const ON_DESCRIPTION = 'Viewers see Khylo TV in the sidebar and can tune in to any channel that is on air.';
const OFF_DESCRIPTION = 'Khylo TV is hidden from everyone and no schedules are built. Your channel choices below are kept for when you turn it back on.';

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;

const formatHours = (hours: number) => `${Math.round(hours).toLocaleString()} hrs`;

/** One line about a channel's content, in plain words. */
function describeContent(channel: LiveChannelAdminChannel): string {
    const noun = channel.Group === 'TV' || channel.Group === 'Networks' ? 'show' : 'movie';
    const amount = `${plural(channel.TitleCount, noun)} · ${formatHours(channel.Hours)}`;
    switch (channel.State) {
        case 'NotEnoughContent': {
            // Only what's missing: more titles, more hours, or both
            const missing = [];
            if (channel.TitleCount < channel.MinimumTitles) missing.push(`${channel.MinimumTitles - channel.TitleCount} more ${noun}${channel.MinimumTitles - channel.TitleCount === 1 ? '' : 's'}`);
            if (channel.Hours < channel.MinimumHours) missing.push(`${Math.ceil(channel.MinimumHours - channel.Hours)} more hrs`);
            return `${amount}. Needs ${missing.join(' and ')} to go on the air.`;
        }
        case 'OutOfSeason':
            return `${amount}. Airs in ${channel.ActiveMonths.map(m => MONTHS[m - 1]).join(' and ')}.`;
        case 'Off':
            // Category channels give up their titles while off, so this is what they would claim
            if (channel.Group === 'TV' || channel.Group === 'Movies') {
                return `${plural(channel.TitleCount, noun)} match this channel.`;
            }
            return amount;
        default:
            return amount;
    }
}

const matchesFilter = (channel: LiveChannelAdminChannel, filter: StatusFilter) => {
    switch (filter) {
        case 'onair':
            return channel.Enabled && channel.State === 'OnAir';
        case 'off':
            return !channel.Enabled;
        case 'attention':
            return channel.Enabled && channel.State === 'NotEnoughContent';
        default:
            return true;
    }
};

interface ChannelRowProps {
    channel: LiveChannelAdminChannel;
    onToggle: (channel: LiveChannelAdminChannel, enabled: boolean) => void;
}

const ChannelRow: FC<ChannelRowProps> = ({ channel, onToggle }) => {
    // A flipped switch shows its new state right away, before the server's new status comes back
    let state: LiveChannelAdminState = channel.State;
    if (!channel.Enabled) {
        state = 'Off';
    } else if (state === 'Off') {
        state = 'OnAir';
    }
    const badge = STATE_BADGES[state];
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2.5,
                py: 1.5,
                borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover },
                '&:last-child': { borderBottom: 'none' }
            }}
        >
            <Typography
                sx={{
                    width: 32,
                    flexShrink: 0,
                    color: KHYLO_COLORS.textMuted,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                }}
            >
                {channel.Number}
            </Typography>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, opacity: channel.Enabled ? 1 : 0.45 }}>
                <KhyloChannelEmblem channel={channel} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: channel.Enabled ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textSecondary
                        }}
                    >
                        {channel.Name}
                    </Typography>
                    <KhyloStatusBadge label={badge.label} color={badge.color} />
                </Box>
                <Typography sx={{ mt: 0.25, color: KHYLO_COLORS.textSecondary, fontSize: '0.78rem', lineHeight: 1.45 }}>
                    {describeContent(channel)}
                </Typography>
            </Box>
            <Switch
                checked={channel.Enabled}
                onChange={(_, checked) => onToggle(channel, checked)}
                slotProps={{ input: { 'aria-label': `${channel.Name} on or off` } }}
            />
        </Box>
    );
};

const bulkButtonSx = {
    color: KHYLO_COLORS.textSecondary,
    textTransform: 'none',
    fontSize: '0.78rem',
    fontWeight: 600,
    minWidth: 0,
    px: 1.25,
    bgcolor: 'transparent',
    boxShadow: 'none',
    '&.Mui-disabled': { color: KHYLO_COLORS.textMuted, bgcolor: 'transparent' },
    '&:hover': { color: KHYLO_COLORS.textPrimary, bgcolor: KHYLO_COLORS.surfaceHover }
} as const;

export const Component: FC = () => {
    const { data, isLoading, isError } = useLiveChannelsAdmin();
    const setLiveEnabled = useSetLiveChannelsEnabled();
    const setChannelsEnabled = useSetChannelsEnabled();
    const rebuildSchedules = useRebuildLiveChannelSchedules();

    const [ search, setSearch ] = useState('');
    const [ filter, setFilter ] = useState<StatusFilter>('all');
    const [ isRebuildOpen, setIsRebuildOpen ] = useState(false);
    const [ message, setMessage ] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

    const channels = useMemo(() => data?.Channels ?? [], [data]);
    const isOn = data?.Enabled ?? false;

    const counts = useMemo(() => ({
        onAir: channels.filter(c => c.Enabled && c.State === 'OnAir').length,
        off: channels.filter(c => !c.Enabled).length,
        attention: channels.filter(c => c.Enabled && c.State === 'NotEnoughContent').length
    }), [channels]);

    const visibleByGroup = useMemo(() => {
        const term = search.trim().toLowerCase();
        const visible = channels.filter(c =>
            matchesFilter(c, filter)
            && (!term || c.Name.toLowerCase().includes(term) || String(c.Number) === term));
        return GROUPS
            .map(group => ({ ...group, channels: visible.filter(c => c.Group === group.id) }))
            .filter(group => group.channels.length > 0);
    }, [ channels, search, filter ]);

    const toggleChannels = useCallback((ids: string[], enabled: boolean) => {
        if (ids.length === 0) return;
        setChannelsEnabled.mutate({ channelIds: ids, enabled }, {
            onError: () => setMessage({ text: 'Couldn\'t save that change. Try again.', severity: 'error' })
        });
    }, [setChannelsEnabled]);

    const onToggleChannel = useCallback(
        (channel: LiveChannelAdminChannel, enabled: boolean) => toggleChannels([channel.Id], enabled),
        [toggleChannels]
    );

    const onToggleMaster = useCallback((enabled: boolean) => {
        setLiveEnabled.mutate(enabled, {
            onSuccess: () => setMessage({ text: enabled ? 'Khylo TV is on.' : 'Khylo TV is off.', severity: 'success' }),
            onError: () => setMessage({ text: 'Couldn\'t save that change. Try again.', severity: 'error' })
        });
    }, [setLiveEnabled]);

    const onConfirmRebuild = useCallback(() => {
        setIsRebuildOpen(false);
        rebuildSchedules.mutate(undefined, {
            onSuccess: () => setMessage({ text: 'Schedules rebuilt from your current library.', severity: 'success' }),
            onError: () => setMessage({ text: 'Couldn\'t rebuild the schedules. Try again.', severity: 'error' })
        });
    }, [rebuildSchedules]);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Page id='liveChannelsAdminPage' title='Khylo TV' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1100}>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Media & Storage' }, { label: 'Khylo TV' } ]}
                    title='Khylo TV'
                    subtitle='Always-on TV channels built from your movie and TV libraries. Choose which channels air, or turn the whole feature off.'
                    badge={
                        <KhyloStatusBadge
                            label={isOn ? `${counts.onAir} on air` : 'Off'}
                            color={isOn ? 'healthy' : 'idle'}
                        />
                    }
                    actions={
                        <>
                            <Button
                                component={RouterLink}
                                to='/live'
                                size='small'
                                startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                                disabled={!isOn}
                                sx={{ color: KHYLO_COLORS.textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem' }}
                            >
                                Open guide
                            </Button>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                                onClick={() => setIsRebuildOpen(true)}
                                disabled={!isOn || rebuildSchedules.isPending}
                                sx={{
                                    color: KHYLO_COLORS.textPrimary,
                                    borderColor: KHYLO_COLORS.borderStrong,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: KHYLO_COLORS.surfaceHover }
                                }}
                            >
                                Rebuild schedules
                            </Button>
                        </>
                    }
                />

                {isError && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Couldn&apos;t load Live Channels from the server.
                    </Alert>
                )}

                <KhyloSettingSection title='Khylo TV'>
                    <KhyloSettingRow
                        title='Turn on Khylo TV'
                        description={isOn ? ON_DESCRIPTION : OFF_DESCRIPTION}
                        control={
                            <Switch
                                checked={isOn}
                                disabled={!data || setLiveEnabled.isPending}
                                onChange={(_, checked) => onToggleMaster(checked)}
                                slotProps={{ input: { 'aria-label': 'Khylo TV on or off' } }}
                            />
                        }
                    />
                    {data && (
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', px: 2.5, py: 1.75 }}>
                            {[
                                { label: 'On air', value: counts.onAir },
                                { label: 'Turned off', value: counts.off },
                                { label: 'Need more content', value: counts.attention }
                            ].map(stat => (
                                <Box key={stat.label}>
                                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: KHYLO_COLORS.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                                        {stat.value}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: KHYLO_COLORS.textMuted }}>
                                        {stat.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </KhyloSettingSection>

                <Box sx={{ opacity: isOn ? 1 : 0.5, transition: 'opacity 0.2s ease' }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}>
                        <TextField
                            size='small'
                            placeholder='Search channels'
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            sx={{ flex: '1 1 220px', maxWidth: 320 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <SearchIcon sx={{ fontSize: 18, color: KHYLO_COLORS.textMuted }} />
                                        </InputAdornment>
                                    )
                                }
                            }}
                        />
                        <ToggleButtonGroup
                            size='small'
                            exclusive
                            value={filter}
                            onChange={(_, value: StatusFilter | null) => value && setFilter(value)}
                            sx={{
                                flexWrap: 'wrap',
                                '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.78rem', fontWeight: 600, px: 1.5 },
                                '& .Mui-selected': { color: `${KHYLO_COLORS.textPrimary} !important`, bgcolor: `${KHYLO_COLORS.accentMuted} !important` }
                            }}
                        >
                            <ToggleButton value='all'>All</ToggleButton>
                            <ToggleButton value='onair'>On air</ToggleButton>
                            <ToggleButton value='off'>Off</ToggleButton>
                            <ToggleButton value='attention'>Needs content</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {visibleByGroup.length === 0 && (
                        <Box sx={{ py: 6, textAlign: 'center', color: KHYLO_COLORS.textMuted }}>
                            <LiveTvIcon sx={{ fontSize: 36, mb: 1 }} />
                            <Typography sx={{ fontSize: '0.875rem' }}>
                                {channels.length === 0 ? 'No channels yet. Add movies or shows to your libraries.' : 'No channels match.'}
                            </Typography>
                        </Box>
                    )}

                    {visibleByGroup.map(group => {
                        const all = channels.filter(c => c.Group === group.id);
                        const onCount = all.filter(c => c.Enabled).length;
                        return (
                            <KhyloSettingSection
                                key={group.id}
                                title={`${group.title} (${onCount}/${all.length} on)`}
                                description={group.description}
                                action={
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Button
                                            variant='text'
                                            size='small'
                                            sx={bulkButtonSx}
                                            disabled={onCount === all.length}
                                            onClick={() => toggleChannels(all.filter(c => !c.Enabled).map(c => c.Id), true)}
                                        >
                                            Turn all on
                                        </Button>
                                        <Button
                                            variant='text'
                                            size='small'
                                            sx={bulkButtonSx}
                                            disabled={onCount === 0}
                                            onClick={() => toggleChannels(all.filter(c => c.Enabled).map(c => c.Id), false)}
                                        >
                                            Turn all off
                                        </Button>
                                    </Box>
                                }
                            >
                                {group.channels.map(channel => (
                                    <ChannelRow key={channel.Id} channel={channel} onToggle={onToggleChannel} />
                                ))}
                            </KhyloSettingSection>
                        );
                    })}
                </Box>

                <ConfirmDialog
                    open={isRebuildOpen}
                    title='Rebuild schedules'
                    text={'Every channel\'s schedule is laid out again from your current library. Anyone watching a channel will jump to whatever the new schedule has on.'}
                    onCancel={() => setIsRebuildOpen(false)}
                    onConfirm={onConfirmRebuild}
                    confirmButtonText='Rebuild'
                />

                <Snackbar
                    open={Boolean(message)}
                    autoHideDuration={3500}
                    onClose={() => setMessage(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity={message?.severity ?? 'success'}
                        onClose={() => setMessage(null)}
                        sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                    >
                        {message?.text}
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LiveChannelsAdminPage';
export default Component;
