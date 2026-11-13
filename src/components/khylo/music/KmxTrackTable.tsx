import React, { useState, type CSSProperties, type FC } from 'react';
import classNames from 'classnames';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import { useApi } from 'hooks/useApi';
import { KmxCover, KmxEqualizer } from './KmxParts';
import { musicArtUrl, trackTime } from './musicArt';
import { openPlaylistPicker } from './musicUi';
import type { Favorites } from './useFavorites';

export interface KmxTrackColumns {
    /** A small cover beside the title. */
    art?: boolean;
    /** The artist under the title. */
    artist?: boolean;
    album?: boolean;
    added?: boolean;
    plays?: boolean;
}

export interface KmxTrackTableProps {
    tracks: BaseItemDto[];
    columns?: KmxTrackColumns;
    /** The song playing now (marked in orange). */
    currentId?: string | null;
    paused?: boolean;
    favorites: Favorites;
    onPlay: (track: BaseItemDto, index: number) => void;
    onOpenAlbum?: (albumId: string) => void;
    /** Present while a playlist is being edited: rows can be dragged and removed. */
    edit?: {
        onRemove: (track: BaseItemDto, index: number) => void;
        onMove: (from: number, to: number) => void;
    };
    /** A song to draw the eye to (arriving from a link), marked softly. */
    highlightId?: string | null;
    /** Hide the column headings (a short list under a title). */
    compact?: boolean;
}

