import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { ServerConfiguration } from '@khylo/sdk/lib/generated-client/models/server-configuration';
import type { MetadataConfiguration } from '@khylo/sdk/lib/generated-client/models/metadata-configuration';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY as CONFIG_QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
import { QUERY_KEY as NAMED_CONFIG_QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { ActionData } from 'types/actionData';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge
} from '../../components/ui';

const CONFIG_KEY = 'metadata';

interface DisplayFormData {
    EnableFolderView: boolean;
    DisplaySpecialsWithinSeasons: boolean;
    EnableGroupingMoviesIntoCollections: boolean;
    EnableGroupingShowsIntoCollections: boolean;
    EnableExternalContentInSuggestions: boolean;
    UseFileCreationTimeForDateAdded: boolean;
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as DisplayFormData;

    config.EnableFolderView = payload.EnableFolderView;
    config.DisplaySpecialsWithinSeasons = payload.DisplaySpecialsWithinSeasons;
    config.EnableGroupingMoviesIntoCollections = payload.EnableGroupingMoviesIntoCollections;
    config.EnableGroupingShowsIntoCollections = payload.EnableGroupingShowsIntoCollections;
    config.EnableExternalContentInSuggestions = payload.EnableExternalContentInSuggestions;

    const metadataConfig: MetadataConfiguration = {
        UseFileCreationTimeForDateAdded: payload.UseFileCreationTimeForDateAdded
    };

    await getSystemApi(api).updateConfiguration({ serverConfiguration: config });
    await getSystemApi(api).updateNamedConfiguration({ key: CONFIG_KEY, body: metadataConfig });

    void queryClient.invalidateQueries({ queryKey: [CONFIG_QUERY_KEY] });
    void queryClient.invalidateQueries({ queryKey: [NAMED_CONFIG_QUERY_KEY, CONFIG_KEY] });

    return { isSaved: true };
};

