import React, { FC, useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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

import { useApi } from 'hooks/useApi';
import { useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import { getCurrentLibrary, serverReason, GONE_MESSAGE } from 'apps/dashboard/features/libraries/api/currentLibrary';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ConfirmDialog from 'components/ConfirmDialog';
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

export const Component: FC = () => {
    const navigate = useNavigate();
    const { api } = useApi();
    const queryClient = useQueryClient();
    const { data: virtualFolders, isPending: isLoading } = useVirtualFolders();
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

    const [ deleteError, setDeleteError ] = useState<string | null>(null);

    const handleDelete = useCallback(async () => {
        if (!deleteTarget || !api) return;
        try {
            const current = await getCurrentLibrary(api, { ItemId: deleteTarget.id, Name: deleteTarget.name });
            if (current?.Name) {
                await getLibraryStructureApi(api).removeVirtualFolder({ name: current.Name, refreshLibrary: true });
            }
            void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
            setDeleteTarget(null);
        } catch (e) {
            console.error('Failed to remove library', e);
            setDeleteTarget(null);
            setDeleteError(serverReason(e, 'Couldn\u2019t remove the library.'));
            void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
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
            <Snackbar open={Boolean(deleteError)} autoHideDuration={6000} onClose={() => setDeleteError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity='error' onClose={() => setDeleteError(null)}>{deleteError}</Alert>
            </Snackbar>
        </KhyloPage>
    );
};

export default Component;
