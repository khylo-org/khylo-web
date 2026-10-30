import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { EncodingOptions } from '@khylo/sdk/lib/generated-client/models/encoding-options';
import { HardwareAccelerationType } from '@khylo/sdk/lib/generated-client/models/hardware-acceleration-type';
import { ServerConnections } from 'lib/khylo-apiclient';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { ActionData } from 'types/actionData';
import { CODECS } from 'apps/dashboard/features/playback/constants/codecs';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloTabs,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge
} from '../../components/ui';

const CONFIG_KEY = 'encoding';

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const data = await request.json() as EncodingOptions;

    await getSystemApi(api).updateNamedConfiguration({ key: CONFIG_KEY, body: data });

    void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, CONFIG_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const { data: initialConfig, isPending } = useNamedConfiguration<EncodingOptions>(CONFIG_KEY);
    const [config, setConfig] = useState<EncodingOptions | null>(null);
    const [activeTab, setActiveTab] = useState('hardware');
    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    const submit = useSubmit();
    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';

    useEffect(() => {
        if (initialConfig && config == null) {
            setConfig(initialConfig);
        }
    }, [initialConfig, config]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const isDirty = useMemo(() => {
        if (!initialConfig || !config) return false;
        return JSON.stringify(initialConfig) !== JSON.stringify(config);
    }, [initialConfig, config]);

    const handleTextChange = useCallback((key: keyof EncodingOptions, value: any) => {
        if (!config) return;
        setConfig({ ...config, [key]: value });
    }, [config]);

    const handleSwitchChange = useCallback((key: keyof EncodingOptions, checked: boolean) => {
        if (!config) return;
        setConfig({ ...config, [key]: checked });
    }, [config]);

    const handleCodecToggle = useCallback((codecName: string, enabled: boolean) => {
        if (!config) return;
        const current = config.HardwareDecodingCodecs || [];
        const next = enabled
            ? [...current, codecName]
            : current.filter(c => c !== codecName);
        setConfig({ ...config, HardwareDecodingCodecs: next });
    }, [config]);

    const handleSave = useCallback(() => {
        if (!config) return;
        submit(
            { ...config },
            { method: 'post', encType: 'application/json' }
        );
    }, [config, submit]);

    const handleDiscard = useCallback(() => {
        if (initialConfig) {
            setConfig(initialConfig);
        }
    }, [initialConfig]);

    if (isPending || !config) {
        return (
            <KhyloPage>
                <Typography color='text.secondary'>Loading transcoding configuration…</Typography>
            </KhyloPage>
        );
    }

    const hwaType = config.HardwareAccelerationType || HardwareAccelerationType.None;
    const isHwaEnabled = hwaType !== HardwareAccelerationType.None;

    const availableCodecs = CODECS.filter(codec => codec.types.includes(hwaType));

    const TABS = [
        { id: 'hardware', label: 'Hardware Acceleration' },
        { id: 'video', label: 'Video & Encoders' },
        { id: 'hdr', label: 'HDR & Tone Mapping' },
        { id: 'subtitles', label: 'Subtitles & Fonts' },
        { id: 'resources', label: 'Resource Limits' }
    ];

    return (
        <KhyloPage>
            <Snackbar
                open={savedNoticeOpen}
                autoHideDuration={4000}
                onClose={() => setSavedNoticeOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity='success' sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.status.healthy.fg }}>
                    Transcoding engine configuration successfully saved.
                </Alert>
            </Snackbar>

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Playback Engine' },
                    { label: 'Hardware Transcoding' }
                ]}
                title='Hardware Transcoding & Acceleration Engine'
                subtitle='Configure GPU hardware-accelerated transcoding pipelines, tone-mapping algorithms, and resource throttling.'
                badge={
                    <KhyloStatusBadge
                        label={isHwaEnabled ? `HW Accel: ${hwaType.toUpperCase()}` : 'Software Only'}
                        color={isHwaEnabled ? 'healthy' : 'idle'}
                        size='medium'
                    />
                }
            />

            <KhyloTabs
                tabs={TABS}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {/* TAB 1: Hardware Acceleration */}
            {activeTab === 'hardware' && (
                <Box>
                    <KhyloSettingSection
                        title='Acceleration Pipeline'
                        description='Select GPU architecture driver used by FFmpeg for hardware-accelerated decoding and encoding.'
                    >
                        <KhyloSettingRow
                            title='Hardware Acceleration Type'
                            description='GPU driver interface for hardware transcoding. Requires compatible GPU drivers installed.'
                            control={
                                <TextField
                                    select
                                    size='small'
                                    value={hwaType}
                                    onChange={(e) => handleTextChange('HardwareAccelerationType', e.target.value)}
                                    sx={{ width: 220 }}
                                >
                                    <MenuItem value={HardwareAccelerationType.None}>None (Software CPU)</MenuItem>
                                    <MenuItem value={HardwareAccelerationType.Qsv}>Intel QuickSync (QSV)</MenuItem>
                                    <MenuItem value={HardwareAccelerationType.Nvenc}>NVIDIA NVENC</MenuItem>
                                    <MenuItem value={HardwareAccelerationType.Vaapi}>Video Acceleration API (VAAPI)</MenuItem>
                                    <MenuItem value={HardwareAccelerationType.Amf}>AMD AMF</MenuItem>
                                    <MenuItem value={HardwareAccelerationType.Videotoolbox}>Apple VideoToolBox</MenuItem>
                                </TextField>
                            }
                        />

                        {hwaType === HardwareAccelerationType.Vaapi && (
                            <KhyloSettingRow
                                isDependent
                                title='VAAPI Device Path'
                                description='Render node device path for VAAPI GPU execution (e.g. /dev/dri/renderD128).'
                                control={
                                    <TextField
                                        size='small'
                                        value={config.VaapiDevice || ''}
                                        onChange={(e) => handleTextChange('VaapiDevice', e.target.value)}
                                        placeholder='/dev/dri/renderD128'
                                        sx={{ width: 240 }}
                                    />
                                }
                            />
                        )}

                        <KhyloSettingRow
                            title='Enable Hardware Encoding'
                            description='Use GPU hardware encoder when remuxing and streaming video. If disabled, CPU encodes video output.'
                            control={
                                <Switch
                                    checked={Boolean(config.EnableHardwareEncoding)}
                                    onChange={(e) => handleSwitchChange('EnableHardwareEncoding', e.target.checked)}
                                    sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                                />
                            }
                        />
                    </KhyloSettingSection>

                    {isHwaEnabled && availableCodecs.length > 0 && (
                        <KhyloSettingSection
                            title='Hardware Decoding Codecs'
                            description='Enable hardware-accelerated video decoding for each supported input stream format.'
                        >
                            {availableCodecs.map((codec) => {
                                const isChecked = (config.HardwareDecodingCodecs || []).includes(codec.name);
                                return (
                                    <KhyloSettingRow
                                        key={codec.name}
                                        title={codec.name}
                                        description={`Hardware-accelerate decoding for ${codec.name} streams.`}
                                        control={
                                            <Switch
                                                checked={isChecked}
                                                onChange={(e) => handleCodecToggle(codec.name, e.target.checked)}
                                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                                            />
                                        }
                                    />
                                );
                            })}
                        </KhyloSettingSection>
                    )}
                </Box>
            )}

            {/* TAB 2: Video & Encoders */}
            {activeTab === 'video' && (
                <KhyloSettingSection
                    title='Encoder Profiles & Rate Control'
                    description='Control quality, target bitrate curves, and compression presets for generated video streams.'
                >
                    <KhyloSettingRow
                        title='Encoder Preset'
                        description='Speed vs compression efficiency tradeoff. Faster presets decrease CPU/GPU load but increase bandwidth.'
                        control={
                            <TextField
                                select
                                size='small'
                                value={config.EncoderPreset || 'auto'}
                                onChange={(e) => handleTextChange('EncoderPreset', e.target.value)}
                                sx={{ width: 200 }}
                            >
                                <MenuItem value='auto'>Automatic (Recommended)</MenuItem>
                                <MenuItem value='ultrafast'>Ultra Fast</MenuItem>
                                <MenuItem value='superfast'>Super Fast</MenuItem>
                                <MenuItem value='veryfast'>Very Fast</MenuItem>
                                <MenuItem value='faster'>Faster</MenuItem>
                                <MenuItem value='fast'>Fast</MenuItem>
                                <MenuItem value='medium'>Medium</MenuItem>
                                <MenuItem value='slow'>Slow</MenuItem>
                            </TextField>
                        }
                    />

                    <KhyloSettingRow
                        title='H.264 Constant Rate Factor (CRF)'
                        description='Visual quality rating for H.264 streams (range 0–51, lower means higher quality). Default: 23.'
                        control={
                            <TextField
                                type='number'
                                size='small'
                                value={config.H264Crf ?? 23}
                                onChange={(e) => handleTextChange('H264Crf', parseInt(e.target.value, 10))}
                                inputProps={{ min: 0, max: 51 }}
                                sx={{ width: 120 }}
                            />
                        }
                    />

                    <KhyloSettingRow
                        title='H.265 (HEVC) Constant Rate Factor (CRF)'
                        description='Visual quality rating for HEVC streams (range 0–51, lower means higher quality). Default: 28.'
                        control={
                            <TextField
                                type='number'
                                size='small'
                                value={config.H265Crf ?? 28}
                                onChange={(e) => handleTextChange('H265Crf', parseInt(e.target.value, 10))}
                                inputProps={{ min: 0, max: 51 }}
                                sx={{ width: 120 }}
                            />
                        }
                    />

                    <KhyloSettingRow
                        title='Deinterlace Double Rate'
                        description='Produce 50/60fps video from 25/30i interlaced broadcasts by doubling output frame rate.'
                        control={
                            <Switch
                                checked={Boolean(config.DeinterlaceDoubleRate)}
                                onChange={(e) => handleSwitchChange('DeinterlaceDoubleRate', e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />
                </KhyloSettingSection>
            )}

            {/* TAB 3: HDR & Tone Mapping */}
            {activeTab === 'hdr' && (
                <KhyloSettingSection
                    title='HDR Dynamic Tone Mapping'
                    description='Maps high dynamic range (HDR10/Dolby Vision/HLG) video color palettes into standard dynamic range (SDR) for client compatibility.'
                >
                    <KhyloSettingRow
                        title='Enable Tone Mapping'
                        description='Convert HDR color space and luminance curves to SDR when transcoding for SDR displays.'
                        control={
                            <Switch
                                checked={Boolean(config.EnableTonemapping)}
                                onChange={(e) => handleSwitchChange('EnableTonemapping', e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />

                    <KhyloSettingRow
                        isDependent
                        disabled={!config.EnableTonemapping}
                        title='Tone Mapping Algorithm'
                        description='Mathematical curve algorithm for color gamut and luminance compression.'
                        control={
                            <TextField
                                select
                                size='small'
                                value={config.TonemappingAlgorithm || 'bt2390'}
                                onChange={(e) => handleTextChange('TonemappingAlgorithm', e.target.value)}
                                sx={{ width: 200 }}
                            >
                                <MenuItem value='bt2390'>ITU-R BT.2390 (Recommended)</MenuItem>
                                <MenuItem value='reinhard'>Reinhard</MenuItem>
                                <MenuItem value='hable'>Hable (Uncharted 2)</MenuItem>
                                <MenuItem value='mobius'>Mobius</MenuItem>
                                <MenuItem value='none'>Clip (Linear)</MenuItem>
                            </TextField>
                        }
                    />

                    <KhyloSettingRow
                        isDependent
                        disabled={!config.EnableTonemapping}
                        title='Tone Mapping Range'
                        description='Color range conversion mode during tone mapping pass.'
                        control={
                            <TextField
                                select
                                size='small'
                                value={config.TonemappingRange || 'auto'}
                                onChange={(e) => handleTextChange('TonemappingRange', e.target.value)}
                                sx={{ width: 180 }}
                            >
                                <MenuItem value='auto'>Automatic</MenuItem>
                                <MenuItem value='tv'>Limited (TV / Video)</MenuItem>
                                <MenuItem value='pc'>Full (PC / RGB)</MenuItem>
                            </TextField>
                        }
                    />
                </KhyloSettingSection>
            )}

            {/* TAB 4: Subtitles & Fonts */}
            {activeTab === 'subtitles' && (
                <KhyloSettingSection
                    title='Subtitle Processing & Burn-in'
                    description='Configure text rendering and bitmap extraction for subtitles when playing on non-native clients.'
                >
                    <KhyloSettingRow
                        title='Enable Subtitle Extraction'
                        description='Extract embedded text subtitle tracks during playback for client-side rendering.'
                        control={
                            <Switch
                                checked={Boolean(config.EnableSubtitleExtraction)}
                                onChange={(e) => handleSwitchChange('EnableSubtitleExtraction', e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />

                    <KhyloSettingRow
                        title='Enable Fallback Font'
                        description='Use custom fallback font file for exotic subtitle glyphs and non-latin scripts.'
                        control={
                            <Switch
                                checked={Boolean(config.EnableFallbackFont)}
                                onChange={(e) => handleSwitchChange('EnableFallbackFont', e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />

                    {config.EnableFallbackFont && (
                        <KhyloSettingRow
                            isDependent
                            title='Fallback Font Path'
                            description='Filesystem path to TTF or OTF font file.'
                            control={
                                <TextField
                                    size='small'
                                    value={config.FallbackFontPath || ''}
                                    onChange={(e) => handleTextChange('FallbackFontPath', e.target.value)}
                                    placeholder='/path/to/font.ttf'
                                    sx={{ width: 260 }}
                                />
                            }
                        />
                    )}
                </KhyloSettingSection>
            )}

            {/* TAB 5: Resource Limits */}
            {activeTab === 'resources' && (
                <KhyloSettingSection
                    title='Thread Allocation & Buffer Queues'
                    description='Control multi-core CPU utilization and disk caching thresholds during intensive transcode sessions.'
                >
                    <KhyloSettingRow
                        title='Encoding Thread Count'
                        description='Number of concurrent CPU threads allocated per transcode job. 0 = automatic core detection.'
                        control={
                            <TextField
                                type='number'
                                size='small'
                                value={config.EncodingThreadCount ?? 0}
                                onChange={(e) => handleTextChange('EncodingThreadCount', parseInt(e.target.value, 10))}
                                inputProps={{ min: 0, max: 128 }}
                                sx={{ width: 120 }}
                            />
                        }
                    />

                    <KhyloSettingRow
                        title='Transcoding Temporary Cache Path'
                        description='Directory where active HLS chunk files and stream segments are written. Fast SSD/RAM recommended.'
                        control={
                            <TextField
                                size='small'
                                value={config.TranscodingTempPath || ''}
                                onChange={(e) => handleTextChange('TranscodingTempPath', e.target.value)}
                                placeholder='Default: server cache directory'
                                sx={{ width: 280 }}
                            />
                        }
                    />

                    <KhyloSettingRow
                        title='Max Muxing Queue Size'
                        description='Maximum number of packets buffered in memory during muxing passes. Default: 2048.'
                        control={
                            <TextField
                                type='number'
                                size='small'
                                value={config.MaxMuxingQueueSize ?? 2048}
                                onChange={(e) => handleTextChange('MaxMuxingQueueSize', parseInt(e.target.value, 10))}
                                inputProps={{ min: 512, max: 16384 }}
                                sx={{ width: 140 }}
                            />
                        }
                    />
                </KhyloSettingSection>
            )}

            <KhyloStickyActionBar
                isDirty={isDirty}
                isSaving={isSubmitting}
                onSave={handleSave}
                onDiscard={handleDiscard}
                saveLabel='Save Configuration'
            />
        </KhyloPage>
    );
};

export default Component;