const dateAdded = (value?: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const KmxTrackTable: FC<KmxTrackTableProps> = ({ tracks, columns = {}, currentId, paused, favorites, onPlay, onOpenAlbum, edit, highlightId, compact }) => {
    const { api } = useApi();
    const [ dragFrom, setDragFrom ] = useState<number | null>(null);
    const [ dropAt, setDropAt ] = useState<number | null>(null);

    const template = [
        edit ? '28px' : null,
        '44px',
        'minmax(200px, 1.6fr)',
        columns.album ? 'minmax(120px, 1fr)' : null,
        columns.added ? '112px' : null,
        columns.plays ? '84px' : null,
        edit ? '132px' : '124px'
    ].filter(Boolean).join(' ');
    const style = { '--kmx-cols': template } as CSSProperties;

    const endDrag = () => {
        setDragFrom(null);
        setDropAt(null);
    };

    return (
        <div className='kmx-table' style={style} role='table'>
            {!compact && (
                <div className='kmx-table__head' role='row'>
                    {edit && <span />}
                    <span className='kmx-table__num'>#</span>
                    <span>Title</span>
                    {columns.album && <span>Album</span>}
                    {columns.added && <span>Added</span>}
                    {columns.plays && <span className='kmx-table__right'>Plays</span>}
                    <span className='kmx-table__right'><AccessTimeIcon fontSize='small' /></span>
                </div>
            )}

            {tracks.map((track, index) => {
                const id = track.Id ?? String(index);
                const isCurrent = Boolean(currentId) && track.Id === currentId;
                const favorite = favorites.isFavorite(track);
                const artists = track.Artists?.join(', ') || track.AlbumArtist || '';
                const plays = track.UserData?.PlayCount ?? 0;
                const label = [ track.Name, artists ].filter(Boolean).join(' · ');

                return (
                    <div
                        key={track.PlaylistItemId ?? id}
                        className={classNames('kmx-row', {
                            'kmx-row--current': isCurrent,
                            'kmx-row--highlight': highlightId && track.Id === highlightId,
                            'kmx-row--dragging': dragFrom === index,
                            'kmx-row--drop-above': dragFrom !== null && dropAt === index && dragFrom > index,
                            'kmx-row--drop-below': dragFrom !== null && dropAt === index && dragFrom < index
                        })}
                        role='row'
                        tabIndex={0}
                        data-track-id={track.Id}
                        draggable={Boolean(edit)}
                        onClick={() => onPlay(track, index)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && e.target === e.currentTarget) onPlay(track, index);
                        }}
                        onDragStart={edit ? e => {
                            setDragFrom(index);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(index));
                        } : undefined}
                        onDragOver={edit ? e => {
                            if (dragFrom === null) return;
                            e.preventDefault();
                            setDropAt(index);
                        } : undefined}
                        onDrop={edit ? e => {
                            e.preventDefault();
                            if (dragFrom !== null && dragFrom !== index) edit.onMove(dragFrom, index);
                            endDrag();
                        } : undefined}
                        onDragEnd={edit ? endDrag : undefined}
                    >
                        {edit && (
                            <button
                                type='button'
                                className='kmx-row__grip'
                                aria-label={`Move ${track.Name}. Use the up and down arrow keys.`}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                    if (e.key === 'ArrowUp' && index > 0) {
                                        e.preventDefault();
                                        edit.onMove(index, index - 1);
                                    } else if (e.key === 'ArrowDown' && index < tracks.length - 1) {
                                        e.preventDefault();
                                        edit.onMove(index, index + 1);
                                    }
                                }}
                            >
                                <DragIndicatorIcon />
                            </button>
                        )}

                        <span className='kmx-row__num'>
                            {isCurrent ? <KmxEqualizer paused={paused} /> : <span className='kmx-row__idx'>{index + 1}</span>}
                            <button
                                type='button'
                                className='kmx-row__play'
                                aria-label={`Play ${label}`}
                                onClick={e => {
                                    e.stopPropagation();
                                    onPlay(track, index);
                                }}
                            >
                                <PlayArrowIcon />
                            </button>
                        </span>

                        <span className='kmx-row__title'>
                            {columns.art && <KmxCover src={musicArtUrl(api, track, 96)} className='kmx-row__cover' />}
                            <span className='kmx-row__text'>
                                <span className='kmx-row__name'>{track.Name}</span>
                                {columns.artist !== false && artists && <span className='kmx-row__artist'>{artists}</span>}
                            </span>
                        </span>

                        {columns.album && (
                            <span className='kmx-row__album'>
                                {track.AlbumId && onOpenAlbum ? (
                                    <button
                                        type='button'
                                        className='kmx-row__link'
                                        onClick={e => {
                                            e.stopPropagation();
                                            onOpenAlbum(track.AlbumId!);
                                        }}
                                    >
                                        {track.Album || 'Single'}
                                    </button>
                                ) : (track.Album || 'Single')}
                            </span>
                        )}

                        {columns.added && <span className='kmx-row__added'>{dateAdded(track.DateCreated)}</span>}
                        {columns.plays && <span className='kmx-row__plays'>{plays > 0 ? `${plays} ${plays === 1 ? 'play' : 'plays'}` : ''}</span>}

                        <span className='kmx-row__end'>
                            <button
                                type='button'
                                className={classNames('kmx-row__act', { 'kmx-row__act--on': favorite })}
                                aria-label={favorite ? `Remove ${track.Name} from favourites` : `Favourite ${track.Name}`}
                                aria-pressed={favorite}
                                onClick={e => {
                                    e.stopPropagation();
                                    void favorites.toggle(track);
                                }}
                            >
                                {favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                            </button>
                            <button
                                type='button'
                                className='kmx-row__act'
                                aria-label={`Add ${track.Name} to a playlist`}
                                title='Add to playlist'
                                onClick={e => {
                                    e.stopPropagation();
                                    if (track.Id) openPlaylistPicker([ track.Id ], { label: label, anchor: e.currentTarget });
                                }}
                            >
                                <PlaylistAddIcon />
                            </button>
                            {edit && (
                                <button
                                    type='button'
                                    className='kmx-row__act kmx-row__act--remove'
                                    aria-label={`Remove ${track.Name} from this playlist`}
                                    title='Remove from this playlist'
                                    onClick={e => {
                                        e.stopPropagation();
                                        edit.onRemove(track, index);
                                    }}
                                >
                                    <RemoveCircleOutlineIcon />
                                </button>
                            )}
                            <span className='kmx-row__time'>{trackTime(track.RunTimeTicks)}</span>
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
