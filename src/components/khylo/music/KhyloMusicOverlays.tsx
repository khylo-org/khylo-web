import React, { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';

import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { getItemImageUrl } from '../media/mediaUtils';
import { onMusicUi, showMusicToast, type MusicUiEvent } from './musicUi';
import {
    PLAYLISTS_QUERY_KEY,
    addSongs,
    createPlaylist,
    deletePlaylist,
    fetchAudioPlaylists,
    fetchPlaylistAccess,
    fetchPlaylistSongIds,
    fetchPlaylistSongs,
    playlistErrorMessage,
    refreshPlaylists,
    removeSongs,
    updatePlaylist
} from './playlistApi';
import { cleanPlaylistName, containsAll, nextDefaultName, songCountLabel } from './playlistRules';
import './KhyloMusicOverlays.scss';

type PickerState = Extract<MusicUiEvent, { type: 'picker' }>;
type DialogState = Extract<MusicUiEvent, { type: 'dialog' }>;

const PICKER_WIDTH = 360;
const PICKER_HEIGHT = 460;

/** Closes whatever is open when Escape is pressed. */
function useEscape(onClose: () => void) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ onClose ]);
}

const PlaylistCover: FC<{ playlist: BaseItemDto; size?: number }> = ({ playlist, size = 96 }) => {
    const { api } = useApi();
    const url = getItemImageUrl(api, playlist, 'primary', size);
    return url ? (
        <img className='kmx-tile' src={url} alt='' loading='lazy' />
    ) : (
        <span className='kmx-tile kmx-tile--empty'><MusicNoteIcon /></span>
    );
};

/* ---------------------------------------------------------------------------------------------------------------- */
/* "Add to playlist"                                                                                                  */
/* ---------------------------------------------------------------------------------------------------------------- */

