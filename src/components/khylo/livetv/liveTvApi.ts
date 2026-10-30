import type { Api } from '@khylo/sdk';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@khylo/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import type { TimerInfoDto } from '@khylo/sdk/lib/generated-client/models/timer-info-dto';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { getUserDataApi } from '@khylo/sdk/lib/utils/api/user-data-api';

/** The channel categories viewers can filter the guide by. */
export type LiveTvCategory = 'all' | 'favorites' | 'movies' | 'sports' | 'kids' | 'news';

export const LIVE_TV_CATEGORIES: { id: LiveTvCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'movies', label: 'Movies' },
    { id: 'sports', label: 'Sports' },
    { id: 'kids', label: 'Kids' },
    { id: 'news', label: 'News' }
];

export interface ChannelPage {
    items: BaseItemDto[];
    total: number;
}

/**
 * The first `limit` channels in a category, or channels matching a search. Big IPTV lineups have
 * thousands of channels, so the server returns them a page at a time.
 */
export async function getChannels(api: Api, userId: string, category: LiveTvCategory, limit: number, search: string): Promise<ChannelPage> {
    if (search) {
        const response = await getLibraryApi(api).getItems({
            userId,
            searchTerm: search,
            includeItemTypes: [BaseItemKind.TvChannel],
            recursive: true,
            limit,
            enableImages: true,
            imageTypeLimit: 1,
            enableImageTypes: [ImageType.Primary],
            enableUserData: true
        });
        return { items: response.data.Items ?? [], total: response.data.TotalRecordCount ?? 0 };
    }

    const response = await getLiveTvApi(api).getLiveTvChannels({
        userId,
        startIndex: 0,
        limit,
        enableImages: true,
        imageTypeLimit: 1,
        enableImageTypes: [ImageType.Primary],
        enableUserData: true,
        enableFavoriteSorting: true,
        sortBy: [ItemSortBy.SortName],
        isFavorite: category === 'favorites' ? true : undefined,
        isMovie: category === 'movies' ? true : undefined,
        isSports: category === 'sports' ? true : undefined,
        isKids: category === 'kids' ? true : undefined,
        isNews: category === 'news' ? true : undefined
    });
    return { items: response.data.Items ?? [], total: response.data.TotalRecordCount ?? 0 };
}

/** Programs on the given channels that overlap a time window. */
export async function getPrograms(api: Api, userId: string, channelIds: string[], start: Date, end: Date): Promise<BaseItemDto[]> {
    if (channelIds.length === 0) return [];
    const response = await getLiveTvApi(api).getPrograms({
        getProgramsDto: {
            UserId: userId,
            ChannelIds: channelIds,
            MinEndDate: start.toISOString(),
            MaxStartDate: end.toISOString(),
            SortBy: [ItemSortBy.StartDate],
            EnableImages: true,
            ImageTypeLimit: 1,
            EnableImageTypes: [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ],
            Fields: [ ItemFields.Overview, ItemFields.ChannelInfo ],
            EnableTotalRecordCount: false
        }
    });
    return response.data.Items ?? [];
}

export async function setChannelFavorite(api: Api, userId: string, channelId: string, isFavorite: boolean): Promise<void> {
    const userDataApi = getUserDataApi(api);
    if (isFavorite) {
        await userDataApi.markFavoriteItem({ userId, itemId: channelId });
    } else {
        await userDataApi.unmarkFavoriteItem({ userId, itemId: channelId });
    }
}

/** Schedules a recording of one airing, or every airing of the show when `wholeSeries`. */
export async function recordProgram(api: Api, programId: string, wholeSeries: boolean): Promise<void> {
    const liveTvApi = getLiveTvApi(api);
    const defaults = (await liveTvApi.getDefaultTimer({ programId })).data;
    if (wholeSeries) {
        await liveTvApi.createSeriesTimer({ seriesTimerInfoDto: defaults });
    } else {
        await liveTvApi.createTimer({ timerInfoDto: defaults as TimerInfoDto });
    }
}

export async function cancelRecording(api: Api, timerId: string): Promise<void> {
    await getLiveTvApi(api).cancelTimer({ timerId });
}

export async function cancelSeriesRecording(api: Api, seriesTimerId: string): Promise<void> {
    await getLiveTvApi(api).cancelSeriesTimer({ timerId: seriesTimerId });
}

export const formatClock = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

export const formatDayAndTime = (iso?: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86_400_000);
    let day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    if (date.toDateString() === today.toDateString()) day = 'Today';
    else if (date.toDateString() === tomorrow.toDateString()) day = 'Tomorrow';
    return `${day} · ${formatClock(iso)}`;
};

/** "S2 · E5 · Episode name" for episodes; the year for movies. */
export function getProgramSubtitle(program: BaseItemDto): string {
    if (program.EpisodeTitle) {
        const parts: string[] = [];
        if (program.ParentIndexNumber != null) parts.push(`S${program.ParentIndexNumber}`);
        if (program.IndexNumber != null) parts.push(`E${program.IndexNumber}`);
        parts.push(program.EpisodeTitle);
        return parts.join(' · ');
    }
    return program.IsMovie && program.ProductionYear ? String(program.ProductionYear) : '';
}

/** Program artwork if the guide has any, else the channel's logo. */
export function getProgramImageUrl(api: Api | undefined, program: BaseItemDto | undefined, maxWidth = 1280): string | null {
    if (!api || !program?.Id) return null;
    const tags = program.ImageTags ?? {};
    if (tags.Thumb) return `${api.basePath}/Items/${program.Id}/Images/Thumb?maxWidth=${maxWidth}&tag=${tags.Thumb}`;
    if (program.BackdropImageTags?.length) return `${api.basePath}/Items/${program.Id}/Images/Backdrop/0?maxWidth=${maxWidth}&tag=${program.BackdropImageTags[0]}`;
    if (tags.Primary) return `${api.basePath}/Items/${program.Id}/Images/Primary?maxWidth=${maxWidth}&tag=${tags.Primary}`;
    return null;
}

export function getChannelLogoUrl(api: Api | undefined, channel: BaseItemDto | undefined, maxHeight = 96): string | null {
    if (!api || !channel?.Id || !channel.ImageTags?.Primary) return null;
    return `${api.basePath}/Items/${channel.Id}/Images/Primary?maxHeight=${maxHeight}&tag=${channel.ImageTags.Primary}`;
}

export const isAiring = (program: BaseItemDto, now: number) =>
    Date.parse(program.StartDate ?? '') <= now && Date.parse(program.EndDate ?? '') > now;
