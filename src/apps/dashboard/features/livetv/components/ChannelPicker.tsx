import React, { type FC, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';

import {
    type PlaylistChannel,
    type PlaylistGroup,
    type PlaylistInfo,
    type Selection,
    EMPTY_SELECTION,
    getGroupState,
    groupChannels,
    isChannelSelected,
    toggleChannel,
    toggleGroup
} from '../utils/channelSelection';
import { KHYLO_COLORS } from '../../../components/ui';

// Groups with thousands of channels render a slice until asked for more
const GROUP_PREVIEW = 200;
const SEARCH_LIMIT = 300;

interface ChannelRowProps {
    channel: PlaylistChannel;
    checked: boolean;
    showGroup?: boolean;
    onToggle: () => void;
}

const ChannelRow: FC<ChannelRowProps> = ({ channel, checked, showGroup, onToggle }) => (
    <Box
        component='label'
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, pl: showGroup ? 1 : 6, pr: 2, cursor: 'pointer', '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover } }}
    >
        <Checkbox size='small' checked={checked} onChange={onToggle} />
        <Box sx={{ width: 40, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {channel.LogoUrl && <img src={channel.LogoUrl} alt='' loading='lazy' referrerPolicy='no-referrer' style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        </Box>
        <Typography sx={{ width: 48, flexShrink: 0, fontSize: '0.75rem', color: KHYLO_COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {channel.Number}
        </Typography>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channel.Name}
        </Typography>
        {showGroup && (
            <Typography sx={{ fontSize: '0.75rem', color: KHYLO_COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>
                {channel.Group}
            </Typography>
        )}
    </Box>
);

interface GroupRowProps {
    group: PlaylistGroup;
    selection: Selection;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectionChange: (selection: Selection) => void;
}

const GroupRow: FC<GroupRowProps> = ({ group, selection, isOpen, onOpenChange, onSelectionChange }) => {
    const [ showAll, setShowAll ] = useState(false);
    const state = getGroupState(group, selection);
    const isWholeGroupOnly = group.channels.length === 0;
    let selected = group.channels.filter(c => isChannelSelected(c, selection)).length;
    if (isWholeGroupOnly && state === 'all') selected = group.count;
    const visible = showAll ? group.channels : group.channels.slice(0, GROUP_PREVIEW);

    return (
        <Box sx={{ borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`, '&:last-child': { borderBottom: 'none' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75, '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover } }}>
                <Checkbox
                    checked={state === 'all'}
                    indeterminate={state === 'some'}
                    onChange={() => onSelectionChange(toggleGroup(group, selection, state !== 'all'))}
                    slotProps={{ input: { 'aria-label': `Include all of ${group.name}` } }}
                />
                <Box
                    component='button'
                    type='button'
                    onClick={() => (isWholeGroupOnly ? onSelectionChange(toggleGroup(group, selection, state !== 'all')) : onOpenChange(!isOpen))}
                    sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5, border: 'none', bgcolor: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer', py: 0.5 }}
                >
                    <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {group.name || 'No group'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: selected ? KHYLO_COLORS.accent : KHYLO_COLORS.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {selected && selected < group.count ? `${selected.toLocaleString()} of ` : ''}
                        {`${group.count.toLocaleString()} ${isWholeGroupOnly ? 'titles' : 'channels'}`}
                    </Typography>
                    {!isWholeGroupOnly && (
                        <ExpandMoreIcon sx={{ fontSize: 20, color: KHYLO_COLORS.textMuted, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
                    )}
                </Box>
            </Box>
            <Collapse in={isOpen} unmountOnExit>
                <Box sx={{ pb: 1 }}>
                    {visible.map(channel => (
                        <ChannelRow
                            key={channel.Id}
                            channel={channel}
                            checked={isChannelSelected(channel, selection)}
                            onToggle={() => onSelectionChange(toggleChannel(channel, selection))}
                        />
                    ))}
                    {!showAll && group.count > GROUP_PREVIEW && (
                        <Button size='small' variant='text' onClick={() => setShowAll(true)} sx={{ ml: 6, textTransform: 'none', color: KHYLO_COLORS.textSecondary }}>
                            {`Show all ${group.channels.length.toLocaleString()} channels`}
                        </Button>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

const sectionSx = { mb: 3, borderRadius: '10px', border: `1px solid ${KHYLO_COLORS.borderDefault}`, bgcolor: KHYLO_COLORS.surfacePrimary, overflow: 'hidden' };

interface ChannelPickerProps {
    playlist: PlaylistInfo;
    selection: Selection;
    onSelectionChange: (selection: Selection) => void;
}

/** Search, groups and channels of a playlist, each with a checkbox. */
export const ChannelPicker: FC<ChannelPickerProps> = ({ playlist, selection, onSelectionChange }) => {
    const [ search, setSearch ] = useState('');
    const [ filter, setFilter ] = useState<'all' | 'selected'>('all');
    const [ openGroups, setOpenGroups ] = useState<Set<string>>(() => new Set());
    const [ showOther, setShowOther ] = useState(false);

    const groups = useMemo(() => groupChannels(playlist), [playlist]);
    const term = search.trim().toLowerCase();
    const searchResults = useMemo(
        () => (term ? playlist.Channels.filter(c => c.Name.toLowerCase().includes(term) || (c.Number ?? '').startsWith(term)).slice(0, SEARCH_LIMIT) : []),
        [ playlist, term ]
    );

    const visibleLive = useMemo(() => {
        const list = filter === 'selected' ? groups.live.filter(g => getGroupState(g, selection) !== 'none') : groups.live;
        return term ? list.filter(g => g.name.toLowerCase().includes(term)) : list;
    }, [ groups, filter, selection, term ]);

    const setGroupOpen = (key: string, open: boolean) => setOpenGroups(prev => {
        const next = new Set(prev);
        if (open) {
            next.add(key);
        } else {
            next.delete(key);
        }
        return next;
    });

    return (
        <>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <TextField
                    size='small'
                    placeholder='Search channels and groups'
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ flex: '1 1 260px' }}
                    slotProps={{ input: { startAdornment: <InputAdornment position='start'><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                />
                <ToggleButtonGroup size='small' exclusive value={filter} onChange={(_, v: 'all' | 'selected' | null) => v && setFilter(v)}>
                    <ToggleButton value='all' sx={{ textTransform: 'none' }}>All groups</ToggleButton>
                    <ToggleButton value='selected' sx={{ textTransform: 'none' }}>Selected</ToggleButton>
                </ToggleButtonGroup>
                <Button
                    size='small'
                    variant='text'
                    onClick={() => onSelectionChange(EMPTY_SELECTION)}
                    sx={{ textTransform: 'none', color: KHYLO_COLORS.textSecondary }}
                >
                    Clear all
                </Button>
            </Box>

            {term && (
                <Box sx={sectionSx}>
                    <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: KHYLO_COLORS.textMuted }}>
                        {searchResults.length === SEARCH_LIMIT ? `MATCHING CHANNELS (FIRST ${SEARCH_LIMIT})` : 'MATCHING CHANNELS'}
                    </Typography>
                    {searchResults.length === 0 && <Typography sx={{ px: 2, pb: 2, fontSize: '0.85rem', color: KHYLO_COLORS.textMuted }}>No channels match.</Typography>}
                    {searchResults.map(channel => (
                        <ChannelRow
                            key={channel.Id}
                            channel={channel}
                            checked={isChannelSelected(channel, selection)}
                            showGroup
                            onToggle={() => onSelectionChange(toggleChannel(channel, selection))}
                        />
                    ))}
                </Box>
            )}

            <Box sx={sectionSx}>
                <Typography sx={{ px: 2, pt: 1.5, pb: 0.5, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: KHYLO_COLORS.textMuted }}>
                    {`LIVE CHANNEL GROUPS (${groups.live.length.toLocaleString()})`}
                </Typography>
                {visibleLive.length === 0 && <Typography sx={{ px: 2, pb: 2, fontSize: '0.85rem', color: KHYLO_COLORS.textMuted }}>No groups to show.</Typography>}
                {visibleLive.map(group => (
                    <GroupRow
                        key={group.key}
                        group={group}
                        selection={selection}
                        isOpen={openGroups.has(group.key)}
                        onOpenChange={open => setGroupOpen(group.key, open)}
                        onSelectionChange={onSelectionChange}
                    />
                ))}
            </Box>

            {groups.other.length > 0 && (
                <Box sx={sectionSx}>
                    <Box
                        component='button'
                        type='button'
                        onClick={() => setShowOther(v => !v)}
                        sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, border: 'none', bgcolor: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: KHYLO_COLORS.textMuted }}>
                                {`ON-DEMAND & ADULT (${groups.other.length.toLocaleString()} GROUPS)`}
                            </Typography>
                            <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: KHYLO_COLORS.textSecondary }}>
                                Movies and series your provider lists as channels, and adult channels. Usually best left off.
                            </Typography>
                        </Box>
                        <ExpandMoreIcon sx={{ color: KHYLO_COLORS.textMuted, transform: showOther ? 'rotate(180deg)' : 'none' }} />
                    </Box>
                    <Collapse in={showOther} unmountOnExit>
                        {groups.other.map(group => (
                            <GroupRow
                                key={group.key}
                                group={group}
                                selection={selection}
                                isOpen={openGroups.has(group.key)}
                                onOpenChange={open => setGroupOpen(group.key, open)}
                                onSelectionChange={onSelectionChange}
                            />
                        ))}
                    </Collapse>
                </Box>
            )}
        </>
    );
};
