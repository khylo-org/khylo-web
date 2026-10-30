import React, { FC, useState, useMemo, useCallback } from 'react';
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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import WebhookIcon from '@mui/icons-material/Webhook';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';

import Page from 'components/Page';
import ConfirmDialog from 'components/ConfirmDialog';
import { type KhyloWebhookDto, useWebhooks } from 'apps/dashboard/features/webhooks/api/useWebhooks';
import { useCreateWebhook } from 'apps/dashboard/features/webhooks/api/useCreateWebhook';
import { useDeleteWebhook } from 'apps/dashboard/features/webhooks/api/useDeleteWebhook';
import { useTestWebhook } from 'apps/dashboard/features/webhooks/api/useTestWebhook';
import { useLocale } from 'hooks/useLocale';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloDataTable,
    KhyloStatusBadge,
    KhyloEmptyState,
    type ColumnDef
} from '../../components/ui';

const AVAILABLE_EVENTS = [
    { id: 'playback.start', label: 'Playback Started' },
    { id: 'playback.pause', label: 'Playback Paused' },
    { id: 'playback.stop', label: 'Playback Stopped' },
    { id: 'library.itemadded', label: 'Media Item Added' },
    { id: 'library.itemupdated', label: 'Metadata Refreshed' },
    { id: 'library.scancompleted', label: 'Library Scan Completed' },
    { id: 'user.created', label: 'User Created' },
    { id: 'user.authenticated', label: 'User Authenticated' },
    { id: 'system.serverstarted', label: 'Server Daemon Started' },
    { id: 'system.storage_warning', label: 'Low Storage Warning' }
];

