import DOMPurify from 'dompurify';
import React, { useState, useEffect, useMemo, type FC } from 'react';
import { openPlaylistEditor } from '../music/musicItems';
import { KhyloDiscMenu } from '../disc/KhyloDiscMenu';
import { useSetKhyloMusicMode } from '../shell/KhyloMusicModeContext';
import { KhyloMusicLayout } from '../music/KhyloMusicLayout';
import { isMusicItem, scrollMusicPanelToTop } from '../music/musicItems';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AlbumOutlinedIcon from '@mui/icons-material/AlbumOutlined';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TvOutlinedIcon from '@mui/icons-material/TvOutlined';
import { openMetadataEditor } from '../metadata/metadataApi';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MovieCreationOutlinedIcon from '@mui/icons-material/MovieCreationOutlined';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AlbumIcon from '@mui/icons-material/Album';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HeadsetIcon from '@mui/icons-material/Headset';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import classNames from 'classnames';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getShowApi } from '@khylo/sdk/lib/utils/api/show-api';
import { getUserDataApi } from '@khylo/sdk/lib/utils/api/user-data-api';

import { useApi } from 'hooks/useApi';
import ConfirmDialog from 'components/ConfirmDialog';
import { KhyloCollectionDialog, type KhyloCollectionDialogMode } from '../collections/KhyloCollectionDialog';
import { COLLECTION_QUERY_KEYS, deleteCollection, removeFromCollection } from '../collections/collectionsApi';
import { KhyloButton } from '../ui/KhyloButton';
import { AmbientBackdrop } from '../ui/AmbientBackdrop';
import { KhyloContentRail } from '../media/KhyloContentRail';
import { KhyloMediaCard } from '../media/KhyloMediaCard';
import {
    getItemImageUrl,
    getItemSubtitle,
    getPlaybackPercentage,
    formatTicksToDuration,
    formatTicksToTrackTime,
    formatTimeRemaining,
    playMediaItem,
    removeFromContinueWatching,
    isEbookMediaItem,
    isAudiobookMediaItem,
    getAudiobookParts,
    getAudiobookTitle
} from '../media/mediaUtils';
import './KhyloDetailsView.scss';

// Above this many seasons the season pills are replaced by a dropdown
const MAX_SEASON_TABS = 8;

// What can go in a collection from its own page
const COLLECTABLE_TYPES: string[] = [ BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.Video, BaseItemKind.MusicVideo ];

// Summaries from book and music sources often carry formatting (paragraphs, headings, italics). Keep that
// formatting, but only safe text tags: no links, images, scripts or styles.
const OVERVIEW_TAGS = [ 'p', 'br', 'em', 'i', 'b', 'strong', 'u', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'blockquote', 'div', 'span' ];
const overviewHtml = (text: string) => DOMPurify.sanitize(text.includes('<') ? text : text.replace(/\n/g, '<br>'), {
    ALLOWED_TAGS: OVERVIEW_TAGS,
    ALLOWED_ATTR: []
});

const isComicPath = (path?: string | null) => /\.(cbz|cbr|cbt|cb7)$/i.test(path ?? '');

