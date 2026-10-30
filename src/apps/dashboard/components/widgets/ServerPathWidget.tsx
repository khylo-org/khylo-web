import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import FolderSpecial from '@mui/icons-material/FolderSpecial';
import StorageIcon from '@mui/icons-material/Storage';
import React from 'react';

import StorageListItem from 'apps/dashboard/features/storage/components/StorageListItem';
import { useSystemStorage } from 'apps/dashboard/features/storage/api/useSystemStorage';
import globalize from 'lib/globalize';
import Widget from './Widget';

const ServerPathWidget = () => {
    const { data: systemStorage } = useSystemStorage();

    const libraryFolders = systemStorage?.Libraries?.flatMap(lib =>
        (lib.Folders || []).map(folder => ({
            label: `${lib.Name || 'Library'} (${folder.Path})`,
            folder
        }))
    ) ?? [];

    return (
        <Widget
            title='Storage Volume Inspector'
            href='/dashboard/libraries'
        >
            <List
                sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    overflow: 'hidden'
                }}
            >
                {/* Media Libraries Storage Pools */}
                {libraryFolders.length > 0 && (
                    <>
                        <ListSubheader
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                bgcolor: 'background.paper',
                                fontWeight: 'bold',
                                color: 'var(--khylo-brand, #D97732)'
                            }}
                        >
                            <FolderSpecial fontSize='small' />
                            Media Library Volumes & Storage Pools
                        </ListSubheader>
                        {libraryFolders.map((item, idx) => (
                            <StorageListItem
                                key={`lib-folder-${idx}-${item.folder.Path}`}
                                label={item.label}
                                folder={item.folder}
                            />
                        ))}
                        <Divider sx={{ my: 1 }} />
                    </>
                )}

                {/* Core Server & Cache System Paths */}
                <ListSubheader
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'background.paper',
                        fontWeight: 'bold',
                        color: 'text.secondary'
                    }}
                >
                    <StorageIcon fontSize='small' />
                    Server System Volumes & Infrastructure
                </ListSubheader>

                <StorageListItem
                    label={globalize.translate('LabelProgramData')}
                    folder={systemStorage?.ProgramDataFolder}
                />
                <StorageListItem
                    label={globalize.translate('LabelTranscodes')}
                    folder={systemStorage?.TranscodingTempFolder}
                />
                <StorageListItem
                    label={globalize.translate('LabelMetadata')}
                    folder={systemStorage?.InternalMetadataFolder}
                />
                <StorageListItem
                    label={globalize.translate('LabelCache')}
                    folder={systemStorage?.CacheFolder}
                />
                <StorageListItem
                    label={globalize.translate('LabelImageCache')}
                    folder={systemStorage?.ImageCacheFolder}
                />
                <StorageListItem
                    label={globalize.translate('LabelLogs')}
                    folder={systemStorage?.LogFolder}
                />
                <StorageListItem
                    label={globalize.translate('LabelWeb')}
                    folder={systemStorage?.WebFolder}
                />
            </List>
        </Widget>
    );
};

export default ServerPathWidget;
