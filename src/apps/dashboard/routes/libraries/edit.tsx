import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MovieIcon from '@mui/icons-material/Movie';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideocamIcon from '@mui/icons-material/Videocam';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentLibrary, serverReason, GONE_MESSAGE } from 'apps/dashboard/features/libraries/api/currentLibrary';
import { useQueryClient } from '@tanstack/react-query';
import { getLibraryStructureApi } from '@khylo/sdk/lib/utils/api/library-structure-api';

import { useApi } from 'hooks/useApi';
import KhyloServerFileBrowserModal from '../../components/browser/KhyloServerFileBrowserModal';
import { useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import ConfirmDialog from 'components/ConfirmDialog';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge,
    KhyloPanel
} from '../../components/ui';

const DOMAIN_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
    movies: { label: 'Movies', icon: <MovieIcon sx={{ fontSize: 18 }} /> },
    tvshows: { label: 'Television', icon: <LiveTvIcon sx={{ fontSize: 18 }} /> },
    music: { label: 'Music', icon: <LibraryMusicIcon sx={{ fontSize: 18 }} /> },
    musicvideos: { label: 'Music Videos', icon: <VideocamIcon sx={{ fontSize: 18 }} /> },
    audiobooks: { label: 'Audiobooks', icon: <HeadphonesIcon sx={{ fontSize: 18 }} /> },
    podcasts: { label: 'Podcasts', icon: <PodcastsIcon sx={{ fontSize: 18 }} /> },
    books: { label: 'Books & Ebooks', icon: <MenuBookIcon sx={{ fontSize: 18 }} /> },
    comics: { label: 'Comics', icon: <AutoStoriesIcon sx={{ fontSize: 18 }} /> },
    photos: { label: 'Photos', icon: <PhotoLibraryIcon sx={{ fontSize: 18 }} /> },
    homevideos: { label: 'Home Videos', icon: <VideocamIcon sx={{ fontSize: 18 }} /> },
    mixed: { label: 'Mixed Media', icon: <FolderSpecialIcon sx={{ fontSize: 18 }} /> }
};

