import type { Api } from '@khylo/sdk';

/** A collection the current user can add to. */
export interface EditableCollection {
    Id: string;
    Name: string;
    /** Made automatically from franchise metadata, with no owner, so everyone sees it. */
    IsShared: boolean;
    ItemCount: number;
    /** The item asked about is already in it. */
    ContainsItem: boolean;
}

/** Query keys to refresh after a collection changes. */
export const COLLECTION_QUERY_KEYS = [
    'KhyloEditableCollections',
    'KhyloLibraryAllItems',
    'KhyloCollectionChildren',
    'KhyloItemDetails'
];

const headers = (api: Api) => ({ Authorization: api.authorizationHeader });

export async function getEditableCollections(api: Api, itemId?: string): Promise<EditableCollection[]> {
    const response = await api.axiosInstance.get<EditableCollection[]>(`${api.basePath}/Collections/Editable`, {
        headers: headers(api),
        params: itemId ? { itemId } : undefined
    });
    return response.data;
}

/** Creates a collection belonging to the current user; only they see it. */
export async function createCollection(api: Api, name: string, itemIds: string[]): Promise<string> {
    const response = await api.axiosInstance.post<{ Id: string }>(`${api.basePath}/Collections`, null, {
        headers: headers(api),
        params: { name, ids: itemIds.length ? itemIds.join(',') : undefined }
    });
    return response.data.Id;
}

export async function addToCollection(api: Api, collectionId: string, itemIds: string[]): Promise<void> {
    await api.axiosInstance.post(`${api.basePath}/Collections/${collectionId}/Items`, null, {
        headers: headers(api),
        params: { ids: itemIds.join(',') }
    });
}

export async function removeFromCollection(api: Api, collectionId: string, itemIds: string[]): Promise<void> {
    await api.axiosInstance.delete(`${api.basePath}/Collections/${collectionId}/Items`, {
        headers: headers(api),
        params: { ids: itemIds.join(',') }
    });
}

export async function renameCollection(api: Api, collectionId: string, name: string): Promise<void> {
    await api.axiosInstance.post(`${api.basePath}/Collections/${collectionId}/Name`, null, {
        headers: headers(api),
        params: { name }
    });
}

/** Deletes the collection itself; the titles in it stay in the library. */
export async function deleteCollection(api: Api, collectionId: string): Promise<void> {
    await api.axiosInstance.delete(`${api.basePath}/Items/${collectionId}`, { headers: headers(api) });
}