export const Component: FC = () => {
    const { dateFnsLocale } = useLocale();
    const { data: webhooks, isLoading } = useWebhooks();
    const webhookList = useMemo(() => webhooks || [], [webhooks]);

    const createWebhook = useCreateWebhook();
    const deleteWebhook = useDeleteWebhook();
    const testWebhook = useTestWebhook();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([
        'playback.start',
        'playback.stop',
        'library.itemadded',
        'system.storage_warning'
    ]);

    const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
    const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

    const onToggleEvent = (eventId: string) => {
        setSelectedEvents((prev) =>
            prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
        );
    };

    const onCreateSubmit = useCallback(async () => {
        if (!name.trim() || !url.trim()) return;
        try {
            await createWebhook.mutateAsync({
                Name: name.trim(),
                Url: url.trim(),
                Secret: secret.trim() || undefined,
                Events: selectedEvents,
                IsEnabled: true
            });
            setIsCreateDialogOpen(false);
            setName('');
            setUrl('');
            setSecret('');
            setSnackbarMsg('Webhook destination registered.');
        } catch {
            setSnackbarMsg('Failed to register webhook.');
        }
    }, [createWebhook, name, url, secret, selectedEvents]);

    const onTriggerTest = useCallback(async (webhookId: string) => {
        try {
            const success = await testWebhook.mutateAsync(webhookId);
            setSnackbarMsg(success ? 'Test ping delivered successfully!' : 'Webhook endpoint returned error.');
        } catch {
            setSnackbarMsg('Failed to deliver test payload.');
        }
    }, [testWebhook]);

    const onConfirmDelete = useCallback(async () => {
        if (!webhookToDelete) return;
        try {
            await deleteWebhook.mutateAsync(webhookToDelete);
            setSnackbarMsg('Webhook removed.');
        } catch {
            setSnackbarMsg('Failed to remove webhook.');
        } finally {
            setWebhookToDelete(null);
        }
    }, [deleteWebhook, webhookToDelete]);

    const filteredWebhooks = useMemo(() => {
        if (!searchTerm.trim()) return webhookList;
        const term = searchTerm.toLowerCase();
        return webhookList.filter(w =>
            (w.Name && w.Name.toLowerCase().includes(term)) ||
            (w.Url && w.Url.toLowerCase().includes(term))
        );
    }, [webhookList, searchTerm]);

    const columns = useMemo<ColumnDef<KhyloWebhookDto>[]>(() => [
        {
            id: 'name',
            header: 'Destination & Endpoint',
            width: '320px',
            render: (row) => (
                <Stack direction='row' alignItems='center' spacing={1.5}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                        }}
                    >
                        <WebhookIcon sx={{ fontSize: 16, color: KHYLO_COLORS.accent }} />
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {row.Name}
                        </Typography>
                        <Typography
                            variant='caption'
                            sx={{
                                color: KHYLO_COLORS.textMuted,
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 260
                            }}
                        >
                            {row.Url}
                        </Typography>
                    </Box>
                </Stack>
            )
        },
        {
            id: 'events',
            header: 'Subscribed Events',
            render: (row) => (
                <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.8rem' }}>
                    {row.Events.length} {row.Events.length === 1 ? 'event trigger' : 'event triggers'}
                </Typography>
            )
        },
        {
            id: 'status',
            header: 'State',
            width: '120px',
            render: (row) => (
                <KhyloStatusBadge
                    label={row.IsEnabled ? 'Active' : 'Disabled'}
                    color={row.IsEnabled ? 'healthy' : 'idle'}
                />
            )
        },
        {
            id: 'created',
            header: 'Created Date',
            width: '180px',
            render: (row) => {
                if (!row.CreatedAt) return <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>—</Typography>;
                const formatted = format(parseISO(row.CreatedAt), 'Pp', { locale: dateFnsLocale });
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
            width: '100px',
            align: 'right',
            render: (row) => (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title='Send Test Ping'>
                        <IconButton
                            size='small'
                            onClick={() => onTriggerTest(row.Id)}
                            sx={{ color: KHYLO_COLORS.accent }}
                        >
                            <SendIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title='Remove Webhook'>
                        <IconButton
                            size='small'
                            onClick={() => setWebhookToDelete(row.Id)}
                            sx={{ color: KHYLO_COLORS.status.danger.fg }}
                        >
                            <DeleteOutlineIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ], [dateFnsLocale, onTriggerTest]);

    return (
        <Page id='webhooksPage' title='Webhooks' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'System' },
                        { label: 'Webhooks' }
                    ]}
                    title='Event Webhooks & Automation'
                    subtitle='Dispatch realtime JSON payloads to Discord, Home Assistant, Overseerr, or automation daemons.'
                    badge={
                        <KhyloStatusBadge
                            label={`${webhookList.length} Endpoints`}
                            color={webhookList.length > 0 ? 'healthy' : 'idle'}
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
                            Register Webhook
                        </Button>
                    }
                />

                {webhookList.length === 0 && !isLoading ? (
                    <KhyloEmptyState
                        icon={<WebhookIcon />}
                        title='No webhooks registered'
                        description='Configure webhook endpoints to send push notifications when playback starts, media is ingested, or system events occur.'
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
                                Register First Webhook
                            </Button>
                        }
                    />
                ) : (
                    <KhyloDataTable
                        columns={columns}
                        data={filteredWebhooks}
                        keyExtractor={(item) => item.Id}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder='Search webhooks by name or URL…'
                        emptyMessage='No matching webhooks found'
                        isLoading={isLoading}
                    />
                )}

                {/* Create Webhook Dialog */}
                <Dialog
                    open={isCreateDialogOpen}
                    onClose={() => setIsCreateDialogOpen(false)}
                    PaperProps={{
                        sx: {
                            bgcolor: KHYLO_COLORS.surfacePrimary,
                            border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                            borderRadius: '8px',
                            minWidth: 480
                        }
                    }}
                >
                    <DialogTitle sx={{ color: KHYLO_COLORS.textPrimary, fontSize: '1rem', fontWeight: 600 }}>
                        Register Webhook Destination
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ pt: 1 }}>
                            <TextField
                                label='Webhook Friendly Name'
                                size='small'
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder='e.g. Discord Notifications'
                            />
                            <TextField
                                label='Destination URL'
                                size='small'
                                fullWidth
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder='https://discord.com/api/webhooks/...'
                            />
                            <TextField
                                label='HMAC Secret (Optional)'
                                size='small'
                                fullWidth
                                type='password'
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                helperText='Used to sign payloads with sha256 HMAC header'
                            />

                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary, fontWeight: 600, mt: 1 }}>
                                Event Subscriptions
                            </Typography>
                            <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                                {AVAILABLE_EVENTS.map(evt => (
                                    <FormControlLabel
                                        key={evt.id}
                                        control={
                                            <Checkbox
                                                checked={selectedEvents.includes(evt.id)}
                                                onChange={() => onToggleEvent(evt.id)}
                                                size='small'
                                                sx={{ color: KHYLO_COLORS.textMuted, '&.Mui-checked': { color: KHYLO_COLORS.accent } }}
                                            />
                                        }
                                        label={<Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{evt.label}</Typography>}
                                    />
                                ))}
                            </FormGroup>
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
                            disabled={!name.trim() || !url.trim()}
                            onClick={() => void onCreateSubmit()}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Register
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirm */}
                <ConfirmDialog
                    open={Boolean(webhookToDelete)}
                    title='Remove Webhook Endpoint'
                    text='Are you sure you want to delete this webhook? Event notifications will no longer be dispatched to this destination.'
                    onCancel={() => setWebhookToDelete(null)}
                    onConfirm={onConfirmDelete}
                    confirmButtonColor='error'
                    confirmButtonText='Remove Webhook'
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

Component.displayName = 'WebhooksPage';
export default Component;
