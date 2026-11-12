import React, { FC, useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MovieIcon from '@mui/icons-material/Movie';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getLibraryStructureApi } from '@khylo/sdk/lib/utils/api/library-structure-api';
import type { VirtualFolderInfo } from '@khylo/sdk/lib/generated-client/models/virtual-folder-info';

import { useApi } from 'hooks/useApi';
import { QUERY_KEY as VIRTUAL_FOLDERS_KEY, useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import { lastScannedLabel, scanJustEnded, scanView, type ScanRequest } from 'apps/dashboard/features/libraries/api/scanStatus';
import { getCurrentLibrary, serverReason, GONE_MESSAGE } from 'apps/dashboard/features/libraries/api/currentLibrary';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ConfirmDialog from 'components/ConfirmDialog';
import { ServerConnections } from 'lib/khylo-apiclient';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloDataTable,
    KhyloStatusBadge,
    KhyloEmptyState,
    type ColumnDef
} from '../../components/ui';

interface DomainMeta {
    label: string;
    icon: React.ReactNode;
}

const DOMAIN_MAP: Record<string, DomainMeta> = {
    movies: { label: 'Movies', icon: <MovieIcon sx={{ fontSize: 16 }} /> },
    tvshows: { label: 'Television', icon: <LiveTvIcon sx={{ fontSize: 16 }} /> },
    music: { label: 'Music', icon: <LibraryMusicIcon sx={{ fontSize: 16 }} /> },
    musicvideos: { label: 'Music Videos', icon: <VideocamIcon sx={{ fontSize: 16 }} /> },
    audiobooks: { label: 'Audiobooks', icon: <HeadphonesIcon sx={{ fontSize: 16 }} /> },
    podcasts: { label: 'Podcasts', icon: <PodcastsIcon sx={{ fontSize: 16 }} /> },
    books: { label: 'Books & Ebooks', icon: <MenuBookIcon sx={{ fontSize: 16 }} /> },
    comics: { label: 'Comics', icon: <AutoStoriesIcon sx={{ fontSize: 16 }} /> },
    photos: { label: 'Photos', icon: <PhotoLibraryIcon sx={{ fontSize: 16 }} /> },
    homevideos: { label: 'Home Videos', icon: <VideocamIcon sx={{ fontSize: 16 }} /> },
    mixed: { label: 'Mixed Media', icon: <FolderSpecialIcon sx={{ fontSize: 16 }} /> }
};

const LAST_SCAN_KEY = 'khylo.lastLibraryScan.';

const getLastScan = (id: string): number | undefined => {
    try {
        const saved = Number(window.localStorage.getItem(LAST_SCAN_KEY + id));
        return Number.isFinite(saved) && saved > 0 ? saved : undefined;
    } catch {
        return undefined;
    }
};

const setLastScan = (id: string, at: number) => {
    try {
        window.localStorage.setItem(LAST_SCAN_KEY + id, String(at));
    } catch {
        // Not remembered when the browser won't store it
    }
};

interface ScanLineProps {
    request: ScanRequest | undefined;
    folder: { RefreshStatus?: string | null; RefreshProgress?: number | null };
    now: number;
    lastScan: number | undefined;
}

/** Under a library's name: whether it is scanning right now, or when it was last scanned from here. */
const ScanLine: FC<ScanLineProps> = ({ request, folder, now, lastScan }) => {
    const view = scanView(request, folder, now);
    if (view.state === 'scanning') {
        return (
            <Box sx={{ minWidth: 150 }}>
                <Typography variant='caption' sx={{ color: KHYLO_COLORS.accent, fontWeight: 600 }}>
                    {view.percent === undefined ? 'Scanning…' : `Scanning… ${view.percent}%`}
                </Typography>
                <LinearProgress
                    variant={view.percent === undefined ? 'indeterminate' : 'determinate'}
                    value={view.percent}
                    sx={{ height: 3, borderRadius: 2, mt: 0.25, bgcolor: KHYLO_COLORS.borderDefault, '& .MuiLinearProgress-bar': { bgcolor: KHYLO_COLORS.accent } }}
                />
            </Box>
        );
    }
    if (view.state === 'starting') {
        return <Typography variant='caption' sx={{ color: KHYLO_COLORS.accent, fontWeight: 600 }}>Scan starting…</Typography>;
    }
    if (lastScan) {
        return <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>{`Last scanned ${lastScannedLabel(lastScan, now)}`}</Typography>;
    }
    return null;
};

