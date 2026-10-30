import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Page from 'components/Page';
import { ServerConnections } from 'lib/khylo-apiclient';
import Dashboard from 'utils/dashboard';
import khyloIcon from 'assets/img/khylo-icon.png';

interface RedeemResult {
    User?: { Id?: string };
    AccessToken?: string;
}

/**
 * Where a sign-in QR code leads when it's scanned with a phone's own camera instead of the Khylo app:
 * the code signs this browser in as the person who made it.
 */
export const SignInWithCodePage = () => {
    const [ params ] = useSearchParams();
    const code = params.get('code') || '';
    const [ message, setMessage ] = useState<string | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const apiClient = ServerConnections.currentApiClient();
        if (!code || !apiClient) {
            setMessage('That code has run out. Make a new one on the other device.');
            return;
        }

        apiClient.ajax({
            type: 'POST',
            url: apiClient.getUrl('Khylo/SignInCodes/Redeem'),
            data: JSON.stringify({ Code: code }),
            contentType: 'application/json',
            dataType: 'json'
        }).then((result: RedeemResult) => {
            if (!result.User?.Id || !result.AccessToken) throw new Error('No sign-in');
            Dashboard.onServerChanged(result.User.Id, result.AccessToken, apiClient);
            void Dashboard.navigate('home');
        }).catch((err: { status?: number }) => {
            if (err?.status === 403) {
                setMessage('This account can’t sign in right now.');
            } else if (err?.status === 429) {
                setMessage('Too many tries. Wait a minute, then scan a new code.');
            } else {
                setMessage('That code has run out. Make a new one on the other device.');
            }
        });
    }, [ code ]);

    return (
        <Page id='khyloSignInWithCodePage' className='standalonePage mainAnimatedPage'>
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
                        maxWidth: 400,
                        bgcolor: 'rgba(24, 24, 26, 0.72)',
                        borderRadius: '20px',
                        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1)',
                        p: { xs: '2rem 1.5rem', sm: '2.5rem 2.25rem' },
                        textAlign: 'center'
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
                    {message ? (
                        <Stack spacing={2.5}>
                            <Typography sx={{ fontWeight: 600, fontSize: '1.05rem' }}>{message}</Typography>
                            <Button variant='outlined' onClick={() => void Dashboard.navigate('login')} sx={{ textTransform: 'none' }}>
                                Go to sign in
                            </Button>
                        </Stack>
                    ) : (
                        <Stack spacing={2} alignItems='center'>
                            <CircularProgress size={28} />
                            <Typography sx={{ color: 'text.secondary' }}>Signing you in&hellip;</Typography>
                        </Stack>
                    )}
                </Box>
            </Box>
        </Page>
    );
};

export default SignInWithCodePage;
