import React, { FC, useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';

import type { AuthenticationInfo } from '@khylo/sdk/lib/generated-client/models/authentication-info';
import Page from 'components/Page';
import InputDialog from 'components/InputDialog';
import ConfirmDialog from 'components/ConfirmDialog';
import { useApiKeys } from 'apps/dashboard/features/keys/api/useApiKeys';
import { useRevokeKey } from 'apps/dashboard/features/keys/api/useRevokeKey';
import { useCreateKey } from 'apps/dashboard/features/keys/api/useCreateKey';
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

export const Component: FC = () => {
    const { dateFnsLocale } = useLocale();
    const { data, isLoading } = useApiKeys();
    const keys = useMemo(() => data?.Items || [], [data]);

    const revokeKey = useRevokeKey();
    const createKey = useCreateKey();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatePromptOpen, setIsCreatePromptOpen] = useState(false);
    const [pendingRevokeToken, setPendingRevokeToken] = useState<string | null>(null);
    const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

    const handleCopyKey = useCallback((token: string) => {
        void navigator.clipboard.writeText(token);
        setSnackbarMsg('API Key copied to clipboard');
    }, []);

    const handleCreateKey = useCallback(async (appName?: string | null) => {
        if (!appName?.trim()) {
            setIsCreatePromptOpen(false);
            return;
        }
        try {
            await createKey.mutateAsync({ app: appName.trim() });
            setSnackbarMsg(`API Key created for ${appName.trim()}`);
        } catch (err) {
            console.error('[ApiKeysPage] failed creating key', err);
            setSnackbarMsg('Failed to generate API Key');
        } finally {
            setIsCreatePromptOpen(false);
        }
    }, [createKey]);

    const handleConfirmRevoke = useCallback(async () => {
        if (!pendingRevokeToken) return;
        try {
            await revokeKey.mutateAsync({ key: pendingRevokeToken });
            setSnackbarMsg('API Key revoked');
        } catch (err) {
            console.error('[ApiKeysPage] failed revoking key', err);
            setSnackbarMsg('Failed to revoke API Key');
        } finally {
            setPendingRevokeToken(null);
        }
    }, [pendingRevokeToken, revokeKey]);

    const filteredKeys = useMemo(() => {
        if (!searchTerm.trim()) return keys;
        const term = searchTerm.toLowerCase();
        return keys.filter(k =>
            (k.AppName && k.AppName.toLowerCase().includes(term)) ||
            (k.AccessToken && k.AccessToken.toLowerCase().includes(term))
        );
    }, [keys, searchTerm]);

    const columns = useMemo<ColumnDef<AuthenticationInfo>[]>(() => [
        {
            id: 'app',
            header: 'Application / Client Service',
            width: '260px',
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
                        <KeyIcon sx={{ fontSize: 16, color: KHYLO_COLORS.accent }} />
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {row.AppName || 'Unnamed Service'}
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                            {row.DeviceName || 'Dedicated API Token'}
                        </Typography>
                    </Box>
                </Stack>
            )
        },
        {
            id: 'token',
            header: 'API Access Token',
            render: (row) => {
                const token = row.AccessToken || '';
                const masked = token.length > 12 ? `${token.substring(0, 6)}••••••••${token.substring(token.length - 4)}` : token;
                return (
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <Typography
                            variant='body2'
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.8rem',
                                color: KHYLO_COLORS.textSecondary,
                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                px: 1,
                                py: 0.25,
                                borderRadius: '4px',
                                border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                            }}
                        >
                            {masked}
                        </Typography>
                        <Tooltip title='Copy Full Token'>
                            <IconButton
                                size='small'
                                onClick={() => handleCopyKey(token)}
                                sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.accent } }}
                            >
                                <ContentCopyIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            }
        },
        {
            id: 'date',
            header: 'Issued Date',
            width: '200px',
            render: (row) => {
                if (!row.DateCreated) return <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>—</Typography>;
                const formatted = format(parseISO(row.DateCreated), 'Pp', { locale: dateFnsLocale });
                return (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.8rem' }}>
                        {formatted}
                    </Typography>
                );
            }
        },
        {
            id: 'status',
            header: 'Token Status',
            width: '130px',
            render: () => <KhyloStatusBadge label='Active' color='healthy' />
        },
        {
            id: 'actions',
            header: 'Actions',
            width: '80px',
            align: 'right',
            render: (row) => (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Tooltip title='Revoke Key'>
                        <IconButton
                            size='small'
                            onClick={() => row.AccessToken && setPendingRevokeToken(row.AccessToken)}
                            sx={{ color: KHYLO_COLORS.status.danger.fg, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                        >
                            <DeleteOutlineIcon fontSize='small' />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ], [dateFnsLocale, handleCopyKey]);

    return (
        <Page id='apiKeysPage' title='API Keys' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Security' },
                        { label: 'API Keys' }
                    ]}
                    title='API Access Keys'
                    subtitle='Cryptographic bearer tokens for automated integration, scripts, external players, and daemon sync pipelines.'
                    badge={
                        <KhyloStatusBadge
                            label={`${keys.length} Keys Active`}
                            color={keys.length > 0 ? 'healthy' : 'idle'}
                        />
                    }
                    actions={
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            onClick={() => setIsCreatePromptOpen(true)}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                color: KHYLO_COLORS.textPrimary,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Generate New Key
                        </Button>
                    }
                />

                {keys.length === 0 && !isLoading ? (
                    <KhyloEmptyState
                        icon={<KeyIcon />}
                        title='No API keys issued'
                        description='Create an API key to authorize automated scripts, scrapers, and external client services.'
                        action={
                            <Button
                                variant='contained'
                                startIcon={<AddIcon />}
                                onClick={() => setIsCreatePromptOpen(true)}
                                sx={{
                                    bgcolor: KHYLO_COLORS.accent,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                }}
                            >
                                Generate First Key
                            </Button>
                        }
                    />
                ) : (
                    <KhyloDataTable
                        columns={columns}
                        data={filteredKeys}
                        keyExtractor={(item) => item.AccessToken || String(Math.random())}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder='Search by application name or token…'
                        emptyMessage='No matching API keys found'
                        isLoading={isLoading}
                    />
                )}

                <InputDialog
                    open={isCreatePromptOpen}
                    title='Generate API Key'
                    label='Application Name'
                    helperText='Enter the name of the application, script, or service that will authenticate using this key'
                    onClose={() => setIsCreatePromptOpen(false)}
                    onConfirm={handleCreateKey}
                    confirmButtonText='Generate Key'
                />

                <ConfirmDialog
                    open={Boolean(pendingRevokeToken)}
                    title='Revoke API Access Key'
                    text='Are you sure you want to permanently revoke this API token? Any applications or automated scripts relying on this key will be disconnected immediately.'
                    onCancel={() => setPendingRevokeToken(null)}
                    onConfirm={handleConfirmRevoke}
                    confirmButtonColor='error'
                    confirmButtonText='Revoke Key'
                />

                <Snackbar
                    open={Boolean(snackbarMsg)}
                    autoHideDuration={3000}
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

Component.displayName = 'ApiKeysPage';
export default Component;
