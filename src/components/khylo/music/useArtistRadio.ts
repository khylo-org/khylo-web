import { useCallback, useState } from 'react';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import { useApi } from 'hooks/useApi';
import { startArtistRadio } from './khyloRadio';
import { showMusicToast } from './musicUi';

/**
 * Starts Artist Radio for an artist. `busy` is true while the station is being put together (a second or two on a big
 * library), so the button can say so. If there is nothing to play, a message says so.
 */
export function useArtistRadio() {
    const { api, user } = useApi();
    const [ busy, setBusy ] = useState(false);

    const start = useCallback(async (artist?: BaseItemDto | null) => {
        if (!artist?.Id || busy) return;
        setBusy(true);
        try {
            const started = await startArtistRadio(api, user?.Id, artist);
            if (!started) showMusicToast(`There are no songs to build ${artist.Name ?? 'this'} radio from yet.`, 'error');
        } catch {
            showMusicToast('Artist Radio could not start. Check the connection and try again.', 'error');
        } finally {
            setBusy(false);
        }
    }, [ api, user?.Id, busy ]);

    return { start, busy };
}
