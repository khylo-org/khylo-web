import { getDisplayVersion } from '@khylo/sdk/lib/utils/versioning';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import React from 'react';

import khyloLogo from 'assets/img/khylo-logo.png';
import { useSystemInfo } from 'hooks/useSystemInfo';
import globalize from 'lib/globalize';

import Widget from './Widget';

type ServerInfoWidgetProps = {
    onScanLibrariesClick?: () => void;
    onRestartClick?: () => void;
    onShutdownClick?: () => void;
    isScanning?: boolean;
};

const ServerInfoWidget = ({
    onScanLibrariesClick,
    onRestartClick,
    onShutdownClick,
    isScanning
}: ServerInfoWidgetProps) => {
    const { data: systemInfo, isPending } = useSystemInfo();

    // The web app ships inside the server, so both carry the same Khylo build number
    const khyloBuild = (systemInfo as { KhyloVersion?: string } | undefined)?.KhyloVersion;
    const displayServerVersion = khyloBuild || systemInfo?.Version;
    const displayWebVersion = khyloBuild || getDisplayVersion(__PACKAGE_JSON_VERSION__);

    return (
        <Widget
            title={globalize.translate('TabServer')}
            href='/dashboard/settings'
        >
            <Stack spacing={2}>
                <Paper sx={{
                    padding: 2
                }}>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
                        <Box
                            component='img'
                            src={khyloLogo}
                            alt='Khylo'
                            sx={{ height: 36, maxWidth: 140, objectFit: 'contain' }}
                        />
                        {!isPending && systemInfo?.OperatingSystem && (
                            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {systemInfo.OperatingSystem}
                            </Typography>
                        )}
                    </Box>
                    <Stack direction='row'>
                        <Stack flexGrow={1} spacing={1}>
                            <Typography fontWeight='bold'>{globalize.translate('LabelServerName')}</Typography>
                            <Typography fontWeight='bold'>{globalize.translate('LabelServerVersion')}</Typography>
                            <Typography fontWeight='bold'>{globalize.translate('LabelWebVersion')}</Typography>
                            <Typography fontWeight='bold'>{globalize.translate('LabelBuildVersion')}</Typography>
                        </Stack>
                        <Stack flexGrow={5} spacing={1}>
                            <>
                                {isPending ? (
                                    <>
                                        <Skeleton />
                                        <Skeleton />
                                    </>
                                ) : (
                                    <>
                                        <Typography>{systemInfo?.ServerName}</Typography>
                                        <Typography>{displayServerVersion}</Typography>
                                    </>
                                )}
                                <Typography>{displayWebVersion}</Typography>
                                <Typography>{__JF_BUILD_VERSION__}</Typography>
                            </>
                        </Stack>
                    </Stack>
                </Paper>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                >
                    <Button
                        onClick={onScanLibrariesClick}
                        startIcon={<RefreshIcon />}
                        sx={{
                            fontWeight: 'bold'
                        }}
                        loading={isScanning}
                        loadingPosition='start'
                    >
                        {globalize.translate('ButtonScanAllLibraries')}
                    </Button>

                    <Button
                        onClick={onRestartClick}
                        startIcon={<RestartAltIcon />}
                        color='error'
                        sx={{
                            fontWeight: 'bold'
                        }}
                    >
                        {globalize.translate('Restart')}
                    </Button>

                    <Button
                        onClick={onShutdownClick}
                        startIcon={<PowerSettingsNewIcon />}
                        color='error'
                        sx={{
                            fontWeight: 'bold'
                        }}
                    >
                        {globalize.translate('ButtonShutdown')}
                    </Button>
                </Stack>
            </Stack>
        </Widget>
    );
};

export default ServerInfoWidget;
