import React, { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';

import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SensorsIcon from '@mui/icons-material/Sensors';
import ShuffleIcon from '@mui/icons-material/Shuffle';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { playMediaItem } from '../media/mediaUtils';
import { KmxArtistCard, KmxCard, KmxHero, KmxRail, KmxSection } from './KmxParts';
import { KmxTrackTable } from './KmxTrackTable';
import { getSimilarArtistsFor } from './khyloRadio';
import { musicArtUrl, musicBackdropUrl } from './musicArt';
import { useArtistRadio } from './useArtistRadio';
import { useCoverTint } from './useCoverTint';
import { useFavorites } from './useFavorites';
import { useMusicNowPlaying } from './useMusicNowPlaying';

const FIELDS = [ ItemFields.PrimaryImageAspectRatio, ItemFields.Overview, ItemFields.Genres, ItemFields.ChildCount, ItemFields.DateCreated ];

// Biographies from music sources often carry formatting: keep paragraphs and emphasis, nothing that could run or link out
const bioHtml = (text: string) => DOMPurify.sanitize(text.includes('<') ? text : text.replace(/\n/g, '<br>'), {
    ALLOWED_TAGS: [ 'p', 'br', 'em', 'i', 'b', 'strong' ],
    ALLOWED_ATTR: []
});

export interface KmxArtistPageProps {
    artistId: string;
    onBack: () => void;
    onOpenArtist: (artistId: string) => void;
}

/** An artist: a banner with their picture, Play / Shuffle / Artist Radio, their most played songs, albums and similar artists. */
export const KmxArtistPage: FC<KmxArtistPageProps> = ({ artistId, onBack, onOpenArtist }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const navigate = useNavigate();
    const favorites = useFavorites();
    const radio = useArtistRadio();
    const now = useMusicNowPlaying();
    const [ showAllPopular, setShowAllPopular ] = useState(false);

    const { data: artist } = useQuery({
        queryKey: [ 'KhyloArtistDetails', artistId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItem({ userId, itemId: artistId })).data as BaseItemDto,
        enabled: Boolean(api)
    });

    const { data: albums } = useQuery({
        queryKey: [ 'KhyloArtistAlbums', artistId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId,
            artistIds: [ artistId ],
            includeItemTypes: [ BaseItemKind.MusicAlbum ],
            recursive: true,
            fields: FIELDS,
            sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName ],
            sortOrder: [ SortOrder.Descending ]
        })).data.Items ?? [],
        enabled: Boolean(api)
    });

    const { data: popular } = useQuery({
        queryKey: [ 'KhyloArtistTopTracks', artistId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId,
            artistIds: [ artistId ],
            includeItemTypes: [ BaseItemKind.Audio ],
            recursive: true,
            fields: FIELDS,
            sortBy: [ ItemSortBy.PlayCount, ItemSortBy.SortName ],
            sortOrder: [ SortOrder.Descending ],
            limit: 10
        })).data.Items ?? [],
        enabled: Boolean(api)
    });

    const { data: similar } = useQuery({
        queryKey: [ 'KhyloArtistSimilar', artistId, userId ],
        queryFn: () => getSimilarArtistsFor(api!, userId, artist!, 12),
        enabled: Boolean(api && artist),
        staleTime: 5 * 60 * 1000
    });

    // The banner picture: their own backdrop, else their photo, else the cover of their newest album (softened, never stretched)
    const firstAlbum = albums?.[0];
    const backdrop = artist ? musicBackdropUrl(api, artist, 1600) : null;
    const photo = artist ? musicArtUrl(api, artist, 1000) : null;
    const albumCover = firstAlbum ? musicArtUrl(api, firstAlbum, 1000) : null;
    const heroImage = backdrop ?? photo ?? albumCover;
    const soften = !backdrop && !photo;
    const tint = useCoverTint(photo ?? albumCover);

    const meta = useMemo(() => {
        const parts: string[] = [];
        if (albums?.length) parts.push(`${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`);
        if (artist?.Genres?.length) parts.push(artist.Genres.slice(0, 3).join(', '));
        return parts.join('  ·  ');
    }, [ albums, artist ]);

    if (!artist) {
        return <div className='kmx-page kmx-page--loading' aria-busy='true' />;
    }

    const isFav = favorites.isFavorite(artist);
    const shownPopular = (popular ?? []).slice(0, showAllPopular ? 10 : 5);

    return (
        <div className='kmx-page' style={{ '--kmx-tint': tint } as React.CSSProperties}>
            <KmxHero
                tall
                image={heroImage}
                soften={soften}
                eyebrow='ARTIST'
                title={artist.Name ?? ''}
                meta={meta}
                onBack={onBack}
                backLabel='Back to artists'
                actions={(
                    <>
                        <KhyloButton variant='primary' size='lg' icon={<PlayArrowIcon />} onClick={() => playMediaItem(artist)}>Play</KhyloButton>
                        <KhyloButton variant='secondary' size='lg' icon={<ShuffleIcon />} onClick={() => playMediaItem(artist, { shuffle: true })}>Shuffle</KhyloButton>
                        <KhyloButton
                            variant='secondary'
                            size='lg'
                            icon={<SensorsIcon />}
                            disabled={radio.busy}
                            onClick={() => void radio.start(artist)}
                            title='Their songs, mixed with artists who really sound like them'
                        >
                            {radio.busy ? 'Building radio…' : 'Artist Radio'}
                        </KhyloButton>
                        <button
                            type='button'
                            className='kmx-round-btn'
                            aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                            aria-pressed={isFav}
                            onClick={() => void favorites.toggle(artist)}
                        >
                            {isFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                        </button>
                    </>
                )}
            />

            <div className='kmx-body'>
                {shownPopular.length > 0 && (
                    <KmxSection
                        title='Popular'
                        action={(popular?.length ?? 0) > 5 ? (
                            <button type='button' className='kmx-link-btn' onClick={() => setShowAllPopular(v => !v)}>{showAllPopular ? 'Show less' : 'Show more'}</button>
                        ) : undefined}
                    >
                        <KmxTrackTable
                            compact
                            tracks={shownPopular}
                            columns={{ art: true, album: true, plays: true }}
                            currentId={now.item?.Id}
                            paused={now.isPaused}
                            favorites={favorites}
                            onPlay={(track, index) => playMediaItem(track, { items: shownPopular, startIndex: index })}
                            onOpenAlbum={id => navigate(`/details?id=${id}`)}
                        />
                    </KmxSection>
                )}

                <KmxSection title='Albums'>
                    {albums && albums.length > 0 ? (
                        <div className='kmx-grid'>
                            {albums.map(album => (
                                <KmxCard
                                    key={album.Id}
                                    title={album.Name ?? ''}
                                    subtitle={[ album.ProductionYear, 'Album' ].filter(Boolean).join(' · ')}
                                    src={musicArtUrl(api, album, 400)}
                                    onOpen={() => navigate(`/details?id=${album.Id}`)}
                                    onPlay={() => playMediaItem(album)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className='kmx-empty'>No albums for this artist yet.</p>
                    )}
                </KmxSection>

                {similar && similar.length > 0 && (
                    <KmxSection title='Similar artists'>
                        <KmxRail label='Similar artists'>
                            {similar.map(other => (
                                <KmxArtistCard
                                    key={other.Id}
                                    name={other.Name ?? ''}
                                    src={musicArtUrl(api, other, 300)}
                                    onOpen={() => onOpenArtist(other.Id!)}
                                />
                            ))}
                        </KmxRail>
                    </KmxSection>
                )}

                {artist.Overview && (
                    <KmxSection title='About'>
                        <div className='kmx-about'>
                            <div className='kmx-about__text' dangerouslySetInnerHTML={{ __html: bioHtml(artist.Overview) }} />
                        </div>
                    </KmxSection>
                )}
            </div>
        </div>
    );
};
