import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Page from 'components/Page';
import { ServerConnections } from 'lib/khylo-apiclient';
import Dashboard from 'utils/dashboard';
import khyloIcon from 'assets/img/khylo-icon.png';

interface InviteDetails {
    Code: string;
    ExpiresAtUtc: string;
    IsValid: boolean;
    ServerName: string;
}

const serverBase = () => (ServerConnections.currentApiClient()?.serverAddress() || window.location.origin).replace(/\/$/, '');

/** Where someone lands from an invitation link: they pick a name and password, and are signed straight in. */
export const InvitePage = () => {
    const [params] = useSearchParams();
    const code = params.get('code') || params.get('invite') || '';

    const [details, setDetails] = useState<InviteDetails | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!code) {
            setStatus('invalid');
            return;
        }
        fetch(`${serverBase()}/Invitations/${encodeURIComponent(code)}/Details`)
            .then(r => (r.ok ? r.json() as Promise<InviteDetails> : Promise.reject(new Error(String(r.status)))))
            .then(d => {
                setDetails(d);
                setStatus(d.IsValid ? 'ready' : 'invalid');
            })
            .catch(() => setStatus('invalid'));
    }, [code]);

    const onSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const name = username.trim();
        if (!name) {
            setError('Choose a name to sign in with.');
            return;
        }
        if (password.length < 8) {
            setError('Use a password with at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('The passwords don’t match.');
            return;
        }

        setBusy(true);
        try {
            const response = await fetch(`${serverBase()}/Invitations/${encodeURIComponent(code)}/Redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Username: name, Password: password })
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({})) as { Message?: string };
                throw new Error(body.Message || 'That didn’t work. Try a different name.');
            }

            // Account made; sign straight in
            const apiClient = ServerConnections.currentApiClient();
            if (!apiClient) {
                void Dashboard.navigate('login');
                return;
            }
            const result = await apiClient.authenticateUserByName(name, password);
            Dashboard.onServerChanged(result.User?.Id, result.AccessToken, apiClient);
            void Dashboard.navigate('home');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
            setBusy(false);
        }
    }, [code, username, password, confirm]);

    const serverName = details?.ServerName || 'Khylo';

    return (
        <Page id='khyloInvitePage' className='standalonePage mainAnimatedPage'>
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2,
                    background: 'radial-gradient(ellipse at 50% 20%, rgba(217, 119, 50, 0.06) 0%, rgba(9, 10, 11, 0.98) 75%)'
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 440,
                        bgcolor: 'rgba(24, 24, 26, 0.72)',
                        borderRadius: '20px',
                        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1)',
                        p: { xs: '2rem 1.5rem', sm: '2.75rem 2.25rem 2rem' }
                    }}
                >
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            mx: 'auto',
                            mb: 3,
                            borderRadius: '16px',
                            bgcolor: 'rgba(217, 119, 50, 0.12)',
                            backgroundImage: `url(${khyloIcon})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: '40px 40px'
                        }}
                    />
                    {status === 'loading' && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={28} />
                        </Box>
                    )}

                    {status === 'invalid' && (
                        <Stack spacing={2} sx={{ textAlign: 'center' }}>
                            <Typography variant='h5' fontWeight={600}>This invitation can&apos;t be used</Typography>
                            <Typography color='text.secondary'>
                                It may have expired or already been used. Ask whoever sent it for a new one.
                            </Typography>
                            <Button variant='outlined' onClick={() => Dashboard.navigate('login')}>
                                Go to sign in
                            </Button>
                        </Stack>
                    )}

                    {status === 'ready' && (
                        <form onSubmit={onSubmit}>
                            <Stack spacing={2.5}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant='overline' color='text.secondary'>You&apos;re invited</Typography>
                                    <Typography variant='h5' fontWeight={600}>Join {serverName}</Typography>
                                    <Typography color='text.secondary' sx={{ mt: 1 }}>
                                        Pick a name and password. You&apos;ll use them to sign in on every device.
                                    </Typography>
                                </Box>
                                <TextField
                                    label='Name'
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoComplete='username'
                                    fullWidth
                                />
                                <TextField
                                    label='Password'
                                    type='password'
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete='new-password'
                                    fullWidth
                                />
                                <TextField
                                    label='Confirm password'
                                    type='password'
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    autoComplete='new-password'
                                    fullWidth
                                />
                                {error && <Typography color='error' variant='body2'>{error}</Typography>}
                                <Button type='submit' variant='contained' size='large' disabled={busy}>
                                    {busy ? 'Creating your account…' : 'Create account'}
                                </Button>
                            </Stack>
                        </form>
                    )}
                </Box>
            </Box>
        </Page>
    );
};

export default InvitePage;
