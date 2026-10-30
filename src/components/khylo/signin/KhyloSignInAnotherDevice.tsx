import React, { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloseIcon from '@mui/icons-material/Close';
import qrcode from 'qrcode-generator';

import { ServerConnections } from 'lib/khylo-apiclient';

interface SignInCode {
    Code: string;
    ExpiresAt: string;
    ExpiresInSeconds: number;
    QrUrl: string;
}

interface SignInCodeStatus {
    Used: boolean;
    Expired: boolean;
    DeviceName?: string | null;
}

type Stage =
    | { kind: 'loading' }
    | { kind: 'showing'; code: SignInCode }
    | { kind: 'used'; deviceName: string }
    | { kind: 'expired' }
    | { kind: 'error' };

const QrCode: FC<{ value: string }> = ({ value }) => {
    const svg = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
    }, [ value ]);
    // Drawn locally from the server's own sign-in address
    return <Box aria-hidden='true' sx={{ width: '100%', '& svg': { display: 'block', width: '100%', height: 'auto' } }} dangerouslySetInnerHTML={{ __html: svg }} />;
};

const formatRemaining = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Shows a QR code a phone scans to sign in as you, with no address, user name or password typed. */
export const KhyloSignInAnotherDevice: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [ stage, setStage ] = useState<Stage>({ kind: 'loading' });
    const [ remaining, setRemaining ] = useState(0);
    const [ generation, setGeneration ] = useState(0);
    const activeCode = useRef<string | null>(null);

    const apiClient = ServerConnections.currentApiClient();

    const cancel = useCallback((code: string | null) => {
        if (code && apiClient) {
            apiClient.ajax({ type: 'DELETE', url: apiClient.getUrl(`Khylo/SignInCodes/${encodeURIComponent(code)}`) })
                .catch(() => undefined);
        }
    }, [ apiClient ]);

    // Make a code whenever the screen opens (or "New code" is pressed)
    useEffect(() => {
        if (!open || !apiClient) return undefined;
        let stopped = false;
        setStage({ kind: 'loading' });
        apiClient.ajax({ type: 'POST', url: apiClient.getUrl('Khylo/SignInCodes'), dataType: 'json' })
            .then((code: SignInCode) => {
                if (stopped) {
                    cancel(code.Code);
                    return;
                }
                activeCode.current = code.Code;
                setRemaining(code.ExpiresInSeconds);
                setStage({ kind: 'showing', code });
            })
            .catch(() => !stopped && setStage({ kind: 'error' }));
        return () => {
            stopped = true;
        };
    }, [ open, generation, apiClient, cancel ]);

    // Count down, and ask every 2 seconds whether a device has used the code
    useEffect(() => {
        if (stage.kind !== 'showing' || !apiClient) return undefined;
        const expiresAt = new Date(stage.code.ExpiresAt).getTime();
        const tick = setInterval(() => {
            const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
            setRemaining(left);
            if (left === 0) {
                activeCode.current = null;
                setStage({ kind: 'expired' });
            }
        }, 1000);
        const poll = setInterval(() => {
            apiClient.ajax({ type: 'GET', url: apiClient.getUrl(`Khylo/SignInCodes/${encodeURIComponent(stage.code.Code)}`), dataType: 'json' })
                .then((status: SignInCodeStatus) => {
                    if (status.Used) {
                        activeCode.current = null;
                        setStage({ kind: 'used', deviceName: status.DeviceName || 'your device' });
                    } else if (status.Expired) {
                        activeCode.current = null;
                        setStage({ kind: 'expired' });
                    }
                })
                .catch(() => undefined);
        }, 2000);
        return () => {
            clearInterval(tick);
            clearInterval(poll);
        };
    }, [ stage, apiClient ]);

    // Closing the screen cancels a code nobody has used
    const handleClose = useCallback(() => {
        cancel(activeCode.current);
        activeCode.current = null;
        onClose();
    }, [ cancel, onClose ]);

    const newCode = useCallback(() => setGeneration(g => g + 1), []);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth='xs'
            fullWidth
            slotProps={{ paper: { sx: { bgcolor: '#141418', color: '#FAF8F5', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', backgroundImage: 'none' } } }}
        >
            <Box sx={{ position: 'relative', px: { xs: 3, sm: 4 }, pt: 4, pb: 3.5, textAlign: 'center' }}>
                <IconButton aria-label='Close' onClick={handleClose} sx={{ position: 'absolute', top: 10, right: 10, color: 'rgba(250,248,245,0.5)' }}>
                    <CloseIcon fontSize='small' />
                </IconButton>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>Sign in another device</Typography>

                {stage.kind === 'loading' && (
                    <Box sx={{ py: 10 }}><CircularProgress size={28} /></Box>
                )}

                {stage.kind === 'showing' && (
                    <>
                        <Typography sx={{ color: 'rgba(250,248,245,0.65)', fontSize: '0.92rem', mb: 2.5 }}>
                            Scan with the Khylo app on your phone: tap Scan to Sign In.
                        </Typography>
                        <Box sx={{ mx: 'auto', width: 260, maxWidth: '100%', bgcolor: '#fff', borderRadius: '14px', p: 1.5 }}>
                            <QrCode value={stage.code.QrUrl} />
                        </Box>
                        <Typography sx={{ mt: 2, color: 'rgba(250,248,245,0.45)', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                            {`Works for ${formatRemaining(remaining)}`}
                        </Typography>
                    </>
                )}

                {stage.kind === 'used' && (
                    <Box sx={{ py: 6 }}>
                        <CheckCircleRounded sx={{ fontSize: 56, color: '#34D399', mb: 1.5 }} />
                        <Typography sx={{ fontSize: '1.05rem', fontWeight: 600 }}>{`Signed in on ${stage.deviceName}`}</Typography>
                        <Button onClick={handleClose} variant='text' sx={{ mt: 3, textTransform: 'none', color: 'rgba(250,248,245,0.7)' }}>Done</Button>
                    </Box>
                )}

                {(stage.kind === 'expired' || stage.kind === 'error') && (
                    <Box sx={{ py: 6 }}>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>
                            {stage.kind === 'expired' ? 'This code ran out' : 'Couldn’t make a code'}
                        </Typography>
                        <Typography sx={{ color: 'rgba(250,248,245,0.6)', fontSize: '0.9rem', mb: 3 }}>
                            {stage.kind === 'expired' ? 'Codes work for 5 minutes, once.' : 'Check your connection and try again.'}
                        </Typography>
                        <Button onClick={newCode} variant='contained' sx={{ textTransform: 'none', fontWeight: 600 }}>New code</Button>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
};

export default KhyloSignInAnotherDevice;
