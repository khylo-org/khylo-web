import type { BackupOptionsDto } from '@khylo/sdk/lib/generated-client/models/backup-options-dto';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import { useApi } from 'hooks/useApi';

/** Starts a backup on the server and returns at once: a big one takes minutes, so the page follows its progress instead of waiting. */
export const useCreateBackup = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: (backupOptions: BackupOptionsDto) => axios.post(`${api?.basePath}/Backup/CreateInBackground`, backupOptions, {
            headers: { Authorization: `MediaBrowser Token="${api?.accessToken ?? ''}"` }
        })
    });
};
