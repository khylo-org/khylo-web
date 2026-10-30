import React, { useEffect, useRef, useState, type FC } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import type { ImageType } from '@khylo/sdk/lib/generated-client/models/image-type';
import type { RemoteSearchResult } from '@khylo/sdk/lib/generated-client/models/remote-search-result';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/FileUploadOutlined';

import { useApi } from 'hooks/useApi';
import {
    type MetadataForm,
    applyMatch,
    canFixMatch,
    chooseRemoteImage,
    getArtworkSlots,
    getCurrentImageUrl,
    getFullItem,
    getRemoteImages,
    onOpenMetadataEditor,
    refreshMetadata,
    removeImage,
    saveDetails,
    searchMatches,
    toForm,
    uploadImage
} from './metadataApi';
import './KhyloMetadataEditor.scss';

type Tab = 'details' | 'artwork' | 'match';

const FIELDS: { key: keyof MetadataForm; label: string; multiline?: boolean; half?: boolean; hint?: string }[] = [
    { key: 'name', label: 'Title' },
    { key: 'sortName', label: 'Sort title', half: true, hint: 'How it sorts in lists, e.g. "Matrix, The"' },
    { key: 'originalTitle', label: 'Original title', half: true },
    { key: 'year', label: 'Year', half: true },
    { key: 'officialRating', label: 'Content rating', half: true, hint: 'e.g. PG-13, TV-MA' },
    { key: 'tagline', label: 'Tagline' },
    { key: 'genres', label: 'Genres', hint: 'Separate with commas' },
    { key: 'overview', label: 'Summary', multiline: true }
];

interface ArtworkSlotProps {
    item: BaseItemDto;
    type: ImageType;
    label: string;
    wide: boolean;
    version: number;
    onChanged: () => Promise<void>;
}

/** One kind of artwork: what's there now, the providers' options, and upload. */
const ArtworkSlot: FC<ArtworkSlotProps> = ({ item, type, label, wide, version, onChanged }) => {
    const { api } = useApi();
    const fileRef = useRef<HTMLInputElement>(null);
    const [ busyUrl, setBusyUrl ] = useState<string | null>(null);
    const [ error, setError ] = useState<string | null>(null);

    const { data: options, isLoading } = useQuery({
        queryKey: [ 'KhyloRemoteImages', item.Id, type ],
        queryFn: () => getRemoteImages(api!, item.Id!, type),
        enabled: Boolean(api && item.Id),
        staleTime: 10 * 60_000
    });

    const run = async (key: string, action: () => Promise<void>) => {
        setBusyUrl(key);
        setError(null);
        try {
            await action();
            await onChanged();
        } catch {
            setError('That didn\'t work. Try another image.');
        } finally {
            setBusyUrl(null);
        }
    };

    const current = api ? getCurrentImageUrl(api, item, type, version) : null;

    return (
        <section className='khylo-metaedit__slot'>
            <div className='khylo-metaedit__slot-head'>
                <h3>{label}</h3>
                <div className='khylo-metaedit__slot-actions'>
                    <button type='button' className='khylo-metaedit__ghost' onClick={() => fileRef.current?.click()} disabled={Boolean(busyUrl)}>
                        <UploadIcon /> Upload
                    </button>
                    {current && (
                        <button type='button' className='khylo-metaedit__ghost' onClick={() => { void run('remove', () => removeImage(api!, item.Id!, type)); }} disabled={Boolean(busyUrl)}>
                            Remove
                        </button>
                    )}
                    <input
                        ref={fileRef}
                        type='file'
                        accept='image/*'
                        hidden
                        onChange={e => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void run('upload', () => uploadImage(api!, item.Id!, type, file));
                        }}
                    />
                </div>
            </div>
            {error && <p className='khylo-metaedit__error'>{error}</p>}

            <div className={classNames('khylo-metaedit__images', { 'khylo-metaedit__images--wide': wide })}>
                <div className={classNames('khylo-metaedit__image khylo-metaedit__image--current', { 'khylo-metaedit__image--wide': wide })}>
                    {current ? <img src={current} alt='' /> : <span>None</span>}
                    <span className='khylo-metaedit__badge'>Current</span>
                </div>
                {isLoading && <p className='khylo-metaedit__hint'>Finding artwork…</p>}
                {!isLoading && !options?.length && <p className='khylo-metaedit__hint'>No artwork found online. Upload your own.</p>}
                {options?.map(option => (
                    <button
                        key={option.Url}
                        type='button'
                        className={classNames('khylo-metaedit__image', { 'khylo-metaedit__image--wide': wide })}
                        onClick={() => { if (option.Url) void run(option.Url, () => chooseRemoteImage(api!, item.Id!, type, option.Url!)); }}
                        disabled={Boolean(busyUrl)}
                        title={[ option.ProviderName, option.Width && option.Height ? `${option.Width}×${option.Height}` : '', option.Language ?? '' ].filter(Boolean).join(' · ')}
                    >
                        <img src={option.ThumbnailUrl ?? option.Url ?? ''} alt='' loading='lazy' referrerPolicy='no-referrer' />
                        {busyUrl === option.Url && <span className='khylo-metaedit__busy' />}
                    </button>
                ))}
            </div>
        </section>
    );
};

