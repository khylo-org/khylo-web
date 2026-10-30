import React, { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { queryClient } from 'utils/query/queryClient';
import './KhyloProfilePicker.scss';

interface HomeProfile {
    Id: string;
    Name: string;
    IsOwner: boolean;
    IsCurrent: boolean;
    HasPin: boolean;
    PrimaryImageTag?: string | null;
    IsKids?: boolean;
    RatingLimit?: string | null;
    NeedsGrownUp?: boolean;
}

interface KidsOptions {
    Levels: { Score: number; Ratings: string[] }[];
    Libraries: { Id: string; Name: string; CollectionType?: string | null }[];
    OwnerHasPin: boolean;
    LiveTvAvailable?: boolean;
}

interface HomeProfiles {
    Profiles: HomeProfile[];
    CanManage: boolean;
}

// Each profile gets its own color, the same every time
const PROFILE_COLORS = [ '#d97732', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#ec4899' ];
const colorFor = (id: string) => PROFILE_COLORS[parseInt(id.replace(/-/g, '').slice(-4), 16) % PROFILE_COLORS.length];

/** An on/off switch with a label and a short description. */
const Toggle: FC<{ label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, description, checked, onChange }) => (
    <button type='button' role='switch' aria-checked={checked} className='khylo-profiles__toggle' onClick={() => onChange(!checked)}>
        <span>
            <strong>{label}</strong>
            <small>{description}</small>
        </span>
        <span className='khylo-profiles__switch' aria-hidden='true' />
    </button>
);

type Step = { kind: 'pick' } | { kind: 'pin'; profile: HomeProfile } | { kind: 'add' } | { kind: 'kids' };

/** "Who's watching?": the household's profiles, switching between them and adding new ones. */
export const KhyloProfilePicker: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { api } = useApi();
    const [ data, setData ] = useState<HomeProfiles | null>(null);
    const [ step, setStep ] = useState<Step>({ kind: 'pick' });
    const [ pin, setPin ] = useState('');
    const [ name, setName ] = useState('');
    const [ newPin, setNewPin ] = useState('');
    const [ isKids, setIsKids ] = useState(false);
    const [ kidsOptions, setKidsOptions ] = useState<KidsOptions | null>(null);
    const [ maxRating, setMaxRating ] = useState(0);
    const [ allowUnrated, setAllowUnrated ] = useState(false);
    const [ allowLiveTv, setAllowLiveTv ] = useState(false);
    const [ libraries, setLibraries ] = useState<string[]>([]);
    const [ ownerPin, setOwnerPin ] = useState('');
    const [ error, setError ] = useState<string | null>(null);
    const [ busy, setBusy ] = useState(false);

    const headers = useCallback(() => ({ Authorization: api?.authorizationHeader ?? '' }), [api]);

    const load = useCallback(async () => {
        if (!api) return;
        const response = await api.axiosInstance.get<HomeProfiles>(`${api.basePath}/Khylo/HomeProfiles`, { headers: headers() });
        setData(response.data);
    }, [ api, headers ]);

    useEffect(() => {
        load().catch(() => setError('Couldn\'t load profiles.'));
    }, [load]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const switchTo = async (profile: HomeProfile, enteredPin?: string) => {
        if (!api) return;
        if (profile.IsCurrent) {
            onClose();
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const response = await api.axiosInstance.post(
                `${api.basePath}/Khylo/HomeProfiles/${profile.Id}/Switch`,
                { Pin: enteredPin ?? null },
                { headers: headers() }
            );
            // Sign this browser in as the profile, then start fresh on Home
            const apiClient = ServerConnections.currentApiClient() as unknown as {
                onAuthenticated: (client: unknown, result: unknown) => Promise<void>;
            };
            await apiClient.onAuthenticated(apiClient, response.data);
            queryClient.clear();
            window.location.hash = '#/home';
            window.location.reload();
        } catch {
            setError(profile.HasPin ? 'That PIN isn\'t right.' : 'Couldn\'t switch profiles.');
            setPin('');
            setBusy(false);
        }
    };

    const pick = (profile: HomeProfile) => {
        if (profile.NeedsGrownUp) {
            setError(`Ask a grown-up to add a PIN to ${profile.Name}'s profile first.`);
            return;
        }
        if (profile.HasPin && !profile.IsCurrent) {
            setPin('');
            setError(null);
            setStep({ kind: 'pin', profile });
        } else {
            void switchTo(profile);
        }
    };

    // A kids profile picks its ratings and libraries on a second page
    const openKids = async () => {
        if (!api) return;
        setError(null);
        setBusy(true);
        try {
            const response = await api.axiosInstance.get<KidsOptions>(`${api.basePath}/Khylo/HomeProfiles/KidsOptions`, { headers: headers() });
            const options = response.data;
            setKidsOptions(options);
            // PG (or the closest level under it) to start with
            const start = [...options.Levels].reverse().find(level => level.Score <= 10) ?? options.Levels[0];
            setMaxRating(start?.Score ?? 0);
            setLibraries(options.Libraries.map(library => library.Id));
            setStep({ kind: 'kids' });
        } catch {
            setError('Couldn\'t load the rating options.');
        } finally {
            setBusy(false);
        }
    };

    const addProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!api || !name.trim()) return;
        if (isKids && step.kind === 'add') {
            void openKids();
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const kids = isKids ? {
                IsKids: true,
                MaxParentalRating: maxRating,
                AllowUnrated: allowUnrated,
                AllowLiveTv: allowLiveTv,
                Libraries: libraries,
                OwnerPin: ownerPin || null
            } : {};
            await api.axiosInstance.post(`${api.basePath}/Khylo/HomeProfiles`, { Name: name.trim(), Pin: newPin || null, ...kids }, { headers: headers() });
            setName('');
            setNewPin('');
            setIsKids(false);
            setOwnerPin('');
            await load();
            setStep({ kind: 'pick' });
        } catch (err) {
            const message = (err as { response?: { data?: unknown } }).response?.data;
            setError(typeof message === 'string' ? message : 'Couldn\'t add the profile.');
        } finally {
            setBusy(false);
        }
    };

    const openAdd = () => {
        setError(null);
        setStep({ kind: 'add' });
    };

    const backToAdd = () => {
        setError(null);
        setStep({ kind: 'add' });
    };

    const submitPin = (e: FormEvent) => {
        e.preventDefault();
        if (step.kind === 'pin') void switchTo(step.profile, pin);
    };

    const avatar = (profile: HomeProfile, size: 'large' | 'small' = 'large') => (
        <span className={`khylo-profiles__avatar khylo-profiles__avatar--${size}`} style={{ background: colorFor(profile.Id) }}>
            {profile.PrimaryImageTag && api ? (
                <img src={`${api.basePath}/Users/${profile.Id}/Images/Primary?tag=${profile.PrimaryImageTag}&maxWidth=300`} alt='' />
            ) : profile.Name.charAt(0).toUpperCase()}
        </span>
    );

    return (
        <div className='khylo-profiles' role='dialog' aria-modal='true' aria-label='Profiles'>
            <button type='button' className='khylo-profiles__close' onClick={onClose} aria-label='Close'><CloseIcon /></button>

            {step.kind === 'pick' && (
                <>
                    <h1 className='khylo-profiles__title'>Who&apos;s watching?</h1>
                    {!data && !error && <p className='khylo-profiles__hint'>Loading…</p>}
                    <div className='khylo-profiles__grid'>
                        {data?.Profiles.map(profile => (
                            <button key={profile.Id} type='button' className='khylo-profiles__profile' onClick={() => pick(profile)} disabled={busy}>
                                {avatar(profile)}
                                <span className='khylo-profiles__name'>
                                    {profile.Name}
                                    {(profile.HasPin || profile.NeedsGrownUp) && <LockOutlinedIcon className='khylo-profiles__lock' />}
                                </span>
                                {profile.IsKids && <span className='khylo-profiles__kids' title={profile.RatingLimit ? `Up to ${profile.RatingLimit}` : undefined}>Kids</span>}
                                {profile.IsCurrent && <span className='khylo-profiles__current'>Watching now</span>}
                            </button>
                        ))}
                        {data?.CanManage && (
                            <button type='button' className='khylo-profiles__profile' onClick={openAdd}>
                                <span className='khylo-profiles__avatar khylo-profiles__avatar--large khylo-profiles__avatar--add'><AddIcon /></span>
                                <span className='khylo-profiles__name'>Add profile</span>
                            </button>
                        )}
                    </div>
                    {error && <p className='khylo-profiles__error'>{error}</p>}
                </>
            )}

            {step.kind === 'pin' && (
                <form className='khylo-profiles__form' onSubmit={submitPin}>
                    {avatar(step.profile, 'small')}
                    <h1 className='khylo-profiles__title'>{`Enter ${step.profile.Name}'s PIN`}</h1>
                    <input
                        className='khylo-profiles__input khylo-profiles__input--pin'
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        inputMode='numeric'
                        type='password'
                        autoComplete='off'
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        aria-label='PIN'
                    />
                    {error && <p className='khylo-profiles__error'>{error}</p>}
                    <div className='khylo-profiles__actions'>
                        <button type='button' className='khylo-profiles__secondary' onClick={() => setStep({ kind: 'pick' })}>Back</button>
                        <button type='submit' className='khylo-profiles__primary' disabled={pin.length !== 4 || busy}>Continue</button>
                    </div>
                </form>
            )}

            {step.kind === 'add' && (
                <form className='khylo-profiles__form' onSubmit={e => { void addProfile(e); }}>
                    <h1 className='khylo-profiles__title'>Add a profile</h1>
                    <p className='khylo-profiles__hint'>For someone in your home. They get their own Continue watching, history and collections.</p>
                    <label className='khylo-profiles__label' htmlFor='khyloProfileName'>Name</label>
                    <input
                        id='khyloProfileName'
                        className='khylo-profiles__input'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={40}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                    />
                    <label className='khylo-profiles__label' htmlFor='khyloProfilePin'>PIN (optional)</label>
                    <input
                        id='khyloProfilePin'
                        className='khylo-profiles__input'
                        value={newPin}
                        onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        inputMode='numeric'
                        placeholder='4 digits, needed to switch into this profile'
                    />
                    <Toggle label='Kids profile' description='Only shows and movies with the ratings you pick' checked={isKids} onChange={setIsKids} />
                    {error && <p className='khylo-profiles__error'>{error}</p>}
                    <div className='khylo-profiles__actions'>
                        <button type='button' className='khylo-profiles__secondary' onClick={() => setStep({ kind: 'pick' })}>Cancel</button>
                        <button type='submit' className='khylo-profiles__primary' disabled={!name.trim() || (newPin.length > 0 && newPin.length !== 4) || busy}>{isKids ? 'Next' : 'Add profile'}</button>
                    </div>
                </form>
            )}

            {step.kind === 'kids' && kidsOptions && (
                <form className='khylo-profiles__form khylo-profiles__form--wide' onSubmit={e => { void addProfile(e); }}>
                    <h1 className='khylo-profiles__title'>{`What can ${name.trim()} watch?`}</h1>
                    <p className='khylo-profiles__hint'>Only a server admin can change this later, from the dashboard.</p>
                    <div className='khylo-profiles__columns'>
                        <fieldset className='khylo-profiles__group'>
                            <legend>Ratings</legend>
                            {kidsOptions.Levels.map(level => (
                                <button
                                    key={level.Score}
                                    type='button'
                                    className={`khylo-profiles__check${level.Score <= maxRating ? ' is-checked' : ''}`}
                                    onClick={() => setMaxRating(level.Score)}
                                >
                                    <span className='khylo-profiles__checkmark'><CheckIcon /></span>
                                    {level.Ratings.join(' · ')}
                                </button>
                            ))}
                            <Toggle label='Unrated (NR)' description='Movies and shows with no rating' checked={allowUnrated} onChange={setAllowUnrated} />
                        </fieldset>
                        <fieldset className='khylo-profiles__group'>
                            <legend>Libraries</legend>
                            {kidsOptions.Libraries.map(library => {
                                const checked = libraries.includes(library.Id);
                                return (
                                    <button
                                        key={library.Id}
                                        type='button'
                                        className={`khylo-profiles__check${checked ? ' is-checked' : ''}`}
                                        onClick={() => setLibraries(checked ? libraries.filter(id => id !== library.Id) : [ ...libraries, library.Id ])}
                                    >
                                        <span className='khylo-profiles__checkmark'><CheckIcon /></span>
                                        {library.Name}
                                    </button>
                                );
                            })}
                            {kidsOptions.LiveTvAvailable !== false && <Toggle label='Live TV' description='Channels from your TV service' checked={allowLiveTv} onChange={setAllowLiveTv} />}
                            {!kidsOptions.OwnerHasPin && (
                                <>
                                    <label className='khylo-profiles__label' htmlFor='khyloOwnerPin'>A PIN for your profile, so kids can&apos;t switch into it</label>
                                    <input
                                        id='khyloOwnerPin'
                                        className='khylo-profiles__input'
                                        value={ownerPin}
                                        onChange={e => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        inputMode='numeric'
                                        type='password'
                                        autoComplete='off'
                                        placeholder='4 digits'
                                    />
                                </>
                            )}
                        </fieldset>
                    </div>
                    {error && <p className='khylo-profiles__error'>{error}</p>}
                    <div className='khylo-profiles__actions'>
                        <button type='button' className='khylo-profiles__secondary' onClick={backToAdd}>Back</button>
                        <button
                            type='submit'
                            className='khylo-profiles__primary'
                            disabled={busy || libraries.length === 0 || (!kidsOptions.OwnerHasPin && ownerPin.length !== 4)}
                        >
                            Add kids profile
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
