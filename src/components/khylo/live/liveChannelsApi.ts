import type { Api } from '@khylo/sdk';

export interface LiveChannelProgram {
    ItemId: string;
    Type: string;
    Name: string;
    SeriesName?: string | null;
    SeriesId?: string | null;
    SeasonNumber?: number | null;
    EpisodeNumber?: number | null;
    ProductionYear?: number | null;
    OfficialRating?: string | null;
    Overview?: string | null;
    StartUtc: string;
    EndUtc: string;
}

export interface LiveChannel {
    Id: string;
    /** Built-in channel key, e.g. "horror-movies" or "network:nbc". */
    Key?: string | null;
    Number: number;
    Name: string;
    /** Guide category: TV, Movies, Networks or Collections. */
    Category: string;
    Description: string;
    Programs: LiveChannelProgram[];
}

export interface LiveChannelTitle {
    ItemId: string;
    Type: string;
    Name: string;
    ProductionYear?: number | null;
}

export interface LiveChannelDetails {
    Channel: LiveChannel;
    Titles: LiveChannelTitle[];
    TitleCount: number;
}

export interface LiveChannelTuneResult {
    Channel: LiveChannel;
    Current?: LiveChannelProgram | null;
    StartPositionTicks: number;
    UpNext: LiveChannelProgram[];
    ServerTimeUtc: string;
}

// The full authorization header (not just the token) identifies this device, which the server
// needs to keep channel playback out of the user's watch progress.
const authHeaders = (api: Api) => ({ Authorization: api.authorizationHeader });

export async function getLiveGuide(api: Api, startTime: Date, hours: number): Promise<LiveChannel[]> {
    const response = await api.axiosInstance.get<LiveChannel[]>(`${api.basePath}/LiveChannels/Guide`, {
        headers: authHeaders(api),
        params: { startTime: startTime.toISOString(), hours }
    });
    return response.data;
}

export async function getLiveChannelDetails(api: Api, channelId: string, hours = 12): Promise<LiveChannelDetails> {
    const response = await api.axiosInstance.get<LiveChannelDetails>(`${api.basePath}/LiveChannels/${channelId}`, {
        headers: authHeaders(api),
        params: { hours }
    });
    return response.data;
}

export async function tuneLiveChannel(api: Api, channelId: string): Promise<LiveChannelTuneResult> {
    const response = await api.axiosInstance.post<LiveChannelTuneResult>(
        `${api.basePath}/LiveChannels/${channelId}/Tune`,
        null,
        { headers: authHeaders(api) }
    );
    return response.data;
}

export async function leaveLiveChannels(api: Api): Promise<void> {
    await api.axiosInstance.post(`${api.basePath}/LiveChannels/Leave`, null, { headers: authHeaders(api) });
}

/** Program title for display: the show for episodes, otherwise the item name. */
export const getProgramTitle = (program: LiveChannelProgram) => program.SeriesName || program.Name;

/** Secondary line: "S2 · E5 · Episode name" for episodes, the year for movies. */
export function getProgramSubtitle(program: LiveChannelProgram): string {
    if (program.SeriesName) {
        const parts: string[] = [];
        if (program.SeasonNumber != null) parts.push(`S${program.SeasonNumber}`);
        if (program.EpisodeNumber != null) parts.push(`E${program.EpisodeNumber}`);
        parts.push(program.Name);
        return parts.join(' · ');
    }
    return program.ProductionYear ? String(program.ProductionYear) : '';
}

export const formatClockTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function getProgramImageUrl(api: Api | undefined, program: LiveChannelProgram, maxWidth = 960): string | null {
    if (!api) return null;
    const imageItemId = program.SeriesId || program.ItemId;
    return `${api.basePath}/Items/${imageItemId}/Images/Backdrop/0?maxWidth=${maxWidth}`;
}

/** The show's (or movie's) logo, for the hero title. */
export function getProgramLogoUrl(api: Api | undefined, program: LiveChannelProgram, maxWidth = 600): string | null {
    if (!api) return null;
    return `${api.basePath}/Items/${program.SeriesId || program.ItemId}/Images/Logo?maxWidth=${maxWidth}`;
}

/** A small landscape image for guide rows: the episode still, or the movie's backdrop. */
export function getProgramThumbUrl(api: Api | undefined, program: LiveChannelProgram, maxWidth = 240): string | null {
    if (!api) return null;
    if (program.SeriesId) return `${api.basePath}/Items/${program.ItemId}/Images/Primary?maxWidth=${maxWidth}`;
    return `${api.basePath}/Items/${program.ItemId}/Images/Backdrop/0?maxWidth=${maxWidth}`;
}

export function getPosterUrl(api: Api | undefined, itemId: string, maxHeight = 360): string | null {
    if (!api) return null;
    return `${api.basePath}/Items/${itemId}/Images/Primary?maxHeight=${maxHeight}`;
}

/** Whether an administrator has Live Channels turned on for the server. */
export async function getLiveChannelsEnabled(api: Api): Promise<boolean> {
    const response = await api.axiosInstance.get<{ Enabled: boolean }>(`${api.basePath}/LiveChannels/Status`, {
        headers: authHeaders(api)
    });
    return response.data.Enabled;
}