export const Component: FC = () => {
    const { libraryId } = useParams<{ libraryId: string }>();
    const navigate = useNavigate();
    const { api } = useApi();
    const queryClient = useQueryClient();

    const { data: virtualFolders, isPending: isLoading } = useVirtualFolders();

    const library = useMemo(() => {
        if (!virtualFolders || !libraryId) return undefined;
        return virtualFolders.find((f: any) => f.ItemId === libraryId || f.Name === libraryId);
    }, [virtualFolders, libraryId]);

    const [libraryName, setLibraryName] = useState('');
    const [newPathInput, setNewPathInput] = useState('');
    const [isBrowserOpen, setIsBrowserOpen] = useState(false);
    const [pathToDelete, setPathToDelete] = useState<string | null>(null);
    const [isDeleteLibConfirmOpen, setIsDeleteLibConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (library) {
            setLibraryName(library.Name || '');
        }
    }, [library]);

    const domainKey = library?.CollectionType || 'mixed';
    const domain = DOMAIN_MAP[domainKey] || { label: domainKey, icon: <FolderSpecialIcon sx={{ fontSize: 18 }} /> };
    const locations = library?.Locations || [];

    const isDirty = Boolean(library && libraryName.trim() !== (library.Name || ''));

    const handleRename = useCallback(async () => {
        if (!api || !library || !libraryName.trim()) return;
        setIsSaving(true);
        setFeedback(null);
        try {
            const current = await getCurrentLibrary(api, library);
            if (!current?.Name) {
                void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
                setFeedback({ severity: 'error', message: GONE_MESSAGE });
                return;
            }
            const newName = libraryName.trim();
            await getLibraryStructureApi(api).renameVirtualFolder({
                name: current.Name,
                newName,
                refreshLibrary: true
            });
            await queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
            // Renaming gives the library a new id: follow it so this page keeps working
            const renamed = await getCurrentLibrary(api, { Name: newName, Locations: current.Locations });
            if (renamed?.ItemId && renamed.ItemId !== libraryId) {
                navigate(`/dashboard/libraries/${renamed.ItemId}`, { replace: true });
            }
            setFeedback({ severity: 'success', message: 'Library renamed.' });
        } catch (err: unknown) {
            console.error('[LibraryEdit] Rename failed:', err);
            setFeedback({ severity: 'error', message: serverReason(err, 'Couldn\u2019t rename the library.') });
        } finally {
            setIsSaving(false);
        }
    }, [api, library, libraryName, libraryId, navigate, queryClient]);

    const handleAddPath = useCallback(async () => {
        if (!api || !library || !newPathInput.trim()) return;
        try {
            const current = await getCurrentLibrary(api, library);
            if (!current?.Name) {
                void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
                setFeedback({ severity: 'error', message: GONE_MESSAGE });
                return;
            }
            await getLibraryStructureApi(api).addMediaPath({
                mediaPathDto: {
                    Name: current.Name,
                    Path: newPathInput.trim()
                },
                refreshLibrary: true
            });
            setNewPathInput('');
            void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
            setFeedback({ severity: 'success', message: 'Storage location attached and queued for scanning.' });
        } catch (err: any) {
            console.error('[LibraryEdit] Add path failed:', err);
            setFeedback({ severity: 'error', message: serverReason(err, 'Couldn\u2019t add that folder.') });
        }
    }, [api, library, newPathInput, queryClient]);

    const handleConfirmRemovePath = useCallback(async () => {
        if (!api || !library || !pathToDelete) return;
        try {
            const current = await getCurrentLibrary(api, library);
            if (!current?.Name) {
                void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
                setPathToDelete(null);
                setFeedback({ severity: 'error', message: GONE_MESSAGE });
                return;
            }
            await getLibraryStructureApi(api).removeMediaPath({
                name: current.Name,
                path: pathToDelete,
                refreshLibrary: true
            });
            setPathToDelete(null);
            void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
            setFeedback({ severity: 'success', message: 'Storage path detached from library.' });
        } catch (err: any) {
            console.error('[LibraryEdit] Remove path failed:', err);
            setPathToDelete(null);
            setFeedback({ severity: 'error', message: serverReason(err, 'Couldn\u2019t remove that folder.') });
        }
    }, [api, library, pathToDelete, queryClient]);

    const handleDeleteLibrary = useCallback(async () => {
        if (!api || !library) return;
        try {
            const current = await getCurrentLibrary(api, library);
            if (!current?.Name) {
                // Already gone: nothing left to delete
                await queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
                navigate('/dashboard/libraries');
                return;
            }
            await getLibraryStructureApi(api).removeVirtualFolder({
                name: current.Name,
                refreshLibrary: true
            });
            void queryClient.invalidateQueries({ queryKey: ['virtualFolders'] });
            navigate('/dashboard/libraries');
        } catch (err: any) {
            console.error('[LibraryEdit] Delete library failed:', err);
            setFeedback({ severity: 'error', message: serverReason(err, 'Couldn\u2019t remove the library.') });
        }
    }, [api, library, queryClient, navigate]);

    if (isLoading) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    if (!library) {
        return (
            <KhyloPage>
                <Alert severity='error' sx={{ mb: 3 }}>
                    Library not found or no longer available.
                </Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/dashboard/libraries')}
                    sx={{ textTransform: 'none', color: KHYLO_COLORS.accent }}
                >
                    Back to Media Libraries
                </Button>
            </KhyloPage>
        );
    }

    return (
        <KhyloPage>
            <ConfirmDialog
                open={Boolean(pathToDelete)}
                title='Detach Storage Path'
                text={`Are you sure you want to detach "${pathToDelete}" from this library? Files on disk will remain untouched.`}
                onConfirm={handleConfirmRemovePath}
                onCancel={() => setPathToDelete(null)}
                confirmButtonColor='error'
                confirmButtonText='Detach Path'
            />

            <ConfirmDialog
                open={isDeleteLibConfirmOpen}
                title='Remove Media Library'
                text={`Are you sure you want to permanently remove "${library.Name}" from Khylo? Media files on disk will not be deleted, but all database indexing and playback records will be removed.`}
                onConfirm={handleDeleteLibrary}
                onCancel={() => setIsDeleteLibConfirmOpen(false)}
                confirmButtonColor='error'
                confirmButtonText='Remove Library'
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Media' },
                    { label: 'Media Libraries', href: '/dashboard/libraries' },
                    { label: library.Name || 'Library' }
                ]}
                title={library.Name || 'Media Library'}
                subtitle={`Storage Roots: ${locations.length} • Domain: ${domain.label}`}
                badge={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KhyloStatusBadge
                            label={domain.label}
                            color='active'
                        />
                        <KhyloStatusBadge
                            label={locations.length > 0 ? 'Storage Online' : 'No Paths'}
                            color={locations.length > 0 ? 'healthy' : 'warning'}
                        />
                    </Box>
                }
                actions={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                            onClick={() => navigate('/dashboard/libraries')}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textSecondary,
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                '&:hover': { color: KHYLO_COLORS.textPrimary }
                            }}
                        >
                            All Libraries
                        </Button>
                        <Button
                            size='small'
                            variant='outlined'
                            color='error'
                            startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setIsDeleteLibConfirmOpen(true)}
                            sx={{
                                textTransform: 'none',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                color: KHYLO_COLORS.status.danger.fg,
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
                            }}
                        >
                            Remove Library
                        </Button>
                    </Box>
                }
            />

            {feedback && (
                <Alert severity={feedback.severity} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
                    {feedback.message}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <KhyloSettingSection
                    title='Library Identity'
                    description='Display name and associated media domain pipeline used by the scanner.'
                >
                    <KhyloSettingRow
                        label='Library Name'
                        description='Friendly name presented in companion apps and client browsing menus.'
                    >
                        <TextField
                            size='small'
                            value={libraryName}
                            onChange={(e) => setLibraryName(e.target.value)}
                            sx={{ minWidth: 280 }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Media Domain'
                        description='Classification domain dictates the metadata scrapers, artwork resolution, and transcode pipelines.'
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: KHYLO_COLORS.accent }}>
                                {domain.icon}
                            </Box>
                            <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                {domain.label}
                            </Typography>
                        </Box>
                    </KhyloSettingRow>
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Filesystem Mount Roots'
                    description='Local directories, NAS shares, and mount points scanned into this media collection.'
                >
                    <KhyloSettingRow
                        label='Attached Storage Paths'
                        description='Every configured path is monitored and indexed into this media domain.'
                    >
                        <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 640 }}>
                            {locations.length === 0 ? (
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.status.warning.fg }}>
                                    No paths currently assigned to this library.
                                </Typography>
                            ) : (
                                locations.map((loc: string, idx: number) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: 1.5,
                                            borderRadius: '6px',
                                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                                            border: `1px solid ${KHYLO_COLORS.borderSubtle}`
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                                            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: KHYLO_COLORS.status.healthy.fg, flexShrink: 0 }} />
                                            <Typography
                                                variant='body2'
                                                noWrap
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.8rem',
                                                    color: KHYLO_COLORS.textPrimary
                                                }}
                                            >
                                                {loc}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size='small'
                                            title='Detach path'
                                            onClick={() => setPathToDelete(loc)}
                                            sx={{
                                                color: KHYLO_COLORS.textMuted,
                                                '&:hover': { color: KHYLO_COLORS.status.danger.fg, bgcolor: 'rgba(239, 68, 68, 0.1)' }
                                            }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                                        </IconButton>
                                    </Box>
                                ))
                            )}

                            {/* Add Path Input */}
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <TextField
                                    size='small'
                                    fullWidth
                                    placeholder='e.g. C:\Media\Movies or \\server\share'
                                    value={newPathInput}
                                    onChange={(e) => setNewPathInput(e.target.value)}
                                    sx={{
                                        '& .MuiInputBase-input': {
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem'
                                        }
                                    }}
                                />
                                <Button
                                    variant='outlined'
                                    size='small'
                                    startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => setIsBrowserOpen(true)}
                                    sx={{
                                        textTransform: 'none',
                                        borderColor: KHYLO_COLORS.borderDefault,
                                        color: KHYLO_COLORS.textPrimary,
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        flexShrink: 0,
                                        '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: KHYLO_COLORS.surfaceHover }
                                    }}
                                >
                                    Browse
                                </Button>
                                <Button
                                    variant='contained'
                                    size='small'
                                    startIcon={<AddIcon />}
                                    disabled={!newPathInput.trim()}
                                    onClick={handleAddPath}
                                    sx={{
                                        textTransform: 'none',
                                        bgcolor: KHYLO_COLORS.accent,
                                        color: '#FFFFFF',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        flexShrink: 0,
                                        '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                    }}
                                >
                                    Attach Path
                                </Button>
                            </Box>
                        </Stack>
                    </KhyloSettingRow>
                </KhyloSettingSection>
            </Box>

            <KhyloStickyActionBar
                isDirty={isDirty}
                isSaving={isSaving}
                saveText='Save Changes'
                onSave={handleRename}
                onReset={() => setLibraryName(library.Name || '')}
            />

            <KhyloServerFileBrowserModal
                open={isBrowserOpen}
                initialPath={newPathInput.trim()}
                onClose={() => setIsBrowserOpen(false)}
                onSelect={(selectedPath) => {
                    setNewPathInput(selectedPath);
                }}
            />
        </KhyloPage>
    );
};

export default Component;
