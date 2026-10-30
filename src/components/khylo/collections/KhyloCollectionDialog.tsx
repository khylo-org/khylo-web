import React, { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicIcon from '@mui/icons-material/Public';
import classNames from 'classnames';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import {
    COLLECTION_QUERY_KEYS,
    addToCollection,
    createCollection,
    getEditableCollections,
    removeFromCollection,
    renameCollection
} from './collectionsApi';
import './KhyloCollectionDialog.scss';

export type KhyloCollectionDialogMode = 'add' | 'create' | 'rename';

export interface KhyloCollectionDialogProps {
    open: boolean;
    mode: KhyloCollectionDialogMode;
    onClose: () => void;
    /** The title to add (add mode). */
    itemId?: string;
    itemName?: string;
    /** The collection to rename (rename mode). */
    collectionId?: string;
    collectionName?: string;
    /** Called with the new collection's id after one is created. */
    onCreated?: (collectionId: string) => void;
}

/**
 * Add a title to collections, make a new collection, or rename one. Collections people make are
 * personal: only the person who made one sees it.
 */
export const KhyloCollectionDialog: FC<KhyloCollectionDialogProps> = ({
    open,
    mode,
    onClose,
    itemId,
    itemName,
    collectionId,
    collectionName,
    onCreated
}) => {
    const { api } = useApi();
    const queryClient = useQueryClient();

    const [ name, setName ] = useState('');
    const [ busyId, setBusyId ] = useState<string | null>(null);
    const [ error, setError ] = useState<string | null>(null);
    // In add mode the "new collection" field stays tucked away until asked for
    const [ isCreating, setIsCreating ] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setName(mode === 'rename' ? (collectionName ?? '') : '');
        setError(null);
        setBusyId(null);
        setIsCreating(mode !== 'add');
    }, [ open, mode, collectionName ]);

    // Put the cursor in the name field as soon as it appears
    useEffect(() => {
        if (open && isCreating) {
            const timer = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [ open, isCreating ]);

    const { data: collections, isLoading } = useQuery({
        queryKey: [ 'KhyloEditableCollections', itemId ],
        queryFn: () => getEditableCollections(api!, itemId),
        enabled: Boolean(open && api && mode === 'add')
    });

    const refresh = async () => {
        await Promise.all(COLLECTION_QUERY_KEYS.map(key => queryClient.invalidateQueries({ queryKey: [key] })));
    };

    const toggle = async (id: string, contains: boolean) => {
        if (!api || !itemId || busyId) return;
        setBusyId(id);
        setError(null);
        try {
            if (contains) {
                await removeFromCollection(api, id, [itemId]);
            } else {
                await addToCollection(api, id, [itemId]);
            }
            await refresh();
        } catch {
            setError('Couldn\'t update that collection. Try again.');
        } finally {
            setBusyId(null);
        }
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!api || !trimmed || busyId) return;
        setBusyId('form');
        setError(null);
        try {
            if (mode === 'rename' && collectionId) {
                await renameCollection(api, collectionId, trimmed);
                await refresh();
                onClose();
                return;
            }

            const id = await createCollection(api, trimmed, itemId ? [itemId] : []);
            await refresh();
            if (mode === 'add') {
                // Stay open so the new collection shows up ticked in the list
                setName('');
                setIsCreating(false);
            } else {
                onClose();
            }
            onCreated?.(id);
        } catch {
            setError(mode === 'rename' ? 'Couldn\'t rename the collection. Try again.' : 'Couldn\'t create the collection. Try again.');
        } finally {
            setBusyId(null);
        }
    };

    let title = 'New collection';
    if (mode === 'add') title = 'Add to collection';
    else if (mode === 'rename') title = 'Rename collection';

    const form = (
        <form className='khylo-collection-dialog__form' onSubmit={e => { submit(e).catch(() => undefined); }}>
            <input
                ref={inputRef}
                className='khylo-collection-dialog__input'
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='Collection name'
                aria-label='Collection name'
                maxLength={120}
            />
            {mode !== 'rename' && (
                <p className='khylo-collection-dialog__hint'>
                    Only you will see this collection.
                </p>
            )}
            <div className='khylo-collection-dialog__form-actions'>
                {mode === 'add' && (
                    <KhyloButton variant='ghost' size='sm' onClick={() => setIsCreating(false)}>
                        Cancel
                    </KhyloButton>
                )}
                <KhyloButton type='submit' variant='primary' size='sm' disabled={!name.trim() || busyId === 'form'}>
                    {mode === 'rename' ? 'Save' : 'Create'}
                </KhyloButton>
            </div>
        </form>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            slotProps={{ paper: { className: 'khylo-collection-dialog' } }}
            aria-labelledby='khylo-collection-dialog-title'
        >
            <div className='khylo-collection-dialog__header'>
                <div>
                    <h2 id='khylo-collection-dialog-title' className='khylo-collection-dialog__title'>{title}</h2>
                    {mode === 'add' && itemName && <p className='khylo-collection-dialog__subtitle'>{itemName}</p>}
                </div>
                <button type='button' className='khylo-collection-dialog__close' onClick={onClose} aria-label='Close'>
                    <CloseIcon />
                </button>
            </div>

            {mode === 'add' ? (
                <>
                    <ul className='khylo-collection-dialog__list'>
                        {isLoading && <p className='khylo-collection-dialog__empty'>Loading collections…</p>}
                        {!isLoading && collections?.length === 0 && (
                            <p className='khylo-collection-dialog__empty'>You don&apos;t have any collections yet. Make your first one below.</p>
                        )}
                        {collections?.map(c => (
                            <li key={c.Id}>
                                <button
                                    type='button'
                                    className={classNames('khylo-collection-dialog__row', { 'khylo-collection-dialog__row--in': c.ContainsItem })}
                                    onClick={() => { toggle(c.Id, c.ContainsItem).catch(() => undefined); }}
                                    disabled={Boolean(busyId)}
                                    aria-pressed={c.ContainsItem}
                                >
                                    <span className='khylo-collection-dialog__check' aria-hidden='true'>
                                        {c.ContainsItem && <CheckIcon />}
                                    </span>
                                    <span className='khylo-collection-dialog__row-text'>
                                        <span className='khylo-collection-dialog__row-name'>{c.Name}</span>
                                        <span className='khylo-collection-dialog__row-meta'>
                                            {c.IsShared ? <PublicIcon /> : <LockOutlinedIcon />}
                                            {c.IsShared ? 'Everyone' : 'Only you'} · {c.ItemCount} {c.ItemCount === 1 ? 'title' : 'titles'}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className='khylo-collection-dialog__footer'>
                        {isCreating ? form : (
                            <KhyloButton variant='secondary' size='sm' icon={<AddIcon />} onClick={() => setIsCreating(true)}>
                                New collection
                            </KhyloButton>
                        )}
                    </div>
                </>
            ) : (
                <div className='khylo-collection-dialog__footer'>{form}</div>
            )}

            {error && <p className='khylo-collection-dialog__error' role='alert'>{error}</p>}
        </Dialog>
    );
};