export const Component: FC = () => {
    const { data: config, isPending: isConfigPending, isError: isConfigError } = useConfiguration();
    const { data: namedConfig, isPending: isNamedPending, isError: isNamedError } = useNamedConfiguration<MetadataConfiguration>(CONFIG_KEY);

    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const [folderView, setFolderView] = useState(false);
    const [specialsInSeasons, setSpecialsInSeasons] = useState(false);
    const [groupMovies, setGroupMovies] = useState(true);
    const [groupShows, setGroupShows] = useState(false);
    const [externalSuggestions, setExternalSuggestions] = useState(false);
    const [useFileCreationDate, setUseFileCreationDate] = useState(false);

    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    useEffect(() => {
        if (config) {
            setFolderView(Boolean(config.EnableFolderView));
            setSpecialsInSeasons(Boolean(config.DisplaySpecialsWithinSeasons));
            setGroupMovies(Boolean(config.EnableGroupingMoviesIntoCollections ?? true));
            setGroupShows(Boolean(config.EnableGroupingShowsIntoCollections));
            setExternalSuggestions(Boolean(config.EnableExternalContentInSuggestions));
        }
    }, [config]);

    useEffect(() => {
        if (namedConfig) {
            setUseFileCreationDate(Boolean(namedConfig.UseFileCreationTimeForDateAdded));
        }
    }, [namedConfig]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const isDirty = useMemo(() => {
        if (!config || !namedConfig) return false;
        return (
            folderView !== Boolean(config.EnableFolderView) ||
            specialsInSeasons !== Boolean(config.DisplaySpecialsWithinSeasons) ||
            groupMovies !== Boolean(config.EnableGroupingMoviesIntoCollections ?? true) ||
            groupShows !== Boolean(config.EnableGroupingShowsIntoCollections) ||
            externalSuggestions !== Boolean(config.EnableExternalContentInSuggestions) ||
            useFileCreationDate !== Boolean(namedConfig.UseFileCreationTimeForDateAdded)
        );
    }, [config, namedConfig, folderView, specialsInSeasons, groupMovies, groupShows, externalSuggestions, useFileCreationDate]);

    const handleSave = useCallback(() => {
        const payload: DisplayFormData = {
            EnableFolderView: folderView,
            DisplaySpecialsWithinSeasons: specialsInSeasons,
            EnableGroupingMoviesIntoCollections: groupMovies,
            EnableGroupingShowsIntoCollections: groupShows,
            EnableExternalContentInSuggestions: externalSuggestions,
            UseFileCreationTimeForDateAdded: useFileCreationDate
        };
        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [folderView, specialsInSeasons, groupMovies, groupShows, externalSuggestions, useFileCreationDate, submit]);

    const handleDiscard = useCallback(() => {
        if (config) {
            setFolderView(Boolean(config.EnableFolderView));
            setSpecialsInSeasons(Boolean(config.DisplaySpecialsWithinSeasons));
            setGroupMovies(Boolean(config.EnableGroupingMoviesIntoCollections ?? true));
            setGroupShows(Boolean(config.EnableGroupingShowsIntoCollections));
            setExternalSuggestions(Boolean(config.EnableExternalContentInSuggestions));
        }
        if (namedConfig) {
            setUseFileCreationDate(Boolean(namedConfig.UseFileCreationTimeForDateAdded));
        }
    }, [config, namedConfig]);

    if (isConfigPending || isNamedPending) return <Loading />;

    return (
        <Page id='libraryDisplayPage' title='Display Settings' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Media', to: '/dashboard/libraries' },
                        { label: 'Display & Collections' }
                    ]}
                    title='Library Display & Grouping Rules'
                    subtitle='Automatic collection aggregation, season folder grouping, and date-added timestamp heuristics.'
                    badge={
                        <KhyloStatusBadge
                            label={groupMovies ? 'Box Set Grouping Active' : 'Flat Movie Library'}
                            color='healthy'
                        />
                    }
                />

                {(isConfigError || isNamedError) && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Failed to retrieve library display configuration.
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Collection Aggregation */}
                    <KhyloSettingSection
                        title='Collection & Box Set Aggregation'
                        description='Automatically cluster sequels, trilogies, and multi-part film series into single collection folders.'
                    >
                        <KhyloSettingRow
                            title='Group Movies into Box Sets / Collections'
                            description='Automatically aggregate related titles (e.g. Alien, The Matrix, Lord of the Rings) into cohesive collection cards in movie views.'
                            control={
                                <Switch
                                    checked={groupMovies}
                                    onChange={(_, checked) => setGroupMovies(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Group Shows into Franchise Collections'
                            description='Aggregate television spin-offs and companion series into umbrella franchise groupings.'
                            control={
                                <Switch
                                    checked={groupShows}
                                    onChange={(_, checked) => setGroupShows(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Display Specials within Season Lists'
                            description='Intersperse TV specials and OVA episodes chronologically between their respective broadcast seasons.'
                            control={
                                <Switch
                                    checked={specialsInSeasons}
                                    onChange={(_, checked) => setSpecialsInSeasons(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Enable Directory / Folder Navigation View'
                            description='Provide raw filesystem directory tree navigation alongside metadata-indexed views.'
                            control={
                                <Switch
                                    checked={folderView}
                                    onChange={(_, checked) => setFolderView(checked)}
                                    color='primary'
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Date Heuristics & Recommendations */}
                    <KhyloSettingSection
                        title='Date Added & Discovery Feeds'
                        description='Heuristics governing Recently Added sorting and recommendation carousel content.'
                    >
                        <KhyloSettingRow
                            title='Date Added Calculation Heuristic'
                            description='Determine which timestamp defines when media was added to the server.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={useFileCreationDate ? 'file' : 'scan'}
                                    onChange={(e) => setUseFileCreationDate(e.target.value === 'file')}
                                    sx={{ width: 260 }}
                                >
                                    <MenuItem value='scan'>Time File Was Scanned by Server</MenuItem>
                                    <MenuItem value='file'>Filesystem Creation / Inode Timestamp</MenuItem>
                                </TextField>
                            }
                        />

                        <KhyloSettingRow
                            title='Include External Content in Recommendations'
                            description='Display related titles from external provider catalogs in recommendation strips even if not in your local library.'
                            control={
                                <Switch
                                    checked={externalSuggestions}
                                    onChange={(_, checked) => setExternalSuggestions(checked)}
                                    color='primary'
                                />
                            }
                        />
                    </KhyloSettingSection>
                </Box>

                <KhyloStickyActionBar
                    isDirty={isDirty}
                    isSaving={isSubmitting}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                />

                <Snackbar
                    open={savedNoticeOpen}
                    autoHideDuration={3000}
                    onClose={() => setSavedNoticeOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity='success'
                        onClose={() => setSavedNoticeOpen(false)}
                        sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                    >
                        Display rules saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LibraryDisplayPage';
export default Component;