const PlaylistPicker: FC<{ state: PickerState; onClose: () => void; onCreate: () => void }> = ({ state, onClose, onCreate }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const queryClient = useQueryClient();
    const [ filter, setFilter ] = useState('');
    const [ busyId, setBusyId ] = useState<string | null>(null);
    useEscape(onClose);

    const { data: playlists, isLoading } = useQuery({
        queryKey: [ PLAYLISTS_QUERY_KEY, userId ],
        queryFn: () => (api ? fetchAudioPlaylists(api, userId) : Promise.resolve([])),
        enabled: Boolean(api)
    });

    // Which playlists already hold these songs
    const memberQueries = useQueries({
        queries: (playlists ?? []).map(playlist => ({
            queryKey: [ 'KhyloPlaylistMembers', playlist.Id, userId ],
            queryFn: () => fetchPlaylistSongIds(api!, userId, playlist.Id!),
            enabled: Boolean(api && playlist.Id),
            staleTime: 0
        }))
    });
    const memberSets = useMemo(() => {
        const map = new Map<string, Set<string>>();
        (playlists ?? []).forEach((playlist, index) => {
            const ids = memberQueries[index]?.data;
            if (playlist.Id && ids) map.set(playlist.Id, new Set(ids));
        });
        return map;
    }, [ playlists, memberQueries ]);

    const shown = (playlists ?? []).filter(p => !filter.trim() || (p.Name ?? '').toLowerCase().includes(filter.trim().toLowerCase()));

    const toggle = async (playlist: BaseItemDto) => {
        if (!api || !playlist.Id || busyId) return;
        const members = memberSets.get(playlist.Id);
        const already = members ? containsAll(members, state.songIds) : false;
        setBusyId(playlist.Id);
        try {
            if (already) {
                // Taking the song(s) back out: the server names each entry by its PlaylistItemId
                const entries = await fetchPlaylistSongs(api, userId, playlist.Id);
                const wanted = new Set(state.songIds);
                const entryIds = entries.filter(e => e.Id && wanted.has(e.Id)).map(e => e.PlaylistItemId).filter((id): id is string => Boolean(id));
                await removeSongs(api, playlist.Id, entryIds);
                showMusicToast(`Removed from ${playlist.Name}`);
            } else {
                const { added } = await addSongs(api, userId, playlist.Id, state.songIds);
                showMusicToast(added > 0 ? `Added to ${playlist.Name}` : `Already in ${playlist.Name}`);
            }
            await refreshPlaylists(queryClient, playlist.Id);
        } catch (error) {
            showMusicToast(playlistErrorMessage(error), 'error');
        } finally {
            setBusyId(null);
        }
    };

    // Next to the button that opened it, kept on screen; centred when nothing was pressed
    const anchor = state.anchor;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = Math.max(12, (vw - PICKER_WIDTH) / 2);
    let top = Math.max(12, (vh - PICKER_HEIGHT) / 2);
    if (anchor) {
        left = Math.min(Math.max(12, anchor.right - PICKER_WIDTH), vw - PICKER_WIDTH - 12);
        top = anchor.bottom + 8;
        if (top + PICKER_HEIGHT > vh - 12) top = Math.max(12, anchor.top - PICKER_HEIGHT - 8);
        if (top + PICKER_HEIGHT > vh - 12) top = Math.max(12, vh - PICKER_HEIGHT - 12);
    }

    return (
        <>
            <div className='kmx-scrim kmx-scrim--clear' onClick={onClose} />
            <div className='kmx-picker' style={{ left, top, width: PICKER_WIDTH, maxHeight: PICKER_HEIGHT }} role='dialog' aria-label='Add to playlist'>
                <div className='kmx-picker__head'>
                    <div className='kmx-picker__title'>Add to playlist</div>
                    {state.label && <div className='kmx-picker__sub'>{state.label}</div>}
                </div>

                <label className='kmx-picker__find'>
                    <SearchIcon />
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder='Find a playlist' aria-label='Find a playlist' />
                </label>

                <div className='kmx-picker__list'>
                    <button type='button' className='kmx-picker__row kmx-picker__row--new' onClick={onCreate}>
                        <span className='kmx-tile kmx-tile--new'><AddIcon /></span>
                        <span className='kmx-picker__name'>New playlist</span>
                    </button>

                    {shown.map(playlist => {
                        const members = playlist.Id ? memberSets.get(playlist.Id) : undefined;
                        const has = members ? containsAll(members, state.songIds) : false;
                        return (
                            <button
                                key={playlist.Id}
                                type='button'
                                className={classNames('kmx-picker__row', { 'kmx-picker__row--busy': busyId === playlist.Id })}
                                onClick={() => toggle(playlist)}
                                aria-pressed={has}
                            >
                                <PlaylistCover playlist={playlist} />
                                <span className='kmx-picker__text'>
                                    <span className='kmx-picker__name'>{playlist.Name}</span>
                                    <span className='kmx-picker__meta'>{songCountLabel(playlist.ChildCount ?? 0)}</span>
                                </span>
                                {has && <CheckIcon className='kmx-picker__check' />}
                            </button>
                        );
                    })}

                    {!isLoading && shown.length === 0 && (
                        <p className='kmx-picker__empty'>{filter ? 'No playlist by that name.' : 'No playlists yet. Make the first one above.'}</p>
                    )}
                </div>

                <div className='kmx-picker__foot'>
                    <KhyloButton variant='primary' size='sm' onClick={onClose}>Done</KhyloButton>
                </div>
            </div>
        </>
    );
};

/* ---------------------------------------------------------------------------------------------------------------- */
/* New playlist / playlist details                                                                                    */
/* ---------------------------------------------------------------------------------------------------------------- */

