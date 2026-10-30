import type { Api } from '@khylo/sdk';
import type { TunerHostInfo } from '@khylo/sdk/lib/generated-client/models/tuner-host-info';

/** A tuner with Khylo's channel selection (not in the SDK's generated types). */
export type SelectableTunerHost = TunerHostInfo & {
    EnableChannelSelection?: boolean;
    IncludedGroups?: string[] | null;
    IncludedChannels?: string[] | null;
    ExcludedChannels?: string[] | null;
};

/** One entry of a tuner's playlist (from LiveTv/TunerHosts/{id}/Playlist). */
export interface PlaylistChannel {
    Id: string;
    Name: string;
    Number?: string | null;
    Group: string;
    LogoUrl?: string | null;
    Kind: 'Live' | 'OnDemand' | 'Adult';
    IsIncluded: boolean;
}

/** A playlist group from the server: on-demand groups come with a count only. */
export interface PlaylistGroupInfo {
    Name: string;
    Kind: 'Live' | 'OnDemand' | 'Adult';
    ChannelCount: number;
}

export interface PlaylistInfo {
    Groups: PlaylistGroupInfo[];
    Channels: PlaylistChannel[];
    TotalCount: number;
}

export interface PlaylistGroup {
    /** Lowercased group name; groups match case-insensitively on the server. */
    key: string;
    name: string;
    kind: PlaylistGroupInfo['Kind'];
    count: number;
    /** Empty for on-demand groups, which can only be picked as a whole. */
    channels: PlaylistChannel[];
}

/** What's picked: whole groups, plus single channels added or removed by hand. */
export interface Selection {
    groups: Set<string>;
    included: Set<string>;
    excluded: Set<string>;
}

const groupKey = (channel: PlaylistChannel) => channel.Group.toLowerCase();

/** Above this many channels the guide gets slow and big, so the picker says so. */
export const LARGE_LINEUP = 3000;

/** Badge color for a lineup of this many channels. */
export function getLineupColor(count: number): 'healthy' | 'warning' | 'idle' {
    if (count > LARGE_LINEUP) return 'warning';
    return count > 0 ? 'healthy' : 'idle';
}

export const EMPTY_SELECTION: Selection = { groups: new Set(), included: new Set(), excluded: new Set() };

export async function getPlaylist(api: Api, tunerId: string): Promise<PlaylistInfo> {
    const response = await api.axiosInstance.get<PlaylistInfo>(
        `${api.basePath}/LiveTv/TunerHosts/${encodeURIComponent(tunerId)}/Playlist`,
        { headers: { Authorization: api.authorizationHeader } }
    );
    return response.data;
}

/**
 * The playlist's groups with their channels. Groups made mostly of on-demand titles or adult
 * channels are set apart, since they're rarely wanted in a TV guide.
 */
export function groupChannels(playlist: PlaylistInfo | undefined): { live: PlaylistGroup[]; other: PlaylistGroup[] } {
    const byKey = new Map<string, PlaylistGroup>();
    for (const info of playlist?.Groups ?? []) {
        byKey.set(info.Name.toLowerCase(), { key: info.Name.toLowerCase(), name: info.Name, kind: info.Kind, count: info.ChannelCount, channels: [] });
    }
    for (const channel of playlist?.Channels ?? []) {
        byKey.get(groupKey(channel))?.channels.push(channel);
    }

    const live: PlaylistGroup[] = [];
    const other: PlaylistGroup[] = [];
    for (const group of byKey.values()) {
        (group.kind === 'Live' ? live : other).push(group);
    }
    return { live, other };
}

export const isChannelSelected = (channel: PlaylistChannel, selection: Selection) =>
    selection.included.has(channel.Id) || (selection.groups.has(groupKey(channel)) && !selection.excluded.has(channel.Id));

export function getGroupState(group: PlaylistGroup, selection: Selection): 'all' | 'some' | 'none' {
    if (selection.groups.has(group.key)) {
        return group.channels.some(c => selection.excluded.has(c.Id)) ? 'some' : 'all';
    }
    return group.channels.some(c => selection.included.has(c.Id)) ? 'some' : 'none';
}

/** Turns a whole group on or off, clearing any single-channel picks inside it. */
export function toggleGroup(group: PlaylistGroup, selection: Selection, on: boolean): Selection {
    const groups = new Set(selection.groups);
    const included = new Set(selection.included);
    const excluded = new Set(selection.excluded);
    if (on) {
        groups.add(group.key);
    } else {
        groups.delete(group.key);
    }
    for (const channel of group.channels) {
        included.delete(channel.Id);
        excluded.delete(channel.Id);
    }
    return { groups, included, excluded };
}

export function toggleChannel(channel: PlaylistChannel, selection: Selection): Selection {
    const included = new Set(selection.included);
    const excluded = new Set(selection.excluded);
    if (selection.groups.has(groupKey(channel))) {
        if (excluded.has(channel.Id)) {
            excluded.delete(channel.Id);
        } else {
            excluded.add(channel.Id);
        }
    } else if (included.has(channel.Id)) {
        included.delete(channel.Id);
    } else {
        included.add(channel.Id);
    }
    return { groups: selection.groups, included, excluded };
}

/** How many entries are picked, counting on-demand groups by size. */
export function countSelected(groups: PlaylistGroup[], selection: Selection): number {
    let count = 0;
    for (const group of groups) {
        if (group.channels.length === 0) {
            count += selection.groups.has(group.key) ? group.count : 0;
        } else {
            for (const channel of group.channels) {
                if (isChannelSelected(channel, selection)) count++;
            }
        }
    }
    return count;
}

/** The selection the way the server stores it on the tuner. */
export function toSelectionBody(playlist: PlaylistInfo, selection: Selection) {
    // The server keeps group names as the provider writes them
    const names = new Map(playlist.Groups.map(g => [ g.Name.toLowerCase(), g.Name ]));
    const channels = playlist.Channels;
    const inGroup = (c: PlaylistChannel) => selection.groups.has(groupKey(c));

    return {
        EnableChannelSelection: true,
        IncludedGroups: [...selection.groups].map(key => names.get(key) ?? key),
        IncludedChannels: channels.filter(c => selection.included.has(c.Id) && !inGroup(c)).map(c => c.Id),
        ExcludedChannels: channels.filter(c => selection.excluded.has(c.Id) && inGroup(c)).map(c => c.Id)
    };
}

/** Saves the selection; the server then re-imports the channels and refreshes the guide. */
export async function saveSelection(api: Api, tunerId: string, playlist: PlaylistInfo, selection: Selection): Promise<void> {
    await api.axiosInstance.post(
        `${api.basePath}/LiveTv/TunerHosts/${encodeURIComponent(tunerId)}/ChannelSelection`,
        toSelectionBody(playlist, selection),
        { headers: { Authorization: api.authorizationHeader } }
    );
}

/**
 * Downloads the playlist of a tuner that hasn't been added yet. Resolves with the server's
 * reason when the playlist can't be read.
 */
export async function testPlaylist(api: Api, tuner: TunerHostInfo): Promise<PlaylistInfo> {
    const response = await api.axiosInstance.post<PlaylistInfo>(
        `${api.basePath}/LiveTv/TunerHosts/TestPlaylist`,
        tuner,
        { headers: { Authorization: api.authorizationHeader } }
    );
    return response.data;
}
