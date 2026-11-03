import React, { useState, useCallback, FC } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MovieIcon from '@mui/icons-material/Movie';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import AlbumIcon from '@mui/icons-material/Album';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import { getLibraryStructureApi } from '@khylo/sdk/lib/utils/api/library-structure-api';

import { useApi } from 'hooks/useApi';
import KhyloServerFileBrowserModal from '../../../components/browser/KhyloServerFileBrowserModal';
import {
    KHYLO_COLORS,
    KhyloWizard,
    KhyloSettingRow,
    KhyloSettingSection,
    KhyloMetricRow,
    type KhyloWizardStep
} from '../../../components/ui';

interface DomainOption {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const DOMAIN_OPTIONS: DomainOption[] = [
    { id: 'movies', label: 'Movies', description: 'Feature films, cinema releases, and movie archives', icon: <MovieIcon sx={{ fontSize: 24 }} /> },
    { id: 'tvshows', label: 'Television', description: 'Episodic series, seasons, and serial broadcasts', icon: <LiveTvIcon sx={{ fontSize: 24 }} /> },
    { id: 'music', label: 'Music', description: 'Artist discographies, studio albums, and singles', icon: <LibraryMusicIcon sx={{ fontSize: 24 }} /> },
    { id: 'musicvideos', label: 'Music Videos', description: 'Concert recordings and official music videos', icon: <VideoLibraryIcon sx={{ fontSize: 24 }} /> },
    { id: 'audiobooks', label: 'Audiobooks', description: 'Narrated spoken audiobooks with chapter tracking', icon: <HeadphonesIcon sx={{ fontSize: 24 }} /> },
    { id: 'podcasts', label: 'Podcasts', description: 'RSS syndicated audio/video series with episode feeds', icon: <PodcastsIcon sx={{ fontSize: 24 }} /> },
    { id: 'books', label: 'Books & Ebooks', description: 'EPub, PDF, and digital publication documents', icon: <MenuBookIcon sx={{ fontSize: 24 }} /> },
    { id: 'comics', label: 'Comics & Manga', description: 'CBZ, CBR, CB7, and CBT graphical volumes', icon: <AutoStoriesIcon sx={{ fontSize: 24 }} /> },
    { id: 'photos', label: 'Photos & RAW', description: 'JPEG, RAW, HEIC, PNG, and camera assets', icon: <PhotoLibraryIcon sx={{ fontSize: 24 }} /> },
    { id: 'dvds', label: 'DVDs', description: 'DVD disc images (ISO) and DVD folders, with their menus', icon: <AlbumIcon sx={{ fontSize: 24 }} /> },
    { id: 'homevideos', label: 'Home Videos', description: 'Personal home videos and camcorder footage', icon: <VideocamIcon sx={{ fontSize: 24 }} /> },
    { id: 'mixed', label: 'Mixed Media', description: 'Multi-type shared folder without domain filtering', icon: <FolderSpecialIcon sx={{ fontSize: 24 }} /> }
];

interface LibraryCreatorProps {
    /** Called once the library is made. */
    onCreated: () => void;
    /** Called when the person backs out. */
    onCancel: () => void;
}

/**
 * The steps for adding a library: kind, name, folders, scanning options and a review. Used by the
 * dashboard's New Library page and by first-run setup.
 */
const LibraryCreator: FC<LibraryCreatorProps> = ({ onCreated, onCancel }) => {
    const { api } = useApi();

    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [libraryName, setLibraryName] = useState('');
    const [paths, setPaths] = useState<string[]>(['']);
    const [isBrowserOpen, setIsBrowserOpen] = useState(false);
    const [browserTargetIndex, setBrowserTargetIndex] = useState<number | null>(null);
    const [enableRealtimeWatcher, setEnableRealtimeWatcher] = useState(true);
    const [extractChapterImages, setExtractChapterImages] = useState(true);
    const [generateTrickplay, setGenerateTrickplay] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const selectedOption = DOMAIN_OPTIONS.find(d => d.id === selectedDomain);

    const handleAddPath = useCallback(() => setPaths(p => [...p, '']), []);
    const handleRemovePath = useCallback((idx: number) => {
        setPaths(p => p.filter((_, i) => i !== idx));
    }, []);
    const handlePathChange = useCallback((idx: number, value: string) => {
        setPaths(p => p.map((v, i) => i === idx ? value : v));
    }, []);

    const handleCreate = useCallback(async () => {
        if (!selectedDomain || !libraryName.trim() || !api) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            const validPaths = paths.filter(p => p.trim());
            await getLibraryStructureApi(api).addVirtualFolder({
                name: libraryName.trim(),
                // DVDs are movies on the server; the disc menu comes from the disc itself
                collectionType: (selectedDomain === 'dvds' ? 'movies' : selectedDomain) as any,
                paths: validPaths,
                refreshLibrary: true,
                // The switches on the review step, so the library is made the way it was shown
                addVirtualFolderDto: {
                    LibraryOptions: {
                        EnableRealtimeMonitor: enableRealtimeWatcher,
                        EnableChapterImageExtraction: extractChapterImages,
                        EnableTrickplayImageExtraction: generateTrickplay
                    }
                }
            });
            onCreated();
        } catch (e) {
            console.error('Failed to create library', e);
            const data = (e as { response?: { data?: unknown } }).response?.data;
            setCreateError(`Couldn't create the library. ${typeof data === 'string' && data.length < 300 ? data : 'Check the folder and try again.'}`);
        } finally {
            setIsCreating(false);
        }
    }, [api, selectedDomain, libraryName, paths, onCreated, enableRealtimeWatcher, extractChapterImages, generateTrickplay]);

