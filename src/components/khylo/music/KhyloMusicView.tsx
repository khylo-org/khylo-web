import React, { useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import SensorsIcon from '@mui/icons-material/Sensors';
import ShuffleIcon from '@mui/icons-material/Shuffle';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { getArtistApi } from '@khylo/sdk/lib/utils/api/artist-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import { playMediaItem } from '../media/mediaUtils';
import { useSetKhyloMusicMode } from '../shell/KhyloMusicModeContext';
import { type MusicTab } from './KhyloMusicSidebar';
import { KhyloMusicLayout } from './KhyloMusicLayout';
import { KhyloMusicPanel } from './KhyloMusicPanel';
import { KmxArtistCard, KmxCard, KmxCover, KmxHero, KmxRail, KmxSection } from './KmxParts';
import { KmxArtistPage } from './KmxArtistPage';
import { KmxTrackTable } from './KmxTrackTable';
import { musicArtUrl, musicBackdropUrl } from './musicArt';
import { scrollMusicPanelToTop } from './musicItems';
import { useArtistRadio } from './useArtistRadio';
import { useCoverTint } from './useCoverTint';
import { useFavorites } from './useFavorites';
import { useMusicNowPlaying } from './useMusicNowPlaying';
import './KhyloMusicView.scss';

export interface KhyloMusicViewProps {
    parentId?: string | null;
}

type AlbumSortOption = 'recent' | 'release' | 'title' | 'artist';

const MUSIC_ITEM_FIELDS = [
    ItemFields.PrimaryImageAspectRatio,
    ItemFields.Overview,
    ItemFields.Genres,
    ItemFields.People,
    ItemFields.CumulativeRunTimeTicks,
    ItemFields.ChildCount,
    ItemFields.DateCreated
];

const TABS: { id: MusicTab; label: string }[] = [
    { id: 'listen-now', label: 'Listen Now' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
    { id: 'songs', label: 'Songs' },
    { id: 'genres', label: 'Genres' }
];

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

// A quiet, deterministic tone for each genre tile: a hue from the name, kept dark and low in saturation
const genreTone = (genre: string): string => {
    let hash = 0;
    for (let i = 0; i < genre.length; i++) {
        hash = (hash << 5) - hash + genre.charCodeAt(i);
        hash |= 0;
    }
    return `hsl(${Math.abs(hash) % 360}, 22%, 21%)`;
};

const genreMatches = (g?: string | null, target?: string | null) => {
    if (!g || !target) return false;
    const a = g.toLowerCase().trim();
    const b = target.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
};

const GenreTile: FC<{ genre: string; stats?: { count: number; albums: number }; coverSrc?: string | null; onOpen: () => void }> = ({ genre, stats, coverSrc, onOpen }) => (
    <div className='kmx-genre' role='listitem' style={{ background: genreTone(genre) }}>
        <button type='button' className='kmx-genre__name kmx-card__open' onClick={onOpen}>{genre}</button>
        <span className='kmx-genre__meta'>{stats ? `${stats.count} songs` : ''}</span>
        {coverSrc && <KmxCover src={coverSrc} className='kmx-genre__cover' />}
    </div>
);

export const KhyloMusicView: FC<KhyloMusicViewProps> = ({ parentId }) => {
    const { api, user } = useApi();
    const userId = user?.Id;
    const navigate = useNavigate();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const favorites = useFavorites();
    const radio = useArtistRadio();
    const now = useMusicNowPlaying();

    // URL or state routing
    const initialArtistId = searchParams.get('artistId') || null;
    const initialGenre = searchParams.get('genre') || null;
    const initialTab = (searchParams.get('tab') as MusicTab) || 'listen-now';

    const [ activeTab, setActiveTab ] = useState<MusicTab>(initialTab);
    const [ selectedArtistId, setSelectedArtistId ] = useState<string | null>(initialArtistId);
    const [ selectedGenre, setSelectedGenre ] = useState<string | null>(initialGenre);
    const [ searchQuery, setSearchQuery ] = useState('');
    const [ albumSort, setAlbumSort ] = useState<AlbumSortOption>('recent');

    // Replace the app rail with the music sidebar while this view is open
    const setMusicMode = useSetKhyloMusicMode();
    // Stays on while the music section is open (album and artist pages included); the shell clears it on leaving
    useEffect(() => {
        setMusicMode(true);
    }, [ setMusicMode ]);

    // A new section, artist or genre starts at the top of the main panel
    useEffect(() => {
        scrollMusicPanelToTop();
    }, [ activeTab, selectedArtistId, selectedGenre ]);

    // Sync tab and parameters from URL if changed externally
    useEffect(() => {
        const urlArtist = searchParams.get('artistId');
        if (urlArtist !== selectedArtistId) setSelectedArtistId(urlArtist);
        const urlGenre = searchParams.get('genre');
        if (urlGenre !== selectedGenre) setSelectedGenre(urlGenre);
        const urlTab = searchParams.get('tab') as MusicTab;
        if (urlTab && urlTab !== activeTab) setActiveTab(urlTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ searchParams ]);

    const setParams = (change: (next: URLSearchParams) => void) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            change(next);
            return next;
        });
    };

    const handleSelectTab = (tab: MusicTab) => {
        setActiveTab(tab);
        setSelectedArtistId(null);
        setSelectedGenre(null);
        setSearchQuery('');
        setParams(next => {
            next.set('tab', tab);
            next.delete('artistId');
            next.delete('genre');
        });
    };

    const handleOpenArtist = (artistId: string) => {
        setSelectedArtistId(artistId);
        setParams(next => next.set('artistId', artistId));
    };

    const handleBackFromArtist = () => {
        setSelectedArtistId(null);
        setParams(next => next.delete('artistId'));
    };

    const handleOpenGenre = (genre: string) => {
        setSelectedGenre(genre);
        setSelectedArtistId(null);
        setParams(next => {
            next.set('genre', genre);
            next.delete('artistId');
        });
    };

    const handleBackFromGenre = () => {
        setSelectedGenre(null);
        setParams(next => next.delete('genre'));
    };

    // 1. Albums
    const { data: allAlbums } = useQuery({
        queryKey: [ 'KhyloMusicAlbums', parentId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId,
            parentId: parentId || undefined,
            includeItemTypes: [ BaseItemKind.MusicAlbum ],
            recursive: true,
            fields: MUSIC_ITEM_FIELDS,
            sortBy: [ ItemSortBy.SortName ]
        })).data.Items ?? [],
        enabled: Boolean(api)
    });

    // 2. Artists
    const { data: allArtists } = useQuery({
        queryKey: [ 'KhyloMusicArtists', parentId, userId ],
        queryFn: async () => {
            try {
                return (await getArtistApi(api!).getAlbumArtists({
                    userId,
                    parentId: parentId || undefined,
                    fields: [ ItemFields.PrimaryImageAspectRatio, ItemFields.Overview, ItemFields.Genres ],
                    sortBy: [ ItemSortBy.SortName ]
                })).data.Items ?? [];
            } catch {
                return (await getLibraryApi(api!).getItems({
                    userId,
                    parentId: parentId || undefined,
                    includeItemTypes: [ BaseItemKind.MusicArtist ],
                    recursive: true,
                    fields: [ ItemFields.PrimaryImageAspectRatio, ItemFields.Overview, ItemFields.Genres ],
                    sortBy: [ ItemSortBy.SortName ]
                })).data.Items ?? [];
            }
        },
        enabled: Boolean(api)
    });

    // 3. Songs
    const { data: allSongs } = useQuery({
        queryKey: [ 'KhyloMusicSongs', parentId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId,
            parentId: parentId || undefined,
            includeItemTypes: [ BaseItemKind.Audio ],
            recursive: true,
            fields: MUSIC_ITEM_FIELDS,
            sortBy: [ ItemSortBy.SortName ],
            limit: 500
        })).data.Items ?? [],
        enabled: Boolean(api)
    });

    // 4. Most played songs (Listen Now)
    const { data: topSongs } = useQuery({
        queryKey: [ 'KhyloMusicTopSongs', parentId, userId ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId,
            parentId: parentId || undefined,
            includeItemTypes: [ BaseItemKind.Audio ],
            recursive: true,
            fields: MUSIC_ITEM_FIELDS,
            sortBy: [ ItemSortBy.PlayCount, ItemSortBy.SortName ],
            sortOrder: [ SortOrder.Descending ],
            limit: 8
        })).data.Items ?? [],
        enabled: Boolean(api)
    });

    // Genres, with how much is in each and a real album cover to show on its tile
    const { availableGenres, genreStats, genreCovers } = useMemo(() => {
        const stats = new Map<string, { count: number; albums: number }>();
        const covers = new Map<string, BaseItemDto>();
        for (const song of allSongs ?? []) {
            song.Genres?.forEach(g => {
                const key = g.trim();
                if (!key) return;
                const prev = stats.get(key) ?? { count: 0, albums: 0 };
                stats.set(key, { ...prev, count: prev.count + 1 });
            });
        }
        for (const album of allAlbums ?? []) {
            album.Genres?.forEach(g => {
                const key = g.trim();
                if (!key) return;
                const prev = stats.get(key) ?? { count: 0, albums: 0 };
                stats.set(key, { ...prev, albums: prev.albums + 1 });
                if (!covers.has(key) && album.ImageTags?.Primary) covers.set(key, album);
            });
        }
        return { availableGenres: Array.from(stats.keys()).sort(), genreStats: stats, genreCovers: covers };
    }, [ allSongs, allAlbums ]);

    const genreSongs = useMemo(() => (selectedGenre && allSongs ? allSongs.filter(s => s.Genres?.some(g => genreMatches(g, selectedGenre))) : []), [ allSongs, selectedGenre ]);

    // Albums for the genre: tagged with it, or holding songs of it
    const genreAlbums = useMemo(() => {
        if (!selectedGenre || !allAlbums) return [];
        const ids = new Set<string>();
        const names = new Set<string>();
        genreSongs.forEach(s => {
            if (s.AlbumId) ids.add(s.AlbumId);
            if (s.Album) names.add(s.Album.toLowerCase().trim());
        });
        return allAlbums.filter(a => a.Genres?.some(g => genreMatches(g, selectedGenre)) || (a.Id && ids.has(a.Id)) || (a.Name && names.has(a.Name.toLowerCase().trim())));
    }, [ allAlbums, selectedGenre, genreSongs ]);

    const genreArtists = useMemo(() => {
        if (!selectedGenre || !allArtists) return [];
        const names = new Set<string>();
        [ ...genreAlbums, ...genreSongs ].forEach(entry => {
            if (entry.AlbumArtist) names.add(entry.AlbumArtist.toLowerCase().trim());
            entry.Artists?.forEach(a => names.add(a.toLowerCase().trim()));
        });
        return allArtists.filter(a => a.Genres?.some(g => genreMatches(g, selectedGenre)) || (a.Name && names.has(a.Name.toLowerCase().trim())));
    }, [ allArtists, selectedGenre, genreAlbums, genreSongs ]);

    const query = searchQuery.trim().toLowerCase();

    const displayedAlbums = useMemo(() => {
        let pool = selectedGenre ? genreAlbums : (allAlbums ?? []);
        if (query) {
            pool = pool.filter(a => a.Name?.toLowerCase().includes(query) || a.AlbumArtist?.toLowerCase().includes(query) || a.Artists?.some(art => art.toLowerCase().includes(query)));
        }
        const sorted = [ ...pool ];
        if (albumSort === 'title') sorted.sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));
        else if (albumSort === 'artist') sorted.sort((a, b) => (a.AlbumArtist || a.Artists?.[0] || '').localeCompare(b.AlbumArtist || b.Artists?.[0] || ''));
        else if (albumSort === 'release') sorted.sort((a, b) => (b.ProductionYear || 0) - (a.ProductionYear || 0));
        else sorted.sort((a, b) => (b.DateCreated ? new Date(b.DateCreated).getTime() : 0) - (a.DateCreated ? new Date(a.DateCreated).getTime() : 0));
        return sorted;
    }, [ allAlbums, selectedGenre, genreAlbums, query, albumSort ]);

    const displayedArtists = useMemo(() => (query ? (allArtists ?? []).filter(a => a.Name?.toLowerCase().includes(query)) : (allArtists ?? [])), [ allArtists, query ]);

    const displayedSongs = useMemo(() => {
        let pool = selectedGenre ? genreSongs : (allSongs ?? []);
        if (query) pool = pool.filter(s => s.Name?.toLowerCase().includes(query) || s.Album?.toLowerCase().includes(query) || s.Artists?.some(art => art.toLowerCase().includes(query)));
        return pool;
    }, [ allSongs, selectedGenre, genreSongs, query ]);

    // The featured album on Listen Now: one with a wide picture if there is one
    const spotlight = useMemo(() => {
        if (!allAlbums?.length) return null;
        return allAlbums.find(a => a.BackdropImageTags?.length || a.ImageTags?.Primary) ?? allAlbums[0];
    }, [ allAlbums ]);

    const recentlyAdded = useMemo(() => [ ...(allAlbums ?? []) ].sort((a, b) => (b.DateCreated ? new Date(b.DateCreated).getTime() : 0) - (a.DateCreated ? new Date(a.DateCreated).getTime() : 0)).slice(0, 16), [ allAlbums ]);
    const featuredArtists = useMemo(() => (allArtists ?? []).slice(0, 16), [ allArtists ]);
    const playedSongs = useMemo(() => (topSongs ?? []).filter(s => (s.UserData?.PlayCount ?? 0) > 0), [ topSongs ]);

    // An artist's picture, or the cover of one of their albums when they have none
    const artistPicture = (artist: BaseItemDto, width = 300): string | null => {
        const direct = musicArtUrl(api, artist, width);
        if (direct) return direct;
        const album = allAlbums?.find(a => a.ArtistItems?.some(ai => ai.Id === artist.Id) || a.AlbumArtist === artist.Name);
        return album ? musicArtUrl(api, album, width) : null;
    };

    const spotlightImage = spotlight ? (musicBackdropUrl(api, spotlight, 1600) ?? musicArtUrl(api, spotlight, 1000)) : null;
    const spotlightSoft = Boolean(spotlight) && !musicBackdropUrl(api, spotlight, 1600);
    const tint = useCoverTint(spotlight ? musicArtUrl(api, spotlight, 400) : null);
    const spotlightArtist = spotlight?.AlbumArtists?.[0];

    const playAll = (songs: BaseItemDto[], shuffle = false) => {
        if (songs.length === 0) return;
        const start = shuffle ? songs[Math.floor(Math.random() * songs.length)] : songs[0];
        playMediaItem(start, { items: songs, shuffle });
    };

    const playRow = (songs: BaseItemDto[]) => (track: BaseItemDto, index: number) => playMediaItem(track, { items: songs, startIndex: index });

    const searchBox = (placeholder: string) => (
        <label className='kmx-search'>
            <SearchIcon />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
            {searchQuery && <button type='button' onClick={() => setSearchQuery('')} aria-label='Clear search'>&times;</button>}
        </label>
    );

    const openAlbum = (id: string) => navigate(`/details?id=${id}`);

    let body: React.ReactNode;

    if (selectedArtistId) {
        body = <KmxArtistPage artistId={selectedArtistId} onBack={handleBackFromArtist} onOpenArtist={handleOpenArtist} />;
    } else if (selectedGenre) {
        body = (
            <div className='kmx-page' style={{ '--kmx-tint': '84, 74, 98' } as CSSProperties}>
                <header className='kmx-head kmx-head--genre'>
                    <div className='kmx-head__info'>
                        <button type='button' className='kmx-link-btn' onClick={handleBackFromGenre}>← All genres</button>
                        <div className='kmx-hero__eyebrow'>GENRE</div>
                        <h1>{selectedGenre}</h1>
                        <div className='kmx-head__meta'>
                            <span>{genreSongs.length} songs</span>
                            <span>{genreAlbums.length} albums</span>
                            <span>{genreArtists.length} artists</span>
                        </div>
                        <div className='kmx-head__actions'>
                            <KhyloButton variant='primary' size='lg' icon={<PlayArrowIcon />} disabled={genreSongs.length === 0} onClick={() => playAll(genreSongs)}>Play all</KhyloButton>
                            <KhyloButton variant='secondary' size='lg' icon={<ShuffleIcon />} disabled={genreSongs.length === 0} onClick={() => playAll(genreSongs, true)}>Shuffle</KhyloButton>
                        </div>
                    </div>
                </header>
                <div className='kmx-body'>
                    {genreSongs.length > 0 && (
                        <KmxSection title='Songs'>
                            <KmxTrackTable tracks={genreSongs.slice(0, 50)} columns={{ art: true, album: true, plays: true }} currentId={now.item?.Id} paused={now.isPaused} favorites={favorites} onPlay={playRow(genreSongs.slice(0, 50))} onOpenAlbum={openAlbum} />
                        </KmxSection>
                    )}
                    {genreAlbums.length > 0 && (
                        <KmxSection title='Albums'>
                            <div className='kmx-grid'>
                                {genreAlbums.map(album => (
                                    <KmxCard key={album.Id} title={album.Name ?? ''} subtitle={album.AlbumArtist ?? 'Album'} src={musicArtUrl(api, album, 400)} onOpen={() => openAlbum(album.Id!)} onPlay={() => playMediaItem(album)} />
                                ))}
                            </div>
                        </KmxSection>
                    )}
                    {genreArtists.length > 0 && (
                        <KmxSection title='Artists'>
                            <div className='kmx-grid'>
                                {genreArtists.map(artist => (
                                    <KmxArtistCard key={artist.Id} name={artist.Name ?? ''} src={artistPicture(artist)} onOpen={() => handleOpenArtist(artist.Id!)} onPlay={() => playMediaItem(artist)} />
                                ))}
                            </div>
                        </KmxSection>
                    )}
                </div>
            </div>
        );
    } else {
        body = (
            <div className='kmx-page' style={{ '--kmx-tint': tint } as CSSProperties}>
                <div className='kmx-nav'>
                    <div className='kmx-nav__tabs' role='tablist' aria-label='Music sections'>
                        {TABS.map(tab => (
                            <button key={tab.id} type='button' role='tab' aria-selected={activeTab === tab.id} className={classNames('kmx-pill', { 'kmx-pill--on': activeTab === tab.id })} onClick={() => handleSelectTab(tab.id)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className='kmx-nav__right'>
                        {searchBox(activeTab === 'artists' ? 'Search artists' : activeTab === 'albums' ? 'Search albums' : activeTab === 'songs' ? 'Search songs' : 'Search music')}
                        {activeTab === 'albums' && (
                            <select className='kmx-select' value={albumSort} onChange={e => setAlbumSort(e.target.value as AlbumSortOption)} aria-label='Sort albums'>
                                <option value='recent'>Recently added</option>
                                <option value='release'>Release year</option>
                                <option value='title'>Title (A–Z)</option>
                                <option value='artist'>Artist (A–Z)</option>
                            </select>
                        )}
                        {allSongs && allSongs.length > 0 && (
                            <KhyloButton variant='primary' size='sm' icon={<ShuffleIcon />} onClick={() => playAll(allSongs, true)} title='Shuffle the whole music library'>Shuffle</KhyloButton>
                        )}
                    </div>
                </div>

                {activeTab === 'listen-now' && (
                    <div className='kmx-body kmx-body--home'>
                        <h1 className='kmx-greeting'>{getGreeting()}</h1>

                        {spotlight && (
                            <KmxHero
                                image={spotlightImage}
                                soften={spotlightSoft}
                                eyebrow='FEATURED ALBUM'
                                title={spotlight.Name ?? ''}
                                meta={[ spotlight.AlbumArtist, spotlight.ProductionYear ].filter(Boolean).join('  ·  ')}
                                actions={(
                                    <>
                                        <KhyloButton variant='primary' size='md' icon={<PlayArrowIcon />} onClick={() => playMediaItem(spotlight)}>Play</KhyloButton>
                                        {spotlightArtist && (
                                            <KhyloButton variant='secondary' size='md' icon={<SensorsIcon />} disabled={radio.busy} onClick={() => void radio.start({ Id: spotlightArtist.Id, Name: spotlightArtist.Name } as BaseItemDto)}>
                                                {radio.busy ? 'Building radio…' : 'Artist Radio'}
                                            </KhyloButton>
                                        )}
                                        <KhyloButton variant='ghost' size='md' onClick={() => openAlbum(spotlight.Id!)}>View album</KhyloButton>
                                    </>
                                )}
                            />
                        )}

                        {recentlyAdded.length > 0 && (
                            <KmxSection title='Recently added' action={<button type='button' className='kmx-link-btn' onClick={() => handleSelectTab('albums')}>Show all</button>}>
                                <KmxRail label='Recently added albums'>
                                    {recentlyAdded.map(album => (
                                        <KmxCard key={album.Id} title={album.Name ?? ''} subtitle={album.AlbumArtist ?? 'Album'} src={musicArtUrl(api, album, 400)} onOpen={() => openAlbum(album.Id!)} onPlay={() => playMediaItem(album)} />
                                    ))}
                                </KmxRail>
                            </KmxSection>
                        )}

                        {playedSongs.length > 0 && (
                            <KmxSection title='Top songs'>
                                <KmxTrackTable compact tracks={playedSongs} columns={{ art: true, plays: true }} currentId={now.item?.Id} paused={now.isPaused} favorites={favorites} onPlay={playRow(playedSongs)} />
                            </KmxSection>
                        )}

                        {featuredArtists.length > 0 && (
                            <KmxSection title='Artists' action={<button type='button' className='kmx-link-btn' onClick={() => handleSelectTab('artists')}>Show all</button>}>
                                <KmxRail label='Artists'>
                                    {featuredArtists.map(artist => (
                                        <KmxArtistCard key={artist.Id} name={artist.Name ?? ''} src={artistPicture(artist)} onOpen={() => handleOpenArtist(artist.Id!)} onPlay={() => playMediaItem(artist)} />
                                    ))}
                                </KmxRail>
                            </KmxSection>
                        )}

                        {availableGenres.length > 0 && (
                            <KmxSection title='Explore genres' action={<button type='button' className='kmx-link-btn' onClick={() => handleSelectTab('genres')}>Show all</button>}>
                                <KmxRail label='Genres'>
                                    {availableGenres.slice(0, 14).map(genre => (
                                        <GenreTile key={genre} genre={genre} stats={genreStats.get(genre)} coverSrc={genreCovers.get(genre) ? musicArtUrl(api, genreCovers.get(genre), 200) : null} onOpen={() => handleOpenGenre(genre)} />
                                    ))}
                                </KmxRail>
                            </KmxSection>
                        )}
                    </div>
                )}

                {activeTab === 'artists' && (
                    <div className='kmx-body'>
                        <KmxSection title='Artists' action={<span className='kmx-count'>{displayedArtists.length}</span>}>
                            {displayedArtists.length > 0 ? (
                                <div className='kmx-grid kmx-grid--artists'>
                                    {displayedArtists.map(artist => (
                                        <KmxArtistCard key={artist.Id} name={artist.Name ?? ''} src={artistPicture(artist)} onOpen={() => handleOpenArtist(artist.Id!)} onPlay={() => playMediaItem(artist)} />
                                    ))}
                                </div>
                            ) : <p className='kmx-empty'>{query ? 'No artists match that search.' : 'No artists yet.'}</p>}
                        </KmxSection>
                    </div>
                )}

                {activeTab === 'albums' && (
                    <div className='kmx-body'>
                        <KmxSection title='Albums' action={<span className='kmx-count'>{displayedAlbums.length}</span>}>
                            {displayedAlbums.length > 0 ? (
                                <div className='kmx-grid'>
                                    {displayedAlbums.map(album => (
                                        <KmxCard key={album.Id} title={album.Name ?? ''} subtitle={[ album.AlbumArtist ?? album.Artists?.[0], album.ProductionYear ].filter(Boolean).join(' · ')} src={musicArtUrl(api, album, 400)} onOpen={() => openAlbum(album.Id!)} onPlay={() => playMediaItem(album)} />
                                    ))}
                                </div>
                            ) : <p className='kmx-empty'>{query ? 'No albums match that search.' : 'No albums yet.'}</p>}
                        </KmxSection>
                    </div>
                )}

                {activeTab === 'songs' && (
                    <div className='kmx-body'>
                        <KmxSection title='Songs' action={<span className='kmx-count'>{displayedSongs.length}</span>}>
                            {displayedSongs.length > 0 ? (
                                <KmxTrackTable tracks={displayedSongs} columns={{ art: true, album: true, added: true, plays: true }} currentId={now.item?.Id} paused={now.isPaused} favorites={favorites} onPlay={playRow(displayedSongs)} onOpenAlbum={openAlbum} />
                            ) : <p className='kmx-empty'>{query ? 'No songs match that search.' : 'No songs yet.'}</p>}
                        </KmxSection>
                    </div>
                )}

                {activeTab === 'genres' && (
                    <div className='kmx-body'>
                        <KmxSection title='Genres' action={<span className='kmx-count'>{availableGenres.length}</span>}>
                            {availableGenres.length > 0 ? (
                                <div className='kmx-grid kmx-grid--genres'>
                                    {availableGenres.map(genre => (
                                        <GenreTile key={genre} genre={genre} stats={genreStats.get(genre)} coverSrc={genreCovers.get(genre) ? musicArtUrl(api, genreCovers.get(genre), 200) : null} onOpen={() => handleOpenGenre(genre)} />
                                    ))}
                                </div>
                            ) : <p className='kmx-empty'>No genres yet.</p>}
                        </KmxSection>
                    </div>
                )}
            </div>
        );
    }

    return <KhyloMusicLayout panel={<KhyloMusicPanel featuredAlbum={spotlight ?? null} />}>{body}</KhyloMusicLayout>;
};
