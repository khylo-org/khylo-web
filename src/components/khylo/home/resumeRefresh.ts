import type { QueryKey } from '@tanstack/react-query';

import { playbackManager } from 'components/playback/playbackmanager';
import Events from 'utils/events';
import { queryClient } from 'utils/query/queryClient';

/**
 * Query keys whose data depends on playback progress (resume position, next up, history).
 * Matched by prefix, e.g. ['KhyloHome', 'Resume'] matches ['KhyloHome', 'Resume', userId].
 */
const PROGRESS_QUERY_PREFIXES: QueryKey[] = [
    ['KhyloHome', 'Resume'],
    ['KhyloHome', 'NextUp'],
    ['KhyloHome', 'Books'],
    ['KhyloHistory'],
    ['KhyloLibraryContinue'],
    ['KhyloItemDetails'],
    ['KhyloSeriesNextUp'],
    ['KhyloSeasonEpisodes']
];

// The stop report is sent to the server without waiting, so refresh once shortly after it
// and once more in case the server took a moment to persist the position.
const REFRESH_DELAYS_MS = [750, 3000];

const isProgressQuery = (queryKey: QueryKey) => PROGRESS_QUERY_PREFIXES.some(
    prefix => prefix.every((part, index) => queryKey[index] === part)
);

const refreshProgressQueries = () => {
    for (const delay of REFRESH_DELAYS_MS) {
        setTimeout(() => {
            void queryClient.invalidateQueries({ predicate: query => isProgressQuery(query.queryKey) });
        }, delay);
    }
};

let isBound = false;

/**
 * Refreshes "Continue Watching/Listening/Reading" and related rows whenever playback stops, so they are
 * up to date as soon as the user returns to the home or library screens (instead of after the cache expires).
 * Safe to call multiple times.
 */
export function bindResumeRefreshOnPlaybackStop() {
    if (isBound) return;
    isBound = true;
    Events.on(playbackManager, 'playbackstop', refreshProgressQueries);
}
