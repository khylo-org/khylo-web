import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LanIcon from '@mui/icons-material/Lan';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import ConfirmDialog from 'components/ConfirmDialog';
import { KHYLO_COLORS } from '../ui/tokens';
import {
    KhyloNetworkShareDialog,
    fetchNetworkShares,
    fetchMappedDrives,
    type MappedDrive,
    removeNetworkShare,
    type NetworkShare,
    type ServerAccess
} from './KhyloNetworkShareDialog';

export interface FileSystemEntry {
    Name: string;
    Path: string;
    Type: 'Directory' | 'File';
}

interface KhyloServerFileBrowserModalProps {
    open: boolean;
    initialPath?: string;
    onClose: () => void;
    onSelect: (selectedPath: string) => void;
    title?: string;
    includeFiles?: boolean;
    filterExtensions?: string[];
}

/** What the tooltip says about a drive mapped on the server's computer. */
const mappedHint = (m: MappedDrive) => {
    if (m.Reachable) return `${m.Address}, mapped as ${m.Letter} on this computer`;
    return `${m.Address} is mapped as ${m.Letter} on this computer. Click to connect it with your login for the share.`;
};

export const KhyloServerFileBrowserModal: FC<KhyloServerFileBrowserModalProps> = ({
    open,
    initialPath = '',
    onClose,
    onSelect,
    title = 'Select Server Storage Directory',
    includeFiles = false,
    filterExtensions
}) => {
    const { api } = useApi();

    const [drives, setDrives] = useState<FileSystemEntry[]>([]);
    const [currentPath, setCurrentPath] = useState<string>(initialPath);
    const [entries, setEntries] = useState<FileSystemEntry[]>([]);
    const [parentPath, setParentPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState<string>(initialPath);

    // Network shares Khylo has connected (SMB and NFS), shown beside the drives
    const [shares, setShares] = useState<NetworkShare[]>([]);
    const [canConnectShares, setCanConnectShares] = useState(true);
    const [whyNotShares, setWhyNotShares] = useState<string | null>(null);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareToRemove, setShareToRemove] = useState<NetworkShare | null>(null);
    // Drives mapped on the server's computer (Windows). The server can't use their letters, but it can connect the address
    const [mappedDrives, setMappedDrives] = useState<MappedDrive[]>([]);
    const [shareDraft, setShareDraft] = useState<{ address: string; username: string } | null>(null);

    const access = useMemo<ServerAccess>(() => {
        const legacy = ServerConnections.currentApiClient();
        let base = api?.basePath || (legacy?.serverAddress ? legacy.serverAddress() : '') || '';
        while (base.endsWith('/')) base = base.slice(0, -1);
        const token = api?.accessToken || (legacy?.accessToken ? legacy.accessToken() : '') || '';
        return { base, token };
    }, [api]);

    const fetchShares = useCallback(async () => {
        try {
            const result = await fetchNetworkShares(access);
            setShares(result.Shares || []);
            setCanConnectShares(result.CanConnect);
            setWhyNotShares(result.WhyNot || null);
        } catch (err) {
            console.warn('[FileBrowser] network shares unavailable:', err);
        }
    }, [access]);

    const fetchMapped = useCallback(async () => {
        try {
            setMappedDrives(await fetchMappedDrives(access));
        } catch (err) {
            console.warn('[FileBrowser] mapped drives unavailable:', err);
        }
    }, [access]);

    // Fetch the server's drives and mounts on open
    const fetchDrives = useCallback(async () => {
        const legacy = ServerConnections.currentApiClient();
        if (legacy && typeof (legacy as any).getJSON === 'function') {
            try {
                const data = await (legacy as any).getJSON((legacy as any).getUrl('Environment/Drives'));
                setDrives(data || []);
                if (!currentPath && data?.length > 0) {
                    setCurrentPath(data[0].Path);
                    setManualInput(data[0].Path);
                }
                return;
            } catch (e) {
                console.warn('[FileBrowser] legacy getDrives failed, falling back to axios:', e);
            }
        }

        const baseUrl = api?.basePath || (legacy?.serverAddress ? legacy.serverAddress() : '');
        const token = api?.accessToken || (legacy?.accessToken ? legacy.accessToken() : '');
        const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
        try {
            const resp = await axios.get<FileSystemEntry[]>(`${cleanBase}/Environment/Drives`, {
                headers: { Authorization: `MediaBrowser Token="${token}"` }
            });
            setDrives(resp.data || []);
            if (!currentPath && resp.data?.length > 0) {
                setCurrentPath(resp.data[0].Path);
                setManualInput(resp.data[0].Path);
            }
        } catch (err: any) {
            console.error('[FileBrowser] Failed to load server drives:', err);
            setErrorMsg('Failed to enumerate server storage drives.');
        }
    }, [api, currentPath]);

    // Fetch directory contents and parent path for a given path
    const loadDirectory = useCallback(async (targetPath: string) => {
        if (!targetPath) return;
        setIsLoading(true);
        setErrorMsg(null);
        setSearchFilter('');

        const legacy = ServerConnections.currentApiClient();
        if (legacy && typeof (legacy as any).getJSON === 'function') {
            try {
                const data = await (legacy as any).getJSON((legacy as any).getUrl('Environment/DirectoryContents', {
                    path: targetPath,
                    includeDirectories: true,
                    includeFiles: includeFiles
                }));
                setEntries(data || []);

                try {
                    const parentData = await (legacy as any).getJSON((legacy as any).getUrl('Environment/ParentPath', { path: targetPath }));
                    setParentPath(parentData || null);
                } catch {
                    setParentPath(null);
                }

                setCurrentPath(targetPath);
                setManualInput(targetPath);
                setIsLoading(false);
                return;
            } catch (e) {
                console.warn('[FileBrowser] legacy loadDirectory failed, falling back to axios:', e);
            }
        }

        const baseUrl = api?.basePath || (legacy?.serverAddress ? legacy.serverAddress() : '');
        const token = api?.accessToken || (legacy?.accessToken ? legacy.accessToken() : '');
        const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
        const headers = { Authorization: `MediaBrowser Token="${token}"` };

        try {
            const contentsUrl = `${cleanBase}/Environment/DirectoryContents?path=${encodeURIComponent(targetPath)}&includeDirectories=true&includeFiles=${includeFiles ? 'true' : 'false'}`;
            const contentsResp = await axios.get<FileSystemEntry[]>(contentsUrl, { headers });
            setEntries(contentsResp.data || []);

            try {
                const parentUrl = `${cleanBase}/Environment/ParentPath?path=${encodeURIComponent(targetPath)}`;
                const parentResp = await axios.get<string | null>(parentUrl, { headers });
                setParentPath(parentResp.data || null);
            } catch {
                setParentPath(null);
            }

            setCurrentPath(targetPath);
            setManualInput(targetPath);
        } catch (err: any) {
            console.warn('[FileBrowser] Cannot access path:', targetPath, err);
            setErrorMsg(`Directory inaccessible or permission denied: ${targetPath}`);
            setEntries([]);
        } finally {
            setIsLoading(false);
        }
    }, [api, includeFiles]);

    // Initialize state when modal opens
    useEffect(() => {
        if (open) {
            fetchDrives();
            if (initialPath) {
                loadDirectory(initialPath);
            } else if (currentPath) {
                loadDirectory(currentPath);
            }
        }
    }, [open, initialPath, fetchDrives, loadDirectory]);

    useEffect(() => {
        if (open) {
            void fetchShares();
            void fetchMapped();
        }
    }, [open, fetchShares, fetchMapped]);

    const onShareConnected = useCallback((share: NetworkShare) => {
        setIsShareDialogOpen(false);
        void fetchShares();
        void fetchDrives();
        void loadDirectory(share.Path);
    }, [fetchShares, fetchDrives, loadDirectory]);

    const onRemoveShareConfirm = useCallback(async () => {
        if (!shareToRemove) return;
        try {
            await removeNetworkShare(access, shareToRemove.Id);
            await fetchShares();
            await fetchDrives();
        } catch {
            setErrorMsg('Couldn\u2019t disconnect the share.');
        } finally {
            setShareToRemove(null);
        }
    }, [access, shareToRemove, fetchShares, fetchDrives]);

    // On Linux a connected share also shows up as a mount; list it once, as a share
    const plainDrives = useMemo(() => {
        const sharePaths = new Set(shares.map(sh => sh.Path.toLowerCase()));
        const trimmed = (path: string) => {
            let t = path.toLowerCase();
            while (t.length > 1 && (t.endsWith('/') || t.endsWith('\\'))) t = t.slice(0, -1);
            return t;
        };
        return drives.filter(d => !sharePaths.has(trimmed(d.Path)));
    }, [drives, shares]);

    const handleSelectDrive = useCallback((drivePath: string) => {
        loadDirectory(drivePath);
    }, [loadDirectory]);

    const handleNavigateUp = useCallback(() => {
        if (parentPath) {
            loadDirectory(parentPath);
        }
    }, [parentPath, loadDirectory]);

    const handleManualSubmit = useCallback((e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = manualInput.trim();
        if (trimmed) {
            loadDirectory(trimmed);
        }
    }, [manualInput, loadDirectory]);

    const handleConfirmSelection = useCallback(() => {
        if (currentPath) {
            onSelect(currentPath);
            onClose();
        }
    }, [currentPath, onSelect, onClose]);

    // Parse breadcrumbs for Windows paths (e.g. C:\Users\name\...)
    const breadcrumbSegments = useMemo(() => {
        if (!currentPath) return [];
        // Normalize slashes for splitting while maintaining display
        const normalized = currentPath.replace(/\//g, '\\');
        const parts = normalized.split('\\').filter(Boolean);

        const segments: { label: string; fullPath: string }[] = [];
        let accumulated = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === 0 && part.endsWith(':')) {
                accumulated = `${part}\\`;
                segments.push({ label: part, fullPath: accumulated });
            } else {
                accumulated = accumulated.endsWith('\\') ? `${accumulated}${part}` : `${accumulated}\\${part}`;
                segments.push({ label: part, fullPath: accumulated });
            }
        }
        return segments;
    }, [currentPath]);

    // Filter directories and files
    const filteredEntries = useMemo(() => {
        let list = entries;
        if (filterExtensions && filterExtensions.length > 0) {
            list = list.filter(e => e.Type === 'Directory' || filterExtensions.some(ext => e.Name.toLowerCase().endsWith(ext.toLowerCase())));
        }
        if (!searchFilter.trim()) return list;
        const q = searchFilter.toLowerCase();
        return list.filter(e => e.Name.toLowerCase().includes(q));
    }, [entries, searchFilter, filterExtensions]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='md'
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: KHYLO_COLORS.surfacePrimary,
                    color: KHYLO_COLORS.textPrimary,
                    borderRadius: '10px',
                    border: `1px solid ${KHYLO_COLORS.borderDefault}`,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column'
                }
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    p: 2.5,
                    borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FolderOpenIcon sx={{ color: KHYLO_COLORS.accent, fontSize: 24 }} />
                    <Box>
                        <Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {title}
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.72rem' }}>
                            Folders on the Khylo server, including network shares it has connected
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    size='small'
                    onClick={onClose}
                    sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.textPrimary } }}
                >
                    <CloseIcon fontSize='small' />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'hidden' }}>
                {/* Available Storage Drives */}
                <Box>
                    <Typography
                        variant='caption'
                        sx={{
                            display: 'block',
                            color: KHYLO_COLORS.textMuted,
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            mb: 1
                        }}
                    >
                        Storage Drives & Mounts
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {plainDrives.map((d) => {
                            const isDriveActive = currentPath.toLowerCase().startsWith(d.Path.toLowerCase());
                            return (
                                <Chip
                                    key={d.Path}
                                    icon={<StorageIcon sx={{ fontSize: 16 }} />}
                                    label={d.Name}
                                    clickable
                                    onClick={() => handleSelectDrive(d.Path)}
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '0.78rem',
                                        borderRadius: '6px',
                                        bgcolor: isDriveActive ? KHYLO_COLORS.surfaceActive : KHYLO_COLORS.surfaceSecondary,
                                        color: isDriveActive ? KHYLO_COLORS.accent : KHYLO_COLORS.textSecondary,
                                        border: `1px solid ${isDriveActive ? KHYLO_COLORS.accent : KHYLO_COLORS.borderSubtle}`,
                                        '&:hover': {
                                            bgcolor: KHYLO_COLORS.surfaceHover,
                                            color: KHYLO_COLORS.accent
                                        }
                                    }}
                                />
                            );
                        })}
                        {shares.map(sh => {
                            const isActive = currentPath.toLowerCase().startsWith(sh.Path.toLowerCase());
                            return (
                                <Tooltip key={sh.Id} title={sh.Connected ? sh.Address : `${sh.Address} isn't connected right now; Khylo keeps trying`}>
                                    <Chip
                                        icon={<LanIcon sx={{ fontSize: 16 }} />}
                                        label={sh.Name}
                                        clickable
                                        onClick={() => handleSelectDrive(sh.Path)}
                                        onDelete={() => setShareToRemove(sh)}
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.78rem',
                                            borderRadius: '6px',
                                            opacity: sh.Connected ? 1 : 0.55,
                                            bgcolor: isActive ? KHYLO_COLORS.surfaceActive : KHYLO_COLORS.surfaceSecondary,
                                            color: isActive ? KHYLO_COLORS.accent : KHYLO_COLORS.textSecondary,
                                            border: `1px solid ${isActive ? KHYLO_COLORS.accent : KHYLO_COLORS.borderSubtle}`,
                                            '& .MuiChip-deleteIcon': { color: KHYLO_COLORS.textMuted, fontSize: 16 },
                                            '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover, color: KHYLO_COLORS.accent }
                                        }}
                                    />
                                </Tooltip>
                            );
                        })}
                        {mappedDrives
                            .filter(m => !shares.some(sh => sh.Address.toLowerCase() === m.Address.toLowerCase()))
                            .map(m => (
                                <Tooltip
                                    key={m.Address}
                                    title={mappedHint(m)}
                                >
                                    <Chip
                                        icon={<LanIcon sx={{ fontSize: 16 }} />}
                                        label={`${m.Letter}  ${m.Address}`}
                                        clickable
                                        onClick={() => {
                                            if (m.Reachable) {
                                                handleSelectDrive(m.Address);
                                            } else {
                                                setShareDraft({ address: m.Address, username: m.UserName ?? '' });
                                                setIsShareDialogOpen(true);
                                            }
                                        }}
                                        variant='outlined'
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.78rem',
                                            borderRadius: '6px',
                                            color: KHYLO_COLORS.textSecondary,
                                            borderColor: KHYLO_COLORS.borderDefault,
                                            '&:hover': { color: KHYLO_COLORS.accent, borderColor: KHYLO_COLORS.accent }
                                        }}
                                    />
                                </Tooltip>
                            ))}
                        <Chip
                            icon={<AddIcon sx={{ fontSize: 16 }} />}
                            label='Network share'
                            clickable
                            onClick={() => {
                                setShareDraft(null);
                                setIsShareDialogOpen(true);
                            }}
                            variant='outlined'
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.78rem',
                                borderRadius: '6px',
                                color: KHYLO_COLORS.textSecondary,
                                borderColor: KHYLO_COLORS.borderDefault,
                                borderStyle: 'dashed',
                                '&:hover': { color: KHYLO_COLORS.accent, borderColor: KHYLO_COLORS.accent }
                            }}
                        />
                    </Box>
                </Box>

                <KhyloNetworkShareDialog
                    open={isShareDialogOpen}
                    access={access}
                    canConnect={canConnectShares}
                    whyNot={whyNotShares}
                    initialAddress={shareDraft?.address}
                    initialUsername={shareDraft?.username}
                    onClose={() => setIsShareDialogOpen(false)}
                    onConnected={onShareConnected}
                />

                <ConfirmDialog
                    open={Boolean(shareToRemove)}
                    title='Disconnect share'
                    text={`Disconnect ${shareToRemove?.Address ?? 'this share'}? Nothing on the share is changed, but libraries using it can't play its media until it's added again.`}
                    onCancel={() => setShareToRemove(null)}
                    onConfirm={onRemoveShareConfirm}
                    confirmButtonColor='error'
                    confirmButtonText='Disconnect'
                />

                {/* Path Input & Go Toolbar */}
                <Box component='form' onSubmit={handleManualSubmit} sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size='small'
                        fullWidth
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder='Type a folder path'
                        InputProps={{
                            sx: {
                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                                color: KHYLO_COLORS.textPrimary
                            }
                        }}
                    />
                    <Button
                        variant='outlined'
                        size='small'
                        type='submit'
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderColor: KHYLO_COLORS.borderDefault,
                            color: KHYLO_COLORS.textPrimary,
                            minWidth: 64,
                            '&:hover': { borderColor: KHYLO_COLORS.accent, bgcolor: KHYLO_COLORS.surfaceHover }
                        }}
                    >
                        Go
                    </Button>
                </Box>

                {/* Breadcrumbs & Navigation Bar */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.25,
                        borderRadius: '6px',
                        bgcolor: KHYLO_COLORS.surfaceSecondary,
                        border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                        gap: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                        <Tooltip title='Parent Folder'>
                            <span>
                                <IconButton
                                    size='small'
                                    disabled={!parentPath || isLoading}
                                    onClick={handleNavigateUp}
                                    sx={{
                                        color: KHYLO_COLORS.accent,
                                        p: 0.5,
                                        '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)' }
                                    }}
                                >
                                    <ArrowUpwardIcon fontSize='small' />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Breadcrumbs
                            separator='/'
                            sx={{
                                color: KHYLO_COLORS.textMuted,
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                                overflow: 'hidden',
                                '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' }
                            }}
                        >
                            {breadcrumbSegments.map((seg, idx) => {
                                const isLast = idx === breadcrumbSegments.length - 1;
                                return isLast ? (
                                    <Typography
                                        key={seg.fullPath}
                                        sx={{
                                            color: KHYLO_COLORS.accent,
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            fontFamily: 'monospace'
                                        }}
                                    >
                                        {seg.label}
                                    </Typography>
                                ) : (
                                    <Link
                                        key={seg.fullPath}
                                        underline='hover'
                                        sx={{
                                            color: KHYLO_COLORS.textSecondary,
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            '&:hover': { color: KHYLO_COLORS.textPrimary }
                                        }}
                                        onClick={() => loadDirectory(seg.fullPath)}
                                    >
                                        {seg.label}
                                    </Link>
                                );
                            })}
                        </Breadcrumbs>
                    </Box>

                    <IconButton
                        size='small'
                        onClick={() => loadDirectory(currentPath)}
                        disabled={isLoading}
                        title='Refresh directory'
                        sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.textPrimary } }}
                    >
                        <RefreshIcon fontSize='small' />
                    </IconButton>
                </Box>

                {/* Directory Search Filter */}
                <TextField
                    size='small'
                    fullWidth
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder='Filter directories in this folder…'
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position='start'>
                                <SearchIcon sx={{ fontSize: 18, color: KHYLO_COLORS.textMuted }} />
                            </InputAdornment>
                        ),
                        sx: {
                            bgcolor: KHYLO_COLORS.surfaceSecondary,
                            fontSize: '0.8rem',
                            borderRadius: '6px'
                        }
                    }}
                />

                {/* Error Banner */}
                {errorMsg && (
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: '6px',
                            bgcolor: KHYLO_COLORS.status.danger.bg,
                            border: `1px solid ${KHYLO_COLORS.status.danger.border}`,
                            color: KHYLO_COLORS.status.danger.fg,
                            fontSize: '0.78rem'
                        }}
                    >
                        {errorMsg}
                    </Box>
                )}

                {/* Directory Contents List */}
                <Box
                    sx={{
                        flexGrow: 1,
                        height: 280,
                        overflowY: 'auto',
                        borderRadius: '6px',
                        border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                        bgcolor: KHYLO_COLORS.bgApp,
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 3 }
                    }}
                >
                    {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1.5 }}>
                            <CircularProgress size={24} sx={{ color: KHYLO_COLORS.accent }} />
                            <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted }}>
                                Reading directory contents…
                            </Typography>
                        </Box>
                    ) : filteredEntries.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 1 }}>
                            <FolderIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.1)' }} />
                            <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                {entries.length === 0 ? 'No subdirectories found in this folder' : 'No matching directories'}
                            </Typography>
                        </Box>
                    ) : (
                        <List dense sx={{ py: 0.5 }}>
                            {filteredEntries.map((entry) => {
                                const isDir = entry.Type === 'Directory';
                                const isSelected = currentPath === entry.Path;
                                return (
                                    <ListItemButton
                                        key={entry.Path}
                                        onClick={() => {
                                            if (isDir) {
                                                loadDirectory(entry.Path);
                                            } else {
                                                setCurrentPath(entry.Path);
                                                setManualInput(entry.Path);
                                            }
                                        }}
                                        sx={{
                                            py: 0.75,
                                            px: 1.5,
                                            borderRadius: '4px',
                                            mx: 0.5,
                                            bgcolor: isSelected ? KHYLO_COLORS.surfaceActive : 'transparent',
                                            borderLeft: isSelected ? `3px solid ${KHYLO_COLORS.accent}` : '3px solid transparent',
                                            transition: 'background-color 0.1s ease',
                                            '&:hover': {
                                                bgcolor: KHYLO_COLORS.surfaceHover
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: isDir ? KHYLO_COLORS.accent : KHYLO_COLORS.textSecondary }}>
                                            {isDir ? <FolderIcon sx={{ fontSize: 20 }} /> : <InsertDriveFileIcon sx={{ fontSize: 20 }} />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={entry.Name}
                                            primaryTypographyProps={{
                                                fontSize: '0.82rem',
                                                fontWeight: isSelected ? 700 : 500,
                                                color: isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.textPrimary
                                            }}
                                        />
                                    </ListItemButton>
                                );
                            })}
                        </List>
                    )}
                </Box>
            </DialogContent>

            {/* Footer with Selected Path Confirmation */}
            <DialogActions
                sx={{
                    p: 2.5,
                    borderTop: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: KHYLO_COLORS.surfaceSecondary
                }}
            >
                <Box sx={{ overflow: 'hidden', mr: 2 }}>
                    <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.7rem', display: 'block' }}>
                        Selected Path:
                    </Typography>
                    <Typography
                        variant='body2'
                        noWrap
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: KHYLO_COLORS.textPrimary
                        }}
                    >
                        {currentPath || 'None'}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button
                        variant='text'
                        size='small'
                        onClick={onClose}
                        sx={{ color: KHYLO_COLORS.textSecondary, textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant='contained'
                        size='small'
                        disabled={!currentPath || isLoading}
                        startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                        onClick={handleConfirmSelection}
                        sx={{
                            bgcolor: KHYLO_COLORS.accent,
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: '0.82rem',
                            '&:hover': { bgcolor: '#c4692a' }
                        }}
                    >
                        Select Path
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default KhyloServerFileBrowserModal;
