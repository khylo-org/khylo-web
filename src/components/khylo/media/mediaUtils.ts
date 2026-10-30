import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { getUserDataApi } from '@khylo/sdk/lib/utils/api/user-data-api';
import { ServerConnections } from 'lib/khylo-apiclient';
import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';

/**
 * Formats ticks (1 tick = 100ns) into human readable duration e.g. "54 min" or "2h 12m"
 */
export function formatTicksToDuration(ticks?: number | null): string {
    if (!ticks) return '';
    const totalMinutes = Math.round(ticks / 600000000);
    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculates and formats time remaining for in-progress playback
 */
export function formatTimeRemaining(runtimeTicks?: number | null, positionTicks?: number | null): string {
    if (!runtimeTicks || positionTicks == null) return '';
    const remainingTicks = Math.max(0, runtimeTicks - positionTicks);
    const remainingMinutes = Math.round(remainingTicks / 600000000);
    if (remainingMinutes <= 0) return 'Finished';
    if (remainingMinutes < 60) return `${remainingMinutes} min left`;
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
}

/**
 * Gets percentage played (0-100)
 */
export function getPlaybackPercentage(item: BaseItemDto): number {
    const data = item.UserData;
    if (data?.PlayedPercentage != null) {
        return Math.min(100, Math.max(0, data.PlayedPercentage));
    }
    if (data?.PlaybackPositionTicks && item.RunTimeTicks) {
        return Math.min(100, Math.max(0, (data.PlaybackPositionTicks / item.RunTimeTicks) * 100));
    }
    if (typeof window !== 'undefined' && item?.Id) {
        const savedPct = localStorage.getItem(`khylo_book_pct_${item.Id}`);
        if (savedPct) {
            const parsed = parseFloat(savedPct);
            if (!isNaN(parsed) && parsed > 0) {
                return Math.min(100, Math.max(0, parsed));
            }
        }
        const savedCfi = localStorage.getItem(`khylo_book_cfi_${item.Id}`);
        if (savedCfi) {
            return 5;
        }
    }
    return 0;
}

/**
 * Builds item image URL with fallback to series/parent artwork
 */
export function getItemImageUrl(
    api: Api | null | undefined,
    item: BaseItemDto,
    type: 'primary' | 'backdrop' | 'thumb' | 'logo' = 'primary',
    maxWidth = 400
): string | null {
    if (!api || !item.Id) return null;

    if (type === 'logo') {
        if (item.ImageTags?.Logo) {
            return `${api.basePath}/Items/${item.Id}/Images/Logo?maxWidth=${maxWidth}&tag=${item.ImageTags.Logo}`;
        }
        if (item.ParentLogoImageTag && item.ParentLogoItemId) {
            return `${api.basePath}/Items/${item.ParentLogoItemId}/Images/Logo?maxWidth=${maxWidth}&tag=${item.ParentLogoImageTag}`;
        }
        if (item.SeriesId) {
            return `${api.basePath}/Items/${item.SeriesId}/Images/Logo?maxWidth=${maxWidth}`;
        }
        return null;
    }

    if (type === 'backdrop') {
        if (item.Type === BaseItemKind.Episode && item.ImageTags?.Primary) {
            return `${api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=${maxWidth}&tag=${item.ImageTags.Primary}`;
        }
        if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
            return `${api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=${maxWidth}&tag=${item.BackdropImageTags[0]}`;
        }
        if (item.ImageTags?.Thumb) {
            return `${api.basePath}/Items/${item.Id}/Images/Thumb?maxWidth=${maxWidth}&tag=${item.ImageTags.Thumb}`;
        }
        if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0 && item.ParentBackdropItemId) {
            return `${api.basePath}/Items/${item.ParentBackdropItemId}/Images/Backdrop/0?maxWidth=${maxWidth}&tag=${item.ParentBackdropImageTags[0]}`;
        }
        if (item.SeriesId) {
            return `${api.basePath}/Items/${item.SeriesId}/Images/Backdrop/0?maxWidth=${maxWidth}`;
        }
    }

    if (type === 'thumb' && item.ImageTags?.Thumb) {
        return `${api.basePath}/Items/${item.Id}/Images/Thumb?maxWidth=${maxWidth}&tag=${item.ImageTags.Thumb}`;
    }

    // Primary
    if (item.ImageTags?.Primary) {
        return `${api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=${maxWidth}&tag=${item.ImageTags.Primary}`;
    }

    // Episode fallback to series poster
    if (item.Type === BaseItemKind.Episode) {
        if (item.SeriesPrimaryImageTag && item.SeriesId) {
            return `${api.basePath}/Items/${item.SeriesId}/Images/Primary?maxWidth=${maxWidth}&tag=${item.SeriesPrimaryImageTag}`;
        }
    }

    // Season fallback
    if (item.Type === BaseItemKind.Season && item.SeriesId) {
        return `${api.basePath}/Items/${item.SeriesId}/Images/Primary?maxWidth=${maxWidth}`;
    }

    return null;
}