const PlaylistDialog: FC<{ state: DialogState; onClose: () => void }> = ({ state, onClose }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const playlistId = state.playlistId;
    const isEdit = Boolean(playlistId);
    useEscape(onClose);

    const { data: playlists } = useQuery({
        queryKey: [ PLAYLISTS_QUERY_KEY, userId ],
        queryFn: () => (api ? fetchAudioPlaylists(api, userId) : Promise.resolve([])),
        enabled: Boolean(api)
    });

    const { data: item } = useQuery({
        queryKey: [ 'KhyloPlaylistDialogItem', playlistId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItem({ userId, itemId: playlistId! })).data as BaseItemDto,
        enabled: Boolean(api && playlistId),
        staleTime: 0
    });
    const { data: access } = useQuery({
        queryKey: [ 'KhyloPlaylistAccess', playlistId, userId ],
        queryFn: () => fetchPlaylistAccess(api!, userId, playlistId!),
        enabled: Boolean(api && playlistId),
        staleTime: 0
    });

    const [ name, setName ] = useState<string | null>(null);
    const [ isPublic, setIsPublic ] = useState<boolean | null>(null);
    const [ confirmDelete, setConfirmDelete ] = useState(false);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const shownName = name ?? (isEdit ? (item?.Name ?? '') : nextDefaultName((playlists ?? []).map(p => p.Name ?? '')));
    const shownPublic = isPublic ?? (isEdit ? Boolean(access?.isPublic) : false);
    const canEdit = !isEdit || Boolean(access?.canEdit);
    const canDelete = isEdit && Boolean(item?.CanDelete);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, [ item?.Id ]);

    const save = async () => {
        if (!api || busy) return;
        const clean = cleanPlaylistName(shownName);
        if (!clean) {
            setError('Give the playlist a name.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            if (isEdit && playlistId) {
                await updatePlaylist(api, playlistId, { name: clean, isPublic: shownPublic });
                await refreshPlaylists(queryClient, playlistId);
                showMusicToast('Saved');
            } else {
                const songIds = state.songIds ?? [];
                const id = await createPlaylist(api, userId, clean, songIds, shownPublic);
                await refreshPlaylists(queryClient, id);
                if (songIds.length > 0) {
                    showMusicToast(`Added to ${clean}`);
                } else {
                    navigate(`/details?id=${id}`);
                }
            }
            onClose();
        } catch (e) {
            setError(playlistErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!api || !playlistId || busy) return;
        setBusy(true);
        setError(null);
        try {
            await deletePlaylist(api, playlistId);
            showMusicToast(`Deleted ${item?.Name ?? 'playlist'}`);
            onClose();
            // Standing on the playlist's own page: it is gone, so go back to the music home
            if (window.location.hash.includes(playlistId)) navigate('/music?tab=listen-now', { replace: true });
            // Refreshing the deleted playlist's own page data would only fail and retry; the lists and sidebar refresh without waiting
            void queryClient.invalidateQueries({ queryKey: [ PLAYLISTS_QUERY_KEY ] });
            queryClient.removeQueries({ queryKey: [ 'KhyloPlaylistMembers' ] });
        } catch (e) {
            setError(playlistErrorMessage(e));
            setConfirmDelete(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className='kmx-scrim' onClick={onClose} />
            <form
                className='kmx-dialog'
                role='dialog'
                aria-modal='true'
                aria-labelledby='kmx-dialog-title'
                onSubmit={e => {
                    e.preventDefault();
                    void save();
                }}
            >
                <div className='kmx-dialog__head'>
                    <h2 id='kmx-dialog-title'>{isEdit ? 'Edit playlist' : 'New playlist'}</h2>
                    <button type='button' className='kmx-icon-btn' onClick={onClose} aria-label='Close'><CloseIcon /></button>
                </div>

                <div className='kmx-field'>
                    <label htmlFor='kmx-playlist-name'>Name</label>
                    <input
                        id='kmx-playlist-name'
                        ref={inputRef}
                        value={shownName}
                        onChange={e => setName(e.target.value)}
                        maxLength={120}
                        disabled={!canEdit || busy}
                        autoComplete='off'
                    />
                </div>

                <div className='kmx-field'>
                    <span className='kmx-field__label'>Who can see it</span>
                    <div className='kmx-seg' role='radiogroup' aria-label='Who can see it'>
                        <button type='button' role='radio' aria-checked={!shownPublic} className={classNames({ 'kmx-seg__on': !shownPublic })} onClick={() => setIsPublic(false)} disabled={!canEdit || busy}>Only me</button>
                        <button type='button' role='radio' aria-checked={shownPublic} className={classNames({ 'kmx-seg__on': shownPublic })} onClick={() => setIsPublic(true)} disabled={!canEdit || busy}>Everyone on this server</button>
                    </div>
                    <p className='kmx-field__help'>Others can play a shared playlist, but only you can change it.</p>
                </div>

                {isEdit && access && !access.canEdit && <p className='kmx-dialog__note'>This playlist belongs to someone else, so you can’t change it.</p>}
                {error && <p className='kmx-dialog__error' role='alert'>{error}</p>}

                {confirmDelete ? (
                    <div className='kmx-dialog__foot kmx-dialog__foot--confirm'>
                        <span>Delete “{item?.Name}”? The songs stay in your library.</span>
                        <div className='kmx-dialog__buttons'>
                            <KhyloButton variant='secondary' size='md' onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</KhyloButton>
                            <KhyloButton variant='destructive' size='md' onClick={() => void remove()} disabled={busy}>Delete</KhyloButton>
                        </div>
                    </div>
                ) : (
                    <div className='kmx-dialog__foot'>
                        {canDelete ? (
                            <button type='button' className='kmx-danger-link' onClick={() => setConfirmDelete(true)}><DeleteOutlineIcon />Delete playlist</button>
                        ) : <span />}
                        <div className='kmx-dialog__buttons'>
                            <KhyloButton variant='secondary' size='md' onClick={onClose}>Cancel</KhyloButton>
                            <KhyloButton variant='primary' size='md' type='submit' disabled={busy || !canEdit}>{isEdit ? 'Save' : 'Create'}</KhyloButton>
                        </div>
                    </div>
                )}
            </form>
        </>
    );
};

/* ---------------------------------------------------------------------------------------------------------------- */
/* The host                                                                                                           */
/* ---------------------------------------------------------------------------------------------------------------- */

/** Draws the playlist picker, the playlist dialog and the short messages. Mounted once, by the app shell. */
export const KhyloMusicOverlays: FC = () => {
    const [ picker, setPicker ] = useState<PickerState | null>(null);
    const [ dialog, setDialog ] = useState<DialogState | null>(null);
    const [ toast, setToast ] = useState<{ id: number; message: string; tone: 'ok' | 'error' } | null>(null);

    useEffect(() => onMusicUi(event => {
        if (event.type === 'picker') {
            setDialog(null);
            setPicker(event);
        } else if (event.type === 'dialog') {
            setPicker(null);
            setDialog(event);
        } else {
            setToast({ id: Date.now(), message: event.message, tone: event.tone ?? 'ok' });
        }
    }), []);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(current => (current?.id === toast.id ? null : current)), toast.tone === 'error' ? 6000 : 3500);
        return () => window.clearTimeout(timer);
    }, [ toast ]);

    const closePicker = useCallback(() => setPicker(null), []);
    const closeDialog = useCallback(() => setDialog(null), []);

    return (
        <>
            {picker && (
                <PlaylistPicker
                    state={picker}
                    onClose={closePicker}
                    onCreate={() => {
                        setPicker(null);
                        setDialog({ type: 'dialog', songIds: picker.songIds });
                    }}
                />
            )}
            {dialog && <PlaylistDialog state={dialog} onClose={closeDialog} />}
            {toast && (
                <div className={classNames('kmx-toast', { 'kmx-toast--error': toast.tone === 'error' })} role='status' aria-live='polite'>
                    {toast.message}
                </div>
            )}
        </>
    );
};
