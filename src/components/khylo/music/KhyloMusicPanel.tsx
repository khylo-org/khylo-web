import React, { type FC } from 'react';
import { useQuery } from '@tanstack/react-query';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { getItemImageUrl, playMediaItem } from '../media/mediaUtils';
import { useMusicNowPlaying } from './useMusicNowPlaying';

export interface KhyloMusicPanelProps {
    featuredAlbum: BaseItemDto | null;
}

/**
 * Right-hand panel, the track playing now, then the artist it belongs to.
 */
export const KhyloMusicPanel: FC<KhyloMusicPanelProps> = ({ featuredAlbum }) => {
    const { api, user } = useApi();
    const { item, isPaused, togglePlayPause, next, previous } = useMusicNowPlaying();

    // The artist of the track that is playing
    const artistId = item?.ArtistItems?.[0]?.Id ?? null;
    const { data: artist } = useQuery({
        queryKey: ['KhyloMusicPanelArtist', artistId, user?.Id],
        queryFn: async () => {
            if (!api || !artistId) return null;
            const res = await getLibraryApi(api).getItem({ userId: user?.Id || undefined, itemId: artistId });
            return res.data as BaseItemDto;
        },
        enabled: Boolean(api && artistId)
    });

    // Show what is playing; otherwise offer the featured album
    const shown = item || featuredAlbum;
    const cover = shown ? getItemImageUrl(api, shown, 'primary', 640) : null;
    const subtitle = item ?
        (item.Artists?.join(', ') || item.AlbumArtist || '') :
        (featuredAlbum?.AlbumArtist || featuredAlbum?.Artists?.[0] || '');
    const artistPhoto = artist ? getItemImageUrl(api, artist, 'primary', 640) : null;

    return (
        <aside className='khylo-music-panel'>
            <section className='khylo-music-panel__now'>
                <h2 className='khylo-music-panel__title'>{item ? 'Now playing' : 'Featured'}</h2>

                <div className='khylo-music-panel__cover'>
                    {cover ? (
                        <img src={cover} alt={shown?.Name ?? ''} className='khylo-music-panel__cover-img' />
                    ) : (
                        <div className='khylo-music-panel__cover-fallback'>
                            <MusicNoteIcon />
                        </div>
                    )}
                </div>

                <div className='khylo-music-panel__track'>
                    <div className='khylo-music-panel__track-name'>{shown?.Name ?? 'Nothing playing'}</div>
                    <div className='khylo-music-panel__track-artist'>{subtitle}</div>
                </div>

                {item ? (
                    <div className='khylo-music-panel__controls'>
                        <button type='button' className='khylo-music-panel__ctrl' onClick={previous} aria-label='Previous'>
                            <SkipPreviousIcon />
                        </button>
                        <button
                            type='button'
                            className='khylo-music-panel__ctrl khylo-music-panel__ctrl--main'
                            onClick={togglePlayPause}
                            aria-label={isPaused ? 'Play' : 'Pause'}
                        >
                            {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                        </button>
                        <button type='button' className='khylo-music-panel__ctrl' onClick={next} aria-label='Next'>
                            <SkipNextIcon />
                        </button>
                    </div>
                ) : (
                    featuredAlbum && (
                        <div className='khylo-music-panel__controls'>
                            <KhyloButton variant='primary' size='md' icon={<PlayArrowIcon />} onClick={() => playMediaItem(featuredAlbum)}>
                                Play album
                            </KhyloButton>
                        </div>
                    )
                )}
            </section>

            {artist && (
                <section className='khylo-music-panel__about'>
                    <h2 className='khylo-music-panel__heading'>About the artist</h2>
                    <div className='khylo-music-panel__about-photo'>
                        {artistPhoto ? (
                            <img src={artistPhoto} alt={artist.Name ?? ''} className='khylo-music-panel__about-img' />
                        ) : (
                            <div className='khylo-music-panel__about-fallback'>{artist.Name?.[0] ?? '♪'}</div>
                        )}
                    </div>
                    <div className='khylo-music-panel__about-name'>{artist.Name}</div>
                    {artist.Genres && artist.Genres.length > 0 && (
                        <div className='khylo-music-panel__about-meta'>{artist.Genres.slice(0, 3).join(' · ')}</div>
                    )}
                </section>
            )}
        </aside>
    );
};
