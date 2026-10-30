import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { type ActionFunctionArgs, useSubmit, useNavigation, useActionData } from 'react-router-dom';

import type { BrandingOptionsDto } from '@khylo/sdk/lib/generated-client/models/branding-options-dto';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { getImageApi } from '@khylo/sdk/lib/utils/api/image-api';
import { ServerConnections } from 'lib/khylo-apiclient';
import { QUERY_KEY, useBrandingOptions } from 'apps/dashboard/features/branding/api/useBrandingOptions';
import { queryClient } from 'utils/query/queryClient';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import Image from 'components/Image';
import { SPLASHSCREEN_URL } from 'constants/branding';
import { useApi } from 'hooks/useApi';
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

const BRANDING_CONFIG_KEY = 'branding';

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getApi();
    if (!api) throw new Error('No Api instance available');

    const payload = await request.json() as BrandingOptionsDto;

    await getSystemApi(api).updateNamedConfiguration({
        key: BRANDING_CONFIG_KEY,
        body: JSON.stringify(payload)
    });

    void queryClient.invalidateQueries({
        queryKey: [QUERY_KEY]
    });

    return { isSaved: true };
};

export const Component: FC = () => {
    const { api } = useApi();
    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';
    const submit = useSubmit();

    const { data: defaultBranding, isPending, isError } = useBrandingOptions();

    const [customCss, setCustomCss] = useState('');
    const [loginDisclaimer, setLoginDisclaimer] = useState('');
    const [splashscreenEnabled, setSplashscreenEnabled] = useState(false);
    const [splashscreenUrl, setSplashscreenUrl] = useState<string>();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [savedNoticeOpen, setSavedNoticeOpen] = useState(false);

    useEffect(() => {
        if (defaultBranding) {
            setCustomCss(defaultBranding.CustomCss || '');
            setLoginDisclaimer(defaultBranding.LoginDisclaimer || '');
            setSplashscreenEnabled(Boolean(defaultBranding.SplashscreenEnabled));
        }
    }, [defaultBranding]);

    useEffect(() => {
        if (api && !isSubmitting) {
            setSplashscreenUrl(api.getUri(SPLASHSCREEN_URL, { t: Date.now() }));
        }
    }, [api, isSubmitting]);

    useEffect(() => {
        if (actionData?.isSaved) {
            setSavedNoticeOpen(true);
        }
    }, [actionData]);

    const onSplashscreenDelete = useCallback(async () => {
        setErrorMsg(null);
        if (!api) return;
        try {
            await getImageApi(api).deleteCustomSplashscreen();
            setSplashscreenUrl(api.getUri(SPLASHSCREEN_URL, { t: Date.now() }));
        } catch {
            setErrorMsg('Failed to delete custom splashscreen.');
        }
    }, [api]);

    const onSplashscreenUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMsg(null);
        const files = event.target.files;
        if (!api || !files?.length) return;

        const file = files[0];
        const reader = new FileReader();
        reader.onerror = () => setErrorMsg('Failed to read image file.');
        reader.onload = async () => {
            if (!reader.result) return;
            const dataUrl = reader.result as string;
            const body = dataUrl.split(',')[1] as never;
            try {
                await getImageApi(api).uploadCustomSplashscreen(
                    { body },
                    { headers: { ['Content-Type']: file.type } }
                );
                setSplashscreenUrl(dataUrl);
            } catch {
                setErrorMsg('Failed to upload custom splashscreen image.');
            }
        };
        reader.readAsDataURL(file);
    }, [api]);

    const isDirty = useMemo(() => {
        if (!defaultBranding) return false;
        return (
            customCss !== (defaultBranding.CustomCss || '') ||
            loginDisclaimer !== (defaultBranding.LoginDisclaimer || '') ||
            splashscreenEnabled !== Boolean(defaultBranding.SplashscreenEnabled)
        );
    }, [defaultBranding, customCss, loginDisclaimer, splashscreenEnabled]);

    const handleSave = useCallback(() => {
        const payload: BrandingOptionsDto = {
            CustomCss: customCss,
            LoginDisclaimer: loginDisclaimer.trim() || undefined,
            SplashscreenEnabled: splashscreenEnabled
        };
        submit(payload as any, { method: 'post', encType: 'application/json' });
    }, [customCss, loginDisclaimer, splashscreenEnabled, submit]);

    const handleDiscard = useCallback(() => {
        if (defaultBranding) {
            setCustomCss(defaultBranding.CustomCss || '');
            setLoginDisclaimer(defaultBranding.LoginDisclaimer || '');
            setSplashscreenEnabled(Boolean(defaultBranding.SplashscreenEnabled));
        }
    }, [defaultBranding]);

    if (isPending) return <Loading />;

    return (
        <Page id='brandingPage' title='Branding & Appearance' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'System' },
                        { label: 'Appearance' }
                    ]}
                    title='Client Appearance & Branding'
                    subtitle='Login disclaimers, custom CSS rules, and client boot splashscreen assets.'
                    badge={
                        <KhyloStatusBadge
                            label={splashscreenEnabled ? 'Custom Splashscreen Active' : 'Default Assets'}
                            color={splashscreenEnabled ? 'healthy' : 'idle'}
                        />
                    }
                />

                {isError && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Failed to retrieve branding settings.
                    </Alert>
                )}

                {errorMsg && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        {errorMsg}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 12 }}>
                    {/* Splashscreen */}
                    <KhyloSettingSection
                        title='Client Boot Splashscreen'
                        description='Hero image presented while media player clients initialize.'
                    >
                        <KhyloSettingRow
                            title='Enable Custom Splashscreen'
                            description='Display uploaded graphic during client loading and boot sequences.'
                            control={
                                <Switch
                                    checked={splashscreenEnabled}
                                    onChange={(_, checked) => setSplashscreenEnabled(checked)}
                                    color='primary'
                                />
                            }
                        />

                        <Box sx={{ p: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'center' }}>
                            <Box
                                sx={{
                                    width: { xs: '100%', sm: 300 },
                                    height: 170,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                    bgcolor: KHYLO_COLORS.surfaceSecondary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Image
                                    isLoading={false}
                                    url={splashscreenEnabled ? splashscreenUrl : undefined}
                                />
                            </Box>

                            <Stack spacing={1.5}>
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, display: 'block', maxWidth: 360 }}>
                                    Recommended resolution: 1920×1080 (16:9 aspect ratio). Supports PNG and JPEG formats.
                                </Typography>
                                <Stack direction='row' spacing={1}>
                                    <Button
                                        variant='contained'
                                        component='label'
                                        size='small'
                                        startIcon={<UploadIcon />}
                                        sx={{
                                            bgcolor: KHYLO_COLORS.accent,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.8rem',
                                            '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                        }}
                                    >
                                        Upload Image
                                        <input
                                            type='file'
                                            hidden
                                            accept='image/png, image/jpeg, image/webp'
                                            onChange={onSplashscreenUpload}
                                        />
                                    </Button>

                                    <Button
                                        variant='outlined'
                                        color='error'
                                        size='small'
                                        startIcon={<DeleteOutlineIcon />}
                                        onClick={onSplashscreenDelete}
                                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                                    >
                                        Reset to Default
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>
                    </KhyloSettingSection>

                    {/* Disclaimer & Custom CSS */}
                    <KhyloSettingSection
                        title='Login Disclaimer & Client Overrides'
                        description='Custom informational text and CSS styles injected into web and desktop clients.'
                    >
                        <KhyloSettingRow
                            title='Login Screen Notice / Disclaimer'
                            description='Informational banner displayed below credentials form on client authentication screens.'
                            control={
                                <TextField
                                    size='small'
                                    multiline
                                    rows={2}
                                    value={loginDisclaimer}
                                    onChange={(e) => setLoginDisclaimer(e.target.value)}
                                    placeholder='Authorized users only. All activity is logged.'
                                    sx={{ width: { xs: '100%', sm: 360 } }}
                                />
                            }
                        />

                        <Box sx={{ p: 2.5, borderTop: `1px solid ${KHYLO_COLORS.borderSubtle}` }}>
                            <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary, mb: 0.5 }}>
                                Custom Client CSS Rules
                            </Typography>
                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, mb: 1.5, display: 'block' }}>
                                Raw CSS rules injected directly into consumer web and desktop client applications.
                            </Typography>
                            <TextField
                                multiline
                                rows={6}
                                fullWidth
                                value={customCss}
                                onChange={(e) => setCustomCss(e.target.value)}
                                placeholder='/* Custom CSS rules */'
                                InputProps={{
                                    sx: {
                                        fontFamily: 'monospace',
                                        fontSize: '0.82rem',
                                        bgcolor: KHYLO_COLORS.surfaceSecondary
                                    }
                                }}
                            />
                        </Box>
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
                        Appearance preferences saved.
                    </Alert>
                </Snackbar>
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'BrandingPage';
export default Component;