export const KhyloDetailsView: FC = () => {
    const [ searchParams ] = useSearchParams();
    const itemId = searchParams.get('id') || searchParams.get('itemId') || '';
    const navigate = useNavigate();
    const { api, user } = useApi();
    const userId = user?.Id;

    const [ selectedSeasonId, setSelectedSeasonId ] = useState<string>('');
    const [ isFav, setIsFav ] = useState<boolean | null>(null);
    const [ isPlayed, setIsPlayed ] = useState<boolean | null>(null);
    const [ logoFailed, setLogoFailed ] = useState(false);
    const [ isRemovedFromContinue, setIsRemovedFromContinue ] = useState(false);
    const [ discMenuOpen, setDiscMenuOpen ] = useState(false);
    const [ showRemovePrompt, setShowRemovePrompt ] = useState(false);
    const [ removedEpisodeIds, setRemovedEpisodeIds ] = useState<Set<string>>(() => new Set());
    const [ trackFavorites, setTrackFavorites ] = useState<Record<string, boolean>>({});
    const [ collectionDialog, setCollectionDialog ] = useState<KhyloCollectionDialogMode | null>(null);
    const [ isDeleteCollectionOpen, setIsDeleteCollectionOpen ] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        setLogoFailed(false);
        setIsFav(null);
        setIsPlayed(null);
        setIsRemovedFromContinue(false);
        setShowRemovePrompt(false);
        setRemovedEpisodeIds(new Set());
        setTrackFavorites({});
        setSelectedSeasonId('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollMusicPanelToTop();
    }, [itemId]);

    // 1. Fetch Item Details
    const { data: item, isLoading: isItemLoading, isError: isItemError } = useQuery({
        queryKey: ['KhyloItemDetails', itemId, userId],
        queryFn: async () => {
            if (!api || !itemId) return null;
            const itemRes = await getLibraryApi(api).getItem({
                userId: userId || undefined,
                itemId
            });
            return itemRes.data as BaseItemDto;
        },
        enabled: Boolean(api && itemId)
    });

    const isSeries = item?.Type === BaseItemKind.Series;
    const isBoxSet = item?.Type === BaseItemKind.BoxSet;
    const isPlaylist = item?.Type === BaseItemKind.Playlist;
    const isAlbum = item?.Type === BaseItemKind.MusicAlbum;
    // A podcast show: its page lists the episodes, newest first
    const isPodcast = String(item?.Type) === 'Podcast';

    // Music items keep the music section's sidebar around them
    const isMusicSection = isMusicItem(item);
    const setMusicMode = useSetKhyloMusicMode();
    useEffect(() => {
        if (item) setMusicMode(isMusicSection);
    }, [item, isMusicSection, setMusicMode]);
    const isAudio = item?.Type === BaseItemKind.Audio;
    const isArtist = item?.Type === BaseItemKind.MusicArtist;
    const isBook = isEbookMediaItem(item);
    const isAudioBook = !isBook && (
        isAudiobookMediaItem(item) ||
        (item?.Type === BaseItemKind.Audio && (item.Genres?.some(g => g.toLowerCase().includes('audiobook')) || item.AlbumArtist?.toLowerCase().includes('narrat')))
    );
    const isMusic = isAlbum || (isAudio && !isAudioBook) || isArtist;
    const isLiterature = isBook || isAudioBook;
    // A DVD: an ISO image or a VIDEO_TS folder. It has its own menu (scenes, audio, subtitles, extras)
    const isDisc = Boolean(item && (String(item.VideoType) === 'Dvd' || (String(item.VideoType) === 'Iso' && String(item.IsoType) === 'Dvd')));
    const isCollectable = Boolean(item?.Type && COLLECTABLE_TYPES.includes(item.Type));
    let peopleHeading = 'Cast & Crew';
    if (String(item?.Type) === 'Comic' || isComicPath(item?.Path)) peopleHeading = 'Creators';
    else if (isAudioBook) peopleHeading = 'Authors & Narrators';
    else if (isLiterature) peopleHeading = 'Authors';
    // For collections the server sets CanDelete for whoever may change it: the owner of a personal
    // collection, or a collection manager for a shared one
    const canEditCollection = isBoxSet && Boolean(item?.CanDelete);

    const refreshCollections = async () => {
        await Promise.all(COLLECTION_QUERY_KEYS.map(key => queryClient.invalidateQueries({ queryKey: [key] })));
    };

    const handleRemoveFromCollection = async (childId: string) => {
        if (!api || !item?.Id) return;
        try {
            await removeFromCollection(api, item.Id, [childId]);
            await refreshCollections();
        } catch (err) {
            console.error('[Collections] remove failed', err);
        }
    };

    const handleDeleteCollection = async () => {
        setIsDeleteCollectionOpen(false);
        if (!api || !item?.Id) return;
        try {
            await deleteCollection(api, item.Id);
            await refreshCollections();
            navigate(-1);
        } catch (err) {
            console.error('[Collections] delete failed', err);
        }
    };

    // If item is a Music Artist, redirect straight to the dedicated Music Streaming Artist Hub
    useEffect(() => {
        if (item?.Type === BaseItemKind.MusicArtist && item?.Id) {
            navigate(`/music?artistId=${item.Id}`, { replace: true });
        }
    }, [item, navigate]);

    // 2. Fetch Seasons (if Series)
    const { data: rawSeasons } = useQuery({
        queryKey: ['KhyloSeriesSeasons', itemId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId || !isSeries) return [];
            const res = await getShowApi(api).getSeasons({
                userId,
                seriesId: itemId
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && itemId && isSeries)
    });

    // 4. Fetch Next Up Episode for Series
    const { data: seriesNextUp } = useQuery({
        queryKey: ['KhyloSeriesNextUp', itemId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId || !isSeries) return null;
            const res = await getShowApi(api).getNextUp({
                userId,
                seriesId: itemId,
                limit: 1,
                fields: [
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview
                ]
            });
            return res.data.Items?.[0] || null;
        },
        enabled: Boolean(api && userId && itemId && isSeries)
    });

    // Numbered seasons first; Specials (season 0) and unnumbered folders such as "DVD Extras" last
    const seasons = useMemo(() => {
        if (!rawSeasons) return rawSeasons;
        const isRegular = (season: BaseItemDto) => (season.IndexNumber ?? 0) > 0;
        return [ ...rawSeasons.filter(isRegular), ...rawSeasons.filter(season => !isRegular(season)) ];
    }, [rawSeasons]);

    // Default season: the numbered season holding the next / in-progress episode, otherwise the first numbered season
    const nextUpSeasonId = seriesNextUp?.SeasonId;
    const hasNextUpSeason = Boolean(nextUpSeasonId && seasons?.some(season => season.Id === nextUpSeasonId && (season.IndexNumber ?? 0) > 0));
    const defaultSeasonId = hasNextUpSeason ? nextUpSeasonId : seasons?.[0]?.Id;
    const activeSeasonId = selectedSeasonId || defaultSeasonId || '';

    // 3. Fetch Episodes for selected season
    const { data: episodes } = useQuery({
        queryKey: ['KhyloSeasonEpisodes', itemId, activeSeasonId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId || !isSeries || !activeSeasonId) return [];
            const res = await getShowApi(api).getEpisodes({
                userId,
                seriesId: itemId,
                seasonId: activeSeasonId,
                fields: [
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview,
                    ItemFields.Path,
                    ItemFields.MediaSources
                ]
            });
            const rawItems = res.data.Items || [];

            // Identify active season number to resolve matching season folder
            const activeSeason = seasons?.find(s => s.Id === activeSeasonId);
            const activeSeasonNumber = activeSeason?.IndexNumber;

            // 1. Filter out obvious extras, bonus clips, featurettes, samples, and 0-minute/under-90-second clips
            const validEpisodes = rawItems.filter(item => {
                const path = (item.Path || '').toLowerCase();

                // Exclude any bonus, extras, deleted scenes, featurettes, samples folders
                if (
                    path.includes('\\extras') ||
                    path.includes('/extras') ||
                    path.includes('extras\\') ||
                    path.includes('extras/') ||
                    path.includes('dvd extras') ||
                    path.includes('bonus') ||
                    path.includes('featurette') ||
                    path.includes('behind the scenes') ||
                    path.includes('sample') ||
                    path.includes('deleted scene')
                ) {
                    return false;
                }

                // Exclude ultra-short clips (< 90 seconds)
                if (item.RunTimeTicks && item.RunTimeTicks < 90 * 10000000) {
                    return false;
                }

                return true;
            });

            // 2. Deduplicate episodes by IndexNumber (Episode number)
            const episodeMap = new Map<number, BaseItemDto>();

            for (const ep of validEpisodes) {
                const idx = ep.IndexNumber ?? 0;
                if (!episodeMap.has(idx)) {
                    episodeMap.set(idx, ep);
                } else {
                    const existing = episodeMap.get(idx)!;
                    const existingPath = (existing.Path || '').toLowerCase();
                    const epPath = (ep.Path || '').toLowerCase();

                    // Prioritize episode whose path contains the current season number
                    const sPattern = activeSeasonNumber !== undefined ? `season ${activeSeasonNumber}` : '';
                    const sPatternPadded = activeSeasonNumber !== undefined ? `season 0${activeSeasonNumber}` : '';

                    const epMatches = sPattern ? (epPath.includes(sPattern) || epPath.includes(sPatternPadded)) : false;
                    const existingMatches = sPattern ? (existingPath.includes(sPattern) || existingPath.includes(sPatternPadded)) : false;

                    if (epMatches && !existingMatches) {
                        episodeMap.set(idx, ep);
                    } else if (!existingMatches) {
                        // Prefer episode with longest/full runtime
                        if ((ep.RunTimeTicks || 0) > (existing.RunTimeTicks || 0)) {
                            episodeMap.set(idx, ep);
                        }
                    }
                }
            }

            return Array.from(episodeMap.values()).sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));
        },
        enabled: Boolean(api && userId && itemId && isSeries && activeSeasonId)
    });

    // 4b. Fetch Children for Collections (BoxSets) and Playlists
    const { data: collectionChildren } = useQuery({
        queryKey: ['KhyloCollectionChildren', itemId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId || (!isBoxSet && !isPlaylist)) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                parentId: itemId,
                fields: [
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview,
                    ItemFields.Genres,
                    ItemFields.ChildCount
                ]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && itemId && (isBoxSet || isPlaylist))
    });

    // 4c. Fetch Tracks for Music Albums or Audiobooks
    const { data: albumTracks } = useQuery({
        queryKey: ['KhyloAlbumTracks', itemId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId || (!isAlbum && !isAudioBook && !isPodcast)) return [];
            // One part of a book: list every part of it (the files beside it in the book's folder)
            if (isAudioBook && item && !item.IsFolder) {
                const parts = await getAudiobookParts(item, item.ServerId ?? undefined);
                return parts.length > 1 ? parts : [];
            }
            const res = await getLibraryApi(api).getItems({
                userId,
                parentId: itemId,
                recursive: true,
                includeItemTypes: isPodcast
                    ? ['PodcastEpisode' as BaseItemKind]
                    : isAlbum
                        ? [BaseItemKind.Audio]
                        : [BaseItemKind.AudioBook, BaseItemKind.Audio, BaseItemKind.Book],
                sortBy: isPodcast
                    ? [ItemSortBy.PremiereDate, ItemSortBy.DateCreated, ItemSortBy.SortName]
                    : [ItemSortBy.ParentIndexNumber, ItemSortBy.IndexNumber, ItemSortBy.SortName],
                sortOrder: [isPodcast ? SortOrder.Descending : SortOrder.Ascending],
                fields: [
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview,
                    ItemFields.Genres,
                    ItemFields.People,
                    ItemFields.ChildCount
                ]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && itemId && (isAlbum || isAudioBook || isPodcast))
    });

    // 4d. Fetch Artist Albums
    const { data: artistAlbums } = useQuery({
        queryKey: ['KhyloArtistAlbums', itemId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId || !isArtist) return [];
            const res = await getLibraryApi(api).getItems({
                userId,
                artistIds: [itemId],
                includeItemTypes: [BaseItemKind.MusicAlbum],
                sortBy: [ItemSortBy.ProductionYear, ItemSortBy.SortName],
                sortOrder: [SortOrder.Descending, SortOrder.Ascending],
                recursive: true,
                fields: [
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview,
                    ItemFields.Genres,
                    ItemFields.ChildCount
                ]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && itemId && isArtist)
    });

    // 4e. Fetch Book Children for Book Folders or Authors
    const { data: bookItems } = useQuery({
        queryKey: ['KhyloBookChildren', itemId, userId, item?.ParentId],
        queryFn: async () => {
            if (!api || !userId || !itemId || !isBook) return [];
            const queryParentId = item?.IsFolder ? itemId : (item?.ParentId || itemId);
            const res = await getLibraryApi(api).getItems({
                userId,
                parentId: queryParentId,
                recursive: true,
                includeItemTypes: [BaseItemKind.Book],
                sortBy: [ItemSortBy.SortName],
                sortOrder: [SortOrder.Ascending],
                fields: [
                    ItemFields.PrimaryImageAspectRatio,
                    ItemFields.Overview,
                    ItemFields.Genres,
                    ItemFields.People,
                    ItemFields.Path
                ]
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && itemId && isBook)
    });

    // 5. Fetch Similar Titles
    const { data: similarItems } = useQuery({
        queryKey: ['KhyloSimilarItems', itemId, userId],
        queryFn: async () => {
            if (!api || !userId || !itemId) return [];
            const res = await getLibraryApi(api).getSimilarItems({
                userId,
                itemId,
                limit: 12
            });
            return res.data.Items || [];
        },
        enabled: Boolean(api && userId && itemId)
    });

    if (isItemLoading) {
        return (
            <div className='khylo-details-loading'>
                <div className='khylo-details-loading__spinner' />
            </div>
        );
    }

    if (isItemError || !item) {
        return (
            <div className='khylo-details-loading' style={{ flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Title Not Found</h2>
                <p style={{ color: '#858079', maxWidth: 400, textAlign: 'center' }}>
                    The requested title could not be loaded. It may have been removed or is temporarily unavailable.
                </p>
                <KhyloButton variant='secondary' onClick={() => navigate('/home')}>
                    Return to Home
                </KhyloButton>
            </div>
        );
    }

    const logoUrl = !logoFailed ? getItemImageUrl(api, item, 'logo', 600) : null;
    const backdropUrl = getItemImageUrl(api, item, 'backdrop', 1920)
        || getItemImageUrl(api, item, 'primary', 800);
    const posterUrl = getItemImageUrl(api, item, 'primary', 500);

    const progress = getPlaybackPercentage(item);
    const isResume = progress > 0;
    const remainingTime = isResume
        ? formatTimeRemaining(item.RunTimeTicks, item.UserData?.PlaybackPositionTicks)
        : '';

    // Technical metadata extraction
    const videoStream = item.MediaStreams?.find(s => s.Type === 'Video');
    const audioStream = item.MediaStreams?.find(s => s.Type === 'Audio');
    const subtitleStreams = item.MediaStreams?.filter(s => s.Type === 'Subtitle') || [];

    const is4K = Boolean((item.Width && item.Width >= 3840) || (videoStream?.Width && videoStream.Width >= 3840));
    const isHD = Boolean(item.IsHD || (item.Width && item.Width >= 1280) || (videoStream?.Width && videoStream.Width >= 1280));
    const isHDR = Boolean(videoStream?.VideoRange && videoStream.VideoRange.includes('HDR'));

    const audioChannels = audioStream?.Channels;
    const audioFormat = audioChannels === 8 ? '7.1 Surround' : audioChannels === 6 ? '5.1 Surround' : audioChannels === 2 ? 'Stereo' : null;

    const directors = item.People?.filter(p => p.Type === 'Director').map(p => p.Name).filter(Boolean) || [];
    const writers = item.People?.filter(p => p.Type === 'Writer').map(p => p.Name).filter(Boolean) || [];
    const studios = item.Studios?.map(s => s.Name).filter(Boolean) || [];

    const trailerUrl = item.RemoteTrailers?.[0]?.Url;
    const hasLocalTrailer = Boolean(item.LocalTrailerCount && item.LocalTrailerCount > 0);
    const hasTrailer = Boolean(trailerUrl || hasLocalTrailer);

    const handlePlay = () => {
        if (isSeries && seriesNextUp) {
            handlePlayEpisode(seriesNextUp);
            return;
        }
        if (isAudioBook) {
            // Loads every part of the book and resumes the part the listener was in
            playMediaItem(item);
            return;
        }
        if ((isAlbum || isPodcast) && albumTracks && albumTracks.length > 0) {
            playMediaItem(albumTracks[0], { items: albumTracks, startIndex: 0 });
            return;
        }
        if (isBook) {
            let targetBook = item;
            if (bookItems && bookItems.length > 0) {
                const epubChild = bookItems.find(b => (b.Path?.toLowerCase().endsWith('.epub') || (b.Container?.toLowerCase() === 'epub')));
                targetBook = epubChild || bookItems[0];
            } else if ((item as any).PartItems && (item as any).PartItems.length > 0) {
                const epubPart = (item as any).PartItems.find((b: any) => (b.Path?.toLowerCase().endsWith('.epub') || (b.Container?.toLowerCase() === 'epub')));
                if (epubPart) {
                    targetBook = epubPart;
                }
            }
            const resumeTicks = isResume ? (targetBook.UserData?.PlaybackPositionTicks || item.UserData?.PlaybackPositionTicks || 0) : 0;
            playMediaItem(targetBook, {
                startPositionTicks: resumeTicks
            });
            return;
        }
        if (isArtist && artistAlbums && artistAlbums.length > 0) {
            playMediaItem(artistAlbums[0]);
            return;
        }
        if ((isBoxSet || isPlaylist) && collectionChildren && collectionChildren.length > 0) {
            playMediaItem(collectionChildren[0]);
            return;
        }
        if (item.Id) {
            playMediaItem(item, {
                startPositionTicks: isResume ? item.UserData?.PlaybackPositionTicks || 0 : 0
            });
        }
    };

    const handlePlayTrack = (track: BaseItemDto, index: number) => {
        if (track.Id && albumTracks) {
            playMediaItem(track, {
                items: albumTracks,
                startIndex: index
            });
        }
    };

    const handleToggleTrackFavorite = async (e: React.MouseEvent, track: BaseItemDto) => {
        e.stopPropagation();
        if (!api || !userId || !track.Id) return;
        const currentFav = trackFavorites[track.Id] ?? Boolean(track.UserData?.IsFavorite);
        const nextFav = !currentFav;
        setTrackFavorites(prev => ({ ...prev, [track.Id!]: nextFav }));
        try {
            if (nextFav) {
                await getUserDataApi(api).markFavoriteItem({ userId, itemId: track.Id });
            } else {
                await getUserDataApi(api).unmarkFavoriteItem({ userId, itemId: track.Id });
            }
        } catch {
            setTrackFavorites(prev => ({ ...prev, [track.Id!]: currentFav }));
        }
    };

    const handlePlayEpisode = (episode: BaseItemDto) => {
        if (episode.Id) {
            const epProgress = getPlaybackPercentage(episode);
            playMediaItem(episode, {
                startPositionTicks: epProgress > 0 ? episode.UserData?.PlaybackPositionTicks || 0 : 0
            });
        }
    };

    const currentFavorite = isFav !== null ? isFav : Boolean(item.UserData?.IsFavorite);

    const handleToggleFavorite = async () => {
        if (!api || !userId || !item.Id) return;
        const nextFav = !currentFavorite;
        setIsFav(nextFav);
        try {
            if (nextFav) {
                await getUserDataApi(api).markFavoriteItem({ userId, itemId: item.Id });
            } else {
                await getUserDataApi(api).unmarkFavoriteItem({ userId, itemId: item.Id });
            }
        } catch {
            setIsFav(!nextFav);
        }
    };

    const currentPlayed = isPlayed !== null ? isPlayed : Boolean(item.UserData?.Played);

    const handleTogglePlayed = async () => {
        if (!api || !userId || !item.Id) return;
        const nextPlayed = !currentPlayed;
        setIsPlayed(nextPlayed);
        try {
            if (nextPlayed) {
                await getUserDataApi(api).markPlayedItem({ userId, itemId: item.Id });
            } else {
                await getUserDataApi(api).markUnplayedItem({ userId, itemId: item.Id });
            }
        } catch {
            setIsPlayed(!nextPlayed);
        }
    };

    const handlePlayTrailer = () => {
        if (trailerUrl) {
            window.open(trailerUrl, '_blank', 'noopener,noreferrer');
        } else if (hasLocalTrailer && item.Id) {
            // Khylo local trailer playback
            playMediaItem(item);
        }
    };

    const handleRemoveFromContinue = async () => {
        if (!item?.Id) return;
        if (item.Type === BaseItemKind.Episode && item.SeriesId) {
            setShowRemovePrompt(true);
            return;
        }
        await executeRemove(item.Type === BaseItemKind.Series ? 'series' : 'episode');
    };

    const executeRemove = async (mode: 'episode' | 'series') => {
        if (!item?.Id) return;
        setShowRemovePrompt(false);
        setIsRemovedFromContinue(true);
        await removeFromContinueWatching(api, userId, item, mode);
        queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Resume'] });
        queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'NextUp'] });
        queryClient.invalidateQueries({ queryKey: ['KhyloLibraryContinue'] });
        queryClient.invalidateQueries({ queryKey: ['KhyloItemDetails', itemId] });
    };

    const handleRemoveSeriesFromContinue = async () => {
        if (!seriesNextUp?.Id) return;
        setIsRemovedFromContinue(true);
        await removeFromContinueWatching(api, userId, { ...seriesNextUp, SeriesId: seriesNextUp.SeriesId ?? item.Id }, 'series');
        void queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Resume'] });
        void queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'NextUp'] });
        void queryClient.invalidateQueries({ queryKey: ['KhyloLibraryContinue'] });
        void queryClient.invalidateQueries({ queryKey: ['KhyloSeriesNextUp'] });
        void queryClient.invalidateQueries({ queryKey: ['KhyloSeasonEpisodes'] });
    };

    const handleRemoveEpisodeItem = async (e: React.MouseEvent, ep: BaseItemDto) => {
        e.stopPropagation();
        if (!ep.Id) return;
        setRemovedEpisodeIds(prev => new Set(prev).add(ep.Id!));
        await removeFromContinueWatching(api, userId, ep, 'episode');
        queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'Resume'] });
        queryClient.invalidateQueries({ queryKey: ['KhyloHome', 'NextUp'] });
        queryClient.invalidateQueries({ queryKey: ['KhyloLibraryContinue'] });
    };

    const detailsPage = (
        <div className={classNames('khylo-details', {
            'khylo-details--music': isMusicSection,
            // Reading and listening pages get the same compact header as music, not a full-screen hero
            'khylo-details--compact': !isMusicSection && (isLiterature || isPodcast || String(item.Type) === 'PodcastEpisode' || String(item.Type) === 'Comic')
        })}>
            {/* Ambient Lighting Field (Spec 8 & 59) */}
            <AmbientBackdrop imageUrl={backdropUrl} opacity={0.09} />

            {/* Back Button (Floating glass pill, clean positioning) */}
            <button
                type='button'
                className='khylo-details__back-btn'
                onClick={() => navigate(-1)}
                aria-label='Go back'
            >
                <ArrowBackIcon />
                <span>Back</span>
            </button>

            {/* Edit details and artwork in place (admins only) */}
            {user?.Policy?.IsAdministrator && item?.Id && (
                <button
                    type='button'
                    className='khylo-details__back-btn khylo-details__edit-btn'
                    onClick={() => openMetadataEditor(item.Id!)}
                    aria-label='Edit details and artwork'
                    title='Edit details and artwork'
                >
                    <EditOutlinedIcon />
                    <span>Edit</span>
                </button>
            )}

            {/* Backdrop environment (Spec 51 & 59) */}
            <div className='khylo-details__backdrop-container'>
                {backdropUrl && (
                    <img
                        src={backdropUrl}
                        alt={item.Name ?? ''}
                        className='khylo-details__backdrop-img'
                    />
                )}
                <div className='khylo-details__backdrop-gradient-left' />
                <div className='khylo-details__backdrop-gradient-bottom' />
                <div className='khylo-details__backdrop-gradient-top' />
            </div>

            {/* Main Header Presentation: Poster + Info (Spec 51) */}
            <div className='khylo-details__hero-section'>
                {/* Poster Box */}
                <div
                    className={classNames('khylo-details__poster-box', {
                        'khylo-details__poster-box--square': isAlbum || isAudio,
                        'khylo-details__poster-box--book': isAudioBook || isBook,
                        'khylo-details__poster-box--artist': isArtist
                    })}
                >
                    {posterUrl ? (
                        <img src={posterUrl} alt={item.Name ?? ''} className='khylo-details__poster-img' />
                    ) : isAlbum || isAudio ? (
                        <div className='khylo-details__vinyl-fallback'>
                            <div className='khylo-details__vinyl-groove khylo-details__vinyl-groove--3' />
                            <div className='khylo-details__vinyl-groove khylo-details__vinyl-groove--2' />
                            <div className='khylo-details__vinyl-groove khylo-details__vinyl-groove--1' />
                            <div className='khylo-details__vinyl-center'>
                                <AlbumIcon className='khylo-details__vinyl-icon' />
                            </div>
                        </div>
                    ) : isAudioBook || isBook ? (
                        <div className='khylo-details__book-fallback'>
                            {isAudioBook ? <HeadsetIcon className='khylo-details__book-icon' /> : <MenuBookIcon className='khylo-details__book-icon' />}
                            <span className='khylo-details__book-fallback-title'>{isAudioBook ? getAudiobookTitle(item) : item.Name}</span>
                        </div>
                    ) : (
                        <div className='khylo-details__poster-placeholder'>{item.Name}</div>
                    )}
                </div>

                {/* Info Column */}
                <div className='khylo-details__info-column'>
                    <div className='khylo-details__kind-tag'>
                        {isAlbum
                            ? 'ALBUM'
                            : isAudio
                                ? 'TRACK'
                                : isArtist
                                    ? 'ARTIST'
                                    : isAudioBook
                                        ? 'AUDIOBOOK'
                                        : isBook
                                            ? 'BOOK & E-BOOK'
                                            : item.Type === BaseItemKind.Episode
                                                ? 'TV EPISODE'
                                                : (item.Type?.toUpperCase() || 'MEDIA')}
                    </div>

                    {(isAlbum || isAudio) && (item.AlbumArtist || item.Artists?.[0]) && (
                        <div className='khylo-details__artist-breadcrumb'>
                            <span className='khylo-details__artist-by'>By </span>
                            <button
                                type='button'
                                className='khylo-details__artist-link-btn'
                                onClick={() => {
                                    if (item.AlbumArtists?.[0]?.Id) {
                                        navigate(`/music?artistId=${item.AlbumArtists[0].Id}`);
                                    } else {
                                        navigate('/music');
                                    }
                                }}
                            >
                                {item.AlbumArtist || item.Artists?.[0]}
                            </button>
                        </div>
                    )}

                    {(isAudioBook || isBook) && (item.Artists?.[0] || item.SeriesName) && (
                        <div className='khylo-details__artist-breadcrumb'>
                            <span className='khylo-details__artist-by'>By </span>
                            <span className='khylo-details__author-text'>{item.Artists?.[0] || item.SeriesName}</span>
                        </div>
                    )}

                    {item.Type === BaseItemKind.Episode && item.SeriesName && (
                        <div className='khylo-details__series-breadcrumb'>
                            <button
                                type='button'
                                className='khylo-details__series-link'
                                onClick={() => item.SeriesId && navigate(`/details?id=${item.SeriesId}`)}
                            >
                                <span>{item.SeriesName}</span>
                                {item.ParentIndexNumber != null && (
                                    <>
                                        <span className='khylo-details__series-sep'>/</span>
                                        <span>Season {item.ParentIndexNumber}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Logo Image or Bold Typographic Title */}
                    {logoUrl && !isMusicSection ? (
                        <div className='khylo-details__logo-wrap'>
                            <img
                                src={logoUrl}
                                alt={item.Name ?? ''}
                                className='khylo-details__logo-img'
                                onError={() => setLogoFailed(true)}
                            />
                        </div>
                    ) : (
                        <h1 className='khylo-details__title'>{isAudioBook ? getAudiobookTitle(item) : item.Name}</h1>
                    )}

                    {item.Taglines && item.Taglines.length > 0 && (
                        <div className='khylo-details__tagline'>&ldquo;{item.Taglines[0]}&rdquo;</div>
                    )}

                    {/* Rich Metadata Badges Row */}
                    <div className='khylo-details__badges-row'>
                        {item.CommunityRating != null && item.CommunityRating > 0 && (
                            <span className='khylo-badge khylo-badge--rating'>
                                <StarIcon />
                                <span>{item.CommunityRating.toFixed(1)}</span>
                            </span>
                        )}

                        {item.ProductionYear && (
                            <span className='khylo-badge khylo-badge--meta'>{item.ProductionYear}</span>
                        )}

                        {item.OfficialRating && (
                            <span className='khylo-badge khylo-badge--pill'>{item.OfficialRating}</span>
                        )}

                        {item.RunTimeTicks && (
                            <span className='khylo-badge khylo-badge--meta'>
                                {formatTicksToDuration(item.RunTimeTicks)}
                            </span>
                        )}

                        {is4K && (
                            <span className='khylo-badge khylo-badge--quality'>4K UHD</span>
                        )}
                        {isHDR && (
                            <span className='khylo-badge khylo-badge--quality'>HDR</span>
                        )}
                        {!is4K && isHD && (
                            <span className='khylo-badge khylo-badge--quality'>HD</span>
                        )}

                        {audioFormat && (
                            <span className='khylo-badge khylo-badge--audio'>{audioFormat}</span>
                        )}

                        {item.Genres && item.Genres.length > 0 && (
                            <span className='khylo-badge khylo-badge--genres'>
                                {item.Genres.slice(0, 3).join(' · ')}
                            </span>
                        )}
                    </div>

                    {/* Primary Action Buttons */}
                    <div className='khylo-details__actions'>
                        {isPlaylist && item?.Id && (
                            <KhyloButton
                                variant='secondary'
                                size='lg'
                                onClick={() => openPlaylistEditor({ items: [], id: item.Id, serverId: item.ServerId })}
                            >
                                EDIT SONGS
                            </KhyloButton>
                        )}
                        {isAlbum ? (
                            <>
                                <KhyloButton
                                    variant='primary'
                                    size='lg'
                                    icon={<PlayArrowIcon />}
                                    onClick={handlePlay}
                                    className='khylo-details__play-btn'
                                >
                                    PLAY ALBUM
                                </KhyloButton>
                                <KhyloButton
                                    variant='secondary'
                                    size='lg'
                                    icon={<ShuffleIcon />}
                                    onClick={() => {
                                        if (albumTracks && albumTracks.length > 0) {
                                            playMediaItem(albumTracks[0], { items: albumTracks, shuffle: true });
                                        } else {
                                            playMediaItem(item, { shuffle: true });
                                        }
                                    }}
                                >
                                    SHUFFLE
                                </KhyloButton>
                                <KhyloButton
                                    variant='secondary'
                                    size='lg'
                                    icon={currentFavorite ? <FavoriteIcon style={{ color: '#D97732' }} /> : <FavoriteBorderIcon />}
                                    onClick={handleToggleFavorite}
                                >
                                    {currentFavorite ? 'FAVORITED' : 'FAVORITE'}
                                </KhyloButton>
                            </>
                        ) : isAudio ? (
                            <>
                                <KhyloButton
                                    variant='primary'
                                    size='lg'
                                    icon={<PlayArrowIcon />}
                                    onClick={handlePlay}
                                    className='khylo-details__play-btn'
                                >
                                    PLAY SONG
                                </KhyloButton>
                                <KhyloButton
                                    variant='secondary'
                                    size='lg'
                                    icon={currentFavorite ? <FavoriteIcon style={{ color: '#D97732' }} /> : <FavoriteBorderIcon />}
                                    onClick={handleToggleFavorite}
                                >
                                    {currentFavorite ? 'FAVORITED' : 'FAVORITE'}
                                </KhyloButton>
                                {item.AlbumId && (
                                    <KhyloButton
                                        variant='secondary'
                                        size='lg'
                                        onClick={() => navigate(`/details?id=${item.AlbumId}`)}
                                    >
                                        VIEW ALBUM
                                    </KhyloButton>
                                )}
                            </>
                        ) : isAudioBook ? (
                            <>
                                <KhyloButton
                                    variant='primary'
                                    size='lg'
                                    icon={<HeadsetIcon />}
                                    onClick={handlePlay}
                                    className='khylo-details__play-btn'
                                >
                                    {isResume ? 'RESUME LISTENING' : 'START LISTENING'}
                                </KhyloButton>
                                <KhyloButton
                                    variant='secondary'
                                    size='lg'
                                    icon={currentFavorite ? <FavoriteIcon style={{ color: '#D97732' }} /> : <FavoriteBorderIcon />}
                                    onClick={handleToggleFavorite}
                                >
                                    {currentFavorite ? 'FAVORITED' : 'FAVORITE'}
                                </KhyloButton>
                                <KhyloButton
                                    variant='secondary'
                                    size='lg'
                                    icon={currentPlayed ? <CheckCircleIcon style={{ color: '#38EF7D' }} /> : <CheckCircleOutlineIcon />}
                                    onClick={handleTogglePlayed}
                                >
                                    {currentPlayed ? 'COMPLETED' : 'MARK FINISHED'}
                                </KhyloButton>
                            </>
                        ) : isBook ? (
                            <>
                                <KhyloButton
                                    variant='primary'
                                    size='lg'
                                    icon={<MenuBookIcon />}
                                    onClick={handlePlay}
                                    className='khylo-details__play-btn'
                                >
                                    {isResume ? 'RESUME READING' : 'READ'}
                                </KhyloButton>
                                <KhyloButton
                                    variant='secondary'
                                    size='lg'
                                    icon={currentFavorite ? <FavoriteIcon style={{ color: '#D97732' }} /> : <FavoriteBorderIcon />}
                                    onClick={handleToggleFavorite}
                                >
                                    {currentFavorite ? 'FAVORITED' : 'FAVORITE'}
                                </KhyloButton>
                            </>
                        ) : (
                            <>
                                <KhyloButton
                                    variant='primary'
                                    size='lg'
                                    icon={<PlayArrowIcon />}
                                    onClick={handlePlay}
                                    className='khylo-details__play-btn'
                                >
                                    {isResume ? 'RESUME' : 'PLAY'}
                                </KhyloButton>

                                {isDisc && (
                                    <KhyloButton
                                        variant='secondary'
                                        size='lg'
                                        icon={<AlbumOutlinedIcon />}
                                        onClick={() => setDiscMenuOpen(true)}
                                    >
                                        DISC MENU
                                    </KhyloButton>
                                )}

                                {/* Everything else as round icon buttons; each names itself on hover */}
                                {(() => {
                                    const listLabel = (isMusic || isAudioBook)
                                        ? (currentFavorite ? 'Favorited' : 'Favorite')
                                        : isLiterature
                                            ? (currentFavorite ? 'In reading list' : 'Add to reading list')
                                            : (currentFavorite ? 'In watchlist' : 'Add to watchlist');
                                    const playedLabel = (isMusic || isAudioBook)
                                        ? (currentPlayed ? 'Played' : 'Mark played')
                                        : isBook
                                            ? (currentPlayed ? 'Read' : 'Mark read')
                                            : (currentPlayed ? 'Watched' : 'Mark watched');
                                    const removeLabel = isRemovedFromContinue ? 'Removed from Continue Watching' : 'Remove from Continue Watching';
                                    return (
                                        <>
                                            <KhyloButton
                                                variant='secondary'
                                                size='lg'
                                                className='khylo-details__icon-action'
                                                data-label={listLabel}
                                                aria-label={listLabel}
                                                icon={
                                                    (isMusic || isAudioBook)
                                                        ? (currentFavorite ? <FavoriteIcon style={{ color: '#D97732' }} /> : <FavoriteBorderIcon />)
                                                        : (currentFavorite ? <BookmarkIcon style={{ color: '#D97732' }} /> : <BookmarkBorderIcon />)
                                                }
                                                onClick={handleToggleFavorite}
                                            />

                                            <KhyloButton
                                                variant='secondary'
                                                size='lg'
                                                className='khylo-details__icon-action'
                                                data-label={playedLabel}
                                                aria-label={playedLabel}
                                                icon={currentPlayed ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
                                                onClick={handleTogglePlayed}
                                            />

                                            {hasTrailer && (
                                                <KhyloButton
                                                    variant='secondary'
                                                    size='lg'
                                                    className='khylo-details__icon-action'
                                                    data-label='Trailer'
                                                    aria-label='Play trailer'
                                                    icon={<MovieCreationOutlinedIcon />}
                                                    onClick={handlePlayTrailer}
                                                />
                                            )}

                                            {isCollectable && (
                                                <KhyloButton
                                                    variant='secondary'
                                                    size='lg'
                                                    className='khylo-details__icon-action'
                                                    data-label='Add to collection'
                                                    aria-label='Add to collection'
                                                    icon={<LibraryAddOutlinedIcon />}
                                                    onClick={() => setCollectionDialog('add')}
                                                />
                                            )}

                                            {canEditCollection && (
                                                <>
                                                    <KhyloButton
                                                        variant='secondary'
                                                        size='lg'
                                                        className='khylo-details__icon-action'
                                                        data-label='Rename collection'
                                                        aria-label='Rename collection'
                                                        icon={<EditOutlinedIcon />}
                                                        onClick={() => setCollectionDialog('rename')}
                                                    />
                                                    <KhyloButton
                                                        variant='secondary'
                                                        size='lg'
                                                        className='khylo-details__icon-action'
                                                        data-label='Delete collection'
                                                        aria-label='Delete collection'
                                                        icon={<DeleteOutlineIcon />}
                                                        onClick={() => setIsDeleteCollectionOpen(true)}
                                                    />
                                                </>
                                            )}

                                            {item.Type === BaseItemKind.Episode && item.SeriesId && (
                                                <KhyloButton
                                                    variant='secondary'
                                                    size='lg'
                                                    className='khylo-details__icon-action'
                                                    data-label='Go to show'
                                                    aria-label='Go to show'
                                                    icon={<TvOutlinedIcon />}
                                                    onClick={() => navigate(`/details?id=${item.SeriesId}`)}
                                                />
                                            )}

                                            {/* Only for a movie/episode the user has actually started. Series use the Next Up banner below. */}
                                            {!isSeries && (isResume || isRemovedFromContinue) && (
                                                <KhyloButton
                                                    variant='secondary'
                                                    size='lg'
                                                    className={classNames('khylo-details__icon-action', { 'khylo-details__remove-btn--done': isRemovedFromContinue })}
                                                    data-label={removeLabel}
                                                    aria-label={removeLabel}
                                                    icon={isRemovedFromContinue ? <CheckIcon /> : <CloseIcon />}
                                                    onClick={handleRemoveFromContinue}
                                                />
                                            )}
                                        </>
                                    );
                                })()}
                            </>
                        )}
                    </div>

                    {/* Playback Progress Indicator */}
                    {isResume && (
                        <div className='khylo-details__progress-container'>
                            <div className='khylo-details__progress-track'>
                                <div
                                    className='khylo-details__progress-bar'
                                    style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                                />
                            </div>
                            <span className='khylo-details__progress-label'>
                                {remainingTime || `${Math.round(progress)}% watched`}
                            </span>
                        </div>
                    )}

                    {/* Overview */}
                    {item.Overview && (
                        <div className='khylo-details__overview-section'>
                            <h3 className='khylo-details__section-heading'>Synopsis</h3>
                            <div className='khylo-details__overview-text' dangerouslySetInnerHTML={{ __html: overviewHtml(item.Overview) }} />
                        </div>
                    )}

                    {/* Next Up Spotlight for TV Shows */}
                    {isSeries && seriesNextUp && (
                        <div className='khylo-details__nextup-banner'>
                            <div className='khylo-details__nextup-text'>
                                <span className='khylo-details__nextup-kicker'>NEXT EPISODE TO WATCH</span>
                                <div className='khylo-details__nextup-title'>
                                    {seriesNextUp.ParentIndexNumber != null && `S${seriesNextUp.ParentIndexNumber}:`}
                                    {seriesNextUp.IndexNumber != null && `E${seriesNextUp.IndexNumber} · `}
                                    {seriesNextUp.Name}
                                </div>
                                {seriesNextUp.Overview && (
                                    <p className='khylo-details__nextup-desc'>{seriesNextUp.Overview}</p>
                                )}
                            </div>
                            <KhyloButton
                                variant='primary'
                                size='md'
                                icon={<PlayArrowIcon />}
                                onClick={() => handlePlayEpisode(seriesNextUp)}
                                className='khylo-details__nextup-btn'
                            >
                                {getPlaybackPercentage(seriesNextUp) > 0 ? 'RESUME EPISODE' : 'PLAY EPISODE'}
                            </KhyloButton>
                            {(getPlaybackPercentage(seriesNextUp) > 0 || isRemovedFromContinue) && (
                                <KhyloButton
                                    variant='secondary'
                                    size='md'
                                    icon={isRemovedFromContinue ? <CheckIcon style={{ color: '#38EF7D' }} /> : <CloseIcon />}
                                    onClick={handleRemoveSeriesFromContinue}
                                    disabled={isRemovedFromContinue}
                                    className={isRemovedFromContinue ? 'khylo-details__remove-btn--done' : ''}
                                >
                                    {isRemovedFromContinue ? 'REMOVED FROM CONTINUE' : 'REMOVE FROM CONTINUE'}
                                </KhyloButton>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* TV Series Seasons & Episodes Presentation (Spec 49 & 50) */}
            {isSeries && seasons && seasons.length > 0 && (
                <div className='khylo-details__episodes-section'>
                    <div className='khylo-details__seasons-header'>
                        <h2 className='khylo-details__episodes-title'>Episodes</h2>
                        {seasons.length > MAX_SEASON_TABS ? (
                            <div className='khylo-details__season-select-wrap'>
                                <select
                                    className='khylo-details__season-select'
                                    value={activeSeasonId}
                                    onChange={e => setSelectedSeasonId(e.target.value)}
                                    aria-label='Season'
                                >
                                    {seasons.map(season => (
                                        <option key={season.Id} value={season.Id!}>
                                            {season.Name}
                                            {season.ChildCount != null ? ` (${season.ChildCount})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ExpandMoreIcon className='khylo-details__season-select-icon' />
                            </div>
                        ) : (
                            <div className='khylo-details__season-tabs' role='tablist'>
                                {seasons.map(season => {
                                    const isActive = season.Id === activeSeasonId;
                                    return (
                                        <button
                                            key={season.Id}
                                            type='button'
                                            role='tab'
                                            aria-selected={isActive}
                                            className={`khylo-details__season-tab ${isActive ? 'khylo-details__season-tab--active' : ''}`}
                                            onClick={() => setSelectedSeasonId(season.Id!)}
                                        >
                                            <span>{season.Name}</span>
                                            {season.ChildCount != null && (
                                                <span className='khylo-details__season-count'>
                                                    ({season.ChildCount})
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Episode landscape stills list (Spec 50) */}
                    <div className='khylo-details__episodes-grid'>
                        {episodes && episodes.map(episode => {
                            const epThumb = getItemImageUrl(api, episode, 'primary', 480)
                                || getItemImageUrl(api, episode, 'thumb', 480)
                                || backdropUrl;
                            const epProgress = getPlaybackPercentage(episode);

                            return (
                                <div
                                    key={episode.Id}
                                    className='khylo-episode-card'
                                    onClick={() => handlePlayEpisode(episode)}
                                    role='button'
                                    tabIndex={0}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handlePlayEpisode(episode);
                                    }}
                                >
                                    <div className='khylo-episode-card__thumb-box'>
                                        {epThumb && (
                                            <img
                                                src={epThumb}
                                                alt={episode.Name ?? ''}
                                                className='khylo-episode-card__thumb'
                                                loading='lazy'
                                            />
                                        )}
                                        <div className='khylo-episode-card__play-overlay'>
                                            <PlayArrowIcon />
                                        </div>
                                        {epProgress > 0 && !removedEpisodeIds.has(episode.Id!) && (
                                            <div className='khylo-episode-card__progress-track'>
                                                <div
                                                    className='khylo-episode-card__progress-bar'
                                                    style={{ width: `${epProgress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className='khylo-episode-card__info'>
                                        <div className='khylo-episode-card__num-title'>
                                            <span className='khylo-episode-card__num'>
                                                {episode.IndexNumber != null ? `Episode ${episode.IndexNumber}` : 'Special'}
                                            </span>
                                            {episode.RunTimeTicks && (
                                                <span className='khylo-episode-card__duration'>
                                                    {formatTicksToDuration(episode.RunTimeTicks)}
                                                </span>
                                            )}
                                        </div>
                                        <div className='khylo-episode-card__title'>{episode.Name}</div>
                                        {episode.Overview && (
                                            <p className='khylo-episode-card__desc'>{episode.Overview}</p>
                                        )}
                                        <div className='khylo-episode-card__actions-row'>
                                            <button
                                                type='button'
                                                className='khylo-episode-card__action-btn'
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    navigate(`/details?id=${episode.Id}`);
                                                }}
                                                title='Episode details'
                                            >
                                                Details
                                            </button>
                                            {epProgress > 0 && !removedEpisodeIds.has(episode.Id!) && (
                                                <button
                                                    type='button'
                                                    className='khylo-episode-card__action-btn khylo-episode-card__action-btn--remove'
                                                    onClick={e => handleRemoveEpisodeItem(e, episode)}
                                                    title='Remove from Continue Playing'
                                                >
                                                    <CloseIcon />
                                                    <span>Remove from Continue</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BoxSet (Collection) or Playlist Child Media */}
            {(isBoxSet || isPlaylist) && collectionChildren && collectionChildren.length > 0 && (
                <div className='khylo-details__collection-section'>
                    <div className='khylo-details__seasons-header'>
                        <h2 className='khylo-details__episodes-title'>
                            {isBoxSet ? 'Titles in this Collection' : 'Items in this Playlist'}
                        </h2>
                        <span className='khylo-details__collection-count'>
                            {collectionChildren.length} {collectionChildren.length === 1 ? 'Title' : 'Titles'}
                        </span>
                    </div>
                    <div className='khylo-details__collection-grid'>
                        {collectionChildren.map(child => (
                            <div key={child.Id} className='khylo-details__collection-card-wrap'>
                                <KhyloMediaCard
                                    item={child}
                                    variant={child.Type === BaseItemKind.BoxSet ? 'collection' : 'poster'}
                                />
                                {canEditCollection && child.Id && (
                                    <button
                                        type='button'
                                        className='khylo-details__collection-remove'
                                        onClick={() => { handleRemoveFromCollection(child.Id!).catch(() => undefined); }}
                                        aria-label={`Remove ${child.Name ?? 'title'} from this collection`}
                                        title='Remove from collection'
                                    >
                                        <CloseIcon />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isBoxSet && collectionChildren && collectionChildren.length === 0 && (
                <div className='khylo-details__collection-section'>
                    <p className='khylo-details__collection-empty'>
                        This collection is empty. Open any movie or show and press Add to collection.
                    </p>
                </div>
            )}

            {/* Music Album & Audiobook Tracklist (Spotify / Apple Music Style) */}
            {(isAlbum || isAudioBook || isPodcast) && albumTracks && albumTracks.length > 0 && (
                <div className='khylo-details__tracks-section'>
                    <div className='khylo-details__seasons-header'>
                        <h2 className='khylo-details__episodes-title'>
                            {isPodcast ? 'Episodes' : isAudioBook ? 'Chapters' : 'Tracks'}
                        </h2>
                        <span className='khylo-details__collection-count'>
                            {albumTracks.length} {isPodcast
                                ? (albumTracks.length === 1 ? 'Episode' : 'Episodes')
                                : (albumTracks.length === 1 ? 'Track' : 'Tracks')}
                        </span>
                    </div>

                    <div className='khylo-tracklist'>
                        <div className='khylo-tracklist__header'>
                            <div className='khylo-tracklist__col-num'>#</div>
                            <div className='khylo-tracklist__col-main'>Title</div>
                            <div className='khylo-tracklist__col-duration'>
                                <AccessTimeIcon fontSize='small' />
                            </div>
                            <div className='khylo-tracklist__col-action' />
                        </div>

                        {albumTracks.map((track, idx) => {
                            const trackNum = isPodcast ? idx + 1 : (track.IndexNumber ?? (idx + 1));
                            const duration = formatTicksToTrackTime(track.RunTimeTicks);
                            // Episodes show when they came out instead of an artist
                            const artistName = isPodcast
                                ? (track.PremiereDate ? new Date(track.PremiereDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined)
                                : track.Artists?.[0] || track.AlbumArtist || item.Name;
                            const isTrackFav = trackFavorites[track.Id!] ?? Boolean(track.UserData?.IsFavorite);

                            return (
                                <div
                                    key={track.Id || idx}
                                    className='khylo-tracklist__row'
                                    onClick={() => handlePlayTrack(track, idx)}
                                    role='button'
                                    tabIndex={0}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handlePlayTrack(track, idx);
                                    }}
                                >
                                    <div className='khylo-tracklist__col-num'>
                                        <span className='khylo-tracklist__num-text'>{trackNum}</span>
                                        <button
                                            type='button'
                                            className='khylo-tracklist__play-btn'
                                            aria-label={`Play ${track.Name}`}
                                            onClick={e => {
                                                e.stopPropagation();
                                                handlePlayTrack(track, idx);
                                            }}
                                        >
                                            <PlayArrowIcon />
                                        </button>
                                    </div>

                                    <div className='khylo-tracklist__col-main'>
                                        <div className='khylo-tracklist__title'>{track.Name}</div>
                                        {artistName && <div className='khylo-tracklist__artist'>{artistName}</div>}
                                    </div>

                                    <div className='khylo-tracklist__col-duration'>
                                        {duration}
                                    </div>

                                    <div className='khylo-tracklist__col-action'>
                                        <button
                                            type='button'
                                            className={classNames('khylo-tracklist__fav-btn', {
                                                'khylo-tracklist__fav-btn--active': isTrackFav
                                            })}
                                            onClick={e => handleToggleTrackFavorite(e, track)}
                                            aria-label='Favorite track'
                                        >
                                            {isTrackFav ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Music Artist Discography Rail */}
            {isArtist && artistAlbums && artistAlbums.length > 0 && (
                <div className='khylo-details__artist-discography'>
                    <KhyloContentRail
                        title='Discography'
                        subtitle='Albums and releases by this artist'
                        items={artistAlbums}
                        variant='square'
                    />
                </div>
            )}

            {/* Technical Specs & Credits */}
            {(directors.length > 0 || writers.length > 0 || studios.length > 0 || audioFormat || subtitleStreams.length > 0) && (
                <div className='khylo-details__specs-section'>
                    <h2 className='khylo-details__section-heading'>Details &amp; Specifications</h2>
                    <div className='khylo-details__specs-grid'>
                        {directors.length > 0 && (
                            <div className='khylo-spec-item'>
                                <span className='khylo-spec-item__label'>Director{directors.length > 1 ? 's' : ''}</span>
                                <span className='khylo-spec-item__value'>{directors.join(', ')}</span>
                            </div>
                        )}
                        {writers.length > 0 && (
                            <div className='khylo-spec-item'>
                                <span className='khylo-spec-item__label'>Writer{writers.length > 1 ? 's' : ''}</span>
                                <span className='khylo-spec-item__value'>{writers.join(', ')}</span>
                            </div>
                        )}
                        {studios.length > 0 && (
                            <div className='khylo-spec-item'>
                                <span className='khylo-spec-item__label'>Studio</span>
                                <span className='khylo-spec-item__value'>{studios.join(', ')}</span>
                            </div>
                        )}
                        {(videoStream?.Codec || is4K || isHD) && (
                            <div className='khylo-spec-item'>
                                <span className='khylo-spec-item__label'>Video Quality</span>
                                <span className='khylo-spec-item__value'>
                                    {is4K ? '4K Ultra HD (3840×2160)' : isHD ? '1080p Full HD' : 'Standard Definition'}
                                    {isHDR ? ' · HDR10' : ''}
                                    {videoStream?.Codec ? ` (${videoStream.Codec.toUpperCase()})` : ''}
                                </span>
                            </div>
                        )}
                        {audioFormat && (
                            <div className='khylo-spec-item'>
                                <span className='khylo-spec-item__label'>Audio Format</span>
                                <span className='khylo-spec-item__value'>
                                    {audioFormat}
                                    {audioStream?.Codec ? ` · ${audioStream.Codec.toUpperCase()}` : ''}
                                </span>
                            </div>
                        )}
                        {subtitleStreams.length > 0 && (
                            <div className='khylo-spec-item'>
                                <span className='khylo-spec-item__label'>Subtitles</span>
                                <span className='khylo-spec-item__value'>
                                    {subtitleStreams
                                        .map(s => s.Language || s.DisplayTitle || 'Unknown')
                                        .filter((v, i, a) => a.indexOf(v) === i)
                                        .slice(0, 6)
                                        .join(', ')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cast & Crew (Spec 51); books and comics have authors and creators, not a cast */}
            {item.People && item.People.length > 0 && (
                <div className='khylo-details__people-section'>
                    <h2 className='khylo-details__section-heading'>
                        {peopleHeading}
                    </h2>
                    <div className='khylo-details__people-grid'>
                        {item.People.slice(0, 14).map((person, idx) => {
                            const personImg = person.PrimaryImageTag && api
                                ? `${api.basePath}/Items/${person.Id}/Images/Primary?maxWidth=200&tag=${person.PrimaryImageTag}`
                                : null;

                            return (
                                <div key={person.Id || idx} className='khylo-person-card'>
                                    <div className='khylo-person-card__avatar'>
                                        {personImg ? (
                                            <img src={personImg} alt={person.Name ?? ''} loading='lazy' />
                                        ) : (
                                            <div className='khylo-person-card__placeholder'>
                                                {person.Name?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className='khylo-person-card__name'>{person.Name}</div>
                                    <div className='khylo-person-card__role'>{person.Role || person.Type}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Related / Similar Media Rail (Spec 51) */}
            {similarItems && similarItems.length > 0 && (
                <div className='khylo-details__similar-section'>
                    <KhyloContentRail
                        title='More Like This'
                        subtitle='Recommended titles based on this media'
                        items={similarItems}
                        variant={isMusic ? 'square' : 'poster'}
                    />
                </div>
            )}

            {/* Remove from Continue Watching Modal for Episodes */}
            {showRemovePrompt && (
                <div className='khylo-details__modal-backdrop' onClick={() => setShowRemovePrompt(false)}>
                    <div className='khylo-details__modal-card' onClick={e => e.stopPropagation()}>
                        <h3 className='khylo-details__modal-title'>Remove from Continue Watching</h3>
                        <p className='khylo-details__modal-desc'>
                            Do you want to remove just this episode or the entire series from your Continue Watching queue?
                        </p>
                        <div className='khylo-details__modal-actions'>
                            <button
                                type='button'
                                className='khylo-details__modal-btn khylo-details__modal-btn--primary'
                                onClick={() => executeRemove('episode')}
                            >
                                Remove Episode
                            </button>
                            <button
                                type='button'
                                className='khylo-details__modal-btn khylo-details__modal-btn--danger'
                                onClick={() => executeRemove('series')}
                            >
                                Remove Entire Show
                            </button>
                            <button
                                type='button'
                                className='khylo-details__modal-btn khylo-details__modal-btn--cancel'
                                onClick={() => setShowRemovePrompt(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {collectionDialog && (
                <KhyloCollectionDialog
                    open
                    mode={collectionDialog}
                    onClose={() => setCollectionDialog(null)}
                    itemId={item.Id ?? undefined}
                    itemName={item.Name ?? undefined}
                    collectionId={item.Id ?? undefined}
                    collectionName={item.Name ?? undefined}
                />
            )}

            <ConfirmDialog
                open={isDeleteCollectionOpen}
                title='Delete collection'
                text={`Delete "${item.Name ?? 'this collection'}"? The titles in it stay in your library.`}
                onCancel={() => setIsDeleteCollectionOpen(false)}
                onConfirm={() => { handleDeleteCollection().catch(() => undefined); }}
                confirmButtonColor='error'
                confirmButtonText='Delete'
            />
            {discMenuOpen && <KhyloDiscMenu item={item} onClose={() => setDiscMenuOpen(false)} />}
        </div>
    );

    return isMusicSection ? <KhyloMusicLayout>{detailsPage}</KhyloMusicLayout> : detailsPage;
};
