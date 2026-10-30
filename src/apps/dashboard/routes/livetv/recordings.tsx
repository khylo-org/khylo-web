import React, { FC, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import type { LiveTvOptions } from '@khylo/sdk/lib/generated-client/models/live-tv-options';

import { useApi } from 'hooks/useApi';
import { QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import { KhyloServerFileBrowserModal } from '../../components/browser/KhyloServerFileBrowserModal';
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

const CONFIG_KEY = 'livetv';

export const Component: FC = () => {
    const { api } = useApi();
    const { data: initialConfig, isPending, isError } = useNamedConfiguration<LiveTvOptions>(CONFIG_KEY);

    const [guideDays, setGuideDays] = useState<number | string>('');
    const [recordingPath, setRecordingPath] = useState('');
    const [movieRecordingPath, setMovieRecordingPath] = useState('');
    const [seriesRecordingPath, setSeriesRecordingPath] = useState('');
    const [prePaddingMinutes, setPrePaddingMinutes] = useState('0');
    const [postPaddingMinutes, setPostPaddingMinutes] = useState('0');
    const [recordingPostProcessor, setRecordingPostProcessor] = useState('');
    const [recordingPostProcessorArgs, setRecordingPostProcessorArgs] = useState('');
    const [saveRecordingNFO, setSaveRecordingNFO] = useState(false);
    const [saveRecordingImages, setSaveRecordingImages] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [pickerField, setPickerField] = useState<'default' | 'movie' | 'series' | null>(null);

    useEffect(() => {
        if (initialConfig) {
            setGuideDays(initialConfig.GuideDays ?? '');
            setRecordingPath(initialConfig.RecordingPath || '');
            setMovieRecordingPath(initialConfig.MovieRecordingPath || '');
            setSeriesRecordingPath(initialConfig.SeriesRecordingPath || '');
            setPrePaddingMinutes(initialConfig.PrePaddingSeconds ? String(initialConfig.PrePaddingSeconds / 60) : '0');
            setPostPaddingMinutes(initialConfig.PostPaddingSeconds ? String(initialConfig.PostPaddingSeconds / 60) : '0');
            setRecordingPostProcessor(initialConfig.RecordingPostProcessor || '');
            setRecordingPostProcessorArgs(initialConfig.RecordingPostProcessorArguments || '');
            setSaveRecordingNFO(!!initialConfig.SaveRecordingNFO);
            setSaveRecordingImages(!!initialConfig.SaveRecordingImages);
        }
    }, [initialConfig]);

    const isDirty = Boolean(
        initialConfig && (
            guideDays !== (initialConfig.GuideDays ?? '')
            || recordingPath !== (initialConfig.RecordingPath || '')
            || movieRecordingPath !== (initialConfig.MovieRecordingPath || '')
            || seriesRecordingPath !== (initialConfig.SeriesRecordingPath || '')
            || prePaddingMinutes !== String(initialConfig.PrePaddingSeconds ? initialConfig.PrePaddingSeconds / 60 : 0)
            || postPaddingMinutes !== String(initialConfig.PostPaddingSeconds ? initialConfig.PostPaddingSeconds / 60 : 0)
            || recordingPostProcessor !== (initialConfig.RecordingPostProcessor || '')
            || recordingPostProcessorArgs !== (initialConfig.RecordingPostProcessorArguments || '')
            || saveRecordingNFO !== !!initialConfig.SaveRecordingNFO
            || saveRecordingImages !== !!initialConfig.SaveRecordingImages
        )
    );

    const handleSave = useCallback(async () => {
        if (!api || !initialConfig) return;
        setIsSaving(true);
        try {
            const updated: LiveTvOptions = {
                ...initialConfig,
                GuideDays: guideDays ? Number(guideDays) : undefined,
                RecordingPath: recordingPath || undefined,
                MovieRecordingPath: movieRecordingPath || undefined,
                SeriesRecordingPath: seriesRecordingPath || undefined,
                PrePaddingSeconds: parseInt(prePaddingMinutes, 10) * 60,
                PostPaddingSeconds: parseInt(postPaddingMinutes, 10) * 60,
                RecordingPostProcessor: recordingPostProcessor || undefined,
                RecordingPostProcessorArguments: recordingPostProcessorArgs || undefined,
                SaveRecordingNFO: saveRecordingNFO,
                SaveRecordingImages: saveRecordingImages
            };

            await getSystemApi(api).updateNamedConfiguration({
                key: CONFIG_KEY,
                body: updated
            });

            void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, CONFIG_KEY] });
            setIsAlertOpen(true);
        } catch (err) {
            console.error('[LiveTvRecordings] Save failed:', err);
        } finally {
            setIsSaving(false);
        }
    }, [
        api,
        initialConfig,
        guideDays,
        recordingPath,
        movieRecordingPath,
        seriesRecordingPath,
        prePaddingMinutes,
        postPaddingMinutes,
        recordingPostProcessor,
        recordingPostProcessorArgs,
        saveRecordingNFO,
        saveRecordingImages
    ]);

    const handleReset = useCallback(() => {
        if (initialConfig) {
            setGuideDays(initialConfig.GuideDays ?? '');
            setRecordingPath(initialConfig.RecordingPath || '');
            setMovieRecordingPath(initialConfig.MovieRecordingPath || '');
            setSeriesRecordingPath(initialConfig.SeriesRecordingPath || '');
            setPrePaddingMinutes(initialConfig.PrePaddingSeconds ? String(initialConfig.PrePaddingSeconds / 60) : '0');
            setPostPaddingMinutes(initialConfig.PostPaddingSeconds ? String(initialConfig.PostPaddingSeconds / 60) : '0');
            setRecordingPostProcessor(initialConfig.RecordingPostProcessor || '');
            setRecordingPostProcessorArgs(initialConfig.RecordingPostProcessorArguments || '');
            setSaveRecordingNFO(!!initialConfig.SaveRecordingNFO);
            setSaveRecordingImages(!!initialConfig.SaveRecordingImages);
        }
    }, [initialConfig]);

    if (isPending) {
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
                title='DVR Configuration Saved'
                text='Recording paths, guide retention horizons, and post-processor rules have been updated.'
                onClose={() => setIsAlertOpen(false)}
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Broadcast' },
                    { label: 'DVR & Recordings' }
                ]}
                title='DVR & Scheduled Recordings'
                subtitle='Configure destination capture paths, EPG day cache windows, padding buffers, and post-processing automation.'
                badge={
                    <KhyloStatusBadge
                        label={isDirty ? 'Unsaved Changes' : 'Synced'}
                        color={isDirty ? 'warning' : 'healthy'}
                    />
                }
            />

            {isError && (
                <Alert severity='error' sx={{ mb: 3 }}>
                    Failed to query DVR configuration from server.
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <KhyloSettingSection
                    title='Storage & Directories'
                    description='Define capture volumes where recorded streams and transcoded episodes are preserved.'
                >
                    <KhyloSettingRow
                        label='Default Recording Directory'
                        description='Primary filesystem path for unclassified captures.'
                    >
                        <TextField
                            size='small'
                            value={recordingPath}
                            onChange={(e) => setRecordingPath(e.target.value)}
                            sx={{ minWidth: 320 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <IconButton size='small' onClick={() => setPickerField('default')}>
                                            <SearchIcon fontSize='small' />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Feature Film Directory'
                        description='Dedicated library target for movie recordings.'
                    >
                        <TextField
                            size='small'
                            value={movieRecordingPath}
                            onChange={(e) => setMovieRecordingPath(e.target.value)}
                            sx={{ minWidth: 320 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <IconButton size='small' onClick={() => setPickerField('movie')}>
                                            <SearchIcon fontSize='small' />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Series Recording Directory'
                        description='Dedicated library target for episodic TV captures.'
                    >
                        <TextField
                            size='small'
                            value={seriesRecordingPath}
                            onChange={(e) => setSeriesRecordingPath(e.target.value)}
                            sx={{ minWidth: 320 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <IconButton size='small' onClick={() => setPickerField('series')}>
                                            <SearchIcon fontSize='small' />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </KhyloSettingRow>
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Guide Horizon & Padding Buffers'
                    description='Control calendar lookahead windows and margin times to prevent clipped broadcast boundaries.'
                >
                    <KhyloSettingRow
                        label='Guide Retention Days'
                        description='Number of days in advance to request and parse from EPG sources.'
                    >
                        <Select
                            size='small'
                            value={guideDays}
                            onChange={(e) => setGuideDays(e.target.value)}
                            displayEmpty
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value=''>Auto (Server Managed)</MenuItem>
                            {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                                <MenuItem key={d} value={d}>
                                    {d} Days
                                </MenuItem>
                            ))}
                        </Select>
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Pre-Padding Buffer'
                        description='Number of minutes before scheduled air time to initiate recording.'
                    >
                        <TextField
                            size='small'
                            type='number'
                            value={prePaddingMinutes}
                            onChange={(e) => setPrePaddingMinutes(e.target.value)}
                            sx={{ width: 120 }}
                            InputProps={{ endAdornment: <InputAdornment position='end'>min</InputAdornment> }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Post-Padding Buffer'
                        description='Number of minutes after scheduled air time to sustain capture in case of live broadcast overrun.'
                    >
                        <TextField
                            size='small'
                            type='number'
                            value={postPaddingMinutes}
                            onChange={(e) => setPostPaddingMinutes(e.target.value)}
                            sx={{ width: 120 }}
                            InputProps={{ endAdornment: <InputAdornment position='end'>min</InputAdornment> }}
                        />
                    </KhyloSettingRow>
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Post-Processing & Metadata'
                    description='Execute custom remuxing or commercial excision scripts following recording completion.'
                >
                    <KhyloSettingRow
                        label='Post-Processor Script'
                        description='Absolute binary or script path invoked when capture completes.'
                    >
                        <TextField
                            size='small'
                            value={recordingPostProcessor}
                            onChange={(e) => setRecordingPostProcessor(e.target.value)}
                            sx={{ minWidth: 320 }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Arguments & CLI Parameters'
                        description='Passed arguments (use %1 for input filename).'
                    >
                        <TextField
                            size='small'
                            value={recordingPostProcessorArgs}
                            onChange={(e) => setRecordingPostProcessorArgs(e.target.value)}
                            sx={{ minWidth: 320 }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Save Sidecar NFO Files'
                        description='Automatically generate Kodi-compatible XML metadata next to recordings.'
                    >
                        <Switch
                            checked={saveRecordingNFO}
                            onChange={(e) => setSaveRecordingNFO(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Extract Poster & Thumbnails'
                        description='Save broadcast artwork alongside recorded video streams.'
                    >
                        <Switch
                            checked={saveRecordingImages}
                            onChange={(e) => setSaveRecordingImages(e.target.checked)}
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

            <KhyloServerFileBrowserModal
                open={pickerField !== null}
                initialPath={
                    pickerField === 'movie' ?
                        movieRecordingPath :
                        pickerField === 'series' ?
                            seriesRecordingPath :
                            recordingPath
                }
                title={
                    pickerField === 'movie' ?
                        'Select Feature Film Recording Directory' :
                        pickerField === 'series' ?
                            'Select Series Recording Directory' :
                            'Select Default Recording Directory'
                }
                includeFiles={false}
                onClose={() => setPickerField(null)}
                onSelect={(selectedPath) => {
                    if (pickerField === 'movie') setMovieRecordingPath(selectedPath);
                    else if (pickerField === 'series') setSeriesRecordingPath(selectedPath);
                    else if (pickerField === 'default') setRecordingPath(selectedPath);
                    setPickerField(null);
                }}
            />
        </KhyloPage>
    );
};

export default Component;