const MatchSearch: FC<{ item: BaseItemDto; onMatched: () => Promise<void> }> = ({ item, onMatched }) => {
    const { api } = useApi();
    const [ name, setName ] = useState(item.Name ?? '');
    const [ year, setYear ] = useState(item.ProductionYear ? String(item.ProductionYear) : '');
    const [ results, setResults ] = useState<RemoteSearchResult[] | null>(null);
    const [ status, setStatus ] = useState<'idle' | 'searching' | 'applying' | 'failed'>('idle');

    const search = async () => {
        if (!api) return;
        setStatus('searching');
        try {
            setResults(await searchMatches(api, item, name, year));
            setStatus('idle');
        } catch {
            setStatus('failed');
        }
    };

    const apply = async (result: RemoteSearchResult) => {
        if (!api) return;
        setStatus('applying');
        try {
            await applyMatch(api, item.Id!, result);
            await onMatched();
        } catch {
            setStatus('failed');
        }
    };

    return (
        <div className='khylo-metaedit__match'>
            <p className='khylo-metaedit__hint'>Wrong movie or show? Search for the right one and Khylo replaces its details and artwork.</p>
            <form
                className='khylo-metaedit__match-form'
                onSubmit={e => {
                    e.preventDefault();
                    void search();
                }}
            >
                <input className='khylo-metaedit__match-input' value={name} onChange={e => setName(e.target.value)} placeholder='Title' aria-label='Title' />
                <input className='khylo-metaedit__match-input khylo-metaedit__match-input--year' value={year} onChange={e => setYear(e.target.value)} placeholder='Year' aria-label='Year' />
                <button type='submit' className='khylo-metaedit__primary' disabled={status === 'searching' || !name.trim()}>
                    {status === 'searching' ? 'Searching…' : 'Search'}
                </button>
            </form>
            {status === 'failed' && <p className='khylo-metaedit__error'>Something went wrong. Try again.</p>}
            {results?.length === 0 && <p className='khylo-metaedit__hint'>No matches. Try a different title or year.</p>}
            <div className='khylo-metaedit__results'>
                {results?.map(result => (
                    <button
                        key={`${result.SearchProviderName}-${JSON.stringify(result.ProviderIds)}`}
                        type='button'
                        className='khylo-metaedit__result'
                        onClick={() => { void apply(result); }}
                        disabled={status === 'applying'}
                    >
                        <span className='khylo-metaedit__result-art'>
                            {result.ImageUrl && <img src={result.ImageUrl} alt='' loading='lazy' referrerPolicy='no-referrer' />}
                        </span>
                        <span className='khylo-metaedit__result-text'>
                            <strong>{result.Name}</strong>
                            <span>{[ result.ProductionYear, result.SearchProviderName ].filter(Boolean).join(' · ')}</span>
                            {result.Overview && <span className='khylo-metaedit__result-overview'>{result.Overview}</span>}
                        </span>
                    </button>
                ))}
            </div>
            {status === 'applying' && <p className='khylo-metaedit__hint'>Applying the match…</p>}
        </div>
    );
};

interface KhyloMetadataEditorProps {
    itemId: string;
    onClose: () => void;
}