export const Component: FC = () => {
    const navigate = useNavigate();
    const { api } = useApi();
    const queryClient = useQueryClient();
    // Scans asked for from this page, by library id, until they have ended
    const [ scans, setScans ] = useState<Record<string, ScanRequest>>({});
    const watching = Object.keys(scans).length > 0;
    const { data: virtualFolders, isPending: isLoading } = useVirtualFolders(watching);
    const [ now, setNow ] = useState(() => Date.now());

    useEffect(() => {
        if (!watching) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [ watching ]);

    // Notice a scan beginning and ending, say so once, and remember when it ended
    useEffect(() => {
        if (!watching) return;
        const ended: string[] = [];
        const next: Record<string, ScanRequest> = {};
        for (const [ id, request ] of Object.entries(scans)) {
            const folder = virtualFolders?.find(f => (f.ItemId || f.Name) === id);
            const seen = request.seenActive || folder?.RefreshStatus === 'Active';
            const current = { ...request, seenActive: seen };
            if (scanJustEnded(current, scanView(current, folder, now))) {
                ended.push(id);
                setLastScan(id, now);
                setNotice(`Finished scanning \u201c${folder?.Name ?? 'the library'}\u201d.`);
            } else {
                next[id] = current;
            }
        }
        if (ended.length > 0 || Object.keys(next).some(id => next[id].seenActive !== scans[id].seenActive)) setScans(next);
    }, [ virtualFolders, now, scans, watching ]);
    const { data: tasks } = useLiveTasks({ isHidden: false });
    const startTask = useStartTask();

    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const librariesTask = useMemo(() => tasks?.find(v => v.Key === 'RefreshLibrary'), [tasks]);

    const handleScanAll = useCallback(() => {
        if (librariesTask?.Id) {
            startTask.mutate({ taskId: librariesTask.Id });
        }
    }, [librariesTask, startTask]);

    const [ actionError, setActionError ] = useState<string | null>(null);
    const [ notice, setNotice ] = useState<string | null>(null);
    const [ scanning, setScanning ] = useState<Set<string>>(() => new Set());

    // Scans one library for new and changed files, the way a scan of everything does, without touching the others
    const handleScanLibrary = useCallback(async (lib: VirtualFolderInfo) => {
        const apiClient = ServerConnections.currentApiClient();
        if (!api || !apiClient) return;
        const key = String(lib.ItemId || lib.Name);
        setScanning(prev => new Set(prev).add(key));
        try {
            // The library's current id first: renaming a library gives it a new one
            const current = await getCurrentLibrary(api, lib);
            if (!current?.ItemId) {
                void queryClient.invalidateQueries({ queryKey: [ VIRTUAL_FOLDERS_KEY ] });
                setActionError(GONE_MESSAGE);
                return;
            }
            await apiClient.refreshItem(current.ItemId, {
                Recursive: true,
                ImageRefreshMode: 'Default',
                MetadataRefreshMode: 'Default',
                ReplaceAllImages: false,
                ReplaceAllMetadata: false
            });
            setScans(prev => ({ ...prev, [key]: { startedAt: Date.now(), seenActive: false } }));
            setNotice(`Scan of \u201c${lib.Name}\u201d started. Its progress shows on its row.`);
        } catch (err: unknown) {
            console.error('Failed to scan library', err);
            setActionError(serverReason(err, `Couldn’t start a scan of “${lib.Name}”.`));
        } finally {
            setScanning(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [api, queryClient]);

    const handleDelete = useCallback(async () => {
        if (!deleteTarget || !api) return;
        try {
            const current = await getCurrentLibrary(api, { ItemId: deleteTarget.id, Name: deleteTarget.name });
            if (current?.Name) {
                await getLibraryStructureApi(api).removeVirtualFolder({ name: current.Name, refreshLibrary: true });
            }
            void queryClient.invalidateQueries({ queryKey: [ VIRTUAL_FOLDERS_KEY ] });
            setDeleteTarget(null);
        } catch (e) {
            console.error('Failed to remove library', e);
            setDeleteTarget(null);
            setActionError(serverReason(e, 'Couldn\u2019t remove the library.'));
            void queryClient.invalidateQueries({ queryKey: [ VIRTUAL_FOLDERS_KEY ] });
        }
    }, [deleteTarget, api, queryClient]);

    const filteredLibraries = useMemo(() => {
        if (!virtualFolders) return [];
        if (!searchTerm) return virtualFolders;
        const q = searchTerm.toLowerCase();
        return virtualFolders.filter((f: any) =>
            f.Name?.toLowerCase().includes(q) ||
            f.CollectionType?.toLowerCase().includes(q) ||
            f.Locations?.some((loc: string) => loc.toLowerCase().includes(q))
        );
    }, [virtualFolders, searchTerm]);

    const columns: ColumnDef<any>[] = [
        {
            id: 'name',
            header: 'Library & Domain',
            width: '28%',
            render: (lib: any) => {
                const domainKey = lib.CollectionType || 'mixed';
                const domain = DOMAIN_MAP[domainKey] || { label: domainKey, icon: <FolderSpecialIcon sx={{ fontSize: 16 }} /> };

                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '6px',
                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: KHYLO_COLORS.accent,
                                flexShrink: 0
                            }}
                        >
                            {domain.icon}
                        </Box>
                        <Box>
                            <Typography variant='body2' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary }}>
                                {lib.Name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                                <KhyloStatusBadge label={domain.label} color='idle' />
                                <ScanLine request={scans[String(lib.ItemId || lib.Name)]} folder={lib} now={now} lastScan={getLastScan(String(lib.ItemId || lib.Name))} />
                            </Box>
                        </Box>
                    </Box>
                );
            }
        },
        {
            id: 'locations',
            header: 'Storage Mount Roots',
            width: '42%',
            render: (lib: any) => {
                const locs = lib.Locations || [];
                if (locs.length === 0) {
                    return (
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.status.warning.fg }}>
                            No paths assigned
                        </Typography>
                    );
                }

                return (
                    <Stack spacing={0.5}>
                        {locs.map((loc: string, i: number) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleOutlineIcon sx={{ fontSize: 14, color: KHYLO_COLORS.status.healthy.fg }} />
                                <Typography
                                    variant='caption'
                                    sx={{
                                        fontFamily: 'monospace',
                                        color: KHYLO_COLORS.textSecondary,
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    {loc}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                );
            }
        },
        {
            id: 'health',
            header: 'Health State',
            width: '15%',
            render: () => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: KHYLO_COLORS.status.healthy.fg
                        }}
                    />
                    <Typography variant='caption' sx={{ fontWeight: 600, color: KHYLO_COLORS.status.healthy.fg }}>
                        Accessible
                    </Typography>
                </Box>
            )
        },
        {
            id: 'actions',
            header: 'Manage',
            width: '15%',
            align: 'right',
            render: (lib: any) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <IconButton
                        size='small'
                        title='Scan this library'
                        disabled={scanning.has(String(lib.ItemId || lib.Name)) || scanView(scans[String(lib.ItemId || lib.Name)], lib, now).state !== 'none'}
                        onClick={() => { void handleScanLibrary(lib); }}
                        sx={{
                            color: KHYLO_COLORS.textSecondary,
                            '&:hover': { color: KHYLO_COLORS.textPrimary, bgcolor: KHYLO_COLORS.surfaceHover }
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: 17 }} />
                    </IconButton>

                    <IconButton
                        size='small'
                        title='Edit Library'
                        onClick={() => navigate(`/dashboard/libraries/${lib.ItemId}`)}
                        sx={{
                            color: KHYLO_COLORS.textSecondary,
                            '&:hover': { color: KHYLO_COLORS.textPrimary, bgcolor: KHYLO_COLORS.surfaceHover }
                        }}
                    >
                        <SettingsIcon sx={{ fontSize: 17 }} />
                    </IconButton>

                    <IconButton
                        size='small'
                        title='Remove Library'
                        onClick={() => setDeleteTarget({ id: lib.ItemId, name: lib.Name })}
                        sx={{
                            color: KHYLO_COLORS.textMuted,
                            '&:hover': { color: KHYLO_COLORS.status.danger.fg, bgcolor: 'rgba(239,68,68,0.1)' }
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                </Box>
            )
        }
    ];

    return (
        <KhyloPage>
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title='Remove Media Library'
                text={`Are you sure you want to remove the library "${deleteTarget?.name}"? Media files on disk will not be deleted, but all database indexing and metadata will be removed.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmButtonText='Remove Library'
                confirmButtonColor='error'
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Media' },
                    { label: 'Media Libraries' }
                ]}
                title='Media Libraries'
                subtitle='Manage storage directories, media domains, metadata providers, and automated indexing pipelines.'
                badge={
                    <KhyloStatusBadge
                        label={`${virtualFolders?.length || 0} Libraries Configured`}
                        color='healthy'
                        size='medium'
                    />
                }
                actions={
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant='outlined'
                            size='small'
                            startIcon={<RefreshIcon />}
                            onClick={handleScanAll}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textPrimary,
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { borderColor: KHYLO_COLORS.accent }
                            }}
                        >
                            Scan All
                        </Button>
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/dashboard/libraries/create')}
                            sx={{
                                textTransform: 'none',
                                bgcolor: KHYLO_COLORS.accent,
                                color: '#FFFFFF',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            New Library
                        </Button>
                    </Box>
                }
            />

            {isLoading ? (
                <Typography color='text.secondary'>Loading libraries…</Typography>
            ) : !virtualFolders?.length ? (
                <KhyloEmptyState
                    icon={<FolderSpecialIcon />}
                    title='No Media Libraries Configured'
                    description='Connect storage directories to begin indexing movies, TV series, music, audiobooks, comics, DVDs, and photos.'
                    action={
                        <Button
                            variant='contained'
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/dashboard/libraries/create')}
                            sx={{ textTransform: 'none', bgcolor: KHYLO_COLORS.accent, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                        >
                            Create First Library
                        </Button>
                    }
                />
            ) : (
                <KhyloDataTable
                    columns={columns}
                    data={filteredLibraries}
                    keyExtractor={(item) => item.ItemId || item.Name || String(Math.random())}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder='Filter libraries by name or path…'
                />
            )}
            <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity='success' onClose={() => setNotice(null)}>{notice}</Alert>
            </Snackbar>
            <Snackbar open={Boolean(actionError)} autoHideDuration={6000} onClose={() => setActionError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity='error' onClose={() => setActionError(null)}>{actionError}</Alert>
            </Snackbar>
        </KhyloPage>
    );
};

export default Component;
