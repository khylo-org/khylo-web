import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { TrickplayOptions } from '@khylo/sdk/lib/generated-client/models/trickplay-options';
import { TrickplayScanBehavior } from '@khylo/sdk/lib/generated-client/models/trickplay-scan-behavior';
import { ProcessPriorityClass } from '@khylo/sdk/lib/generated-client/models/process-priority-class';
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

interface TrickplayFormData {
    EnableHwAcceleration: boolean;
    EnableHwEncoding: boolean;
    EnableKeyFrameOnlyExtraction: boolean;
    ScanBehavior: TrickplayScanBehavior;
    ProcessPriority: ProcessPriorityClass;
    Interval: number;
    WidthResolutions: number[];
    TileWidth: number;
    TileHeight: number;
    JpegQuality: number;
    Qscale: number;
    ProcessThreads: number;
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getSystemApi(api).getConfiguration();
    const payload = await request.json() as TrickplayFormData;

    const options = config.TrickplayOptions || {};
    options.EnableHwAcceleration = payload.EnableHwAcceleration;
    options.EnableHwEncoding = payload.EnableHwEncoding;
    options.EnableKeyFrameOnlyExtraction = payload.EnableKeyFrameOnlyExtraction;
    options.ScanBehavior = payload.ScanBehavior;
    options.ProcessPriority = payload.ProcessPriority;
    options.Interval = payload.Interval;
    options.WidthResolutions = payload.WidthResolutions;
    options.TileWidth = payload.TileWidth;
    options.TileHeight = payload.TileHeight;
    options.JpegQuality = payload.JpegQuality;
    options.Qscale = payload.Qscale;
    options.ProcessThreads = payload.ProcessThreads;

    config.TrickplayOptions = options;

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
    const trickplay = config?.TrickplayOptions;

