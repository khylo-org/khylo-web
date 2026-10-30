import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { ServerConfiguration } from '@khylo/sdk/lib/generated-client/models/server-configuration';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
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

interface ResumeFormData {
    MinResumePct: number;
    MaxResumePct: number;
    MinAudiobookResume: number;
    MaxAudiobookResume: number;
    MinResumeDurationSeconds: number;
    EnableIntroDetection: boolean;
    EnableCreditsDetection: boolean;
    AutoSkipIntro: boolean;
    AutoSkipCredits: boolean;
    EnableInactivityProtection: boolean;
    InactivityTimeoutMinutes: number;
    PreferredSubtitleLanguage: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as ResumeFormData;

    config.MinResumePct = payload.MinResumePct;
    config.MaxResumePct = payload.MaxResumePct;
    config.MinAudiobookResume = payload.MinAudiobookResume;
    config.MaxAudiobookResume = payload.MaxAudiobookResume;
    config.MinResumeDurationSeconds = payload.MinResumeDurationSeconds;

    (config as any).EnableIntroDetection = payload.EnableIntroDetection;
    (config as any).EnableCreditsDetection = payload.EnableCreditsDetection;
    (config as any).AutoSkipIntro = payload.AutoSkipIntro;
    (config as any).AutoSkipCredits = payload.AutoSkipCredits;
    (config as any).EnableInactivityProtection = payload.EnableInactivityProtection;
    (config as any).InactivityTimeoutMinutes = payload.InactivityTimeoutMinutes;
    (config as any).PreferredSubtitleLanguage = payload.PreferredSubtitleLanguage;

    await getSystemApi(api).updateConfiguration({ serverConfiguration: config });

    void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const { data: config, isPending, isError } = useConfiguration();

    // Local form state
    const [minResumePct, setMinResumePct] = useState<number>(5);
    const [maxResumePct, setMaxResumePct] = useState<number>(90);
    const [minAudiobookResume, setMinAudiobookResume] = useState<number>(2);
    const [maxAudiobookResume, setMaxAudiobookResume] = useState<number>(98);
    const [minResumeDuration, setMinResumeDuration] = useState<number>(300);

    const [enableIntroDetection, setEnableIntroDetection] = useState<boolean>(true);
    const [autoSkipIntro, setAutoSkipIntro] = useState<boolean>(false);
    const [enableCreditsDetection, setEnableCreditsDetection] = useState<boolean>(true);
    const [autoSkipCredits, setAutoSkipCredits] = useState<boolean>(false);

    const [enableInactivityProtection, setEnableInactivityProtection] = useState<boolean>(true);
    const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(120);
    const [preferredSubtitleLanguage, setPreferredSubtitleLanguage] = useState<string>('eng');

    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    // Sync from server config
    useEffect(() => {
        if (config) {
            setMinResumePct(config.MinResumePct ?? 5);
            setMaxResumePct(config.MaxResumePct ?? 90);
            setMinAudiobookResume(config.MinAudiobookResume ?? 2);
            setMaxAudiobookResume(config.MaxAudiobookResume ?? 98);
            setMinResumeDuration(config.MinResumeDurationSeconds ?? 300);

            setEnableIntroDetection(Boolean((config as any).EnableIntroDetection ?? true));
            setAutoSkipIntro(Boolean((config as any).AutoSkipIntro ?? false));
            setEnableCreditsDetection(Boolean((config as any).EnableCreditsDetection ?? true));
            setAutoSkipCredits(Boolean((config as any).AutoSkipCredits ?? false));

            setEnableInactivityProtection(Boolean((config as any).EnableInactivityProtection ?? true));
            setInactivityTimeoutMinutes((config as any).InactivityTimeoutMinutes ?? 120);
            setPreferredSubtitleLanguage((config as any).PreferredSubtitleLanguage || 'eng');
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
            minResumePct !== (config.MinResumePct ?? 5) ||
            maxResumePct !== (config.MaxResumePct ?? 90) ||
            minAudiobookResume !== (config.MinAudiobookResume ?? 2) ||
            maxAudiobookResume !== (config.MaxAudiobookResume ?? 98) ||
            minResumeDuration !== (config.MinResumeDurationSeconds ?? 300) ||
            enableIntroDetection !== Boolean((config as any).EnableIntroDetection ?? true) ||
            autoSkipIntro !== Boolean((config as any).AutoSkipIntro ?? false) ||
            enableCreditsDetection !== Boolean((config as any).EnableCreditsDetection ?? true) ||
            autoSkipCredits !== Boolean((config as any).AutoSkipCredits ?? false) ||
            enableInactivityProtection !== Boolean((config as any).EnableInactivityProtection ?? true) ||
            inactivityTimeoutMinutes !== ((config as any).InactivityTimeoutMinutes ?? 120) ||
            preferredSubtitleLanguage !== ((config as any).PreferredSubtitleLanguage || 'eng')
        );
    }, [
        config,
        minResumePct,
        maxResumePct,
        minAudiobookResume,
        maxAudiobookResume,
        minResumeDuration,
        enableIntroDetection,
        autoSkipIntro,
        enableCreditsDetection,
        autoSkipCredits,
        enableInactivityProtection,
        inactivityTimeoutMinutes,
        preferredSubtitleLanguage
    ]);