    const steps: KhyloWizardStep[] = [
        {
            label: 'Media Domain',
            description: 'Select the media domain. Khylo uses dedicated server-side engines, resolvers, and metadata parsers optimized specifically for each domain.',
            canProceed: () => Boolean(selectedDomain),
            content: (
                <Grid container spacing={2}>
                    {DOMAIN_OPTIONS.map((option) => {
                        const isSelected = selectedDomain === option.id;
                        return (
                            <Grid item xs={12} sm={6} md={4} key={option.id}>
                                <Paper
                                    variant='outlined'
                                    onClick={() => {
                                        setSelectedDomain(option.id);
                                        if (!libraryName) setLibraryName(option.label);
                                    }}
                                    sx={{
                                        p: 2,
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        bgcolor: isSelected ? KHYLO_COLORS.surfaceActive : KHYLO_COLORS.surfacePrimary,
                                        borderColor: isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.borderDefault,
                                        transition: 'all 0.15s ease',
                                        position: 'relative',
                                        '&:hover': {
                                            borderColor: isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.borderStrong,
                                            bgcolor: isSelected ? KHYLO_COLORS.surfaceActive : KHYLO_COLORS.surfaceHover
                                        }
                                    }}
                                >
                                    {isSelected && (
                                        <CheckCircleIcon
                                            sx={{
                                                position: 'absolute',
                                                top: 10,
                                                right: 10,
                                                fontSize: 18,
                                                color: KHYLO_COLORS.accent
                                            }}
                                        />
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, color: isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.textSecondary }}>
                                        {option.icon}
                                        <Typography variant='body1' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary }}>
                                            {option.label}
                                        </Typography>
                                    </Box>
                                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.78rem', lineHeight: 1.4 }}>
                                        {option.description}
                                    </Typography>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            )
        },
        {
            label: 'Identity',
            description: 'Name your library. This label appears in server administration and client applications.',
            canProceed: () => Boolean(libraryName.trim()),
            content: (
                <Box sx={{ maxWidth: 520, py: 1 }}>
                    <TextField
                        label='Library Name'
                        value={libraryName}
                        onChange={(e) => setLibraryName(e.target.value)}
                        fullWidth
                        size='small'
                        autoFocus
                        helperText={`Media domain assigned: ${selectedOption?.label || 'None'}`}
                        InputProps={{
                            sx: {
                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                fontWeight: 600
                            }
                        }}
                    />
                </Box>
            )
        },
        {
            label: 'Storage Locations',
            description: 'Specify one or more server filesystem storage directories containing the media for this library.',
            canProceed: () => paths.some(p => p.trim().length > 0),
            content: (
                <Stack spacing={2} sx={{ maxWidth: 720, py: 1 }}>
                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.75rem' }}>
                        Choose folders on the server, or connect a network share (a NAS or another computer) with Browse:
                    </Typography>

                    {paths.map((p, idx) => (
                        <Stack key={idx} direction='row' gap={1} alignItems='center'>
                            <TextField
                                label={`Location ${idx + 1}`}
                                value={p}
                                onChange={(e) => handlePathChange(idx, e.target.value)}
                                placeholder='C:\Media\Movies or \\server\share'
                                fullWidth
                                size='small'
                                InputProps={{
                                    sx: {
                                        bgcolor: KHYLO_COLORS.surfaceSecondary,
                                        fontFamily: 'monospace',
                                        fontSize: '0.82rem'
                                    }
                                }}
                            />
                            <Button
                                size='small'
                                variant='outlined'
                                startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
                                onClick={() => {
                                    setBrowserTargetIndex(idx);
                                    setIsBrowserOpen(true);
                                }}
                                sx={{
                                    textTransform: 'none',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 600,
                                    fontSize: '0.78rem',
                                    borderColor: KHYLO_COLORS.borderDefault,
                                    color: KHYLO_COLORS.textPrimary,
                                    '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: KHYLO_COLORS.surfaceHover }
                                }}
                            >
                                Browse
                            </Button>
                            {paths.length > 1 && (
                                <IconButton
                                    size='small'
                                    onClick={() => handleRemovePath(idx)}
                                    sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.status.danger.fg } }}
                                >
                                    <DeleteOutlineIcon fontSize='small' />
                                </IconButton>
                            )}
                        </Stack>
                    ))}

                    <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
                        <Button
                            size='small'
                            variant='contained'
                            startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
                            onClick={() => {
                                setBrowserTargetIndex(null);
                                setIsBrowserOpen(true);
                            }}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                color: '#fff',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: '#c4692a' }
                            }}
                        >
                            Browse & Add Location
                        </Button>
                        <Button
                            size='small'
                            variant='text'
                            startIcon={<AddIcon />}
                            onClick={handleAddPath}
                            sx={{
                                color: KHYLO_COLORS.textSecondary,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { color: KHYLO_COLORS.textPrimary }
                            }}
                        >
                            Add Manual Path
                        </Button>
                    </Box>
                </Stack>
            )
        },
        {
            label: 'Scanning & Ingestion',
            description: 'Configure automated background indexing and visual asset extraction behavior for this library.',
            content: (
                <KhyloSettingSection title='Ingestion Rules'>
                    <KhyloSettingRow
                        title='Real-time Filesystem Monitoring'
                        description='Automatically detect and index newly added or modified files using OS file-system watchers.'
                        control={
                            <Switch
                                checked={enableRealtimeWatcher}
                                onChange={(e) => setEnableRealtimeWatcher(e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />
                    <KhyloSettingRow
                        title='Extract Chapter Images'
                        description='Extract thumbnail imagery for chapter jump points during background library scan.'
                        control={
                            <Switch
                                checked={extractChapterImages}
                                onChange={(e) => setExtractChapterImages(e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />
                    <KhyloSettingRow
                        title='Generate Scrubbing Trickplay Assets'
                        description='Generate seek thumbnails for high-resolution video scrub previews. Requires background GPU/CPU time.'
                        control={
                            <Switch
                                checked={generateTrickplay}
                                onChange={(e) => setGenerateTrickplay(e.target.checked)}
                                sx={{ '& .Mui-checked': { color: KHYLO_COLORS.accent } }}
                            />
                        }
                    />
                </KhyloSettingSection>
            )
        },
        {
            label: 'Review & Create',
            description: 'Confirm configuration. Upon creation, Khylo will verify storage access and initiate the initial media index.',
            content: (
                <Box sx={{ maxWidth: 560 }}>
                    <Paper
                        variant='outlined'
                        sx={{
                            p: 2.5,
                            borderRadius: '8px',
                            bgcolor: KHYLO_COLORS.surfacePrimary,
                            borderColor: KHYLO_COLORS.borderDefault
                        }}
                    >
                        <Stack spacing={1.5}>
                            <KhyloMetricRow label='Media Domain' value={selectedOption?.label || '—'} />
                            <KhyloMetricRow label='Library Name' value={libraryName} />
                            <KhyloMetricRow
                                label='Storage Paths'
                                value={
                                    <Stack spacing={0.5} alignItems='flex-end'>
                                        {paths.filter(p => p.trim()).map((p, i) => (
                                            <Typography
                                                key={i}
                                                variant='caption'
                                                sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                                            >
                                                {p}
                                            </Typography>
                                        ))}
                                    </Stack>
                                }
                            />
                            <KhyloMetricRow label='Realtime Monitoring' value={enableRealtimeWatcher ? 'Enabled' : 'Disabled'} />
                            <KhyloMetricRow label='Chapter Extraction' value={extractChapterImages ? 'Enabled' : 'Disabled'} />
                            <KhyloMetricRow label='Trickplay Generation' value={generateTrickplay ? 'Enabled' : 'Disabled'} />
                        </Stack>
                    </Paper>
                </Box>
            )
        }
    ];

    return (
        <>
            {createError && <Alert severity='error' sx={{ mb: 2 }}>{createError}</Alert>}
            <Paper
                variant='outlined'
                sx={{
                    borderRadius: '8px',
                    borderColor: KHYLO_COLORS.borderDefault,
                    bgcolor: KHYLO_COLORS.surfacePrimary,
                    overflow: 'hidden'
                }}
            >
                <KhyloWizard
                    steps={steps}
                    onComplete={handleCreate}
                    onCancel={onCancel}
                    completeLabel={isCreating ? 'Creating…' : 'Create Library & Start Scan'}
                />
            </Paper>

            <KhyloServerFileBrowserModal
                open={isBrowserOpen}
                initialPath={browserTargetIndex !== null ? paths[browserTargetIndex] : (paths.find(p => p.trim()) || '')}
                onClose={() => {
                    setIsBrowserOpen(false);
                    setBrowserTargetIndex(null);
                }}
                onSelect={(selectedPath) => {
                    if (browserTargetIndex !== null) {
                        handlePathChange(browserTargetIndex, selectedPath);
                    } else {
                        setPaths((prev) => {
                            const trimmed = prev.filter(p => p.trim().length > 0);
                            return [...trimmed, selectedPath];
                        });
                    }
                }}
            />
        </>
    );
};

export default LibraryCreator;
