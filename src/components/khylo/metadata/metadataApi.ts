import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@khylo/sdk/lib/generated-client/models/image-type';
import { MetadataField } from '@khylo/sdk/lib/generated-client/models/metadata-field';
import { MetadataRefreshMode } from '@khylo/sdk/lib/generated-client/models/metadata-refresh-mode';
import type { RemoteImageInfo } from '@khylo/sdk/lib/generated-client/models/remote-image-info';
import type { RemoteSearchResult } from '@khylo/sdk/lib/generated-client/models/remote-search-result';
import { getItemLookupApi } from '@khylo/sdk/lib/utils/api/item-lookup-api';
import { getItemUpdateApi } from '@khylo/sdk/lib/utils/api/item-update-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getRemoteImageApi } from '@khylo/sdk/lib/utils/api/remote-image-api';
import { getImageApi } from '@khylo/sdk/lib/utils/api/image-api';

/** The editable details, as shown in the form. */
export interface MetadataForm {
    name: string;
    sortName: string;
    originalTitle: string;
    year: string;
    officialRating: string;
    tagline: string;
    overview: string;
    genres: string;
}

export const toForm = (item: BaseItemDto): MetadataForm => ({
    name: item.Name ?? '',
    sortName: item.ForcedSortName ?? item.SortName ?? '',
    originalTitle: item.OriginalTitle ?? '',
    year: item.ProductionYear ? String(item.ProductionYear) : '',
    officialRating: item.OfficialRating ?? '',
    tagline: item.Taglines?.[0] ?? '',
    overview: item.Overview ?? '',
    genres: (item.Genres ?? []).join(', ')
});

export async function getFullItem(api: Api, userId: string, itemId: string): Promise<BaseItemDto> {
    return (await getLibraryApi(api).getItem({ itemId, userId })).data;
}

/**
 * Saves the details. Fields that were changed are locked, like Plex does, so a later metadata
 * refresh doesn't put the provider's version back.
 */
export async function saveDetails(api: Api, item: BaseItemDto, before: MetadataForm, form: MetadataForm): Promise<void> {
    const genres = form.genres.split(',').map(g => g.trim()).filter(Boolean);
    const locked = new Set(item.LockedFields ?? []);
    if (form.name !== before.name) locked.add(MetadataField.Name);
    if (form.overview !== before.overview) locked.add(MetadataField.Overview);
    if (form.genres !== before.genres) locked.add(MetadataField.Genres);
    if (form.officialRating !== before.officialRating) locked.add(MetadataField.OfficialRating);

    const year = parseInt(form.year, 10);
    await getItemUpdateApi(api).updateItem({
        itemId: item.Id!,
        baseItemDto: {
            ...item,
            Name: form.name.trim(),
            ForcedSortName: form.sortName.trim() && form.sortName.trim() !== form.name.trim() ? form.sortName.trim() : null,
            OriginalTitle: form.originalTitle.trim() || null,
            ProductionYear: Number.isFinite(year) ? year : null,
            OfficialRating: form.officialRating.trim() || null,
            Taglines: form.tagline.trim() ? [form.tagline.trim()] : [],
            Overview: form.overview.trim() || null,
            Genres: genres,
            LockedFields: [...locked]
        }
    });
}

/** Which artwork slots an item has, with friendly names. */
export function getArtworkSlots(item: BaseItemDto): { type: ImageType; label: string; wide: boolean }[] {
    const isVideoTitle = item.Type === BaseItemKind.Movie || item.Type === BaseItemKind.Series || item.Type === BaseItemKind.BoxSet
        || item.Type === BaseItemKind.Season || item.Type === BaseItemKind.MusicVideo || item.Type === BaseItemKind.Video;
    const isEpisode = item.Type === BaseItemKind.Episode;
    const isMusic = item.Type === BaseItemKind.MusicAlbum || item.Type === BaseItemKind.Audio;

    const slots: { type: ImageType; label: string; wide: boolean }[] = [
        { type: ImageType.Primary, label: (isEpisode && 'Thumbnail') || (isMusic && 'Album cover') || 'Poster', wide: isEpisode }
    ];
    if (isVideoTitle || item.Type === BaseItemKind.MusicArtist) {
        slots.push({ type: ImageType.Backdrop, label: 'Background', wide: true });
    }
    if (isVideoTitle) {
        slots.push({ type: ImageType.Logo, label: 'Title logo', wide: true });
    }
    return slots;
}

