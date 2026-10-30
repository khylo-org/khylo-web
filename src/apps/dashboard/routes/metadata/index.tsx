import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';

import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FolderIcon from '@mui/icons-material/Folder';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import {
    useMetadataItems,
    useItemMetadata,
    useUpdateItemMetadata,
    useRefreshItemMetadata,
    MetadataItemSummary
} from 'apps/dashboard/features/libraries/api/useMetadataManager';
import Page from 'components/Page';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloPanel,
    KhyloStatusBadge,
    KhyloEmptyState
} from '../../components/ui';

const PAGE_SIZE = 40;

const ITEM_TYPE_OPTIONS = [
    { value: 'all', label: 'All Media Types' },
    { value: 'Movie', label: 'Movies' },
    { value: 'Series', label: 'TV Shows' },
    { value: 'Episode', label: 'Episodes' },
    { value: 'MusicAlbum', label: 'Music Albums' },
    { value: 'Audio', label: 'Audio Tracks' },
    { value: 'Book', label: 'Books & Ebooks' }
];

export const Component: FC = () => {
    const { api } = useApi();
    const { data: virtualFolders } = useVirtualFolders();

    // Filters state
    const [selectedLibraryId, setSelectedLibraryId] = useState<string>('all');
    const [selectedItemType, setSelectedItemType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterMissingOverview, setFilterMissingOverview] = useState<boolean>(false);
    const [filterMissingPoster, setFilterMissingPoster] = useState<boolean>(false);
    const [pageIndex, setPageIndex] = useState<number>(0);

    // Selected item for editor
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // Notification toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('success');

    // Query list of items
    const {
        data: itemsData,
        isLoading: isItemsLoading,
        isFetching: isItemsFetching,
        refetch: refetchItems
    } = useMetadataItems({
        libraryId: selectedLibraryId,
        searchTerm: searchTerm.trim() || undefined,
        itemType: selectedItemType,
        limit: PAGE_SIZE,
        startIndex: pageIndex * PAGE_SIZE,
        missingOverview: filterMissingOverview,
        missingPoster: filterMissingPoster
    });

    const items = itemsData?.Items ?? [];
    const totalRecordCount = itemsData?.TotalRecordCount ?? 0;
    const totalPages = Math.ceil(totalRecordCount / PAGE_SIZE) || 1;

    // Auto-select first item if none selected and items loaded
    useEffect(() => {
        if (!selectedItemId && items.length > 0) {
            setSelectedItemId(items[0].Id);
        }
    }, [items, selectedItemId]);

    // Query full metadata for selected item
    const {
        data: fullItem,
        isLoading: isItemLoading,
        isFetching: isItemFetching
    } = useItemMetadata(selectedItemId || undefined);

    // Local form state for editing
    const [formName, setFormName] = useState('');
    const [formOriginalTitle, setFormOriginalTitle] = useState('');
    const [formSortName, setFormSortName] = useState('');
    const [formYear, setFormYear] = useState<string>('');
    const [formPremiereDate, setFormPremiereDate] = useState('');
    const [formOfficialRating, setFormOfficialRating] = useState('');
    const [formCommunityRating, setFormCommunityRating] = useState<string>('');
    const [formCriticRating, setFormCriticRating] = useState<string>('');
    const [formOverview, setFormOverview] = useState('');
    const [formGenres, setFormGenres] = useState('');
    const [formStudios, setFormStudios] = useState('');
    const [formTags, setFormTags] = useState('');
    const [formLockData, setFormLockData] = useState(false);
    const [formImdbId, setFormImdbId] = useState('');
    const [formTmdbId, setFormTmdbId] = useState('');
    const [formTvdbId, setFormTvdbId] = useState('');

    // Sync form state when fullItem loads
    useEffect(() => {
        if (fullItem) {
            setFormName(fullItem.Name || '');
            setFormOriginalTitle(fullItem.OriginalTitle || '');
            setFormSortName(fullItem.SortName || '');
            setFormYear(fullItem.ProductionYear ? String(fullItem.ProductionYear) : '');
            setFormPremiereDate(fullItem.PremiereDate ? fullItem.PremiereDate.split('T')[0] : '');
            setFormOfficialRating(fullItem.OfficialRating || '');
            setFormCommunityRating(fullItem.CommunityRating != null ? String(fullItem.CommunityRating) : '');
            setFormCriticRating(fullItem.CriticRating != null ? String(fullItem.CriticRating) : '');
            setFormOverview(fullItem.Overview || '');
            setFormGenres(Array.isArray(fullItem.Genres) ? fullItem.Genres.join(', ') : '');

            const studiosStr = Array.isArray(fullItem.Studios)
                ? fullItem.Studios.map((s: any) => typeof s === 'string' ? s : s.Name).filter(Boolean).join(', ')
                : '';
            setFormStudios(studiosStr);

            setFormTags(Array.isArray(fullItem.Tags) ? fullItem.Tags.join(', ') : '');
            setFormLockData(Boolean(fullItem.LockData));
            setFormImdbId(fullItem.ProviderIds?.Imdb || '');
            setFormTmdbId(fullItem.ProviderIds?.Tmdb || '');
            setFormTvdbId(fullItem.ProviderIds?.Tvdb || '');
        }
    }, [fullItem]);

    const updateItemMutation = useUpdateItemMetadata();
    const refreshItemMutation = useRefreshItemMetadata();

    const handleSaveMetadata = useCallback(async () => {
        if (!selectedItemId || !fullItem) return;

        const updatedItem: any = {
            ...fullItem,
            Name: formName.trim(),
            OriginalTitle: formOriginalTitle.trim() || undefined,
            SortName: formSortName.trim() || undefined,
            ProductionYear: formYear.trim() ? parseInt(formYear.trim(), 10) : undefined,
            PremiereDate: formPremiereDate.trim() ? `${formPremiereDate.trim()}T00:00:00.0000000Z` : undefined,
            OfficialRating: formOfficialRating.trim() || undefined,
            CommunityRating: formCommunityRating.trim() ? parseFloat(formCommunityRating.trim()) : undefined,
            CriticRating: formCriticRating.trim() ? parseFloat(formCriticRating.trim()) : undefined,
            Overview: formOverview.trim() || undefined,
            Genres: formGenres.split(',').map(s => s.trim()).filter(Boolean),
            Studios: formStudios.split(',').map(s => ({ Name: s.trim() })).filter(s => s.Name),
            Tags: formTags.split(',').map(s => s.trim()).filter(Boolean),
            LockData: formLockData,
            ProviderIds: {
                ...(fullItem.ProviderIds || {}),
                Imdb: formImdbId.trim() || undefined,
                Tmdb: formTmdbId.trim() || undefined,
                Tvdb: formTvdbId.trim() || undefined
            }
        };

        try {
            await updateItemMutation.mutateAsync(updatedItem);
            setToastSeverity('success');
            setToastMessage(`Saved metadata for "${formName}".`);
            refetchItems();
        } catch (err) {
            console.error('[MetadataManager] Save error:', err);
            setToastSeverity('error');
            setToastMessage('Failed to save metadata.');
        }
    }, [selectedItemId, fullItem, formName, formOriginalTitle, formSortName, formYear, formPremiereDate, formOfficialRating, formCommunityRating, formCriticRating, formOverview, formGenres, formStudios, formTags, formLockData, formImdbId, formTmdbId, formTvdbId, updateItemMutation, refetchItems]);

    const handleRefreshMetadata = useCallback(async () => {
        if (!selectedItemId) return;
        try {
            await refreshItemMutation.mutateAsync(selectedItemId);
            setToastSeverity('info');
            setToastMessage(`Metadata refresh scheduled for "${formName}".`);
        } catch (err) {
            console.error('[MetadataManager] Refresh error:', err);
            setToastSeverity('error');
            setToastMessage('Failed to trigger metadata refresh.');
        }
    }, [selectedItemId, formName, refreshItemMutation]);

    const getItemIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'movie': return <MovieIcon fontSize='small' sx={{ color: KHYLO_COLORS.accent }} />;
            case 'series':
            case 'episode': return <TvIcon fontSize='small' sx={{ color: '#3B82F6' }} />;
            case 'musicalbum':
            case 'audio': return <MusicNoteIcon fontSize='small' sx={{ color: '#10B981' }} />;
            case 'book': return <MenuBookIcon fontSize='small' sx={{ color: '#F59E0B' }} />;
            default: return <FolderIcon fontSize='small' sx={{ color: KHYLO_COLORS.textMuted }} />;
        }
    };

    const legacyClient = ServerConnections.currentApiClient();
    const baseUrl = api?.basePath || (legacyClient?.serverAddress ? legacyClient.serverAddress() : '');
    const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';

    const getItemImageUrl = (itemId: string, tag?: string) => {
        if (!tag) return null;
        return `${cleanBase}/Items/${itemId}/Images/Primary?fillWidth=120&fillHeight=180&tag=${tag}&quality=90`;
    };

    return (
        <Page id='metadataManagerPage' title='Metadata Manager' className='mainAnimatedPage type-interior'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Server' },
                        { label: 'Media' },
                        { label: 'Metadata Manager' }
                    ]}
                    title='Metadata Manager'
                    subtitle='Inspect, enrich, curate, and lock media metadata, artwork tags, and provider identifiers across all libraries.'
                    badge={
                        <KhyloStatusBadge
                            label={`${totalRecordCount} Indexed Media Items`}
                            color='healthy'
                            size='medium'
                        />
                    }
                    actions={
                        <Button
                            variant='outlined'
                            size='small'
                            startIcon={<RefreshIcon />}
                            onClick={() => refetchItems()}
                            disabled={isItemsFetching}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textPrimary,
                                '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: 'rgba(217, 119, 50, 0.08)' }
                            }}
                        >
                            {isItemsFetching ? 'Refreshing…' : 'Refresh Index'}
                        </Button>
                    }
                />

                {/* Main Split Grid */}
                <Grid container spacing={3}>
                    {/* LEFT COLUMN: Library Explorer & Item Selection List */}
                    <Grid item xs={12} md={5} lg={4}>
                        <Paper
                            variant='outlined'
                            sx={{
                                borderRadius: '10px',
                                bgcolor: KHYLO_COLORS.surfacePrimary,
                                border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                                display: 'flex',
                                flexDirection: 'column',
                                height: 'calc(100vh - 240px)',
                                minHeight: 600,
                                overflow: 'hidden'
                            }}
                        >
                            {/* Filter Controls Bar */}
                            <Box sx={{ p: 2, borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`, bgcolor: KHYLO_COLORS.surfaceSecondary }}>
                                <Stack spacing={1.5}>
                                    <TextField
                                        size='small'
                                        placeholder='Search by title or keyword…'
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setPageIndex(0);
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position='start'>
                                                    <SearchIcon fontSize='small' sx={{ color: KHYLO_COLORS.textMuted }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: searchTerm ? (
                                                <InputAdornment position='end'>
                                                    <IconButton size='small' onClick={() => setSearchTerm('')}>
                                                        <ClearIcon fontSize='small' />
                                                    </IconButton>
                                                </InputAdornment>
                                            ) : null,
                                            sx: { fontSize: '0.84rem' }
                                        }}
                                        fullWidth
                                    />

                                    <Stack direction='row' spacing={1}>
                                        <TextField
                                            select
                                            size='small'
                                            label='Library'
                                            value={selectedLibraryId}
                                            onChange={(e) => {
                                                setSelectedLibraryId(e.target.value);
                                                setPageIndex(0);
                                            }}
                                            sx={{ flex: 1, '& .MuiSelect-select': { fontSize: '0.82rem' } }}
                                        >
                                            <MenuItem value='all'>All Libraries</MenuItem>
                                            {(virtualFolders || []).map((f) => (
                                                <MenuItem key={f.ItemId || f.Name || ''} value={f.ItemId ?? ''}>
                                                    {f.Name}
                                                </MenuItem>
                                            ))}
                                        </TextField>

                                        <TextField
                                            select
                                            size='small'
                                            label='Type'
                                            value={selectedItemType}
                                            onChange={(e) => {
                                                setSelectedItemType(e.target.value);
                                                setPageIndex(0);
                                            }}
                                            sx={{ flex: 1, '& .MuiSelect-select': { fontSize: '0.82rem' } }}
                                        >
                                            {ITEM_TYPE_OPTIONS.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Stack>

                                    <Stack direction='row' spacing={1} flexWrap='wrap'>
                                        <Chip
                                            label='Missing Overview'
                                            size='small'
                                            clickable
                                            color={filterMissingOverview ? 'primary' : 'default'}
                                            onClick={() => {
                                                setFilterMissingOverview(v => !v);
                                                setPageIndex(0);
                                            }}
                                            sx={{
                                                fontSize: '0.72rem',
                                                bgcolor: filterMissingOverview ? KHYLO_COLORS.accent : 'transparent',
                                                borderColor: filterMissingOverview ? KHYLO_COLORS.accent : KHYLO_COLORS.borderDefault,
                                                border: '1px solid'
                                            }}
                                        />
                                        <Chip
                                            label='Missing Poster'
                                            size='small'
                                            clickable
                                            color={filterMissingPoster ? 'primary' : 'default'}
                                            onClick={() => {
                                                setFilterMissingPoster(v => !v);
                                                setPageIndex(0);
                                            }}
                                            sx={{
                                                fontSize: '0.72rem',
                                                bgcolor: filterMissingPoster ? KHYLO_COLORS.accent : 'transparent',
                                                borderColor: filterMissingPoster ? KHYLO_COLORS.accent : KHYLO_COLORS.borderDefault,
                                                border: '1px solid'
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </Box>

                            {/* Item Count & Page Navigation Header */}
                            <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontWeight: 600 }}>
                                    Showing {items.length} of {totalRecordCount} items
                                </Typography>
                                <Stack direction='row' alignItems='center' spacing={0.5}>
                                    <IconButton
                                        size='small'
                                        disabled={pageIndex === 0}
                                        onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                                    >
                                        <ChevronLeftIcon fontSize='small' />
                                    </IconButton>
                                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary, fontFamily: 'monospace' }}>
                                        {pageIndex + 1}/{totalPages}
                                    </Typography>
                                    <IconButton
                                        size='small'
                                        disabled={pageIndex >= totalPages - 1}
                                        onClick={() => setPageIndex(p => p + 1)}
                                    >
                                        <ChevronRightIcon fontSize='small' />
                                    </IconButton>
                                </Stack>
                            </Box>

                            {/* Items List */}
                            <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                                {isItemsLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                                        <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                                    </Box>
                                ) : items.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
                                        <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>
                                            No media items match the selected filter criteria.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={0.75}>
                                        {items.map((item) => {
                                            const isSelected = item.Id === selectedItemId;
                                            const imgUrl = getItemImageUrl(item.Id, item.ImageTags?.Primary);

                                            return (
                                                <Box
                                                    key={item.Id}
                                                    onClick={() => setSelectedItemId(item.Id)}
                                                    sx={{
                                                        p: 1.25,
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        bgcolor: isSelected ? 'rgba(217, 119, 50, 0.12)' : 'transparent',
                                                        border: `1px solid ${isSelected ? KHYLO_COLORS.accent : 'transparent'}`,
                                                        transition: 'all 0.15s ease',
                                                        '&:hover': {
                                                            bgcolor: isSelected ? 'rgba(217, 119, 50, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                                            borderColor: isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.borderDefault
                                                        }
                                                    }}
                                                >
                                                    {/* Thumbnail */}
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 56,
                                                            borderRadius: '4px',
                                                            overflow: 'hidden',
                                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                            flexShrink: 0,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        {imgUrl ? (
                                                            <Box
                                                                component='img'
                                                                src={imgUrl}
                                                                alt=''
                                                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            getItemIcon(item.Type)
                                                        )}
                                                    </Box>

                                                    {/* Item Info */}
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant='body2'
                                                            noWrap
                                                            sx={{
                                                                fontWeight: isSelected ? 700 : 600,
                                                                color: isSelected ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textPrimary,
                                                                fontSize: '0.84rem'
                                                            }}
                                                        >
                                                            {item.Name}
                                                        </Typography>
                                                        <Stack direction='row' alignItems='center' spacing={1} sx={{ mt: 0.25 }}>
                                                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.74rem' }}>
                                                                {item.ProductionYear || 'N/A'}
                                                            </Typography>
                                                            <Chip
                                                                label={item.Type}
                                                                size='small'
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 600,
                                                                    bgcolor: 'rgba(255,255,255,0.06)',
                                                                    color: KHYLO_COLORS.textSecondary
                                                                }}
                                                            />
                                                            {item.LockData && (
                                                                <LockIcon sx={{ fontSize: 13, color: KHYLO_COLORS.accent }} />
                                                            )}
                                                            {!item.Overview && (
                                                                <WarningAmberIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* RIGHT COLUMN: Full Item Metadata Editor */}
                    <Grid item xs={12} md={7} lg={8}>
                        {selectedItemId && fullItem ? (
                            <Stack spacing={3}>
                                {/* Item Header & Top Actions Card */}
                                <Paper
                                    variant='outlined'
                                    sx={{
                                        p: 2.5,
                                        borderRadius: '10px',
                                        bgcolor: KHYLO_COLORS.surfacePrimary,
                                        border: `1px solid ${KHYLO_COLORS.borderDefault}`
                                    }}
                                >
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }} justifyContent='space-between'>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            {/* Poster Preview */}
                                            <Box
                                                sx={{
                                                    width: 60,
                                                    height: 88,
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    bgcolor: 'rgba(255,255,255,0.05)',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `1px solid ${KHYLO_COLORS.borderDefault}`
                                                }}
                                            >
                                                {getItemImageUrl(fullItem.Id, fullItem.ImageTags?.Primary) ? (
                                                    <Box
                                                        component='img'
                                                        src={getItemImageUrl(fullItem.Id, fullItem.ImageTags?.Primary)!}
                                                        alt=''
                                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    getItemIcon(fullItem.Type)
                                                )}
                                            </Box>
                                            <Box>
                                                <Stack direction='row' alignItems='center' spacing={1}>
                                                    <Typography variant='h6' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary }}>
                                                        {fullItem.Name}
                                                    </Typography>
                                                    <KhyloStatusBadge
                                                        label={fullItem.Type}
                                                        color='active'
                                                        size='small'
                                                    />
                                                    {formLockData && (
                                                        <Chip
                                                            icon={<LockIcon sx={{ fontSize: '13px !important' }} />}
                                                            label='Locked'
                                                            size='small'
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.68rem',
                                                                fontWeight: 700,
                                                                bgcolor: 'rgba(217, 119, 50, 0.15)',
                                                                color: KHYLO_COLORS.accent,
                                                                border: '1px solid rgba(217, 119, 50, 0.3)'
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
                                                    ID: {fullItem.Id} {fullItem.Path ? `· ${fullItem.Path}` : ''}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Action Buttons */}
                                        <Stack direction='row' spacing={1.5}>
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                startIcon={refreshItemMutation.isPending ? <CircularProgress size={16} /> : <RefreshIcon />}
                                                onClick={handleRefreshMetadata}
                                                disabled={refreshItemMutation.isPending}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    fontSize: '0.82rem',
                                                    borderColor: KHYLO_COLORS.borderDefault,
                                                    color: KHYLO_COLORS.textPrimary,
                                                    '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: 'rgba(217, 119, 50, 0.08)' }
                                                }}
                                            >
                                                {refreshItemMutation.isPending ? 'Scraping…' : 'Scrape / Refresh'}
                                            </Button>
                                            <Button
                                                variant='contained'
                                                size='small'
                                                startIcon={updateItemMutation.isPending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveIcon />}
                                                onClick={handleSaveMetadata}
                                                disabled={updateItemMutation.isPending}
                                                sx={{
                                                    textTransform: 'none',
                                                    bgcolor: KHYLO_COLORS.accent,
                                                    fontWeight: 700,
                                                    fontSize: '0.82rem',
                                                    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                                }}
                                            >
                                                {updateItemMutation.isPending ? 'Saving…' : 'Save Changes'}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>

                                {/* Metadata Form Sections */}
                                <Stack spacing={2.5}>
                                    {/* SECTION 1: General Details */}
                                    <KhyloPanel title='General Details'>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={8}>
                                                <TextField
                                                    label='Title / Name'
                                                    value={formName}
                                                    onChange={(e) => setFormName(e.target.value)}
                                                    size='small'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label='Production Year'
                                                    value={formYear}
                                                    onChange={(e) => setFormYear(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. 2024'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    label='Original Title'
                                                    value={formOriginalTitle}
                                                    onChange={(e) => setFormOriginalTitle(e.target.value)}
                                                    size='small'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    label='Sort Title'
                                                    value={formSortName}
                                                    onChange={(e) => setFormSortName(e.target.value)}
                                                    size='small'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    label='Premiere Date'
                                                    type='date'
                                                    value={formPremiereDate}
                                                    onChange={(e) => setFormPremiereDate(e.target.value)}
                                                    size='small'
                                                    InputLabelProps={{ shrink: true }}
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    label='Parental / Official Rating'
                                                    value={formOfficialRating}
                                                    onChange={(e) => setFormOfficialRating(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. PG-13, R, TV-MA'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label='Overview / Synopsis'
                                                    value={formOverview}
                                                    onChange={(e) => setFormOverview(e.target.value)}
                                                    multiline
                                                    rows={4}
                                                    size='small'
                                                    fullWidth
                                                />
                                            </Grid>
                                        </Grid>
                                    </KhyloPanel>

                                    {/* SECTION 2: Scores & Ratings */}
                                    <KhyloPanel title='Community & Critic Scores'>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    label='Community Rating (0.0 – 10.0)'
                                                    value={formCommunityRating}
                                                    onChange={(e) => setFormCommunityRating(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. 8.4'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    label='Critic Rating (0 – 100)'
                                                    value={formCriticRating}
                                                    onChange={(e) => setFormCriticRating(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. 91'
                                                    fullWidth
                                                />
                                            </Grid>
                                        </Grid>
                                    </KhyloPanel>

                                    {/* SECTION 3: Taxonomy (Genres, Studios, Tags) */}
                                    <KhyloPanel title='Genres, Studios & Tags'>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label='Genres (Comma separated)'
                                                    value={formGenres}
                                                    onChange={(e) => setFormGenres(e.target.value)}
                                                    size='small'
                                                    placeholder='Action, Sci-Fi, Adventure'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label='Studios / Production Companies (Comma separated)'
                                                    value={formStudios}
                                                    onChange={(e) => setFormStudios(e.target.value)}
                                                    size='small'
                                                    placeholder='Warner Bros., Legendary Pictures'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    label='Tags (Comma separated)'
                                                    value={formTags}
                                                    onChange={(e) => setFormTags(e.target.value)}
                                                    size='small'
                                                    placeholder='4K, Criterion, Favorite'
                                                    fullWidth
                                                />
                                            </Grid>
                                        </Grid>
                                    </KhyloPanel>

                                    {/* SECTION 4: External Online Provider IDs */}
                                    <KhyloPanel title='Online Metadata Providers'>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label='IMDb ID'
                                                    value={formImdbId}
                                                    onChange={(e) => setFormImdbId(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. tt0087800'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label='TheMovieDb ID'
                                                    value={formTmdbId}
                                                    onChange={(e) => setFormTmdbId(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. 377'
                                                    fullWidth
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField
                                                    label='TheTVDB ID'
                                                    value={formTvdbId}
                                                    onChange={(e) => setFormTvdbId(e.target.value)}
                                                    size='small'
                                                    placeholder='e.g. 73491'
                                                    fullWidth
                                                />
                                            </Grid>
                                        </Grid>
                                    </KhyloPanel>

                                    {/* SECTION 5: Protection & Locking */}
                                    <KhyloPanel title='Protection & Lock Controls'>
                                        <Box sx={{ p: 1 }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={formLockData}
                                                        onChange={(e) => setFormLockData(e.target.checked)}
                                                        sx={{
                                                            '& .MuiSwitch-switchBase.Mui-checked': { color: KHYLO_COLORS.accent },
                                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: KHYLO_COLORS.accent }
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                                            Lock Item Metadata
                                                        </Typography>
                                                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                                            When enabled, background library scans, metadata refreshers, and automated scrapers will never overwrite your manual edits.
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </Box>
                                    </KhyloPanel>
                                </Stack>
                            </Stack>
                        ) : (
                            <Paper
                                variant='outlined'
                                sx={{
                                    p: 8,
                                    borderRadius: '10px',
                                    bgcolor: KHYLO_COLORS.surfacePrimary,
                                    border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                                    textAlign: 'center'
                                }}
                            >
                                <KhyloEmptyState
                                    icon={<FolderIcon fontSize='large' />}
                                    title='Select an Item to Curate Metadata'
                                    description='Browse the media items in the library list on the left or use the search bar above to inspect, enrich, and lock item metadata.'
                                />
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            </KhyloPage>

            {/* Notification Toast */}
            <Snackbar
                open={Boolean(toastMessage)}
                autoHideDuration={4000}
                onClose={() => setToastMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                {toastMessage ? (
                    <Alert
                        onClose={() => setToastMessage(null)}
                        severity={toastSeverity}
                        variant='filled'
                        sx={{ width: '100%', fontWeight: 600 }}
                    >
                        {toastMessage}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Page>
    );
};

export default Component;
