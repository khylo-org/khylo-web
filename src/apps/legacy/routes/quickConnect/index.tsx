import { getAuthenticationApi } from '@khylo/sdk/lib/utils/api/authentication-api';
import React, { type FC, type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { useUsers } from 'hooks/useUsers';

import './quickConnect.scss';

const CODE_LENGTH = 6;

/** Letters and digits only, in capitals, as the device shows them. */
const cleanCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

/** Approves a code shown on a TV or other device, signing that device in. */
const QuickConnectPage: FC = () => {
    const { api, user } = useApi();
    const { data: users, isPending } = useUsers();
    const [ searchParams ] = useSearchParams();
    const isAdmin = Boolean(user?.Policy?.IsAdministrator);
    // Scanning the device's QR code opens this page with its code filled in
    const [ code, setCode ] = useState(() => cleanCode(searchParams.get('code') ?? ''));
    const [ userId, setUserId ] = useState(searchParams.get('userId') ?? user?.Id ?? '');
    const [ status, setStatus ] = useState<'idle' | 'approving' | 'approved' | 'failed'>('idle');

    const approve = (e: FormEvent) => {
        e.preventDefault();
        if (!api || code.length !== CODE_LENGTH) return;

        setStatus('approving');
        getAuthenticationApi(api)
            .authorizeQuickConnect({ code, userId: isAdmin ? userId || undefined : undefined })
            .then(() => setStatus('approved'))
            .catch(() => setStatus('failed'));
    };

    const reset = () => {
        setCode('');
        setStatus('idle');
    };

    if (isPending) return <Loading />;

    const signInAs = users?.find(u => u.Id === userId)?.Name ?? user?.Name;

    return (
        <Page id='quickConnectPreferencesPage' title='Add a device' className='userPreferencesPage noSecondaryNavPage' shouldAutoFocus>
            <div className='khylo-adddevice'>
                <Link to='/mypreferencesmenu' className='khylo-settings-back-link'>← Settings</Link>

                <div className='khylo-adddevice__card'>
                    <h1 className='khylo-adddevice__title'>Add a device</h1>

                    {status === 'approved' ? (
                        <div className='khylo-adddevice__done'>
                            <div className='khylo-adddevice__check' aria-hidden='true'>✓</div>
                            <p className='khylo-adddevice__done-title'>Device added</p>
                            <p className='khylo-adddevice__lead'>{`It will sign in as ${signInAs ?? 'you'} in a few seconds.`}</p>
                            <div className='khylo-adddevice__actions'>
                                <button type='button' className='khylo-adddevice__secondary' onClick={reset}>Add another device</button>
                                <Link to='/home' className='khylo-adddevice__primary'>Done</Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={approve}>
                            <ol className='khylo-adddevice__steps'>
                                <li>On your TV or other device, choose <strong>Sign in with a code</strong>.</li>
                                <li>Type the 6-character code it shows, or scan its QR code with your phone camera.</li>
                            </ol>

                            <label className='khylo-adddevice__label' htmlFor='khyloDeviceCode'>Code</label>
                            <input
                                id='khyloDeviceCode'
                                className='khylo-adddevice__code'
                                value={code}
                                onChange={e => {
                                    setCode(cleanCode(e.target.value));
                                    if (status === 'failed') setStatus('idle');
                                }}
                                placeholder='ABC123'
                                autoComplete='one-time-code'
                                autoCapitalize='characters'
                                spellCheck={false}
                                maxLength={CODE_LENGTH + 2}
                                aria-describedby='khyloDeviceCodeHelp'
                            />
                            <p id='khyloDeviceCodeHelp' className='khylo-adddevice__help'>
                                {status === 'failed' ?
                                    'That code didn\'t work. Codes expire after 10 minutes, so check the device for its current code.' :
                                    'Only approve devices you own. The device will be signed in to this account.'}
                            </p>

                            {isAdmin && (users?.length ?? 0) > 1 && (
                                <>
                                    <label className='khylo-adddevice__label' htmlFor='khyloDeviceUser'>Sign the device in as</label>
                                    <select id='khyloDeviceUser' className='khylo-adddevice__select' value={userId} onChange={e => setUserId(e.target.value)}>
                                        {users?.filter(u => !u.Policy?.IsDisabled).map(u => (
                                            <option key={u.Id} value={u.Id ?? ''}>{u.Name}</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            <button
                                type='submit'
                                className='khylo-adddevice__primary khylo-adddevice__submit'
                                disabled={code.length !== CODE_LENGTH || status === 'approving'}
                            >
                                {status === 'approving' ? 'Adding…' : 'Add device'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default QuickConnectPage;