/**
 * Returns formatted subtitle e.g. "S1 E6" or "2023 · Action"
 */
export function getItemSubtitle(item: BaseItemDto): string {
    if (item.Type === BaseItemKind.Episode) {
        const season = item.ParentIndexNumber;
        const episode = item.IndexNumber;
        if (season != null && episode != null) {
            return `S${season} E${episode}`;
        }
        if (episode != null) {
            return `E${episode}`;
        }
        return item.SeriesName || 'Episode';
    }

    if (item.Type === BaseItemKind.Series) {
        const parts: string[] = [];
        if (item.ProductionYear) parts.push(String(item.ProductionYear));
        if (item.ChildCount) parts.push(`${item.ChildCount} Seasons`);
        return parts.join(' · ') || 'Series';
    }

    if (item.Type === BaseItemKind.Movie) {
        const parts: string[] = [];
        if (item.ProductionYear) parts.push(String(item.ProductionYear));
        if (item.OfficialRating) parts.push(item.OfficialRating);
        return parts.join(' · ') || 'Movie';
    }

    if (item.Type === BaseItemKind.Audio || item.Type === BaseItemKind.MusicAlbum) {
        const artist = item.AlbumArtist || item.Artists?.[0];
        if (item.Type === BaseItemKind.Audio) {
            return [artist, item.Album].filter(Boolean).join(' · ') || 'Song';
        }
        return [artist, item.ProductionYear].filter(Boolean).join(' · ') || 'Album';
    }

    if (item.Type === BaseItemKind.MusicArtist) {
        return 'Artist';
    }

    if (item.Type === BaseItemKind.Book || item.Type === BaseItemKind.AudioBook) {
        const author = item.Artists?.[0] || item.SeriesName;
        const tag = item.Type === BaseItemKind.AudioBook ? 'Audiobook' : 'Book';
        return [author, item.ProductionYear].filter(Boolean).join(' · ') || tag;
    }

    if (item.Type === BaseItemKind.BoxSet) {
        return item.ChildCount ? `${item.ChildCount} ${item.ChildCount === 1 ? 'title' : 'titles'}` : 'Collection';
    }

    return item.ProductionYear ? String(item.ProductionYear) : '';
}

/**
 * Formats ticks into digital track time e.g. "3:42" or "1:04:12"
 */
