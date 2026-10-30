import type { Api } from '@khylo/sdk';
import type { VirtualFolderInfo } from '@khylo/sdk/lib/generated-client/models/virtual-folder-info';
import { getLibraryStructureApi } from '@khylo/sdk/lib/utils/api/library-structure-api';
import axios from 'axios';

/**
 * A library's name as the server has it right now. Renaming a library moves its folder and gives it a new id,
 * so a page opened before a rename can hold an old name; asking for the current one first keeps deletes and
 * edits from failing with "does not exist". Matches by id, then by name, then by the folders it holds.
 */
export async function getCurrentLibrary(api: Api, library: Pick<VirtualFolderInfo, 'ItemId' | 'Name' | 'Locations'>): Promise<VirtualFolderInfo | undefined> {
    const folders = (await getLibraryStructureApi(api).getVirtualFolders()).data ?? [];
    return folders.find(f => library.ItemId && f.ItemId === library.ItemId)
        ?? folders.find(f => library.Name && f.Name === library.Name)
        ?? folders.find(f => (library.Locations?.length ?? 0) > 0 && f.Locations?.some(l => library.Locations?.includes(l)));
}

/** The server's own words for why something failed, falling back to a plain message. */
export function serverReason(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as unknown;
        if (typeof data === 'string' && data.trim()) return data.trim();
        if (data && typeof data === 'object' && 'Message' in data && typeof (data as { Message?: unknown }).Message === 'string') {
            return (data as { Message: string }).Message;
        }
    }
    return fallback;
}

export const GONE_MESSAGE = 'This library was already removed or renamed. The list has been refreshed.';
