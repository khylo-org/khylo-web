import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

/**
 * The picture for a song, album, artist or playlist. A song has none of its own on most servers, so it uses its
 * album's cover: that is what keeps rows from showing empty tiles.
 */
export function musicArtUrl(api: Api | null | undefined, item: BaseItemDto | null | undefined, width = 400): string | null {
    if (!api || !item?.Id) return null;
    const base = api.basePath;
    if (item.ImageTags?.Primary) {
        return `${base}/Items/${item.Id}/Images/Primary?maxWidth=${width}&tag=${item.ImageTags.Primary}`;
    }
    if (item.AlbumId && item.AlbumPrimaryImageTag) {
        return `${base}/Items/${item.AlbumId}/Images/Primary?maxWidth=${width}&tag=${item.AlbumPrimaryImageTag}`;
    }
    if (item.ParentPrimaryImageItemId && item.ParentPrimaryImageTag) {
        return `${base}/Items/${item.ParentPrimaryImageItemId}/Images/Primary?maxWidth=${width}&tag=${item.ParentPrimaryImageTag}`;
    }
    // A song sent without a picture tag still shares its album's cover. If the album has none the server says so,
    // and the tile shows its quiet fallback instead.
    if (item.AlbumId) {
        return `${base}/Items/${item.AlbumId}/Images/Primary?maxWidth=${width}`;
    }
    return null;
}

/** A wide picture for a banner: the item's backdrop, or its parent's (an album uses its artist's). Null when there is none. */
export function musicBackdropUrl(api: Api | null | undefined, item: BaseItemDto | null | undefined, width = 1600): string | null {
    if (!api || !item?.Id) return null;
    const base = api.basePath;
    if (item.BackdropImageTags?.length) {
        return `${base}/Items/${item.Id}/Images/Backdrop/0?maxWidth=${width}&tag=${item.BackdropImageTags[0]}`;
    }
    if (item.ParentBackdropItemId && item.ParentBackdropImageTags?.length) {
        return `${base}/Items/${item.ParentBackdropItemId}/Images/Backdrop/0?maxWidth=${width}&tag=${item.ParentBackdropImageTags[0]}`;
    }
    return null;
}

/** "3:08" for a run time in ticks (a song's length). */
export function trackTime(ticks?: number | null): string {
    if (!ticks || ticks <= 0) return '';
    const total = Math.round(ticks / 10000000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** "28 min" / "1 hr 12 min" for a total run time in ticks. */
export function totalTime(ticks?: number | null): string {
    if (!ticks || ticks <= 0) return '';
    const minutes = Math.round(ticks / 10000000 / 60);
    if (minutes < 60) return `${Math.max(1, minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