export function formatTicksToTrackTime(ticks?: number | null): string {
    if (!ticks) return '0:00';
    const totalSeconds = Math.floor(ticks / 10000000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

    if (hours > 0) {
        const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${minutes}:${formattedSeconds}`;
}

const KHYLO_HIDDEN_CONTINUE_KEY = 'khylo_hidden_continue_items';

/**
 * Returns the set of item and series IDs hidden from Continue Watching
 */
export function getHiddenContinueItemIds(): Set<string> {
    try {
        const stored = localStorage.getItem(KHYLO_HIDDEN_CONTINUE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return new Set<string>(parsed);
            }
        }
    } catch (e) {
        console.warn('Failed to parse hidden continue items from storage', e);
    }
    return new Set<string>();
}

/**
 * Marks an ID as hidden from Continue Watching
 */
export function hideContinueItem(id: string): void {
    if (!id) return;
    try {
        const ids = getHiddenContinueItemIds();
        ids.add(id);
        localStorage.setItem(KHYLO_HIDDEN_CONTINUE_KEY, JSON.stringify(Array.from(ids)));
    } catch (e) {
        console.warn('Failed to save hidden continue item to storage', e);
    }
}

/**
 * Unhides an ID from Continue Watching (called when playback starts)
 */
export function unhideContinueItem(id?: string | null): void {
    if (!id) return;
    try {
        const ids = getHiddenContinueItemIds();
        if (ids.has(id)) {
            ids.delete(id);
            localStorage.setItem(KHYLO_HIDDEN_CONTINUE_KEY, JSON.stringify(Array.from(ids)));
        }
    } catch (e) {
        console.warn('Failed to remove hidden continue item from storage', e);
    }
}

/**
 * Removes an item or entire series from Continue Watching both on server and in local client cache
 */
export async function removeFromContinueWatching(
    api: Api | null | undefined,
    userId: string | null | undefined,
    item: BaseItemDto,
    mode: 'episode' | 'series' | 'auto' = 'auto'
): Promise<void> {
    if (!item?.Id) return;

    const isSeriesRemoval = mode === 'series' || item.Type === BaseItemKind.Series;

    // Local hide first for immediate, zero-latency feedback
    if (isSeriesRemoval) {
        const targetId = item.SeriesId || item.Id;
        hideContinueItem(targetId);
        if (item.Id) hideContinueItem(item.Id);
    } else {
        hideContinueItem(item.Id);
    }

    // Server update: clear the resume position of the in-progress item only. Never mark a whole series
    // unplayed, that would wipe the user's watch history for every episode of the show.
    if (api && userId && item.Type !== BaseItemKind.Series) {
        try {
            await getUserDataApi(api).updateItemUserData({
                userId,
                itemId: item.Id,
                updateUserItemDataDto: { PlaybackPositionTicks: 0, PlayedPercentage: 0 }
            });
        } catch (err) {
            console.warn('Server error marking item unplayed:', err);
        }
    }

    // Global broadcast to update Home, LibraryBrowser, Details, etc.
    window.dispatchEvent(new CustomEvent('khylo-continue-watching-updated', {
        detail: {
            itemId: item.Id,
            seriesId: item.SeriesId,
            mode: isSeriesRemoval ? 'series' : 'episode'
        }
    }));
}

/**
 * Identifies if an item is an E-Book (epub, pdf, mobi, etc.)
 */
export function isEbookMediaItem(item?: BaseItemDto | null): boolean {
    if (!item) return false;
    const type = String(item.Type || '');
    const mediaType = String((item as any).MediaType || '');
    const path = (item.Path || '').toLowerCase();
    const container = (item.Container || '').toLowerCase();

    // Explicit audio files are never ebooks
    if (type === 'AudioBook' || mediaType === 'AudioBook') return false;
    if (path.endsWith('.mp3') || path.endsWith('.m4b') || path.endsWith('.m4a') || container === 'mp3' || container === 'm4b') return false;

    // Direct book items
    if (type === BaseItemKind.Book || type === 'Book' || mediaType === 'Book') return true;
    if (path.endsWith('.epub') || path.endsWith('.pdf') || path.endsWith('.mobi') || path.endsWith('.azw3') || path.endsWith('.cbr') || path.endsWith('.cbz')) return true;
    if (container === 'epub' || container === 'pdf' || container === 'mobi' || container === 'azw3' || container === 'cbr' || container === 'cbz') return true;

    // Folders inside books collection
    if ((type === BaseItemKind.Folder || type === 'Folder') && (
        (item.CollectionType as string) === 'books' ||
        ((path.includes('\\books') || path.includes('/books')) && !path.includes('audio book') && !path.includes('audiobook'))
    )) {
        return true;
    }

    return false;
}

/**
 * Identifies if an item is an Audiobook
 */
export function isAudiobookMediaItem(item?: BaseItemDto | null): boolean {
    if (!item) return false;
    const type = String(item.Type || '');
    const mediaType = String((item as any).MediaType || '');
    const path = (item.Path || '').toLowerCase();
    const container = (item.Container || '').toLowerCase();

    if (path.endsWith('.epub') || path.endsWith('.pdf') || path.endsWith('.mobi') || container === 'epub' || container === 'pdf' || container === 'mobi') {
        return false;
    }

    if (type === BaseItemKind.AudioBook || type === 'AudioBook' || mediaType === 'AudioBook') return true;
    if ((path.includes('audio book') || path.includes('audiobook')) && (path.endsWith('.mp3') || path.endsWith('.m4b') || path.endsWith('.m4a') || container === 'mp3' || container === 'm4b')) return true;
    if ((type === BaseItemKind.Folder || type === 'Folder') && (
        (item.CollectionType as string) === 'audiobooks' || path.includes('audio book') || path.includes('audiobook')
    )) {
        return true;
    }

    return false;
}

/**
 * Ebook formats the web readers can open, in order of preference:
 * epub (bookPlayer), pdf (pdfPlayer), comic archives (comicsPlayer).
 * MOBI/AZW3 have no browser reader.
 */
const READABLE_BOOK_EXTENSIONS = ['.epub', '.pdf', '.cbz', '.cbr', '.cb7', '.cbt'];

function getReadableRank(book: BaseItemDto): number {
    const path = (book.Path || '').toLowerCase();
    return READABLE_BOOK_EXTENSIONS.findIndex(ext => path.endsWith(ext));
}

/**
 * Picks the copy of a book the browser can actually read. List/card queries usually omit Path,
 * so the candidates are re-fetched with Path before choosing (otherwise a MOBI copy can be chosen
 * and handed to the EPUB reader, which then spins forever).
 */
async function resolveReadableBook(candidates: BaseItemDto[], serverId?: string): Promise<{ book?: BaseItemDto; formats: string[] }> {
    const ids = Array.from(new Set(candidates.map(c => c.Id).filter(Boolean))) as string[];
    let withPaths = candidates;

    if (ids.length && candidates.some(c => !c.Path)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiClient = (ServerConnections as any).getApiClient(serverId) || (ServerConnections as any).currentApiClient();
        try {
            const result = await apiClient.getItems(apiClient.getCurrentUserId(), { Ids: ids.join(','), Fields: 'Path,MediaSources' });
            if (result?.Items?.length) {
                withPaths = result.Items;
            }
        } catch (err) {
            console.error('[playMediaItem] failed to resolve book files', err);
        }
    }

    const formats = withPaths
        .map(b => (b.Path || '').split('.').pop()?.toUpperCase())
        .filter((f): f is string => Boolean(f));

    const book = withPaths
        .filter(b => getReadableRank(b) >= 0)
        .sort((a, b) => getReadableRank(a) - getReadableRank(b))[0];

    return { book, formats: Array.from(new Set(formats)) };
}

async function playBook(item: BaseItemDto, candidates: BaseItemDto[], serverId: string | undefined, startPositionTicks?: number) {
    const { book, formats } = await resolveReadableBook(candidates, serverId);

    if (!book) {
        const { default: alert } = await import('components/alert');
        await alert({
            title: item.Name || 'Unable to open book',
            text: formats.length
                ? `This book is only available as ${formats.join(', ')}, which can't be read in the browser. Add an EPUB or PDF copy to read it here.`
                : 'No readable file was found for this book.'
        });
        return;
    }

    const bookToPlay: BaseItemDto = {
        ...book,
        ServerId: book.ServerId || serverId,
        MediaType: 'Book',
        Type: 'Book'
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (playbackManager as any).play({
        items: [bookToPlay],
        ids: [bookToPlay.Id],
        serverId,
        startPositionTicks: startPositionTicks ?? book.UserData?.PlaybackPositionTicks ?? item.UserData?.PlaybackPositionTicks
    });
}

