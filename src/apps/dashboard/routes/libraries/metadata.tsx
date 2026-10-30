import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { ImageResolution } from '@khylo/sdk/lib/generated-client/models/image-resolution';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
import { queryClient } from 'utils/query/queryClient';
import { useCountries } from 'apps/dashboard/features/libraries/api/useCountries';
import { useCultures } from 'apps/dashboard/features/libraries/api/useCultures';
import { getImageResolutionOptions } from 'apps/dashboard/features/libraries/utils/metadataOptions';
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

interface MetadataFormData {
    PreferredMetadataLanguage: string;
    MetadataCountryCode: string;
    DummyChapterDuration: number;
    ChapterImageResolution: ImageResolution;
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as MetadataFormData;

    config.PreferredMetadataLanguage = payload.PreferredMetadataLanguage;
    config.MetadataCountryCode = payload.MetadataCountryCode;
    config.DummyChapterDuration = payload.DummyChapterDuration;
    config.ChapterImageResolution = payload.ChapterImageResolution;

    await getSystemApi(api).updateConfiguration({ serverConfiguration: config });

    void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const { data: config, isPending: isConfigPending, isError: isConfigError } = useConfiguration();
    const { data: cultures, isPending: isCulturesPending, isError: isCulturesError } = useCultures();
    const { data: countries, isPending: isCountriesPending, isError: isCountriesError } = useCountries();

    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const [language, setLanguage] = useState('en');
    const [country, setCountry] = useState('US');
    const [dummyChapterDuration, setDummyChapterDuration] = useState(0);
    const [chapterResolution, setChapterResolution] = useState<ImageResolution>('MatchSource' as any);
    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    const imageResolutions = useMemo(() => getImageResolutionOptions(), []);

    useEffect(() => {
        if (config) {
            setLanguage(config.PreferredMetadataLanguage || 'en');
            setCountry(config.MetadataCountryCode || 'US');
            setDummyChapterDuration(config.DummyChapterDuration ?? 0);
            if (config.ChapterImageResolution) {
                setChapterResolution(config.ChapterImageResolution);
            }
        }
    }, [config]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const isDirty = useMemo(() => {
        if (!config) return false;
        return (
            language !== (config.PreferredMetadataLanguage || 'en') ||
            country !== (config.MetadataCountryCode || 'US') ||
            dummyChapterDuration !== (config.DummyChapterDuration ?? 0) ||
            chapterResolution !== config.ChapterImageResolution
        );
    }, [config, language, country, dummyChapterDuration, chapterResolution]);

    const handleSave = useCallback(() => {
        const payload: MetadataFormData = {
            PreferredMetadataLanguage: language,
            MetadataCountryCode: country,
            DummyChapterDuration: dummyChapterDuration,
            ChapterImageResolution: chapterResolution
        };
        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [language, country, dummyChapterDuration, chapterResolution, submit]);

    const handleDiscard = useCallback(() => {
        if (config) {
            setLanguage(config.PreferredMetadataLanguage || 'en');
            setCountry(config.MetadataCountryCode || 'US');
            setDummyChapterDuration(config.DummyChapterDuration ?? 0);
            if (config.ChapterImageResolution) {
                setChapterResolution(config.ChapterImageResolution);
            }
        }
    }, [config]);

    if (isConfigPending || isCulturesPending || isCountriesPending) return <Loading />;

    const cultureList = cultures || [];
    const countryList = countries || [];

    return (
        <Page id='metadataImagesConfigurationPage' title='Metadata Defaults' className='type-interior mainAnimatedPage'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Media', to: '/dashboard/libraries' },
                        { label: 'Metadata Defaults' }
                    ]}
                    title='Metadata Scraping & Chapter Defaults'
                    subtitle='Global scraper language preferences, content rating authorities, and synthetic chapter thumbnail extraction.'
                    badge={
                        <KhyloStatusBadge
                            label={`Default: ${language.toUpperCase()} (${country})`}
                            color='healthy'
                        />
                    }
                />

                {(isConfigError || isCulturesError || isCountriesError) && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Failed to retrieve metadata configuration options.
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Localization */}
                    <KhyloSettingSection
                        title='Scraper Language & Regional Ratings'
                        description='Default localization applied when querying online databases (TMDB, TVDB, MusicBrainz, OpenSubtitles).'
                    >
                        <KhyloSettingRow
                            title='Preferred Metadata Language'
                            description='Language used for movie synopses, episode descriptions, and taglines.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    sx={{ width: 260 }}
                                >
                                    {cultureList.map((c) => (
                                        <MenuItem key={c.TwoLetterISOLanguageName} value={c.TwoLetterISOLanguageName}>
                                            {c.DisplayName}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            }
                        />

                        <KhyloSettingRow
                            title='Content Rating Country'
                            description='Regional rating authority for MPAA/BBFC/FSK advisory classifications (e.g. PG-13, TV-MA).'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    sx={{ width: 260 }}
                                >
                                    {countryList.map((c) => (
                                        <MenuItem key={c.DisplayName} value={c.TwoLetterISORegionName || ''}>
                                            {c.DisplayName}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            }
                        />
                    </KhyloSettingSection>

                    {/* Chapter Generation */}
                    <KhyloSettingSection
                        title='Automated Chapter Division & Storyboards'
                        description='Synthetic chapter creation and image resolution for media files lacking embedded chapters.'
                    >
                        <KhyloSettingRow
                            title='Synthetic Chapter Marker Interval'
                            description='Generates synthetic chapter markers at regular time intervals for files without chapter metadata. Set to 0 to disable.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={dummyChapterDuration}
                                    onChange={(e) => setDummyChapterDuration(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>sec</InputAdornment>,
                                        inputProps: { min: 0, max: 7200, step: 60 }
                                    }}
                                    sx={{ width: 140 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Chapter Thumbnail Image Resolution'
                            description='Maximum output pixel resolution for extracted chapter preview thumbnails.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={chapterResolution}
                                    onChange={(e) => setChapterResolution(e.target.value as ImageResolution)}
                                    sx={{ width: 200 }}
                                >
                                    {imageResolutions.map((res) => (
                                        <MenuItem key={res.name} value={res.value}>
                                            {res.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
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
                        Metadata defaults saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'MetadataImagesPage';
export default Component;
