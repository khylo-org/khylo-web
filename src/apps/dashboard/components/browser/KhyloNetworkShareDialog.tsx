import React, { FC, useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import axios from 'axios';

import { KHYLO_COLORS } from '../ui/tokens';

export interface NetworkShare {
    Id: string;
    Name: string;
    Kind: 'smb' | 'nfs';
    Address: string;
    Username?: string | null;
    ReadOnly: boolean;
    Path: string;
    Connected: boolean;
}

/** A network drive someone mapped on the server's computer (Windows), for example X: pointing to \\nas\movies. */
export interface MappedDrive {
    Letter: string;
    Address: string;
    UserName?: string | null;
    Account?: string | null;
    Reachable: boolean;
}

export const fetchMappedDrives = async ({ base, token }: ServerAccess) => (
    (await axios.get<MappedDrive[]>(`${base}/Khylo/NetworkShares/Mapped`, {
        headers: { Authorization: `MediaBrowser Token="${token}"` }
    })).data
);

export interface NetworkSharesResult {
    CanConnect: boolean;
    WhyNot?: string | null;
    Shares: NetworkShare[];
}

/** Base address and token for calls from the folder picker (works during setup too). */
export interface ServerAccess {
    base: string;
    token: string;
}

export const fetchNetworkShares = async ({ base, token }: ServerAccess) => (
    (await axios.get<NetworkSharesResult>(`${base}/Khylo/NetworkShares`, {
        headers: { Authorization: `MediaBrowser Token="${token}"` }
    })).data
);

export const removeNetworkShare = async ({ base, token }: ServerAccess, id: string) => {
    await axios.delete(`${base}/Khylo/NetworkShares/${encodeURIComponent(id)}`, {
        headers: { Authorization: `MediaBrowser Token="${token}"` }
    });
};

interface Props {
    open: boolean;
    access: ServerAccess;
    canConnect: boolean;
    whyNot?: string | null;
    /** The address and login to start with, for a drive already mapped on the computer. */
    initialAddress?: string;
    initialUsername?: string;
    onClose: () => void;
    onConnected: (share: NetworkShare) => void;
}

const SMB_HELP = 'The computer’s name or IP address, then the share: \\\\192.168.1.10\\Movies';
const NFS_HELP = 'The computer’s name or IP address, a colon, then the folder: 192.168.1.10:/volume1/Movies';

/** Connects a Windows/SMB or NFS share so its folders can be used in libraries. */
export const KhyloNetworkShareDialog: FC<Props> = ({ open, access, canConnect, whyNot, initialAddress, initialUsername, onClose, onConnected }) => {
    const [kind, setKind] = useState<'smb' | 'nfs'>('smb');
    const [address, setAddress] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [readOnly, setReadOnly] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setAddress(initialAddress ?? '');
            setUsername(initialUsername ?? '');
            setPassword('');
            setReadOnly(true);
            setError(null);
            setBusy(false);
        }
    }, [open, initialAddress, initialUsername]);

    const onConnect = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!address.trim()) {
            setError(kind === 'smb' ? 'Enter the share, like \\\\nas\\Movies.' : 'Enter the share, like nas:/volume1/Movies.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const response = await axios.post<NetworkShare>(`${access.base}/Khylo/NetworkShares`, {
                Kind: kind,
                Address: address.trim(),
                Username: kind === 'smb' ? username.trim() : null,
                Password: kind === 'smb' ? password : null,
                ReadOnly: readOnly
            }, {
                headers: { Authorization: `MediaBrowser Token="${access.token}"` },
                timeout: 90000
            });
            onConnected(response.data);
        } catch (err) {
            const message = axios.isAxiosError(err) ? (err.response?.data as { Message?: string } | undefined)?.Message : undefined;
            setError(message || 'Couldn’t connect the share. Check the address and try again.');
        } finally {
            setBusy(false);
        }
    }, [access, address, kind, onConnected, password, readOnly, username]);

    const fieldSx = { '& .MuiInputBase-root': { bgcolor: KHYLO_COLORS.surfaceSecondary } };

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            maxWidth='xs'
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: KHYLO_COLORS.surfacePrimary,
                        color: KHYLO_COLORS.textPrimary,
                        borderRadius: '10px',
                        border: `1px solid ${KHYLO_COLORS.borderDefault}`
                    }
                }
            }}
        >
            <Box component='form' onSubmit={onConnect}>
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>Add a network share</DialogTitle>
                <DialogContent>
                    {!canConnect ? (
                        <Alert severity='info' sx={{ whiteSpace: 'pre-line' }}>{whyNot}</Alert>
                    ) : (
                        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
                            <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary }}>
                                Use media from a NAS or another computer. Khylo connects the share and keeps it connected.
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size='small'
                                value={kind}
                                onChange={(_, value: 'smb' | 'nfs' | null) => value && setKind(value)}
                            >
                                <ToggleButton value='smb' sx={{ textTransform: 'none' }}>Windows / SMB</ToggleButton>
                                <ToggleButton value='nfs' sx={{ textTransform: 'none' }}>NFS</ToggleButton>
                            </ToggleButtonGroup>
                            <TextField
                                label='Share'
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder={kind === 'smb' ? '\\\\nas\\Movies' : 'nas:/volume1/Movies'}
                                helperText={kind === 'smb' ? SMB_HELP : NFS_HELP}
                                size='small'
                                fullWidth
                                sx={fieldSx}
                                slotProps={{ htmlInput: { spellCheck: false, autoCapitalize: 'off' } }}
                            />
                            {kind === 'smb' && (
                                <>
                                    <TextField
                                        label='User name'
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        helperText='Leave empty if the share allows guests'
                                        size='small'
                                        fullWidth
                                        autoComplete='off'
                                        sx={fieldSx}
                                    />
                                    <TextField
                                        label='Password'
                                        type='password'
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        size='small'
                                        fullWidth
                                        autoComplete='new-password'
                                        sx={fieldSx}
                                    />
                                </>
                            )}
                            {kind === 'nfs' && (
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                    The NAS must allow this server&apos;s address to use the share.
                                </Typography>
                            )}
                            <FormControlLabel
                                control={<Checkbox checked={readOnly} onChange={e => setReadOnly(e.target.checked)} size='small' />}
                                label={<Typography variant='body2'>Read only (recommended): Khylo never changes your files</Typography>}
                            />
                            {error && <Alert severity='error'>{error}</Alert>}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant='text'
                        onClick={onClose}
                        disabled={busy}
                        sx={{ bgcolor: 'transparent', boxShadow: 'none', color: KHYLO_COLORS.textSecondary, textTransform: 'none', '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover, color: KHYLO_COLORS.textPrimary } }}
                    >
                        {canConnect ? 'Cancel' : 'Close'}
                    </Button>
                    {canConnect && (
                        <Button
                            type='submit'
                            variant='contained'
                            disabled={busy}
                            startIcon={busy ? <CircularProgress size={14} color='inherit' /> : undefined}
                            sx={{ bgcolor: KHYLO_COLORS.accent, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                        >
                            {busy ? 'Connecting…' : 'Connect'}
                        </Button>
                    )}
                </DialogActions>
            </Box>
        </Dialog>
    );
};

export default KhyloNetworkShareDialog;