/**
 * Robust playback trigger ensuring serverId, queue items, and shuffle options are provided to playbackManager
 */
export function playMediaItem(
    item: BaseItemDto,
    options?: {
        startPositionTicks?: number;
        serverId?: string;
        shuffle?: boolean;
        items?: BaseItemDto[];
        startIndex?: number;
        /** Play a particular version of the item (a DVD's extra title, say). */
        mediaSourceId?: string;
        audioStreamIndex?: number;
        subtitleStreamIndex?: number;
    }
): void {
    if (!item?.Id) return;
    unhideContinueItem(item.Id);
    if (item.SeriesId) {
        unhideContinueItem(item.SeriesId);
    }
    const currentClient = (ServerConnections as any).currentApiClient?.() || (window as any).ApiClient;
    const defaultServerId = currentClient?.serverId?.() || currentClient?.serverInfo?.()?.Id || (ServerConnections as any).getLastUsedServer?.()?.Id;
    const serverId = options?.serverId || item.ServerId || (item as any).serverId || defaultServerId;

    const targetItems: BaseItemDto[] = options?.items && options.items.length > 0
        ? options.items
        : ((item as any).PartItems && (item as any).PartItems.length > 0)
            ? (item as any).PartItems
            : [item];

    if (isEbookMediaItem(item) && !item.IsFolder) {
        void playBook(item, [item, ...targetItems, ...((item as any).PartItems || [])], serverId, options?.startPositionTicks);
        return;
    }

    // Audiobooks always play as the whole book (every part), never a single part file
    if (isAudiobookMediaItem(item) && !(options?.items && options.items.length > 1)) {
        void playAudiobook(item, serverId, options);
        return;
    }

    let resolvedStartIndex = options?.startIndex ?? 0;
    const itIsAudioBook = isAudiobookMediaItem(item);
    if (itIsAudioBook && options?.startIndex === undefined && (item as any).PartItems?.length > 0) {
        const activePartIdx = (item as any).PartItems.findIndex((p: BaseItemDto) => (p.UserData?.PlaybackPositionTicks || 0) > 0);
        if (activePartIdx >= 0) {
            resolvedStartIndex = activePartIdx;
        }
    }

    const itemsToPlay = targetItems.map(it => {
        const itemCopy = { ...it };
        if (!itemCopy.ServerId && serverId) {
            itemCopy.ServerId = serverId;
        }

        const isAudio = isAudiobookMediaItem(it);
        const isBk = isEbookMediaItem(it);

        if (isAudio && !it.IsFolder && it.Type !== BaseItemKind.Folder) {
            itemCopy.MediaType = 'Audio';
            itemCopy.Type = 'AudioBook';
        } else if (isBk && !it.IsFolder && it.Type !== BaseItemKind.Folder) {
            itemCopy.MediaType = 'Book';
            itemCopy.Type = 'Book';
        }
        return itemCopy;
    });
    const idsToPlay = itemsToPlay.map(i => i.Id).filter(Boolean);

    const activeItem = itemsToPlay[resolvedStartIndex] || item;
    const startTicks = options?.startPositionTicks !== undefined
        ? options.startPositionTicks
        : (activeItem.UserData?.PlaybackPositionTicks || item.UserData?.PlaybackPositionTicks || undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (playbackManager as any).play({
        items: itemsToPlay,
        ids: idsToPlay,
        serverId: serverId,
        shuffle: options?.shuffle,
        startIndex: resolvedStartIndex,
        startPositionTicks: startTicks,
        mediaSourceId: options?.mediaSourceId,
        audioStreamIndex: options?.audioStreamIndex,
        subtitleStreamIndex: options?.subtitleStreamIndex
    });

    if (itIsAudioBook) {
        setTimeout(() => {
            (appRouter as any).showNowPlaying();
        }, 150);
    }
}

type ItemWithParts = BaseItemDto & { PartItems?: BaseItemDto[] };

const getPartItems = (item: BaseItemDto) => (item as ItemWithParts).PartItems;

// Marks the start of a part suffix, e.g. "Part 3", "CD 2", "Disc 1", "Chapter 12"
const PART_MARKER = /\b(?:part|cd|disc|chapter|pt|ch|track) ?\d/i;
const SEPARATOR_CHARS = ' -–—:()[]';

const trimSeparators = (value: string) => {
    let startIndex = 0;
    let endIndex = value.length;
    while (startIndex < endIndex && SEPARATOR_CHARS.includes(value[startIndex])) startIndex++;
    while (endIndex > startIndex && SEPARATOR_CHARS.includes(value[endIndex - 1])) endIndex--;
    return value.slice(startIndex, endIndex);
};

/**
 * Book title without a part suffix, e.g. "Big Bad Wolf - Part 3" -> "Big Bad Wolf"
 */
export function getAudiobookTitle(item: BaseItemDto): string {
    // A book in several files: the server names the book on every part
    if (item.Type === BaseItemKind.AudioBook && item.Album) return item.Album;
    const name = item.Name || '';
    const marker = PART_MARKER.exec(name);
    if (!marker || marker.index === 0) return name;
    return trimSeparators(name.slice(0, marker.index)) || name;
}

/**
 * Short label for one part of a book, e.g. "Big Bad Wolf - Part 3" -> "Part 3"
 */
export function getAudiobookPartLabel(item: BaseItemDto, index: number): string {
    const name = item.Name || '';
    const title = getAudiobookTitle(item);
    // Parts with their own chapter names ("Part 1, Chapters 1 - 4") keep them
    if (!name.toLowerCase().startsWith(title.toLowerCase())) return name || `Part ${index + 1}`;
    const suffix = trimSeparators(name.slice(title.length));
    if (suffix) return suffix.charAt(0).toUpperCase() + suffix.slice(1);
    return name && name !== title ? name : `Part ${index + 1}`;
}

/**
 * Loads every part of the audiobook an item belongs to, in order. Parts are the audio files in the
 * book's folder; when one folder holds several books, only parts with the same title are kept.
 */
export async function getAudiobookParts(item: BaseItemDto, serverId?: string): Promise<BaseItemDto[]> {
    const partItems = getPartItems(item);
    const knownParts: BaseItemDto[] = partItems?.length ? partItems : [item];
    const parentId = item.IsFolder ? item.Id : item.ParentId;
    if (!parentId) return knownParts;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiClient = (ServerConnections as any).getApiClient(serverId) || (ServerConnections as any).currentApiClient();
    try {
        const result = await apiClient.getItems(apiClient.getCurrentUserId(), {
            ParentId: parentId,
            Recursive: Boolean(item.IsFolder),
            IncludeItemTypes: 'AudioBook,Audio',
            SortBy: 'ParentIndexNumber,IndexNumber,SortName',
            SortOrder: 'Ascending',
            Fields: 'Path,ParentId,PrimaryImageAspectRatio'
        });
        const siblings: BaseItemDto[] = result?.Items || [];
        if (item.IsFolder) return siblings.length ? siblings : knownParts;

        const title = getAudiobookTitle(item).toLowerCase();
        const sameBook = siblings.filter(part =>
            getAudiobookTitle(part).toLowerCase() === title || (item.Album && part.Album === item.Album));
        return sameBook.length ? sameBook : knownParts;
    } catch (err) {
        console.error('[playMediaItem] failed to load audiobook parts', err);
        return knownParts;
    }
}

/**
 * Where to start: the part that was clicked, or for a whole-book card / folder the part the
 * listener was last in, otherwise the first unfinished part.
 */
function getAudiobookStartIndex(item: BaseItemDto, parts: BaseItemDto[]): number {
    const isWholeBook = item.IsFolder || Boolean(getPartItems(item)?.length);
    if (!isWholeBook) {
        const clicked = parts.findIndex(part => part.Id === item.Id);
        if (clicked >= 0) return clicked;
    }

    let latestIndex = -1;
    let latestTime = 0;
    parts.forEach((part, index) => {
        if ((part.UserData?.PlaybackPositionTicks || 0) <= 0) return;
        const time = part.UserData?.LastPlayedDate ? new Date(part.UserData.LastPlayedDate).getTime() : 1;
        if (time >= latestTime) {
            latestTime = time;
            latestIndex = index;
        }
    });
    if (latestIndex >= 0) return latestIndex;

    const firstUnplayed = parts.findIndex(part => !part.UserData?.Played);
    return Math.max(firstUnplayed, 0);
}

async function playAudiobook(
    item: BaseItemDto,
    serverId: string | undefined,
    options?: { startPositionTicks?: number; shuffle?: boolean; startIndex?: number; items?: BaseItemDto[] }
) {
    const parts = await getAudiobookParts(item, serverId);
    const requested = options?.items?.[options.startIndex ?? 0];
    const requestedIndex = requested ? parts.findIndex(part => part.Id === requested.Id) : -1;
    const startIndex = requestedIndex >= 0 ? requestedIndex : getAudiobookStartIndex(item, parts);

    const itemsToPlay = parts.map(part => ({
        ...part,
        ServerId: part.ServerId || serverId,
        MediaType: 'Audio',
        Type: 'AudioBook'
    } as BaseItemDto));
    const startPart = itemsToPlay[startIndex];
    // A caller's start position belongs to the part it asked for; otherwise resume the chosen part itself
    const explicitTicks = requestedIndex >= 0 || startPart?.Id === item.Id ? options?.startPositionTicks : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (playbackManager as any).play({
        items: itemsToPlay,
        ids: itemsToPlay.map(part => part.Id),
        serverId,
        startIndex,
        startPositionTicks: explicitTicks ?? startPart?.UserData?.PlaybackPositionTicks ?? 0
    });

    setTimeout(() => {
        void appRouter.showNowPlaying();
    }, 150);
}

/**
 * Collapses multi-part books, audiobooks, and chapter files into single unified titles.
 * E.g. "Big Bad Wolf - Part 1" through "Part 7" -> 1 card "Big Bad Wolf"
 */
export function collapseBookParts(items: BaseItemDto[]): BaseItemDto[] {
    if (!items || items.length === 0) return [];

    const groups = new Map<string, BaseItemDto[]>();

    for (const item of items) {
        const typeStr = String(item.Type);
        if (typeStr === 'Folder' || typeStr === 'CollectionFolder' || typeStr === 'UserView') {
            continue;
        }

        const isAudio = item.Type === BaseItemKind.AudioBook || (item as any).MediaType === 'AudioBook' || (item as any).MediaType === 'Audio' || isAudiobookMediaItem(item);
        const isBook = item.Type === BaseItemKind.Book || (item as any).MediaType === 'Book' || isEbookMediaItem(item);

        if (!isAudio && !isBook) {
            // Non-literature item, keep unique
            groups.set(`item-${item.Id}`, [item]);
            continue;
        }

        // Parts the server knows belong to one book carry the book's name; group by that
        const rawName = (item.Type === BaseItemKind.AudioBook && item.Album) ? item.Album : (item.Name || '');
        // Strip part/chapter suffix like " - Part 1", " - CD 1", " - Pt 2", " Part 01", "(Part 1)", etc.
        const cleanName = rawName
            .replace(/\s*[-–—:]\s*(part|cd|disc|chapter|pt|ch|track)\s*\d+.*$/i, '')
            .replace(/\s*\((part|cd|disc|chapter|pt|ch|track)\s*\d+.*\)$/i, '')
            .replace(/\s+(part|cd|disc|chapter|pt|ch|track)\s*\d+.*$/i, '')
            .trim();

        // Unique book key: Group primarily by cleaned title + author/album
        const author = (item.AlbumArtist || item.Artists?.[0] || item.SeriesName || '').toLowerCase().trim();
        const album = (item.Album || '').toLowerCase().trim();
        const groupKey = cleanName
            ? `lit:${cleanName.toLowerCase()}:${author || album || item.ParentId || ''}`
            : (item.ParentId ? `parent:${item.ParentId}` : `item:${item.Id}`);

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(item);
    }

    const result: BaseItemDto[] = [];

    for (const [, partList] of groups.entries()) {
        if (partList.length === 1) {
            const only = partList[0];
            // Lists show a book in several files once (its first part); name it for the book
            result.push(only.Type === BaseItemKind.AudioBook && only.Album ? { ...only, Name: only.Album, SortName: only.Album } : only);
            continue;
        }

        // Multiple parts or formats for this single title
        // Sort parts: for ebooks, always prefer .epub over .mobi, then IndexNumber or Name
        partList.sort((a, b) => {
            // Prefer .epub over .mobi for ebooks
            const aEpub = a.Path?.toLowerCase().endsWith('.epub') || a.Container?.toLowerCase() === 'epub';
            const bEpub = b.Path?.toLowerCase().endsWith('.epub') || b.Container?.toLowerCase() === 'epub';
            if (aEpub && !bEpub) return -1;
            if (!aEpub && bEpub) return 1;
            if (a.IndexNumber != null && b.IndexNumber != null) {
                return a.IndexNumber - b.IndexNumber;
            }
            return (a.Name || '').localeCompare(b.Name || '', undefined, { numeric: true, sensitivity: 'base' });
        });

        // Representative item:
        // For ebooks, prioritize an epub part (with progress if available)
        const epubPart = partList.find(p => (p.Path?.toLowerCase().endsWith('.epub') || p.Container?.toLowerCase() === 'epub'));
        const inProgressEpub = partList.find(p => (p.UserData?.PlaybackPositionTicks || 0) > 0 && (p.Path?.toLowerCase().endsWith('.epub') || p.Container?.toLowerCase() === 'epub'));
        const inProgressPart = partList.find(p => (p.UserData?.PlaybackPositionTicks || 0) > 0);
        const primaryPart = inProgressEpub || epubPart || inProgressPart || partList[0];

        const rawName = (primaryPart.Type === BaseItemKind.AudioBook && primaryPart.Album) ? primaryPart.Album : (primaryPart.Name || '');
        const cleanName = rawName
            .replace(/\s*[-–—:]\s*(part|cd|disc|chapter|pt|ch|track)\s*\d+.*$/i, '')
            .replace(/\s*\((part|cd|disc|chapter|pt|ch|track)\s*\d+.*\)$/i, '')
            .replace(/\s+(part|cd|disc|chapter|pt|ch|track)\s*\d+.*$/i, '')
            .trim();

        // Calculate total runtime ticks across parts if available
        let totalRunTimeTicks = 0;
        let anyRunTime = false;
        for (const p of partList) {
            if (p.RunTimeTicks) {
                totalRunTimeTicks += p.RunTimeTicks;
                anyRunTime = true;
            }
        }

        // Merge all genres across parts
        const allGenres = new Set<string>();
        for (const p of partList) {
            if (p.Genres && Array.isArray(p.Genres)) {
                for (const g of p.Genres) {
                    if (g && g.trim()) allGenres.add(g.trim());
                }
            }
        }

        const consolidatedItem: BaseItemDto = {
            ...primaryPart,
            Name: cleanName || primaryPart.Name,
            SortName: cleanName || primaryPart.SortName,
            RunTimeTicks: anyRunTime ? totalRunTimeTicks : primaryPart.RunTimeTicks,
            ChildCount: partList.length,
            PartCount: partList.length,
            Genres: allGenres.size > 0 ? Array.from(allGenres) : primaryPart.Genres
        };

        // Attach part items array for playback/details reference
        (consolidatedItem as any).PartItems = partList;

        result.push(consolidatedItem);
    }

    return result;
}
