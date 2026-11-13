import React, { useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import SearchIcon from '@mui/icons-material/Search';
import SensorsIcon from '@mui/icons-material/Sensors';
import ShuffleIcon from '@mui/icons-material/Shuffle';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { playMediaItem } from '../media/mediaUtils';
import { KmxCard, KmxCover, KmxRail, KmxSection } from './KmxParts';
import { KmxTrackTable } from './KmxTrackTable';
import { musicArtUrl, totalTime } from './musicArt';
import { openPlaylistDialog, openPlaylistPicker, showMusicToast } from './musicUi';
import {
    PLAYLIST_SONGS_QUERY_KEY,
    addSongs,
    fetchPlaylistAccess,
    fetchPlaylistSongs,
    moveSong,
    playlistErrorMessage,
    refreshPlaylists,
    removeSongs
} from './playlistApi';
import { moveInList, songCountLabel } from './playlistRules';
import { useArtistRadio } from './useArtistRadio';
import { useCoverTint } from './useCoverTint';
import { useFavorites } from './useFavorites';
import { useMusicNowPlaying } from './useMusicNowPlaying';

const SONG_FIELDS = [ ItemFields.PrimaryImageAspectRatio, ItemFields.Genres, ItemFields.DateCreated, ItemFields.ParentId ];

/** Songs found by a search, for adding to the playlist being edited. */
const AddSongsPanel: FC<{ playlistId: string; inPlaylist: Set<string>; onAdded: () => void }> = ({ playlistId, inPlaylist, onAdded }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const queryClient = useQueryClient();
    const [ text, setText ] = useState('');
    const [ term, setTerm ] = useState('');
    const [ busyId, setBusyId ] = useState<string | null>(null);

    // Wait for a pause in typing before asking the server
    useEffect(() => {
        const timer = window.setTimeout(() => setTerm(text.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [ text ]);

    const { data: results, isFetching } = useQuery({
        queryKey: [ 'KhyloPlaylistAddSearch', term, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId,
            searchTerm: term,
            includeItemTypes: [ BaseItemKind.Audio ],
            recursive: true,
            fields: SONG_FIELDS,
            sortBy: [ ItemSortBy.SortName ],
            limit: 30
        })).data.Items ?? [],
        enabled: Boolean(api) && term.length > 1
    });

    const add = async (song: BaseItemDto) => {
        if (!api || !song.Id || busyId) return;
        setBusyId(song.Id);
        try {
            await addSongs(api, userId, playlistId, [ song.Id ]);
            await refreshPlaylists(queryClient, playlistId);
            onAdded();
        } catch (error) {
            showMusicToast(playlistErrorMessage(error), 'error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className='kmx-add' aria-label='Add songs to this playlist'>
            <h2>Add to this playlist</h2>
            <label className='kmx-add__find'>
                <SearchIcon />
                <input value={text} onChange={e => setText(e.target.value)} placeholder='Search songs, albums or artists' aria-label='Search for songs to add' />
            </label>
            {term.length > 1 && (results ?? []).length === 0 && !isFetching && <p className='kmx-empty'>No songs found for “{term}”.</p>}
            <div className='kmx-add__list'>
                {(results ?? []).map(song => {
                    const added = Boolean(song.Id && inPlaylist.has(song.Id));
                    return (
                        <div className='kmx-add__row' key={song.Id}>
                            <KmxCover src={musicArtUrl(api, song, 96)} className='kmx-add__cover' />
                            <span className='kmx-add__text'>
                                <span className='kmx-add__name'>{song.Name}</span>
                                <span className='kmx-add__sub'>{[ song.Artists?.[0], song.Album ].filter(Boolean).join(' · ')}</span>
                            </span>
                            <KhyloButton
                                variant={added ? 'ghost' : 'secondary'}
                                size='sm'
                                icon={added ? <CheckIcon /> : <AddIcon />}
                                disabled={added || busyId === song.Id}
                                onClick={() => void add(song)}
                            >
                                {added ? 'Added' : 'Add'}
                            </KhyloButton>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export interface KmxCollectionPageProps {
    /** An album or an audio playlist. */
    item: BaseItemDto;
}

/** An album or a playlist: its cover, Play / Shuffle (/ Artist Radio), its songs, and for your own playlists, editing. */
export const KmxCollectionPage: FC<KmxCollectionPageProps> = ({ item }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const favorites = useFavorites();
    const radio = useArtistRadio();
    const now = useMusicNowPlaying();
    const isPlaylist = item.Type === BaseItemKind.Playlist;
    const itemId = item.Id!;
    const [ editing, setEditing ] = useState(false);
    // The "add songs" panel: opened by its button, by Edit, or because the playlist is empty; once open it stays while songs go in
    const [ adding, setAdding ] = useState(false);

    // Leaving for another playlist or album ends editing
    useEffect(() => {
        setEditing(false);
        setAdding(false);
    }, [ itemId ]);

    const { data: tracks } = useQuery({
        queryKey: [ PLAYLIST_SONGS_QUERY_KEY, itemId, userId ],
        queryFn: async () => {
            if (isPlaylist) return fetchPlaylistSongs(api!, userId, itemId);
            return (await getLibraryApi(api!).getItems({
                userId,
                parentId: itemId,
                includeItemTypes: [ BaseItemKind.Audio ],
                recursive: true,
                fields: SONG_FIELDS,
                sortBy: [ ItemSortBy.ParentIndexNumber, ItemSortBy.IndexNumber, ItemSortBy.SortName ]
            })).data.Items ?? [];
        },
        enabled: Boolean(api && itemId)
    });

    const { data: access } = useQuery({
        queryKey: [ 'KhyloPlaylistAccess', itemId, userId ],
        queryFn: () => fetchPlaylistAccess(api!, userId, itemId),
        enabled: Boolean(api && isPlaylist),
        staleTime: 30 * 1000
    });
    const canEdit = isPlaylist && Boolean(access?.canEdit);
    const emptyPlaylist = isPlaylist && tracks !== undefined && tracks.length === 0;
    useEffect(() => {
        if (emptyPlaylist && canEdit) setAdding(true);
    }, [ emptyPlaylist, canEdit ]);

    const albumArtist = !isPlaylist ? item.AlbumArtists?.[0] : undefined;
    const { data: moreByArtist } = useQuery({
        queryKey: [ 'KhyloMoreByArtist', albumArtist?.Id, userId ],
        queryFn: async () => ((await getLibraryApi(api!).getItems({
            userId,
            artistIds: [ albumArtist!.Id! ],
            includeItemTypes: [ BaseItemKind.MusicAlbum ],
            recursive: true,
            fields: [ ItemFields.PrimaryImageAspectRatio ],
            sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.SortName ]
        })).data.Items ?? []).filter(album => album.Id !== itemId),
        enabled: Boolean(api && albumArtist?.Id)
    });

    const cover = musicArtUrl(api, item, 600);
    const tint = useCoverTint(cover);
    const list = useMemo(() => tracks ?? [], [ tracks ]);
    const inPlaylist = useMemo(() => new Set(list.map(track => track.Id).filter((id): id is string => Boolean(id))), [ list ]);

    const totalTicks = list.reduce((sum, track) => sum + (track.RunTimeTicks ?? 0), 0);
    const variousArtists = !isPlaylist && new Set(list.map(track => track.Artists?.[0] ?? '')).size > 1;
    const key = [ PLAYLIST_SONGS_QUERY_KEY, itemId, userId ];

    const play = (index = 0, shuffle = false) => {
        if (list.length === 0) return;
        playMediaItem(list[index], { items: list, startIndex: shuffle ? undefined : index, shuffle });
    };

    // Reordering: the list moves at once, then the server is told; a refusal puts it back
    const move = async (from: number, to: number) => {
        if (!api || !isPlaylist || from === to) return;
        const song = list[from];
        if (!song?.PlaylistItemId) return;
        queryClient.setQueryData(key, moveInList(list, from, to));
        try {
            await moveSong(api, itemId, song.PlaylistItemId, to);
        } catch (error) {
            showMusicToast(playlistErrorMessage(error), 'error');
        } finally {
            await queryClient.invalidateQueries({ queryKey: key });
        }
    };

    const remove = async (song: BaseItemDto, index: number) => {
        if (!api || !song.PlaylistItemId) return;
        queryClient.setQueryData(key, list.filter((_, i) => i !== index));
        try {
            await removeSongs(api, itemId, [ song.PlaylistItemId ]);
            showMusicToast(`Removed ${song.Name}`);
        } catch (error) {
            showMusicToast(playlistErrorMessage(error), 'error');
        } finally {
            await refreshPlaylists(queryClient, itemId);
        }
    };

    const artistLine = isPlaylist ? (
        <span>{user?.Name && access?.canEdit ? 'Made by you' : 'Playlist'}</span>
    ) : albumArtist ? (
        <button type='button' className='kmx-link-btn kmx-link-btn--strong' onClick={() => navigate(`/music?artistId=${albumArtist.Id}`)}>{albumArtist.Name}</button>
    ) : (
        <span>{item.AlbumArtist}</span>
    );
    const isFav = favorites.isFavorite(item);

    return (
        <div className='kmx-page' style={{ '--kmx-tint': tint } as CSSProperties}>
            <header className='kmx-head'>
                <KmxCover src={cover} className='kmx-head__cover' />
                <div className='kmx-head__info'>
                    <div className='kmx-hero__eyebrow'>{isPlaylist ? 'PLAYLIST' : 'ALBUM'}</div>
                    <h1 title={item.Name ?? ''}>{item.Name}</h1>
                    <div className='kmx-head__meta'>
                        {artistLine}
                        {!isPlaylist && item.ProductionYear ? <span>{item.ProductionYear}</span> : null}
                        {tracks && <span>{songCountLabel(list.length)}</span>}
                        {totalTicks > 0 && <span>{totalTime(totalTicks)}</span>}
                    </div>
                    <div className='kmx-head__actions'>
                        <KhyloButton variant='primary' size='lg' icon={<PlayArrowIcon />} disabled={list.length === 0} onClick={() => play(0)}>Play</KhyloButton>
                        <KhyloButton variant='secondary' size='lg' icon={<ShuffleIcon />} disabled={list.length === 0} onClick={() => play(0, true)}>Shuffle</KhyloButton>
                        {albumArtist && (
                            <KhyloButton
                                variant='secondary'
                                size='lg'
                                icon={<SensorsIcon />}
                                disabled={radio.busy}
                                onClick={() => void radio.start({ Id: albumArtist.Id, Name: albumArtist.Name } as BaseItemDto)}
                                title='Their songs, mixed with artists who really sound like them'
                            >
                                {radio.busy ? 'Building radio…' : 'Artist Radio'}
                            </KhyloButton>
                        )}
                        {!isPlaylist && (
                            <button type='button' className='kmx-round-btn' aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={isFav} onClick={() => void favorites.toggle(item)}>
                                {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                            </button>
                        )}
                        {!isPlaylist && list.length > 0 && (
                            <button
                                type='button'
                                className='kmx-round-btn'
                                aria-label='Add this album to a playlist'
                                title='Add the whole album to a playlist'
                                onClick={e => openPlaylistPicker(list.map(t => t.Id!).filter(Boolean), { label: `${item.Name} · ${songCountLabel(list.length)}`, anchor: e.currentTarget })}
                            >
                                <PlaylistAddIcon />
                            </button>
                        )}
                        {canEdit && !editing && (
                            <KhyloButton variant={adding ? 'primary' : 'secondary'} size='lg' icon={<AddIcon />} onClick={() => setAdding(v => !v)}>Add songs</KhyloButton>
                        )}
                        {canEdit && (
                            <KhyloButton
                                variant={editing ? 'primary' : 'secondary'}
                                size='lg'
                                icon={editing ? <CheckIcon /> : <EditOutlinedIcon />}
                                onClick={() => setEditing(v => !v)}
                            >
                                {editing ? 'Done' : 'Edit'}
                            </KhyloButton>
                        )}
                        {isPlaylist && (
                            <button type='button' className='kmx-round-btn' aria-label='Playlist details' title='Rename, who can see it, delete' onClick={() => openPlaylistDialog({ playlistId: itemId })}>
                                <MoreHorizIcon />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className='kmx-body'>
                {editing && <p className='kmx-edit-hint'>Drag a song by its handle to reorder, or focus the handle and use the arrow keys. The minus button takes a song out of this playlist (it stays in your library).</p>}

                {tracks && list.length === 0 ? (
                    <p className='kmx-empty'>
                        {isPlaylist ? (canEdit ? 'Nothing in this playlist yet. Search below to add songs.' : 'Nothing in this playlist yet.') : 'No songs found for this album.'}
                    </p>
                ) : (
                    <KmxTrackTable
                        tracks={list}
                        columns={{ art: isPlaylist, artist: isPlaylist || variousArtists, album: isPlaylist, plays: !isPlaylist }}
                        currentId={now.item?.Id}
                        paused={now.isPaused}
                        favorites={favorites}
                        onPlay={(_track, index) => play(index)}
                        onOpenAlbum={id => navigate(`/details?id=${id}`)}
                        edit={editing && canEdit ? { onMove: (from, to) => void move(from, to), onRemove: (song, index) => void remove(song, index) } : undefined}
                    />
                )}

                {isPlaylist && canEdit && (editing || adding) && (
                    <AddSongsPanel playlistId={itemId} inPlaylist={inPlaylist} onAdded={() => undefined} />
                )}

                {!isPlaylist && albumArtist && moreByArtist && moreByArtist.length > 0 && (
                    <KmxSection title={`More by ${albumArtist.Name}`}>
                        <KmxRail label={`More by ${albumArtist.Name}`}>
                            {moreByArtist.map(album => (
                                <KmxCard
                                    key={album.Id}
                                    title={album.Name ?? ''}
                                    subtitle={[ album.ProductionYear, 'Album' ].filter(Boolean).join(' · ')}
                                    src={musicArtUrl(api, album, 400)}
                                    onOpen={() => navigate(`/details?id=${album.Id}`)}
                                    onPlay={() => playMediaItem(album)}
                                />
                            ))}
                        </KmxRail>
                    </KmxSection>
                )}
            </div>
        </div>
    );
};
