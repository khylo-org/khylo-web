import { useCallback, useState } from 'react';

import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { getUserDataApi } from '@khylo/sdk/lib/utils/api/user-data-api';

import { useApi } from 'hooks/useApi';

export interface Favorites {
    isFavorite: (item: BaseItemDto) => boolean;
    toggle: (item: BaseItemDto) => Promise<void>;
}

/** Hearts for songs, albums and artists: the change shows at once and is put back if the server refuses it. */
export function useFavorites(): Favorites {
    const { api, user } = useApi();
    const userId = user?.Id;
    const [ overrides, setOverrides ] = useState<Record<string, boolean>>({});

    const isFavorite = useCallback((item: BaseItemDto) => {
        const id = item.Id;
        if (id && id in overrides) return overrides[id];
        return Boolean(item.UserData?.IsFavorite);
    }, [ overrides ]);

    const toggle = useCallback(async (item: BaseItemDto) => {
        const id = item.Id;
        if (!api || !userId || !id) return;
        const now = id in overrides ? overrides[id] : Boolean(item.UserData?.IsFavorite);
        setOverrides(prev => ({ ...prev, [id]: !now }));
        try {
            if (now) await getUserDataApi(api).unmarkFavoriteItem({ userId, itemId: id });
            else await getUserDataApi(api).markFavoriteItem({ userId, itemId: id });
        } catch {
            setOverrides(prev => ({ ...prev, [id]: now }));
        }
    }, [ api, userId, overrides ]);

    return { isFavorite, toggle };
}
