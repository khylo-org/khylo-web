import React, { FC, useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GroupIcon from '@mui/icons-material/Group';
import { useNavigate } from 'react-router-dom';

import { useUsers } from 'hooks/useUsers';
import { useDeleteUser } from 'apps/dashboard/features/users/api/useDeleteUser';
import ConfirmDialog from 'components/ConfirmDialog';
import { UserTab } from 'apps/dashboard/features/users/constants/userTab';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloDataTable,
    KhyloStatusBadge,
    KhyloEmptyState,
    type ColumnDef
} from '../../components/ui';

export const Component: FC = () => {
    const navigate = useNavigate();
    const { data: users, isPending: isLoading } = useUsers(undefined, { forceRefresh: true });
    const deleteUser = useDeleteUser();

    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = useCallback(() => {
        if (!deleteTarget) return;
        deleteUser.mutate({ userId: deleteTarget.id });
        setDeleteTarget(null);
    }, [deleteTarget, deleteUser]);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchTerm) return users;
        const q = searchTerm.toLowerCase();
        return users.filter((u: any) =>
            u.Name?.toLowerCase().includes(q) ||
            (u.Policy?.IsAdministrator ? 'administrator' : 'user').includes(q)
        );
    }, [users, searchTerm]);

    const adminCount = useMemo(() => {
        return (users || []).filter((u: any) => u.Policy?.IsAdministrator).length;
    }, [users]);

    const columns: ColumnDef<any>[] = [
        {
            id: 'identity',
            header: 'User Account',
            width: '35%',
            render: (user: any) => {
                const isAdmin = Boolean(user.Policy?.IsAdministrator);
                const firstLetter = (user.Name || 'U').charAt(0).toUpperCase();

                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                bgcolor: isAdmin ? KHYLO_COLORS.accent : KHYLO_COLORS.surfaceSecondary,
                                color: isAdmin ? '#FFFFFF' : KHYLO_COLORS.textPrimary,
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                border: `1px solid ${isAdmin ? KHYLO_COLORS.accent : KHYLO_COLORS.borderSubtle}`
                            }}
                        >
                            {firstLetter}
                        </Avatar>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant='body2' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary }}>
                                    {user.Name}
                                </Typography>
                                {isAdmin && (
                                    <SecurityIcon sx={{ fontSize: 14, color: KHYLO_COLORS.accent }} />
                                )}
                            </Box>
                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                                ID: {user.Id ? `${user.Id.substring(0, 8)}…` : '—'}
                            </Typography>
                        </Box>
                    </Box>
                );
            }
        },
        {
            id: 'role',
            header: 'Privilege Level',
            width: '20%',
            render: (user: any) => {
                const isAdmin = Boolean(user.Policy?.IsAdministrator);
                return (
                    <KhyloStatusBadge
                        label={isAdmin ? 'Administrator' : 'Standard User'}
                        color={isAdmin ? 'healthy' : 'idle'}
                    />
                );
            }
        },
        {
            id: 'activity',
            header: 'Last Active',
            width: '25%',
            render: (user: any) => {
                if (!user.LastActivityDate) {
                    return (
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                            Never active
                        </Typography>
                    );
                }
                const d = new Date(user.LastActivityDate);
                return (
                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary, fontFamily: 'monospace' }}>
                        {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                );
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            width: '20%',
            align: 'right',
            render: (user: any) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Button
                        size='small'
                        variant='text'
                        onClick={() => navigate(`/dashboard/users/${user.Id}/${UserTab.Profile}`)}
                        sx={{
                            color: KHYLO_COLORS.textSecondary,
                            textTransform: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            '&:hover': { color: KHYLO_COLORS.accent }
                        }}
                    >
                        Edit Profile
                    </Button>
                    <IconButton
                        size='small'
                        title='Access & Permissions'
                        onClick={() => navigate(`/dashboard/users/${user.Id}/${UserTab.Access}`)}
                        sx={{
                            color: KHYLO_COLORS.textSecondary,
                            '&:hover': { color: KHYLO_COLORS.textPrimary, bgcolor: KHYLO_COLORS.surfaceHover }
                        }}
                    >
                        <LockOpenIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                        size='small'
                        title='Delete User'
                        onClick={() => setDeleteTarget({ id: user.Id, name: user.Name })}
                        sx={{
                            color: KHYLO_COLORS.textMuted,
                            '&:hover': { color: KHYLO_COLORS.status.danger.fg, bgcolor: 'rgba(239,68,68,0.1)' }
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>
            )
        }
    ];

    return (
        <KhyloPage>
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title='Delete User Account'
                text={`Are you sure you want to permanently delete the account "${deleteTarget?.name}"? All playback history, favorites, and permissions will be removed.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmButtonText='Delete Account'
                confirmButtonColor='error'
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Access Control' },
                    { label: 'User Accounts' }
                ]}
                title='User Accounts'
                subtitle='Manage administrative credentials, local user accounts, library access scopes, and streaming restrictions.'
                badge={
                    <KhyloStatusBadge
                        label={`${users?.length || 0} Accounts · ${adminCount} Admin`}
                        color='healthy'
                        size='medium'
                    />
                }
                actions={
                    <Button
                        variant='contained'
                        size='small'
                        startIcon={<PersonAddIcon />}
                        onClick={() => navigate('/dashboard/users/add')}
                        sx={{
                            textTransform: 'none',
                            bgcolor: KHYLO_COLORS.accent,
                            color: '#FFFFFF',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                        }}
                    >
                        New User Account
                    </Button>
                }
            />

            {isLoading ? (
                <Typography color='text.secondary'>Loading user accounts…</Typography>
            ) : !users?.length ? (
                <KhyloEmptyState
                    icon={<GroupIcon />}
                    title='No User Accounts Found'
                    description='Create an account to allow someone to stream and manage content on this Khylo server.'
                    action={
                        <Button
                            variant='contained'
                            startIcon={<PersonAddIcon />}
                            onClick={() => navigate('/dashboard/users/add')}
                            sx={{ textTransform: 'none', bgcolor: KHYLO_COLORS.accent, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                        >
                            Create First Account
                        </Button>
                    }
                />
            ) : (
                <KhyloDataTable
                    columns={columns}
                    data={filteredUsers}
                    keyExtractor={(u) => u.Id || String(Math.random())}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder='Search user accounts by name or role…'
                />
            )}
        </KhyloPage>
    );
};

export default Component;
