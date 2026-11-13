import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SensorsIcon from '@mui/icons-material/Sensors';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { playMediaItem } from '../media/mediaUtils';
import { KmxCover } from './KmxParts';
import { musicArtUrl } from './musicArt';
import { useArtistRadio } from './useArtistRadio';
import { useMusicNowPlaying } from './useMusicNowPlaying';

export interface KhyloMusicPanelProps {
    featuredAlbum: BaseItemDto | null;
}

/**
 * Right-hand panel: the song playing now (or a featured album when nothing is), the artist it belongs to,
 * and Artist Radio for them.
 */
export const KhyloMusicPanel: FC<KhyloMusicPanelProps> = ({ featuredAlbum }) => {
    const { api, user } = useApi();
    const navigate = useNavigate();
    const radio = useArtistRadio();
    const { item, isPaused, togglePlayPause, next, previous } = useMusicNowPlaying();

    // The artist of the song that is playing, or of the featured album
    const artistRef = item?.ArtistItems?.[0] ?? featuredAlbum?.AlbumArtists?.[0] ?? featuredAlbum?.ArtistItems?.[0];
    const artistId = artistRef?.Id ?? null;
    const { data: artist } = useQuery({
        queryKey: [ 'KhyloMusicPanelArtist', artistId, user?.Id ],
        queryFn: async () => (await getLibraryApi(api!).getItem({ userId: user?.Id, itemId: artistId! })).data as BaseItemDto,
        enabled: Boolean(api && artistId)
    });

    // Show what is playing; otherwise offer the featured album
    const shown = item || featuredAlbum;
    const subtitle = item ?
        (item.Artists?.join(', ') || item.AlbumArtist || '') :
        (featuredAlbum?.AlbumArtist || featuredAlbum?.Artists?.[0] || '');
    const artistPhoto = artist ? (musicArtUrl(api, artist, 640) ?? musicArtUrl(api, shown, 640)) : null;

    return (
        <aside className='khylo-music-panel'>
            <section className='khylo-music-panel__now'>
                <h2 className='khylo-music-panel__title'>{item ? 'Now playing' : 'Featured'}</h2>

                <KmxCover src={musicArtUrl(api, shown, 640)} className='khylo-music-panel__cover' />

                <div className='khylo-music-panel__track'>
                    <div className='khylo-music-panel__track-name' title={shown?.Name ?? ''}>{shown?.Name ?? 'Nothing playing'}</div>
                    {artistId ? (
                        <button type='button' className='khylo-music-panel__track-artist' onClick={() => navigate(`/music?artistId=${artistId}`)}>{subtitle}</button>
                    ) : (
                        <div className='khylo-music-panel__track-artist'>{subtitle}</div>
                    )}
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
                    <button type='button' className='khylo-music-panel__about-card' onClick={() => navigate(`/music?artistId=${artist.Id}`)}>
                        <KmxCover src={artistPhoto} round person className='khylo-music-panel__about-photo' />
                        <span className='khylo-music-panel__about-text'>
                            <span className='khylo-music-panel__about-name'>{artist.Name}</span>
                            {artist.Genres && artist.Genres.length > 0 && (
                                <span className='khylo-music-panel__about-meta'>{artist.Genres.slice(0, 3).join(' · ')}</span>
                            )}
                        </span>
                    </button>
                    <KhyloButton
                        variant='secondary'
                        size='md'
                        fullWidth
                        icon={<SensorsIcon />}
                        disabled={radio.busy}
                        onClick={() => void radio.start(artist)}
                        title='Their songs, mixed with artists who really sound like them'
                    >
                        {radio.busy ? 'Building radio…' : `${artist.Name} Radio`}
                    </KhyloButton>
                </section>
            )}
        </aside>
    );
};
