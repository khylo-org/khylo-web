import React, { FC, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useParams, useNavigate } from 'react-router-dom';

import { useServerLog } from 'apps/dashboard/features/logs/api/useServerLog';
import { copy } from 'scripts/clipboard';
import Toast from 'apps/dashboard/components/Toast';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloPanel,
    KhyloStatusBadge
} from '../../components/ui';

export const Component: FC = () => {
    const { file: fileName } = useParams<{ file: string }>();
    const navigate = useNavigate();
    const terminalRef = useRef<HTMLDivElement | null>(null);

    const [isCopiedToastOpen, setIsCopiedToastOpen] = useState(false);
    const [isWatchModeEnabled, setIsWatchModeEnabled] = useState(false);
    const [wasAtBottom, setWasAtBottom] = useState(true);

    const {
        isError: error,
        isPending: loading,
        data: log,
        refetch
    } = useServerLog(
        fileName ?? '',
        isWatchModeEnabled ? 2000 : false
    );

    const scrollToBottom = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, []);

    const toggleWatchMode = useCallback(() => {
        setIsWatchModeEnabled((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(scrollToBottom, 100);
            }
            return next;
        });
    }, [scrollToBottom]);

    const copyToClipboard = useCallback(async () => {
        if (log) {
            await copy(log);
            setIsCopiedToastOpen(true);
        }
    }, [log]);

    const downloadFile = useCallback(() => {
        if ('URL' in globalThis && log && fileName) {
            const blob = new Blob([log], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    }, [log, fileName]);

    useEffect(() => {
        const terminal = terminalRef.current;
        if (!terminal) return;

        const onScroll = () => {
            const atBottom = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight <= 15;
            setWasAtBottom(atBottom);
        };

        terminal.addEventListener('scroll', onScroll);
        return () => terminal.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (wasAtBottom) {
            scrollToBottom();
        }
    }, [log, scrollToBottom, wasAtBottom]);

    const logLines = useMemo(() => {
        if (!log) return [];
        return log.split('\n');
    }, [log]);

    const formatLogLine = useCallback((line: string, index: number) => {
        let color: string = KHYLO_COLORS.textSecondary;
        let badgeColor: string | null = null;
        let badgeText: string | null = null;

        if (line.includes('[ERR]') || line.includes('[Error]') || line.includes('Exception:')) {
            color = KHYLO_COLORS.status.danger.fg;
            badgeColor = 'rgba(239, 68, 68, 0.2)';
            badgeText = 'ERR';
        } else if (line.includes('[WRN]') || line.includes('[Warning]')) {
            color = KHYLO_COLORS.status.warning.fg;
            badgeColor = 'rgba(245, 158, 11, 0.2)';
            badgeText = 'WRN';
        } else if (line.includes('[INF]') || line.includes('[Information]')) {
            color = '#FAF8F5';
        } else if (line.includes('[DBG]') || line.includes('[Debug]')) {
            color = KHYLO_COLORS.textMuted;
        }

        return (
            <Box
                key={index}
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    px: 1.5,
                    py: 0.2,
                    fontSize: '0.78rem',
                    fontFamily: '"JetBrains Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace',
                    lineHeight: 1.5,
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' }
                }}
            >
                <Typography
                    component='span'
                    sx={{
                        color: 'rgba(255, 255, 255, 0.25)',
                        fontSize: '0.72rem',
                        userSelect: 'none',
                        minWidth: 42,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums'
                    }}
                >
                    {index + 1}
                </Typography>

                {badgeText && (
                    <Box
                        component='span'
                        sx={{
                            px: 0.6,
                            py: 0.1,
                            borderRadius: '3px',
                            bgcolor: badgeColor,
                            color: color,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            flexShrink: 0
                        }}
                    >
                        {badgeText}
                    </Box>
                )}

                <Typography
                    component='span'
                    sx={{
                        color: color,
                        fontSize: '0.78rem',
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap'
                    }}
                >
                    {line}
                </Typography>
            </Box>
        );
    }, []);

    return (
        <KhyloPage>
            <Toast
                open={isCopiedToastOpen}
                onClose={() => setIsCopiedToastOpen(false)}
                message='Log buffer copied to clipboard.'
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Diagnostics' },
                    { label: 'System Logs', href: '/dashboard/logs' },
                    { label: fileName || 'Log' }
                ]}
                title={fileName || 'Diagnostic Server Log'}
                subtitle={`Diagnostic output recorded from the Khylo server runtime. Inspect exceptions, request traces, and hardware encoder sessions.`}
                badge={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KhyloStatusBadge
                            label={isWatchModeEnabled ? 'LIVE POLLING (2s)' : 'STATIC ARCHIVE'}
                            color={isWatchModeEnabled ? 'healthy' : 'idle'}
                        />
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontFamily: 'monospace' }}>
                            {logLines.length.toLocaleString()} lines
                        </Typography>
                    </Box>
                }
                actions={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                            onClick={() => navigate('/dashboard/logs')}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textSecondary,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                '&:hover': { color: KHYLO_COLORS.textPrimary }
                            }}
                        >
                            All Logs
                        </Button>

                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={isWatchModeEnabled ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                            onClick={toggleWatchMode}
                            sx={{
                                textTransform: 'none',
                                borderColor: isWatchModeEnabled ? KHYLO_COLORS.status.healthy.border : KHYLO_COLORS.borderDefault,
                                color: isWatchModeEnabled ? KHYLO_COLORS.status.healthy.fg : KHYLO_COLORS.textPrimary,
                                bgcolor: isWatchModeEnabled ? KHYLO_COLORS.status.healthy.bg : 'transparent',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                '&:hover': { borderColor: KHYLO_COLORS.accent }
                            }}
                        >
                            {isWatchModeEnabled ? 'Pause Live' : 'Follow Tail'}
                        </Button>

                        <Tooltip title='Scroll to Bottom'>
                            <IconButton
                                size='small'
                                onClick={scrollToBottom}
                                sx={{ color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.textPrimary } }}
                            >
                                <ArrowDownwardIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='Copy Full Buffer'>
                            <IconButton
                                size='small'
                                onClick={copyToClipboard}
                                sx={{ color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.textPrimary } }}
                            >
                                <ContentCopyIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='Download Log File'>
                            <IconButton
                                size='small'
                                onClick={downloadFile}
                                sx={{ color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.textPrimary } }}
                            >
                                <DownloadIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                }
            />

            {error && (
                <Alert
                    severity='error'
                    sx={{ mb: 3 }}
                    action={
                        <Button color='inherit' size='small' onClick={() => refetch()}>
                            Retry
                        </Button>
                    }
                >
                    Failed to fetch server log file contents.
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            ) : (
                <KhyloPanel
                    sx={{
                        p: 0,
                        overflow: 'hidden',
                        bgcolor: '#08080A',
                        border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                        borderRadius: '8px'
                    }}
                >
                    {/* Terminal Top Bar */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 1,
                            bgcolor: '#111115',
                            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TerminalIcon sx={{ fontSize: 16, color: KHYLO_COLORS.accent }} />
                            <Typography
                                variant='caption'
                                sx={{
                                    fontFamily: 'monospace',
                                    color: KHYLO_COLORS.textPrimary,
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                }}
                            >
                                {fileName}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isWatchModeEnabled && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Box
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: KHYLO_COLORS.status.healthy.fg,
                                            animation: 'pulse 1.5s infinite'
                                        }}
                                    />
                                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.status.healthy.fg, fontSize: '0.7rem', fontWeight: 600 }}>
                                        Streaming Tail
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Monospace Output Body */}
                    <Box
                        ref={terminalRef}
                        sx={{
                            height: '70vh',
                            minHeight: 480,
                            overflowY: 'auto',
                            py: 1.5,
                            bgcolor: '#08080A',
                            '&::-webkit-scrollbar': { width: 6 },
                            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }
                        }}
                    >
                        {logLines.length === 0 ? (
                            <Typography sx={{ p: 2, color: KHYLO_COLORS.textMuted, fontStyle: 'italic', fontSize: '0.8rem' }}>
                                File is empty.
                            </Typography>
                        ) : (
                            logLines.map(formatLogLine)
                        )}
                    </Box>
                </KhyloPanel>
            )}
        </KhyloPage>
    );
};

export default Component;
