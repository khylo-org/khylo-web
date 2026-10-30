import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';

import Page from 'components/Page';
import ConfirmDialog from 'components/ConfirmDialog';
import { useApi } from 'hooks/useApi';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloDataTable,
    KhyloStatusBadge,
    type ColumnDef
} from '../../components/ui';

interface HomeProfile {
    Id: string;
    Name: string;
    IsKids: boolean;
    HasPin: boolean;
}

interface HomeOwner {
    Id: string;
    Name: string;
    IsAdministrator: boolean;
    Allowed: boolean | null;
    CanAddProfiles: boolean;
    Profiles: HomeProfile[];
}

interface HomeProfilesAdmin {
    AllowByDefault: boolean;
    MaxProfilesPerHome: number;
    Users: HomeOwner[];
}

type Choice = 'default' | 'allow' | 'deny';

const choiceOf = (allowed: boolean | null): Choice => {
    if (allowed === null) return 'default';
    return allowed ? 'allow' : 'deny';
};

/**
 * Home Profiles: whether the people this server is shared with may add profiles for their own
 * household (a partner, a sister, a child), how many, and every home on the server. Profiles never
 * get more access than the person who made them.
 */
export const Component: FC = () => {
    const { api } = useApi();
    const [ data, setData ] = useState<HomeProfilesAdmin | null>(null);
    const [ maxDraft, setMaxDraft ] = useState('');
    const [ searchTerm, setSearchTerm ] = useState('');
    const [ toRemove, setToRemove ] = useState<HomeProfile | null>(null);
    const [ message, setMessage ] = useState<string | null>(null);

    const headers = useMemo(() => ({ Authorization: api?.authorizationHeader ?? '' }), [api]);
    const base = api ? `${api.basePath}/Khylo/HomeProfiles/Admin` : '';

    const load = useCallback(async () => {
        if (!api) return;
        const response = await api.axiosInstance.get<HomeProfilesAdmin>(base, { headers });
        setData(response.data);
        setMaxDraft(String(response.data.MaxProfilesPerHome));
    }, [ api, base, headers ]);

    useEffect(() => {
        load().catch(() => setMessage('Couldn\'t load home profiles.'));
    }, [load]);

    const saveSettings = useCallback(async (allowByDefault: boolean, maxProfiles: number) => {
        if (!api) return;
        try {
            await api.axiosInstance.post(`${base}/Settings`, { AllowByDefault: allowByDefault, MaxProfilesPerHome: maxProfiles }, { headers });
            await load();
            setMessage('Saved.');
        } catch {
            setMessage('Couldn\'t save the settings.');
        }
    }, [ api, base, headers, load ]);

    const setAllowance = useCallback(async (user: HomeOwner, choice: Choice) => {
        if (!api) return;
        const allowed = choice === 'default' ? null : choice === 'allow';
        try {
            await api.axiosInstance.post(`${base}/Users/${user.Id}`, { Allowed: allowed }, { headers });
            await load();
        } catch {
            setMessage(`Couldn't update ${user.Name}.`);
        }
    }, [ api, base, headers, load ]);

    const removeProfile = useCallback(async () => {
        if (!api || !toRemove) return;
        try {
            await api.axiosInstance.delete(`${base}/Profiles/${toRemove.Id}`, { headers });
            await load();
            setMessage(`${toRemove.Name} was removed.`);
        } catch {
            setMessage(`Couldn't remove ${toRemove.Name}.`);
        } finally {
            setToRemove(null);
        }
    }, [ api, base, headers, load, toRemove ]);

    const commitMax = useCallback(() => {
        if (!data) return;
        const value = Math.min(20, Math.max(1, parseInt(maxDraft || '0', 10) || data.MaxProfilesPerHome));
        if (value !== data.MaxProfilesPerHome) void saveSettings(data.AllowByDefault, value);
        else setMaxDraft(String(value));
    }, [ data, maxDraft, saveSettings ]);

    const users = useMemo(() => {
        const list = data?.Users ?? [];
        const term = searchTerm.trim().toLowerCase();
        return term ? list.filter(u => u.Name.toLowerCase().includes(term) || u.Profiles.some(p => p.Name.toLowerCase().includes(term))) : list;
    }, [ data, searchTerm ]);

    const columns = useMemo<ColumnDef<HomeOwner>[]>(() => [
        {
            id: 'user',
            header: 'Account',
            width: '220px',
            render: (row) => (
                <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>{row.Name}</Typography>
                    {row.IsAdministrator && <KhyloStatusBadge label='Admin' color='idle' />}
                </Stack>
            )
        },
        {
            id: 'allowed',
            header: 'Can add profiles',
            width: '230px',
            render: (row) => row.IsAdministrator ? (
                <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>Always (admin)</Typography>
            ) : (
                <Select
                    size='small'
                    value={choiceOf(row.Allowed)}
                    onChange={e => { void setAllowance(row, e.target.value as Choice); }}
                    sx={{ minWidth: 200, fontSize: '0.85rem' }}
                >
                    <MenuItem value='default'>{`Server default (${data?.AllowByDefault ? 'yes' : 'no'})`}</MenuItem>
                    <MenuItem value='allow'>Yes</MenuItem>
                    <MenuItem value='deny'>No</MenuItem>
                </Select>
            )
        },
        {
            id: 'profiles',
            header: 'Profiles in their home',
            render: (row) => row.Profiles.length === 0 ? (
                <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>None</Typography>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {row.Profiles.map(profile => (
                        <Chip
                            key={profile.Id}
                            size='small'
                            label={profile.IsKids ? `${profile.Name} · Kids` : profile.Name}
                            onDelete={() => setToRemove(profile)}
                            sx={{ bgcolor: KHYLO_COLORS.surfaceSecondary, color: KHYLO_COLORS.textPrimary }}
                        />
                    ))}
                </Box>
            )
        }
    ], [ data, setAllowance ]);

    return (
        <Page id='homeProfilesPage' title='Home Profiles' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Access' }, { label: 'Home Profiles' } ]}
                    title='Home Profiles'
                    subtitle='Let the people you share this server with add profiles for their own household. A profile never gets more access than the person who made it, and everyone in a home shares that person’s stream limit.'
                />

                <KhyloSettingSection title='Settings' description='Admins can always add profiles to their own home.'>
                    <KhyloSettingRow
                        title='Let users add home profiles'
                        description='Users can add profiles for their family unless you switch it off for them below.'
                        control={
                            <Switch
                                checked={data?.AllowByDefault ?? true}
                                disabled={!data}
                                onChange={e => { if (data) void saveSettings(e.target.checked, data.MaxProfilesPerHome); }}
                            />
                        }
                    />
                    <KhyloSettingRow
                        title='Profiles per home'
                        description='How many profiles each user can add, between 1 and 20.'
                        control={
                            <TextField
                                type='number'
                                size='small'
                                value={maxDraft}
                                disabled={!data}
                                onChange={e => setMaxDraft(e.target.value)}
                                onBlur={commitMax}
                                onKeyDown={e => { if (e.key === 'Enter') commitMax(); }}
                                slotProps={{ htmlInput: { min: 1, max: 20 } }}
                                sx={{ width: 96 }}
                            />
                        }
                    />
                </KhyloSettingSection>

                <KhyloDataTable
                    columns={columns}
                    data={users}
                    keyExtractor={(row) => row.Id}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder='Search accounts and profiles…'
                    emptyMessage='No accounts found'
                    isLoading={!data}
                />

                <ConfirmDialog
                    open={Boolean(toRemove)}
                    title='Remove profile'
                    text={toRemove ? `Remove ${toRemove.Name}? Their watch history and favorites are deleted too.` : ''}
                    onCancel={() => setToRemove(null)}
                    onConfirm={() => { void removeProfile(); }}
                    confirmButtonColor='error'
                    confirmButtonText='Remove'
                />

                <Snackbar
                    open={Boolean(message)}
                    autoHideDuration={3500}
                    onClose={() => setMessage(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity='info'
                        icon={<FamilyRestroomIcon fontSize='small' />}
                        onClose={() => setMessage(null)}
                        sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                    >
                        {message}
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'HomeProfilesPage';
export default Component;
