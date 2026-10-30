import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

/**
 * Views in the web app that we treat as UserViews.
 */
export const MetaView: Record<string, BaseItemDto> = {
    Favorites: {
        Id: 'favorites',
        Name: 'Favorites'
    }
};
