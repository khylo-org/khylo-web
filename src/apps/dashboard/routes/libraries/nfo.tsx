import React, { FC, useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import type { XbmcMetadataOptions } from '@khylo/sdk/lib/generated-client/models/xbmc-metadata-options';

import { useApi } from 'hooks/useApi';
import { QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { useUsers } from 'hooks/useUsers';
import { queryClient } from 'utils/query/queryClient';
import SimpleAlert from 'components/SimpleAlert';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge
} from '../../components/ui';

const CONFIG_KEY = 'xbmcmetadata';

export const Component: FC = () => {
    const { api } = useApi();
    const {
        data: config,
        isPending: isConfigPending,
        isError: isConfigError
    } = useNamedConfiguration<XbmcMetadataOptions>(CONFIG_KEY);

    const {
        data: users,
        isPending: isUsersPending,
        isError: isUsersError
    } = useUsers();

    const [userId, setUserId] = useState<string>('');
    const [saveImagePathsInNfo, setSaveImagePathsInNfo] = useState(false);
    const [enablePathSubstitution, setEnablePathSubstitution] = useState(false);
    const [enableExtraThumbsDuplication, setEnableExtraThumbsDuplication] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    useEffect(() => {
        if (config) {
            setUserId(config.UserId || '');
            setSaveImagePathsInNfo(!!config.SaveImagePathsInNfo);
            setEnablePathSubstitution(!!config.EnablePathSubstitution);
            setEnableExtraThumbsDuplication(!!config.EnableExtraThumbsDuplication);
        }
    }, [config]);

    const isDirty = Boolean(
        config && (
            userId !== (config.UserId || '') ||
            saveImagePathsInNfo !== !!config.SaveImagePathsInNfo ||
            enablePathSubstitution !== !!config.EnablePathSubstitution ||
            enableExtraThumbsDuplication !== !!config.EnableExtraThumbsDuplication
        )
    );

    const handleReset = useCallback(() => {
        if (config) {
            setUserId(config.UserId || '');
            setSaveImagePathsInNfo(!!config.SaveImagePathsInNfo);
            setEnablePathSubstitution(!!config.EnablePathSubstitution);
            setEnableExtraThumbsDuplication(!!config.EnableExtraThumbsDuplication);
        }
    }, [config]);

    const handleSave = useCallback(async () => {
        if (!api) return;
        setIsSaving(true);
        try {
            const newConfig: XbmcMetadataOptions = {
                UserId: userId || undefined,
                ReleaseDateFormat: 'yyyy-MM-dd',
                SaveImagePathsInNfo: saveImagePathsInNfo,
                EnablePathSubstitution: enablePathSubstitution,
                EnableExtraThumbsDuplication: enableExtraThumbsDuplication
            };

            await getSystemApi(api).updateNamedConfiguration({
                key: CONFIG_KEY,
                body: newConfig
            });

            void queryClient.invalidateQueries({
                queryKey: [QUERY_KEY, CONFIG_KEY]
            });

            setIsSaved(true);
            setIsAlertOpen(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            console.error('[NfoSettings] Failed to save NFO settings:', err);
        } finally {
            setIsSaving(false);
        }
    }, [api, userId, saveImagePathsInNfo, enablePathSubstitution, enableExtraThumbsDuplication]);

    if (isConfigPending || isUsersPending) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    return (
        <KhyloPage>
            <SimpleAlert
                open={isAlertOpen}
                title='Settings Saved'
                text='NFO and Kodi metadata compatibility changes will apply to subsequent library scans and artwork extractions.'
                onClose={() => setIsAlertOpen(false)}
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Media' },
                    { label: 'Metadata & NFO' },
                    { label: 'NFO Storage' }
                ]}
                title='NFO & Kodi Metadata Options'
                subtitle='Configure XML/NFO sidecar files for interoperability with Kodi and external metadata managers.'
                badge={
                    <KhyloStatusBadge
                        label={isDirty ? 'Unsaved Changes' : 'Synced'}
                        color={isDirty ? 'warning' : 'healthy'}
                    />
                }
            />

            {(isConfigError || isUsersError) && (
                <Alert severity='error' sx={{ mb: 3 }}>
                    Failed to load NFO configuration or user directory from server.
                </Alert>
            )}

            {isSaved && (
                <Alert severity='success' sx={{ mb: 3 }}>
                    NFO metadata configuration saved successfully.
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <KhyloSettingSection
                    title='Kodi Companion Identity'
                    description='Assign the default server profile used when writing user-specific play states and ratings into NFO files.'
                >
                    <KhyloSettingRow
                        label='User Account Reference'
                        description='User profile used to calculate watched indicators and individual ratings exported into local NFO files.'
                    >
                        <Select
                            size='small'
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            displayEmpty
                            sx={{ minWidth: 260 }}
                        >
                            <MenuItem value=''>
                                <em>None (Global Metadata Only)</em>
                            </MenuItem>
                            {users?.map((u) => (
                                <MenuItem key={u.Id} value={u.Id}>
                                    {u.Name}
                                </MenuItem>
                            ))}
                        </Select>
                    </KhyloSettingRow>
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Artwork & File Serialization'
                    description='Define how image references and extra media assets are recorded within .nfo descriptor documents.'
                >
                    <KhyloSettingRow
                        label='Record Absolute Image Paths'
                        description='Embed local disk paths directly into artwork XML nodes within the NFO file rather than relative filenames.'
                    >
                        <Switch
                            checked={saveImagePathsInNfo}
                            onChange={(e) => setSaveImagePathsInNfo(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Path Substitution Translation'
                        description='Translate server-local filesystem paths to shared network UNC or SMB paths defined in path substitutions.'
                    >
                        <Switch
                            checked={enablePathSubstitution}
                            onChange={(e) => setEnablePathSubstitution(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Duplicate Extra Fanart & Thumbs'
                        description='Duplicate backdrop assets into extrathumbs and extrafanart subdirectories for legacy Kodi skin support.'
                    >
                        <Switch
                            checked={enableExtraThumbsDuplication}
                            onChange={(e) => setEnableExtraThumbsDuplication(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>
                </KhyloSettingSection>
            </Box>

            <KhyloStickyActionBar
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={handleSave}
                onReset={handleReset}
            />
        </KhyloPage>
    );
};

export default Component;