export async function getRemoteImages(api: Api, itemId: string, type: ImageType): Promise<RemoteImageInfo[]> {
    const response = await getRemoteImageApi(api).getRemoteImages({ itemId, type, limit: 60, includeAllLanguages: false });
    return response.data.Images ?? [];
}

export async function chooseRemoteImage(api: Api, itemId: string, type: ImageType, imageUrl: string): Promise<void> {
    await getRemoteImageApi(api).downloadRemoteImage({ itemId, type, imageUrl });
}

/** Uploads an image file. The server takes the image as base64 text with the image's type. */
export async function uploadImage(api: Api, itemId: string, type: ImageType, file: File): Promise<void> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
        reader.readAsDataURL(file);
    });
    await api.axiosInstance.post(
        `${api.basePath}/Items/${itemId}/Images/${type}`,
        dataUrl.slice(dataUrl.indexOf(',') + 1),
        { headers: { Authorization: api.authorizationHeader, 'Content-Type': file.type } }
    );
}

export async function removeImage(api: Api, itemId: string, type: ImageType): Promise<void> {
    await getImageApi(api).deleteItemImage({ itemId, imageType: type, imageIndex: 0 });
}

/** The current image of a slot, or null; `version` busts the browser cache after a change. */
export function getCurrentImageUrl(api: Api, item: BaseItemDto, type: ImageType, version: number): string | null {
    const hasImage = type === ImageType.Backdrop ? Boolean(item.BackdropImageTags?.length) : Boolean(item.ImageTags?.[type]);
    if (!hasImage || !item.Id) return null;
    const suffix = type === ImageType.Backdrop ? '/0' : '';
    return `${api.basePath}/Items/${item.Id}/Images/${type}${suffix}?maxWidth=600&v=${version}`;
}

/** Item types the providers can search for a correct match. */
const SEARCH_TYPES: Partial<Record<BaseItemKind, string>> = {
    [BaseItemKind.Movie]: 'Movie',
    [BaseItemKind.Series]: 'Series',
    [BaseItemKind.BoxSet]: 'BoxSet',
    [BaseItemKind.MusicAlbum]: 'MusicAlbum',
    [BaseItemKind.MusicArtist]: 'MusicArtist',
    [BaseItemKind.MusicVideo]: 'MusicVideo',
    [BaseItemKind.Book]: 'Book',
    [BaseItemKind.AudioBook]: 'Book',
    // Khylo's own item type for podcasts; not in the SDK's list, so it is keyed by its name
    ['Podcast' as BaseItemKind]: 'Podcast',
    [BaseItemKind.Trailer]: 'Trailer'
};

export const canFixMatch = (item: BaseItemDto) => Boolean(item.Type && SEARCH_TYPES[item.Type]);

export async function searchMatches(api: Api, item: BaseItemDto, name: string, year: string): Promise<RemoteSearchResult[]> {
    const searchType = item.Type ? SEARCH_TYPES[item.Type] : undefined;
    if (!searchType) return [];
    const parsedYear = parseInt(year, 10);
    const response = await api.axiosInstance.post<RemoteSearchResult[]>(
        `${api.basePath}/Items/RemoteSearch/${searchType}`,
        {
            ItemId: item.Id,
            SearchInfo: { Name: name, Year: Number.isFinite(parsedYear) ? parsedYear : undefined },
            IncludeDisabledProviders: true
        },
        { headers: { Authorization: api.authorizationHeader } }
    );
    return response.data;
}

/** Re-matches the item to a search result, replacing its metadata and artwork. */
export async function applyMatch(api: Api, itemId: string, result: RemoteSearchResult): Promise<void> {
    await getItemLookupApi(api).applySearchCriteria({ itemId, remoteSearchResult: result, replaceAllImages: true });
}

/** Downloads fresh metadata and artwork from the providers. Locked fields are kept. */
export async function refreshMetadata(api: Api, itemId: string): Promise<void> {
    await getLibraryApi(api).refreshItem({
        itemId,
        metadataRefreshMode: MetadataRefreshMode.FullRefresh,
        imageRefreshMode: MetadataRefreshMode.FullRefresh,
        replaceAllMetadata: true,
        replaceAllImages: false
    });
}

// Any card or page can ask for the editor; the app shell hosts it
const OPEN_EVENT = 'khylo:edit-metadata';

export function openMetadataEditor(itemId: string): void {
    window.dispatchEvent(new CustomEvent<string>(OPEN_EVENT, { detail: itemId }));
}

export function onOpenMetadataEditor(handler: (itemId: string) => void): () => void {
    const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
    window.addEventListener(OPEN_EVENT, listener);
    return () => window.removeEventListener(OPEN_EVENT, listener);
}