/** Edit a title's details and artwork in place, like Plex. Admins only. */
export const KhyloMetadataEditor: FC<KhyloMetadataEditorProps> = ({ itemId, onClose }) => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const [ tab, setTab ] = useState<Tab>('details');
    const [ form, setForm ] = useState<MetadataForm | null>(null);
    const [ version, setVersion ] = useState(() => Date.now());
    const [ status, setStatus ] = useState<'idle' | 'saving' | 'refreshing' | 'failed'>('idle');

    const { data: item, refetch } = useQuery({
        queryKey: [ 'KhyloMetadataItem', itemId ],
        queryFn: () => getFullItem(api!, user!.Id!, itemId),
        enabled: Boolean(api && user?.Id),
        staleTime: 0
    });
    const original = item ? toForm(item) : null;

    useEffect(() => {
        if (item && !form) setForm(toForm(item));
    }, [ item, form ]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Every page showing this title picks up the change
    const refreshEverywhere = async () => {
        setVersion(Date.now());
        await refetch();
        await queryClient.invalidateQueries({ predicate: q => q.queryKey[0] !== 'KhyloMetadataItem' && q.queryKey[0] !== 'KhyloRemoteImages' });
    };

    const isDirty = Boolean(form && original && JSON.stringify(form) !== JSON.stringify(original));

    const save = async () => {
        if (!api || !item || !form || !original) return;
        setStatus('saving');
        try {
            await saveDetails(api, item, original, form);
            await refreshEverywhere();
            onClose();
        } catch {
            setStatus('failed');
        }
    };

    const refreshFromProviders = async () => {
        if (!api) return;
        setStatus('refreshing');
        try {
            await refreshMetadata(api, itemId);
            // The refresh runs on the server; give it a moment before reloading
            await new Promise(resolve => setTimeout(resolve, 2500));
            const fresh = await refetch();
            if (fresh.data) setForm(toForm(fresh.data));
            await refreshEverywhere();
            setStatus('idle');
        } catch {
            setStatus('failed');
        }
    };

    const onMatched = async () => {
        const fresh = await refetch();
        if (fresh.data) setForm(toForm(fresh.data));
        await refreshEverywhere();
        setTab('details');
    };

    const tabs: { id: Tab; label: string }[] = [
        { id: 'details', label: 'Details' },
        { id: 'artwork', label: 'Artwork' },
        ...(item && canFixMatch(item) ? [{ id: 'match' as Tab, label: 'Fix match' }] : [])
    ];

    return (
        <div className='khylo-metaedit' role='dialog' aria-modal='true' aria-label='Edit'>
            <button type='button' className='khylo-metaedit__scrim' aria-label='Close' onClick={onClose} tabIndex={-1} />
            <div className='khylo-metaedit__panel'>
                <header className='khylo-metaedit__head'>
                    <div>
                        <span className='khylo-metaedit__eyebrow'>Edit</span>
                        <h2 className='khylo-metaedit__title'>{item?.Name ?? '…'}</h2>
                    </div>
                    <button type='button' className='khylo-metaedit__icon' onClick={onClose} aria-label='Close'><CloseIcon /></button>
                </header>

                <div className='khylo-metaedit__tabs' role='tablist'>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            type='button'
                            role='tab'
                            aria-selected={tab === t.id}
                            className={classNames('khylo-metaedit__tab', { 'khylo-metaedit__tab--active': tab === t.id })}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className='khylo-metaedit__body'>
                    {!item || !form ? <p className='khylo-metaedit__hint'>Loading…</p> : null}

                    {item && form && tab === 'details' && (
                        <div className='khylo-metaedit__fields'>
                            {FIELDS.map(field => (
                                <label key={field.key} className={classNames('khylo-metaedit__field', { 'khylo-metaedit__field--half': field.half })}>
                                    <span>{field.label}</span>
                                    {field.multiline ? (
                                        <textarea rows={6} value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />
                                    ) : (
                                        <input value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} inputMode={field.key === 'year' ? 'numeric' : undefined} />
                                    )}
                                    {field.hint && <small>{field.hint}</small>}
                                </label>
                            ))}
                            <p className='khylo-metaedit__hint'>Fields you change are locked, so refreshing metadata won&apos;t undo them.</p>
                        </div>
                    )}

                    {item && tab === 'artwork' && getArtworkSlots(item).map(slot => (
                        <ArtworkSlot key={slot.type} item={item} type={slot.type} label={slot.label} wide={slot.wide} version={version} onChanged={refreshEverywhere} />
                    ))}

                    {item && tab === 'match' && <MatchSearch item={item} onMatched={onMatched} />}
                </div>

                <footer className='khylo-metaedit__foot'>
                    <button type='button' className='khylo-metaedit__ghost' onClick={() => { void refreshFromProviders(); }} disabled={status === 'refreshing' || !item}>
                        <RefreshIcon className={classNames({ 'khylo-metaedit__spin': status === 'refreshing' })} />
                        {status === 'refreshing' ? 'Refreshing…' : 'Refresh metadata'}
                    </button>
                    <span className='khylo-metaedit__foot-status'>{status === 'failed' ? 'Couldn\'t save. Try again.' : ''}</span>
                    <button type='button' className='khylo-metaedit__ghost' onClick={onClose}>{isDirty ? 'Cancel' : 'Close'}</button>
                    {tab === 'details' && (
                        <button type='button' className='khylo-metaedit__primary' onClick={() => { void save(); }} disabled={!isDirty || status === 'saving'}>
                            {status === 'saving' ? 'Saving…' : 'Save'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

/** Lives in the app shell and opens the editor for whichever title asked. Admins only. */
export const KhyloMetadataEditorHost: FC = () => {
    const { user } = useApi();
    const [ itemId, setItemId ] = useState<string | null>(null);
    const isAdmin = Boolean(user?.Policy?.IsAdministrator);

    useEffect(() => onOpenMetadataEditor(setItemId), []);

    if (!isAdmin || !itemId) return null;
    return <KhyloMetadataEditor key={itemId} itemId={itemId} onClose={() => setItemId(null)} />;
};
