/**
 * Restrictions on how the viewer can move through playback. Used by Khylo live channels, where the
 * viewer can pause and rewind but never get ahead of the broadcast: no seeking past the live point,
 * no skipping to another program, no chapter or intro skips.
 */
export interface PlaybackNavigationPolicy {
    /**
     * The furthest position (ticks) the viewer may seek to in the given item, or null for no limit.
     */
    getMaxSeekTicks(itemId: string | undefined): number | null;
}

let activePolicy: PlaybackNavigationPolicy | null = null;

export function setPlaybackNavigationPolicy(policy: PlaybackNavigationPolicy | null) {
    activePolicy = policy;
}

export function getPlaybackNavigationPolicy(): PlaybackNavigationPolicy | null {
    return activePolicy;
}

/** True while viewers may not skip between items, chapters or segments. */
export function isPlaybackNavigationLocked(): boolean {
    return activePolicy !== null;
}