    const handleSave = useCallback(() => {
        const payload: ResumeFormData = {
            MinResumePct: minResumePct,
            MaxResumePct: maxResumePct,
            MinAudiobookResume: minAudiobookResume,
            MaxAudiobookResume: maxAudiobookResume,
            MinResumeDurationSeconds: minResumeDuration,
            EnableIntroDetection: enableIntroDetection,
            AutoSkipIntro: autoSkipIntro,
            EnableCreditsDetection: enableCreditsDetection,
            AutoSkipCredits: autoSkipCredits,
            EnableInactivityProtection: enableInactivityProtection,
            InactivityTimeoutMinutes: inactivityTimeoutMinutes,
            PreferredSubtitleLanguage: preferredSubtitleLanguage.trim()
        };

        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [
        minResumePct,
        maxResumePct,
        minAudiobookResume,
        maxAudiobookResume,
        minResumeDuration,
        enableIntroDetection,
        autoSkipIntro,
        enableCreditsDetection,
        autoSkipCredits,
        enableInactivityProtection,
        inactivityTimeoutMinutes,
        preferredSubtitleLanguage,
        submit
    ]);

    const handleDiscard = useCallback(() => {
        if (config) {
            setMinResumePct(config.MinResumePct ?? 5);
            setMaxResumePct(config.MaxResumePct ?? 90);
            setMinAudiobookResume(config.MinAudiobookResume ?? 2);
            setMaxAudiobookResume(config.MaxAudiobookResume ?? 98);
            setMinResumeDuration(config.MinResumeDurationSeconds ?? 300);

            setEnableIntroDetection(Boolean((config as any).EnableIntroDetection ?? true));
            setAutoSkipIntro(Boolean((config as any).AutoSkipIntro ?? false));
            setEnableCreditsDetection(Boolean((config as any).EnableCreditsDetection ?? true));
            setAutoSkipCredits(Boolean((config as any).AutoSkipCredits ?? false));

            setEnableInactivityProtection(Boolean((config as any).EnableInactivityProtection ?? true));
            setInactivityTimeoutMinutes((config as any).InactivityTimeoutMinutes ?? 120);
            setPreferredSubtitleLanguage((config as any).PreferredSubtitleLanguage || 'eng');
        }
    }, [config]);

    if (isPending) {
        return <Loading />;
    }

    if (isError) {
        return (
            <Page id='playbackConfigurationPage' title='Playback Heuristics' className='mainAnimatedPage type-interior'>
                <KhyloPage>
                    <Alert severity='error'>Failed to load playback heuristics configuration.</Alert>
                </KhyloPage>
            </Page>
        );
    }

    return (
        <Page id='playbackConfigurationPage' title='Playback Heuristics' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Playback' },
                        { label: 'Resume & Heuristics' }
                    ]}
                    title='Playback Heuristics & Resume'
                    subtitle='Playstate retention thresholds, chapter & intro heuristics, and session inactivity governance.'
                    badge={
                        <KhyloStatusBadge
                            label={`Resume Window: ${minResumePct}% – ${maxResumePct}%`}
                            color='healthy'
                        />
                    }
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Video Resume */}
                    <KhyloSettingSection
                        title='Video Resume Boundaries'
                        description='Define playback percentage thresholds for marking media in-progress or completed.'
                    >
                        <KhyloSettingRow
                            title='Minimum Playback Percentage'
                            description='Percentage of video that must be watched before a resume point is committed to the database. Prevents accidental clicks from cluttering Continue Watching.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={minResumePct}
                                    onChange={(e) => setMinResumePct(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>%</InputAdornment>,
                                        inputProps: { min: 0, max: 100, step: 1 }
                                    }}
                                    sx={{ width: 130 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Maximum Playback Percentage'
                            description='Percentage of video after which the item is considered fully watched. The resume marker is cleared and the item is marked watched.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={maxResumePct}
                                    onChange={(e) => setMaxResumePct(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>%</InputAdornment>,
                                        inputProps: { min: 50, max: 100, step: 1 }
                                    }}
                                    sx={{ width: 130 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Minimum Item Duration'
                            description='Items shorter than this threshold will not generate resume states. Recommended: 300 seconds (5 minutes).'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={minResumeDuration}
                                    onChange={(e) => setMinResumeDuration(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>sec</InputAdornment>,
                                        inputProps: { min: 0, max: 3600, step: 30 }
                                    }}
                                    sx={{ width: 140 }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Audiobook & Spoken Word */}
                    <KhyloSettingSection
                        title='Audiobook & Spoken Word Resume'
                        description='Specialized resume thresholds for audiobooks, podcasts, and long-form spoken word tracks.'
                    >
                        <KhyloSettingRow
                            title='Audiobook Start Threshold'
                            description='Percentage of audiobook track that must be played before saving the position marker.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={minAudiobookResume}
                                    onChange={(e) => setMinAudiobookResume(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>%</InputAdornment>,
                                        inputProps: { min: 0, max: 100, step: 1 }
                                    }}
                                    sx={{ width: 130 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Audiobook Finish Threshold'
                            description='Percentage of track at which an audiobook chapter or title is marked finished.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={maxAudiobookResume}
                                    onChange={(e) => setMaxAudiobookResume(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>%</InputAdornment>,
                                        inputProps: { min: 50, max: 100, step: 1 }
                                    }}
                                    sx={{ width: 130 }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Intro & Credits */}
                    <KhyloSettingSection
                        title='Intro & Credits Detection Heuristics'
                        description='Automated detection and skip controls for television episode opening titles and closing credits.'
                    >
                        <KhyloSettingRow
                            title='Automated Intro Detection'
                            description='Analyze audio fingerprint patterns across episode files to index opening title sequences.'
                            control={
                                <Switch
                                    checked={enableIntroDetection}
                                    onChange={(_, checked) => setEnableIntroDetection(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Automatically Skip Intros'
                            description='Automatically advance the playback cursor past detected opening intros without manual click required.'
                            isDependent
                            disabled={!enableIntroDetection}
                            control={
                                <Switch
                                    checked={autoSkipIntro}
                                    onChange={(_, checked) => setAutoSkipIntro(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Automated End Credits Detection'
                            description='Detect end credits to prompt for subsequent episodes or auto-play queue advancement.'
                            control={
                                <Switch
                                    checked={enableCreditsDetection}
                                    onChange={(_, checked) => setEnableCreditsDetection(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Automatically Skip End Credits'
                            description='Automatically trigger the next episode in the play queue when rolling credits begin.'
                            isDependent
                            disabled={!enableCreditsDetection}
                            control={
                                <Switch
                                    checked={autoSkipCredits}
                                    onChange={(_, checked) => setAutoSkipCredits(checked)}
                                    color='primary'
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Inactivity Guard */}
                    <KhyloSettingSection
                        title='Continuous Playback Inactivity Guard'
                        description='Prevent unattended playback streams from consuming bandwidth and server resources.'
                    >
                        <KhyloSettingRow
                            title='Enable Inactivity Protection'
                            description='Monitors playback activity and pauses the stream if no user interaction occurs within the timeout threshold.'
                            control={
                                <Switch
                                    checked={enableInactivityProtection}
                                    onChange={(_, checked) => setEnableInactivityProtection(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Inactivity Timeout'
                            description='Minutes of continuous uninterrupted playback before displaying the confirmation prompt.'
                            isDependent
                            disabled={!enableInactivityProtection}
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={inactivityTimeoutMinutes}
                                    onChange={(e) => setInactivityTimeoutMinutes(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>min</InputAdornment>,
                                        inputProps: { min: 15, max: 720, step: 15 }
                                    }}
                                    sx={{ width: 140 }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Subtitle Defaults */}
                    <KhyloSettingSection
                        title='Default Subtitle Language'
                        description='Standard language preference for automatic subtitle track matching.'
                    >
                        <KhyloSettingRow
                            title='Preferred Subtitle Language Code'
                            description='Three-letter ISO 639-2 language code (e.g. eng, spa, fre, jpn, deu) used to select matching subtitle streams by default.'
                            control={
                                <TextField
                                    size='small'
                                    value={preferredSubtitleLanguage}
                                    onChange={(e) => setPreferredSubtitleLanguage(e.target.value)}
                                    sx={{ width: 140 }}
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
                        Playback heuristics successfully saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'ResumePage';
export default Component;