    // Form state
    const [enableHwAcceleration, setEnableHwAcceleration] = useState<boolean>(false);
    const [enableHwEncoding, setEnableHwEncoding] = useState<boolean>(false);
    const [enableKeyFrameOnly, setEnableKeyFrameOnly] = useState<boolean>(true);
    const [scanBehavior, setScanBehavior] = useState<TrickplayScanBehavior>(TrickplayScanBehavior.NonBlocking);
    const [processPriority, setProcessPriority] = useState<ProcessPriorityClass>(ProcessPriorityClass.BelowNormal);
    const [intervalSec, setIntervalSec] = useState<number>(10);
    const [widthResolutions, setWidthResolutions] = useState<string>('320');
    const [tileWidth, setTileWidth] = useState<number>(10);
    const [tileHeight, setTileHeight] = useState<number>(10);
    const [jpegQuality, setJpegQuality] = useState<number>(90);
    const [qscale, setQscale] = useState<number>(4);
    const [processThreads, setProcessThreads] = useState<number>(1);

    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    useEffect(() => {
        if (trickplay) {
            setEnableHwAcceleration(Boolean(trickplay.EnableHwAcceleration));
            setEnableHwEncoding(Boolean(trickplay.EnableHwEncoding));
            setEnableKeyFrameOnly(Boolean(trickplay.EnableKeyFrameOnlyExtraction ?? true));
            setScanBehavior(trickplay.ScanBehavior ?? TrickplayScanBehavior.NonBlocking);
            setProcessPriority(trickplay.ProcessPriority ?? ProcessPriorityClass.BelowNormal);
            setIntervalSec(trickplay.Interval ? Math.round(trickplay.Interval / 1000) : 10);
            setWidthResolutions(trickplay.WidthResolutions ? trickplay.WidthResolutions.join(', ') : '320');
            setTileWidth(trickplay.TileWidth ?? 10);
            setTileHeight(trickplay.TileHeight ?? 10);
            setJpegQuality(trickplay.JpegQuality ?? 90);
            setQscale(trickplay.Qscale ?? 4);
            setProcessThreads(trickplay.ProcessThreads ?? 1);
        }
    }, [trickplay]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const isDirty = useMemo(() => {
        if (!trickplay) return false;
        const origIntervalSec = trickplay.Interval ? Math.round(trickplay.Interval / 1000) : 10;
        const origResolutions = trickplay.WidthResolutions ? trickplay.WidthResolutions.join(', ') : '320';

        return (
            enableHwAcceleration !== Boolean(trickplay.EnableHwAcceleration) ||
            enableHwEncoding !== Boolean(trickplay.EnableHwEncoding) ||
            enableKeyFrameOnly !== Boolean(trickplay.EnableKeyFrameOnlyExtraction ?? true) ||
            scanBehavior !== (trickplay.ScanBehavior ?? TrickplayScanBehavior.NonBlocking) ||
            processPriority !== (trickplay.ProcessPriority ?? ProcessPriorityClass.BelowNormal) ||
            intervalSec !== origIntervalSec ||
            widthResolutions.replace(/\s/g, '') !== origResolutions.replace(/\s/g, '') ||
            tileWidth !== (trickplay.TileWidth ?? 10) ||
            tileHeight !== (trickplay.TileHeight ?? 10) ||
            jpegQuality !== (trickplay.JpegQuality ?? 90) ||
            qscale !== (trickplay.Qscale ?? 4) ||
            processThreads !== (trickplay.ProcessThreads ?? 1)
        );
    }, [
        trickplay,
        enableHwAcceleration,
        enableHwEncoding,
        enableKeyFrameOnly,
        scanBehavior,
        processPriority,
        intervalSec,
        widthResolutions,
        tileWidth,
        tileHeight,
        jpegQuality,
        qscale,
        processThreads
    ]);

    const handleSave = useCallback(() => {
        const parsedResolutions = widthResolutions
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);

        const payload: TrickplayFormData = {
            EnableHwAcceleration: enableHwAcceleration,
            EnableHwEncoding: enableHwEncoding,
            EnableKeyFrameOnlyExtraction: enableKeyFrameOnly,
            ScanBehavior: scanBehavior,
            ProcessPriority: processPriority,
            Interval: Math.max(1, intervalSec) * 1000,
            WidthResolutions: parsedResolutions.length > 0 ? parsedResolutions : [320],
            TileWidth: tileWidth,
            TileHeight: tileHeight,
            JpegQuality: jpegQuality,
            Qscale: qscale,
            ProcessThreads: processThreads
        };

        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [
        enableHwAcceleration,
        enableHwEncoding,
        enableKeyFrameOnly,
        scanBehavior,
        processPriority,
        intervalSec,
        widthResolutions,
        tileWidth,
        tileHeight,
        jpegQuality,
        qscale,
        processThreads,
        submit
    ]);

    const handleDiscard = useCallback(() => {
        if (trickplay) {
            setEnableHwAcceleration(Boolean(trickplay.EnableHwAcceleration));
            setEnableHwEncoding(Boolean(trickplay.EnableHwEncoding));
            setEnableKeyFrameOnly(Boolean(trickplay.EnableKeyFrameOnlyExtraction ?? true));
            setScanBehavior(trickplay.ScanBehavior ?? TrickplayScanBehavior.NonBlocking);
            setProcessPriority(trickplay.ProcessPriority ?? ProcessPriorityClass.BelowNormal);
            setIntervalSec(trickplay.Interval ? Math.round(trickplay.Interval / 1000) : 10);
            setWidthResolutions(trickplay.WidthResolutions ? trickplay.WidthResolutions.join(', ') : '320');
            setTileWidth(trickplay.TileWidth ?? 10);
            setTileHeight(trickplay.TileHeight ?? 10);
            setJpegQuality(trickplay.JpegQuality ?? 90);
            setQscale(trickplay.Qscale ?? 4);
            setProcessThreads(trickplay.ProcessThreads ?? 1);
        }
    }, [trickplay]);

    if (isPending) {
        return <Loading />;
    }

    if (isError) {
        return (
            <Page id='trickplayConfigurationPage' title='Trickplay Thumbnails' className='mainAnimatedPage type-interior'>
                <KhyloPage>
                    <Alert severity='error'>Failed to load trickplay configuration.</Alert>
                </KhyloPage>
            </Page>
        );
    }

    return (
        <Page id='trickplayConfigurationPage' title='Trickplay Thumbnails' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Playback' },
                        { label: 'Trickplay Thumbnails' }
                    ]}
                    title='Trickplay Storyboard Thumbnails'
                    subtitle='Timeline scrubbing image generation, hardware extraction acceleration, and worker process priorities.'
                    badge={
                        <KhyloStatusBadge
                            label={enableHwAcceleration ? 'GPU Accelerated' : 'CPU Software Extraction'}
                            color={enableHwAcceleration ? 'healthy' : 'idle'}
                        />
                    }
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Hardware & Workers */}
                    <KhyloSettingSection
                        title='Hardware Acceleration & Processing'
                        description='Offload thumbnail frame extraction and JPEG tile compilation to dedicated hardware engines.'
                    >
                        <KhyloSettingRow
                            title='Hardware Accelerated Decoding'
                            description='Use GPU decoders (NVDEC, QSV, VAAPI, VideoToolbox) to unpack video streams for thumbnail extraction.'
                            control={
                                <Switch
                                    checked={enableHwAcceleration}
                                    onChange={(_, checked) => setEnableHwAcceleration(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Hardware Accelerated Tile Encoding'
                            description='Use GPU encoders to assemble JPEG storyboard sheets, minimizing host CPU overhead during library ingestion.'
                            control={
                                <Switch
                                    checked={enableHwEncoding}
                                    onChange={(_, checked) => setEnableHwEncoding(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Keyframe-Only Extraction'
                            description='Extract frames solely at GOP I-frame boundaries. Drastically speeds up extraction times with negligible visual deviation.'
                            control={
                                <Switch
                                    checked={enableKeyFrameOnly}
                                    onChange={(_, checked) => setEnableKeyFrameOnly(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Worker Thread Allocation'
                            description='Number of parallel threads allocated to thumbnail extraction. 0 allocates threads automatically based on CPU topology.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={processThreads}
                                    onChange={(e) => setProcessThreads(parseInt(e.target.value || '0', 10))}
                                    InputProps={{ inputProps: { min: 0, max: 32, step: 1 } }}
                                    sx={{ width: 120 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Process Scheduling Priority'
                            description='Host OS CPU scheduling class. Running at Below Normal or Idle prevents background generation from causing playback stutter.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={processPriority}
                                    onChange={(e) => setProcessPriority(e.target.value as ProcessPriorityClass)}
                                    sx={{ width: 160 }}
                                >
                                    <MenuItem value={ProcessPriorityClass.Idle}>Idle (Background)</MenuItem>
                                    <MenuItem value={ProcessPriorityClass.BelowNormal}>Below Normal (Recommended)</MenuItem>
                                    <MenuItem value={ProcessPriorityClass.Normal}>Normal</MenuItem>
                                    <MenuItem value={ProcessPriorityClass.AboveNormal}>Above Normal</MenuItem>
                                    <MenuItem value={ProcessPriorityClass.High}>High</MenuItem>
                                </TextField>
                            }
                        />
                    </KhyloSettingSection>

                    {/* Geometry & Resolution */}
                    <KhyloSettingSection
                        title='Storyboard Geometry & Tile Resolution'
                        description='Configure the frequency, resolution, and mosaic dimensions of generated thumbnail sheets.'
                    >
                        <KhyloSettingRow
                            title='Snapshot Interval'
                            description='Elapsed video time between thumbnail snapshots. 10 seconds generates one scrubbing preview tile every 10 seconds of playback.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={intervalSec}
                                    onChange={(e) => setIntervalSec(parseInt(e.target.value || '0', 10))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position='end'>sec</InputAdornment>,
                                        inputProps: { min: 1, max: 120, step: 1 }
                                    }}
                                    sx={{ width: 130 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Thumbnail Width Resolutions'
                            description='Target horizontal pixel widths for thumbnail images. Comma-separated (e.g. 320 for standard timeline scrubbing).'
                            control={
                                <TextField
                                    size='small'
                                    value={widthResolutions}
                                    onChange={(e) => setWidthResolutions(e.target.value)}
                                    placeholder='320'
                                    sx={{ width: 160 }}
                                />
                            }
                        />

                        <KhyloSettingRow
                            title='Mosaic Grid Dimensions'
                            description='Number of horizontal columns and vertical rows per assembled thumbnail tile image (e.g. 10x10 creates 100 tiles per sheet).'
                            control={
                                <Stack direction='row' alignItems='center' spacing={1}>
                                    <TextField
                                        type='number'
                                        size='small'
                                        value={tileWidth}
                                        onChange={(e) => setTileWidth(parseInt(e.target.value || '10', 10))}
                                        InputProps={{ inputProps: { min: 1, max: 30, step: 1 } }}
                                        sx={{ width: 80 }}
                                    />
                                    <Box sx={{ color: KHYLO_COLORS.textMuted }}>×</Box>
                                    <TextField
                                        type='number'
                                        size='small'
                                        value={tileHeight}
                                        onChange={(e) => setTileHeight(parseInt(e.target.value || '10', 10))}
                                        InputProps={{ inputProps: { min: 1, max: 30, step: 1 } }}
                                        sx={{ width: 80 }}
                                    />
                                </Stack>
                            }
                        />

                        <KhyloSettingRow
                            title='JPEG Quality Factor'
                            description='Compression quality level for output images from 1 to 100. Lower values yield smaller storage footprint.'
                            control={
                                <TextField
                                    type='number'
                                    size='small'
                                    value={jpegQuality}
                                    onChange={(e) => setJpegQuality(parseInt(e.target.value || '90', 10))}
                                    InputProps={{ inputProps: { min: 1, max: 100, step: 5 } }}
                                    sx={{ width: 110 }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {/* Automation Behavior */}
                    <KhyloSettingSection
                        title='Automation & Scan Schedule'
                        description='Specify when trickplay generation tasks are triggered.'
                    >
                        <KhyloSettingRow
                            title='Library Ingestion Behavior'
                            description='Determines whether trickplay generation runs as an asynchronous background worker or during media library scans.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={scanBehavior}
                                    onChange={(e) => setScanBehavior(e.target.value as TrickplayScanBehavior)}
                                    sx={{ width: 220 }}
                                >
                                    <MenuItem value={TrickplayScanBehavior.NonBlocking}>
                                        Non-Blocking (Background Queue)
                                    </MenuItem>
                                    <MenuItem value={TrickplayScanBehavior.Blocking}>
                                        Blocking (During Library Scan)
                                    </MenuItem>
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
                        Trickplay generation configuration successfully saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'TrickplayPage';
export default Component;
