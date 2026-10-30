import React, { FC, useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import BlockIcon from '@mui/icons-material/Block';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';

import Page from 'components/Page';
import ConfirmDialog from 'components/ConfirmDialog';
import { type InvitationDto, useInvitations } from 'apps/dashboard/features/invitations/api/useInvitations';
import { useCreateInvitation } from 'apps/dashboard/features/invitations/api/useCreateInvitation';
import { useRevokeInvitation } from 'apps/dashboard/features/invitations/api/useRevokeInvitation';
import { useClearFinishedInvitations, useDeleteInvitation } from 'apps/dashboard/features/invitations/api/useDeleteInvitation';
import { useLocale } from 'hooks/useLocale';
import { useApi } from 'hooks/useApi';
import { copy } from 'scripts/clipboard';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloDataTable,
    KhyloStatusBadge,
    KhyloEmptyState,
    KhyloTabs,
    type ColumnDef
} from '../../components/ui';

export const Component: FC = () => {
    const { dateFnsLocale } = useLocale();
    const { data: invitations, isLoading } = useInvitations();
    const inviteList = useMemo(() => invitations || [], [invitations]);

    const createInvitation = useCreateInvitation();
    const revokeInvitation = useRevokeInvitation();
    const deleteInvitation = useDeleteInvitation();
    const clearFinished = useClearFinishedInvitations();

    // Active invitations up front; used, expired and revoked ones under History
    const [view, setView] = useState<'active' | 'history'>('active');
    const activeInvites = useMemo(() => inviteList.filter(i => i.Status === 'Active'), [inviteList]);
    const finishedInvites = useMemo(() => inviteList.filter(i => i.Status !== 'Active'), [inviteList]);
    const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [expirationDays, setExpirationDays] = useState<number>(7);
    const [maxUses, setMaxUses] = useState<number>(1);
    const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);
    const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

    // Invitations are for people outside the home, so links use the server's web address when it has one
    const { api } = useApi();
    const [webAddress, setWebAddress] = useState<string | null>(null);
    useEffect(() => {
        if (!api) return;
        fetch(`${api.basePath}/Khylo/WebAddress`)
            .then(r => (r.ok ? r.json() as Promise<{ Address?: string | null }> : null))
            .then(d => setWebAddress(d?.Address ? d.Address.replace(/\/$/, '') : null))
            .catch(() => setWebAddress(null));
    }, [api]);

    const onCopyToken = useCallback((code: string) => {
        const base = webAddress ?? window.location.origin;
        const inviteUrl = `${base}${window.location.pathname}#/invite?code=${encodeURIComponent(code)}`;
        void copy(inviteUrl);
        setSnackbarMsg('Invitation link copied to clipboard');
    }, [webAddress]);

    const onCreateSubmit = useCallback(async () => {
        try {
            const result = await createInvitation.mutateAsync({
                LifetimeHours: expirationDays * 24,
                MaxUses: maxUses
            });
            setIsCreateDialogOpen(false);
            onCopyToken(result.Code);
            setSnackbarMsg('Invitation created and link copied to clipboard!');
        } catch {
            setSnackbarMsg('Failed to create user invitation.');
        }
    }, [createInvitation, expirationDays, maxUses, onCopyToken]);

    const onRevokeConfirm = useCallback(async () => {
        if (!invitationToRevoke) return;
        try {
            await revokeInvitation.mutateAsync(invitationToRevoke);
            setSnackbarMsg('Invitation revoked.');
        } catch {
            setSnackbarMsg('Failed to revoke invitation.');
        } finally {
            setInvitationToRevoke(null);
        }
    }, [invitationToRevoke, revokeInvitation]);

    const onDeleteConfirm = useCallback(async () => {
        if (!invitationToDelete) return;
        try {
            await deleteInvitation.mutateAsync(invitationToDelete);
            setSnackbarMsg('Invitation removed.');
        } catch {
            setSnackbarMsg('Failed to remove invitation.');
        } finally {
            setInvitationToDelete(null);
        }
    }, [invitationToDelete, deleteInvitation]);

    const onClearConfirm = useCallback(async () => {
        try {
            const removed = await clearFinished.mutateAsync();
            setSnackbarMsg(removed === 1 ? '1 invitation removed.' : `${removed} invitations removed.`);
        } catch {
            setSnackbarMsg('Failed to clear history.');
        } finally {
            setIsClearConfirmOpen(false);
        }
    }, [clearFinished]);

    const filteredInvitations = useMemo(() => {
        const list = view === 'active' ? activeInvites : finishedInvites;
        if (!searchTerm.trim()) return list;
        const term = searchTerm.toLowerCase();
        return list.filter(inv =>
            inv.Code?.toLowerCase().includes(term)
            || inv.RedeemedBy?.some(r => r.Username.toLowerCase().includes(term))
        );
    }, [activeInvites, finishedInvites, searchTerm, view]);

    const columns = useMemo<ColumnDef<InvitationDto>[]>(() => [
        {
            id: 'token',
            header: 'Invitation Token',
            width: '280px',
            render: (row) => (
                <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography
                        variant='body2'
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: KHYLO_COLORS.textPrimary,
                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                            px: 1,
                            py: 0.25,
                            borderRadius: '4px',
                            border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                        }}
                    >
                        {row.Code}
                    </Typography>
                    {row.Status === 'Active' && <Tooltip title='Copy invitation link'>
                        <IconButton
                            size='small'
                            onClick={() => onCopyToken(row.Code)}
                            sx={{ color: KHYLO_COLORS.accent, '&:hover': { color: KHYLO_COLORS.accentHover } }}
                        >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>}
                </Stack>
            )
        },
        {
            id: 'status',
            header: 'State',
            width: '130px',
            render: (row) => {
                switch (row.Status) {
                    case 'Active':
                        return <KhyloStatusBadge label='Active' color='healthy' />;
                    case 'Used':
                        return <KhyloStatusBadge label='Used' color='idle' />;
                    case 'Expired':
                        return <KhyloStatusBadge label='Expired' color='idle' />;
                    default:
                        return <KhyloStatusBadge label='Revoked' color='danger' />;
                }
            }
        },
        {
            id: 'redemptions',
            header: 'Joined',
            width: '200px',
            render: (row) => (
                <Stack spacing={0.25}>
                    <Typography variant='body2' sx={{ fontSize: '0.82rem', color: KHYLO_COLORS.textSecondary }}>
                        {row.UseCount} of {row.MaxUses}
                    </Typography>
                    {row.RedeemedBy?.map(r => (
                        <Link
                            key={r.UserId}
                            component={RouterLink}
                            to={`/dashboard/users/${r.UserId}/profile`}
                            underline='hover'
                            sx={{ fontSize: '0.8rem', color: KHYLO_COLORS.textPrimary }}
                        >
                            {r.Username}
                        </Link>
                    ))}
                </Stack>
            )
        },
        {
            id: 'created',
            header: 'Created Date',
            width: '180px',
            render: (row) => {
                if (!row.CreatedAtUtc) return <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>—</Typography>;
                const formatted = format(parseISO(row.CreatedAtUtc), 'Pp', { locale: dateFnsLocale });
                return (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.8rem' }}>
                        {formatted}
                    </Typography>
                );
            }
        },
        {
            id: 'expires',
            header: 'Expires At',
            width: '180px',
            render: (row) => {
                if (!row.ExpiresAtUtc) return <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>Never</Typography>;
                const formatted = format(parseISO(row.ExpiresAtUtc), 'Pp', { locale: dateFnsLocale });
                return (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.8rem' }}>
                        {formatted}
                    </Typography>
                );
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            width: '80px',
            align: 'right',
            render: (row) => (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {row.Status === 'Active' ? (
                        <Tooltip title='Revoke invitation'>
                            <IconButton
                                size='small'
                                onClick={() => setInvitationToRevoke(row.Id)}
                                sx={{ color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.status.danger.fg } }}
                            >
                                <BlockIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title='Remove from history'>
                            <IconButton
                                size='small'
                                onClick={() => setInvitationToDelete(row.Id)}
                                sx={{ color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.status.danger.fg } }}
                            >
                                <DeleteOutlineIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            )
        }
    ], [dateFnsLocale, onCopyToken]);

    return (
        <Page id='invitationsPage' title='Invitations' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Access' },
                        { label: 'Invitations' }
                    ]}
                    title='User Onboarding Invitations'
                    subtitle='Issue timed, single-use, or multi-use invitation tokens that allow new members to self-register.'
                    badge={
                        <KhyloStatusBadge
                            label={`${activeInvites.length} active`}
                            color={activeInvites.length > 0 ? 'healthy' : 'idle'}
                        />
                    }
                    actions={
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            onClick={() => setIsCreateDialogOpen(true)}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                color: KHYLO_COLORS.textPrimary,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Generate Invitation
                        </Button>
                    }
                />

                {inviteList.length === 0 && !isLoading ? (
                    <KhyloEmptyState
                        icon={<MarkEmailReadIcon />}
                        title='No invitations yet'
                        description='Generate invitation tokens to securely invite family, friends, or team members to your server.'
                        action={
                            <Button
                                variant='contained'
                                startIcon={<AddIcon />}
                                onClick={() => setIsCreateDialogOpen(true)}
                                sx={{
                                    bgcolor: KHYLO_COLORS.accent,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                }}
                            >
                                Generate First Invitation
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <Stack direction='row' alignItems='flex-end' justifyContent='space-between'>
                            <Box sx={{ flexGrow: 1 }}>
                                <KhyloTabs
                                    tabs={[
                                        { id: 'active', label: 'Active', count: activeInvites.length },
                                        { id: 'history', label: 'History', count: finishedInvites.length }
                                    ]}
                                    activeTab={view}
                                    onChange={(id) => setView(id === 'history' ? 'history' : 'active')}
                                />
                            </Box>
                            {view === 'history' && finishedInvites.length > 0 && (
                                <Button
                                    size='small'
                                    onClick={() => setIsClearConfirmOpen(true)}
                                    variant='outlined'
                                    sx={{
                                        mb: 3,
                                        ml: 2,
                                        bgcolor: 'transparent',
                                        color: KHYLO_COLORS.textSecondary,
                                        borderColor: KHYLO_COLORS.borderDefault,
                                        textTransform: 'none',
                                        boxShadow: 'none',
                                        '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover, color: KHYLO_COLORS.textPrimary, borderColor: KHYLO_COLORS.borderStrong }
                                    }}
                                >
                                    Clear history
                                </Button>
                            )}
                        </Stack>
                        <KhyloDataTable
                            columns={columns}
                            data={filteredInvitations}
                            keyExtractor={(item) => item.Id || String(Math.random())}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            searchPlaceholder='Search by token snippet…'
                            emptyMessage={view === 'history' ?
                                'Used, expired and revoked invitations show here, and clear themselves after 30 days.' :
                                'No active invitations. Generate one to invite someone.'}
                            isLoading={isLoading}
                        />
                    </>
                )}

                {/* Create Invitation Modal */}
                <Dialog
                    open={isCreateDialogOpen}
                    onClose={() => setIsCreateDialogOpen(false)}
                    PaperProps={{
                        sx: {
                            bgcolor: KHYLO_COLORS.surfacePrimary,
                            border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                            borderRadius: '8px',
                            minWidth: 420
                        }
                    }}
                >
                    <DialogTitle sx={{ color: KHYLO_COLORS.textPrimary, fontSize: '1rem', fontWeight: 600 }}>
                        Generate New Invitation Token
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2.5} sx={{ pt: 1 }}>
                            <TextField
                                label='Validity Period (Days)'
                                type='number'
                                size='small'
                                fullWidth
                                value={expirationDays}
                                onChange={(e) => setExpirationDays(parseInt(e.target.value || '1', 10))}
                                helperText='Days until the invitation token expires automatically'
                                InputProps={{ inputProps: { min: 1, max: 365 } }}
                            />
                            <TextField
                                label='Maximum Number of Redemptions'
                                type='number'
                                size='small'
                                fullWidth
                                value={maxUses}
                                onChange={(e) => setMaxUses(parseInt(e.target.value || '1', 10))}
                                helperText='How many new user accounts can be created with this token'
                                InputProps={{ inputProps: { min: 1, max: 100 } }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={() => setIsCreateDialogOpen(false)}
                            sx={{ color: KHYLO_COLORS.textSecondary, textTransform: 'none' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={() => void onCreateSubmit()}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Generate & Copy Link
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Revoke Confirm Dialog */}
                <ConfirmDialog
                    open={Boolean(invitationToRevoke)}
                    title='Revoke Invitation Token'
                    text='Are you sure you want to revoke this invitation? Any pending registration attempts using this token will be rejected.'
                    onCancel={() => setInvitationToRevoke(null)}
                    onConfirm={onRevokeConfirm}
                    confirmButtonColor='error'
                    confirmButtonText='Revoke Token'
                />

                <ConfirmDialog
                    open={Boolean(invitationToDelete)}
                    title='Remove Invitation'
                    text='Remove this invitation from the history? Anyone who joined with it keeps their account.'
                    onCancel={() => setInvitationToDelete(null)}
                    onConfirm={onDeleteConfirm}
                    confirmButtonColor='error'
                    confirmButtonText='Remove'
                />

                <ConfirmDialog
                    open={isClearConfirmOpen}
                    title='Clear History'
                    text='Remove every used, expired and revoked invitation? Anyone who joined with them keeps their account.'
                    onCancel={() => setIsClearConfirmOpen(false)}
                    onConfirm={onClearConfirm}
                    confirmButtonColor='error'
                    confirmButtonText='Clear history'
                />

                <Snackbar
                    open={Boolean(snackbarMsg)}
                    autoHideDuration={3500}
                    onClose={() => setSnackbarMsg(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity='info'
                        onClose={() => setSnackbarMsg(null)}
                        sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                    >
                        {snackbarMsg}
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'InvitationsPage';
export default Component;
