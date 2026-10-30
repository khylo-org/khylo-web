import React, { FC, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';

import { useLibraryMediaFolders } from 'apps/dashboard/features/users/api/useLibraryMediaFolders';
import { useCreateUser } from 'apps/dashboard/features/users/api/useCreateUser';
import { useUpdateUserPolicy } from 'apps/dashboard/features/users/api/useUpdateUserPolicy';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSettingSection,
    KhyloSettingRow,
    KhyloStickyActionBar,
    KhyloStatusBadge
} from '../../components/ui';

export const Component: FC = () => {
    const navigate = useNavigate();
    const { data: mediaFolders, isPending: isFoldersLoading } = useLibraryMediaFolders();
    const createUser = useCreateUser();
    const updateUserPolicy = useUpdateUserPolicy();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isAdministrator, setIsAdministrator] = useState(false);
    const [enableAllFolders, setEnableAllFolders] = useState(true);
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
    const [enableRemoteAccess, setEnableRemoteAccess] = useState(true);
    const [enableMediaPlayback, setEnableMediaPlayback] = useState(true);
    const [enableVideoTranscoding, setEnableVideoTranscoding] = useState(true);
    const [enableAudioTranscoding, setEnableAudioTranscoding] = useState(true);
    const [enableDownloading, setEnableDownloading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const folders = useMemo(() => mediaFolders?.Items || [], [mediaFolders]);

    const handleToggleFolder = useCallback((folderId: string) => {
        setSelectedFolders((prev) =>
            prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
        );
    }, []);

    const canSubmit = username.trim().length > 0 && !isSubmitting;

    const handleCreate = useCallback(async () => {
        if (!username.trim()) {
            setErrorMessage('Username is required.');
            return;
        }

        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            const userResponse = await createUser.mutateAsync({
                createUserByName: {
                    Name: username.trim(),
                    Password: password || undefined
                }
            });

            const newUser = userResponse.data;
            if (!newUser.Id || !newUser.Policy) {
                throw new Error('Server returned incomplete user record.');
            }

            const policy = {
                ...newUser.Policy,
                IsAdministrator: isAdministrator,
                EnableAllFolders: enableAllFolders,
                EnabledFolders: enableAllFolders ? [] : selectedFolders,
                EnableRemoteAccess: enableRemoteAccess,
                EnableMediaPlayback: enableMediaPlayback,
                EnableVideoPlaybackTranscoding: enableVideoTranscoding,
                EnableAudioPlaybackTranscoding: enableAudioTranscoding,
                EnableContentDownloading: enableDownloading
            };

            await updateUserPolicy.mutateAsync({
                userId: newUser.Id,
                userPolicy: policy
            });

            navigate('/dashboard/users');
        } catch (err: any) {
            console.error('[AddUser] Creation error:', err);
            setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to create user account.');
            setIsSubmitting(false);
        }
    }, [
        username,
        password,
        isAdministrator,
        enableAllFolders,
        selectedFolders,
        enableRemoteAccess,
        enableMediaPlayback,
        enableVideoTranscoding,
        enableAudioTranscoding,
        enableDownloading,
        createUser,
        updateUserPolicy,
        navigate
    ]);

    return (
        <KhyloPage>
            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Access Control' },
                    { label: 'User Accounts', href: '/dashboard/users' },
                    { label: 'Create Account' }
                ]}
                title='Create User Account'
                subtitle='Provision a new member profile with tailored library access boundaries, playback privileges, and authentication credentials.'
                badge={
                    <KhyloStatusBadge
                        label={isAdministrator ? 'Administrator Role' : 'Standard Member'}
                        color={isAdministrator ? 'active' : 'idle'}
                    />
                }
                actions={
                    <Button
                        variant='outlined'
                        size='small'
                        onClick={() => navigate('/dashboard/users')}
                        sx={{
                            textTransform: 'none',
                            borderColor: KHYLO_COLORS.borderDefault,
                            color: KHYLO_COLORS.textSecondary,
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            '&:hover': { color: KHYLO_COLORS.textPrimary }
                        }}
                    >
                        Cancel
                    </Button>
                }
            />

            {errorMessage && (
                <Alert severity='error' sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
                    {errorMessage}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <KhyloSettingSection
                    title='Identity & Credentials'
                    description='Set account handle and optional initial access secret for authentication.'
                >
                    <KhyloSettingRow
                        label='Username'
                        description='Unique account handle used to log in across web and mobile companion apps.'
                    >
                        <TextField
                            size='small'
                            required
                            placeholder='e.g. alex'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            sx={{ minWidth: 280 }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Initial Password'
                        description='Leave empty to allow the user to complete initial sign-in without a password.'
                    >
                        <TextField
                            size='small'
                            type='password'
                            placeholder='••••••••••••'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{ minWidth: 280 }}
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Server Administrator Role'
                        description='Grants unrestricted access to Khylo Server administration, hardware settings, and storage mount configuration.'
                    >
                        <Switch
                            checked={isAdministrator}
                            onChange={(e) => setIsAdministrator(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Library Scope & Content Access'
                    description='Control which media collections and directories this account is authorized to browse and stream.'
                >
                    <KhyloSettingRow
                        label='Access All Media Libraries'
                        description='Automatically inherit access to all current and future media libraries created on this server.'
                    >
                        <Switch
                            checked={enableAllFolders}
                            onChange={(e) => setEnableAllFolders(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    {!enableAllFolders && (
                        <KhyloSettingRow
                            label='Permitted Libraries'
                            description='Select individual library collections granted to this account.'
                        >
                            {isFoldersLoading ? (
                                <CircularProgress size={20} sx={{ color: KHYLO_COLORS.accent }} />
                            ) : folders.length === 0 ? (
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                    No libraries configured on server.
                                </Typography>
                            ) : (
                                <FormGroup sx={{ gap: 0.5 }}>
                                    {folders.map((folder) => {
                                        const isChecked = selectedFolders.includes(folder.Id || '');
                                        return (
                                            <FormControlLabel
                                                key={folder.Id}
                                                control={
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onChange={() => handleToggleFolder(folder.Id || '')}
                                                        size='small'
                                                        sx={{
                                                            color: KHYLO_COLORS.textMuted,
                                                            '&.Mui-checked': { color: KHYLO_COLORS.accent }
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography variant='body2' sx={{ fontSize: '0.85rem' }}>
                                                        {folder.Name}
                                                    </Typography>
                                                }
                                            />
                                        );
                                    })}
                                </FormGroup>
                            )}
                        </KhyloSettingRow>
                    )}
                </KhyloSettingSection>

                <KhyloSettingSection
                    title='Playback & Network Capabilities'
                    description='Define streaming permissions, transcoding rights, and remote network boundary limits.'
                >
                    <KhyloSettingRow
                        label='Remote WAN Network Access'
                        description='Allow user to connect to this Khylo server from outside the local home network.'
                    >
                        <Switch
                            checked={enableRemoteAccess}
                            onChange={(e) => setEnableRemoteAccess(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Direct Media Playback'
                        description='Authorize streaming audio and video content to authorized endpoints.'
                    >
                        <Switch
                            checked={enableMediaPlayback}
                            onChange={(e) => setEnableMediaPlayback(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Video Transcoding Acceleration'
                        description='Allow video streams to be dynamically transcoded when client codecs or bandwidth require adaptation.'
                    >
                        <Switch
                            checked={enableVideoTranscoding}
                            onChange={(e) => setEnableVideoTranscoding(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Audio Transcoding'
                        description='Allow audio format conversion on the fly when playback devices do not support the source format.'
                    >
                        <Switch
                            checked={enableAudioTranscoding}
                            onChange={(e) => setEnableAudioTranscoding(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>

                    <KhyloSettingRow
                        label='Offline Content Downloading'
                        description='Allow saving raw media files locally to client devices for offline playback.'
                    >
                        <Switch
                            checked={enableDownloading}
                            onChange={(e) => setEnableDownloading(e.target.checked)}
                            color='warning'
                        />
                    </KhyloSettingRow>
                </KhyloSettingSection>
            </Box>

            <KhyloStickyActionBar
                isDirty={canSubmit}
                isSaving={isSubmitting}
                saveText='Create Account'
                onSave={handleCreate}
                onReset={() => {
                    setUsername('');
                    setPassword('');
                    setIsAdministrator(false);
                    setEnableAllFolders(true);
                    setSelectedFolders([]);
                }}
            />
        </KhyloPage>
    );
};

export default Component;
