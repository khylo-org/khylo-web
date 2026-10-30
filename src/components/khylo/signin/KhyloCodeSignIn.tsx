import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { createRoot } from 'react-dom/client';
import qrcode from 'qrcode-generator';
import type { ApiClient } from 'khylo-apiclient';
import type { AuthenticationResult } from '@khylo/sdk/lib/generated-client/models/authentication-result';

import './KhyloCodeSignIn.scss';

interface CodeRequest {
    code: string;
    secret: string;
}

// The server keeps a code for 10 minutes; a fresh one appears a little before that
const CODE_LIFETIME_MS = 9 * 60_000;
const POLL_MS = 2_500;

const isLoopback = (host: string) => host === 'localhost' || host === '[::1]' || host.startsWith('127.');

/**
 * Where a phone should go to approve the code. The page's own address works when this screen was
 * opened over the network; on the server itself (localhost) or in an app, the server's address is used.
 */
function getApproveUrl(apiClient: ApiClient, code: string): string {
    const { protocol, hostname, origin, pathname } = window.location;
    const base = (protocol.startsWith('http') && !isLoopback(hostname)) ?
        `${origin}${pathname}` :
        `${apiClient.serverAddress()}/web/`;
    return `${base}#/quickconnect?code=${code}`;
}

async function startRequest(apiClient: ApiClient): Promise<CodeRequest> {
    const json = await apiClient.ajax({ type: 'POST', url: apiClient.getUrl('/QuickConnect/Initiate'), dataType: 'json' }) as { Code?: string; Secret?: string };
    if (!json.Code || !json.Secret) throw new Error('Malformed quick connect response');
    return { code: json.Code, secret: json.Secret };
}

const QrCode: FC<{ value: string }> = ({ value }) => {
    const svg = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }, [value]);
    // The SVG is generated locally from our own URL, never from user input
    return <div className='khylo-codesignin__qr' aria-hidden='true' dangerouslySetInnerHTML={{ __html: svg }} />;
};

interface KhyloCodeSignInProps {
    apiClient: ApiClient;
    onSignedIn: (result: AuthenticationResult) => void;
    onClose: () => void;
}

/** Shows a short code and QR code; signing in on another device with them signs this one in. */
export const KhyloCodeSignIn: FC<KhyloCodeSignInProps> = ({ apiClient, onSignedIn, onClose }) => {
    const [ pending, setPending ] = useState<CodeRequest | null>(null);
    const [ error, setError ] = useState<string | null>(null);
    const [ generation, setGeneration ] = useState(0);
    const showNewCode = useCallback(() => setGeneration(g => g + 1), []);

    // A new code on open, before the old one expires, and after an error
    useEffect(() => {
        let isCurrent = true;
        setPending(null);
        setError(null);
        startRequest(apiClient)
            .then(next => isCurrent && setPending(next))
            .catch(() => isCurrent && setError('Signing in with a code is turned off on this server.'));
        const refresh = setTimeout(showNewCode, CODE_LIFETIME_MS);
        return () => {
            isCurrent = false;
            clearTimeout(refresh);
        };
    }, [ apiClient, generation, showNewCode ]);

    // Wait for the code to be approved on another device
    useEffect(() => {
        if (!pending) return;
        let isDone = false;
        const check = async () => {
            const data = await apiClient.getJSON(apiClient.getUrl(`/QuickConnect/Connect?Secret=${pending.secret}`)) as { Authenticated?: boolean };
            if (isDone || !data.Authenticated) return;
            isDone = true;
            onSignedIn(await apiClient.quickConnect(pending.secret));
        };
        const timer = setInterval(() => {
            // A failed check means the code expired; show a fresh one
            check().catch(() => !isDone && showNewCode());
        }, POLL_MS);
        return () => {
            isDone = true;
            clearInterval(timer);
        };
    }, [ apiClient, pending, onSignedIn, showNewCode ]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className='khylo-codesignin' role='dialog' aria-modal='true' aria-labelledby='khylo-codesignin-title'>
            <div className='khylo-codesignin__card'>
                <button type='button' className='khylo-codesignin__close' onClick={onClose} aria-label='Close'>✕</button>
                <h2 id='khylo-codesignin-title' className='khylo-codesignin__title'>Sign in with a code</h2>
                <p className='khylo-codesignin__lead'>
                    On a phone or computer that&apos;s already signed in, open <strong>Add a device</strong> from your profile menu and enter this code.
                </p>

                {error && <p className='khylo-codesignin__error'>{error}</p>}

                {!error && (
                    <>
                        <div className='khylo-codesignin__code' aria-live='polite' aria-label={pending ? `Code ${pending.code.split('').join(' ')}` : 'Getting a code'}>
                            {(pending?.code ?? '      ').split('').map((ch, i) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <span key={i} className='khylo-codesignin__char'>{ch.trim() ? ch : ''}</span>
                            ))}
                        </div>

                        <div className='khylo-codesignin__divider'><span>or scan with your phone</span></div>

                        <div className='khylo-codesignin__qr-wrap'>
                            {pending ? <QrCode value={getApproveUrl(apiClient, pending.code)} /> : <div className='khylo-codesignin__qr khylo-codesignin__qr--empty' />}
                        </div>

                        <p className='khylo-codesignin__hint'>
                            <span className='khylo-codesignin__pulse' aria-hidden='true' />
                            Waiting for approval. This screen signs in by itself.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

/** Opens the code sign-in over the current page (used by the login screen). */
export function showCodeSignIn(apiClient: ApiClient, onSignedIn: (result: AuthenticationResult) => void): void {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = () => {
        root.unmount();
        host.remove();
    };

    root.render(
        <KhyloCodeSignIn
            apiClient={apiClient}
            onClose={close}
            onSignedIn={result => {
                close();
                onSignedIn(result);
            }}
        />
    );
}
