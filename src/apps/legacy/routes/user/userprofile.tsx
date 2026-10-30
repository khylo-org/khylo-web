import React, {
    type FunctionComponent,
    useState,
    useRef,
    useMemo,
    useEffect
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { UserDto } from '@khylo/sdk/lib/generated-client';
import { ImageType } from '@khylo/sdk/lib/generated-client/models/image-type';

// MUI Icons
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import LockOutlined from '@mui/icons-material/LockOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import TvOutlined from '@mui/icons-material/TvOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';

import Dashboard from '../../../../utils/dashboard';
import globalize from '../../../../lib/globalize';
import { appHost } from '../../../../components/apphost';
import confirm from '../../../../components/confirm/confirm';
import toast from '../../../../components/toast/toast';
import { useUser } from 'hooks/api/useUser';
import loading from 'components/loading/loading';
import { queryClient } from 'utils/query/queryClient';
import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';
import { KhyloButton } from 'components/khylo/ui/KhyloButton';

import './userprofile.scss';

const UserProfile: FunctionComponent = () => {
    const [ searchParams ] = useSearchParams();
    const navigate = useNavigate();
    const userId = searchParams.get('userId') || undefined;
    const { data: user, isPending: isUserPending } = useUser({ userId });

    const [ loggedInUser, setLoggedInUser ] = useState<UserDto | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Form State
    const [ currentPassword, setCurrentPassword ] = useState('');
    const [ newPassword, setNewPassword ] = useState('');
    const [ confirmPassword, setConfirmPassword ] = useState('');
    const [ showCurrent, setShowCurrent ] = useState(false);
    const [ showNew, setShowNew ] = useState(false);
    const [ showConfirm, setShowConfirm ] = useState(false);
    const [ isSavingPassword, setIsSavingPassword ] = useState(false);

    useEffect(() => {
        Dashboard.getCurrentUser().then((current) => {
            setLoggedInUser(current);
        }).catch((err) => {
            console.error('[userprofile] failed to get current user', err);
        });
    }, []);

    const isAdmin = Boolean(user?.Policy?.IsAdministrator);
    const canEdit = Boolean(
        loggedInUser?.Policy?.IsAdministrator || user?.Policy?.EnableUserPreferenceAccess
    );

    const userImageUrl = useMemo(() => {
        if (!user?.Id || !user?.PrimaryImageTag) return null;
        return window.ApiClient.getUserImageUrl(user.Id, {
            tag: user.PrimaryImageTag,
            type: 'Primary'
        });
    }, [user?.Id, user?.PrimaryImageTag]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.Id) return;

        if (!/image.*/.exec(file.type)) {
            toast(globalize.translate('FileReadError'));
            return;
        }

        loading.show();
        window.ApiClient.uploadUserImage(user.Id, ImageType.Primary, file)
            .then(() => {
                loading.hide();
                toast('Profile photo updated');
                void queryClient.invalidateQueries({ queryKey: ['User'] });
            })
            .catch((err) => {
                loading.hide();
                console.error('[userprofile] failed to upload image', err);
                toast(globalize.translate('FileReadError'));
            });
    };

    const handleDeleteImage = () => {
        if (!user?.Id) return;
        const userId = user.Id;

        confirm(
            globalize.translate('DeleteImageConfirmation') || 'Are you sure you want to delete this image?',
            globalize.translate('DeleteImage') || 'Delete Image'
        ).then(() => {
            loading.show();
            window.ApiClient.deleteUserImage(userId, ImageType.Primary)
                .then(() => {
                    loading.hide();
                    toast('Profile photo removed');
                    void queryClient.invalidateQueries({ queryKey: ['User'] });
                })
                .catch((err) => {
                    loading.hide();
                    console.error('[userprofile] failed to delete image', err);
                });
        }).catch(() => {
            // Cancelled
        });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.Id) return;

        if (newPassword !== confirmPassword) {
            toast(globalize.translate('PasswordMatchError'));
            return;
        }

        if (newPassword === '' && isAdmin) {
            toast(globalize.translate('PasswordMissingSaveError'));
            return;
        }

        setIsSavingPassword(true);
        loading.show();

        window.ApiClient.updateUserPassword(user.Id, currentPassword, newPassword)
            .then(() => {
                loading.hide();
                setIsSavingPassword(false);
                toast(globalize.translate('PasswordSaved'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                void queryClient.invalidateQueries({ queryKey: ['User'] });
            })
            .catch(() => {
                loading.hide();
                setIsSavingPassword(false);
                Dashboard.alert({
                    title: globalize.translate('HeaderLoginFailure'),
                    message: globalize.translate('MessageInvalidUser')
                });
            });
    };

    const handleResetPassword = () => {
        if (!user?.Id) return;
        const userId = user.Id;

        confirm(
            globalize.translate('PasswordResetConfirmation') || 'Are you sure you want to reset your password?',
            globalize.translate('ResetPassword') || 'Reset Password'
        ).then(() => {
            loading.show();
            window.ApiClient.resetUserPassword(userId)
                .then(() => {
                    loading.hide();
                    Dashboard.alert({
                        message: globalize.translate('PasswordResetComplete'),
                        title: globalize.translate('ResetPassword')
                    });
                    void queryClient.invalidateQueries({ queryKey: ['User'] });
                })
                .catch((err) => {
                    loading.hide();
                    console.error('[userprofile] failed to reset user password', err);
                });
        }).catch(() => {
            // Cancelled
        });
    };

    const handleSignOut = () => {
        confirm('Are you sure you want to sign out of Khylo?', 'Sign Out').then(() => {
            Dashboard.logout();
        }).catch(() => {
            // Cancelled
        });
    };

    if (isUserPending || !user) {
        return <Loading />;
    }

    const userInitial = user.Name ? user.Name.charAt(0).toUpperCase() : 'K';

    return (
        <Page
            id='userProfilePage'
            title={globalize.translate('Profile')}
            className='khylo-profile-page noSecondaryNavPage'
        >
            <div className='khylo-profile-container'>
                {/* Back to Settings Header Link */}
                <div className='khylo-profile-top-bar'>
                    <a href='#/mypreferencesmenu' className='khylo-settings-back-link'>
                        ← {globalize.translate('Settings')}
                    </a>
                </div>

                {/* 1. Refined Profile Header */}
                <div className='khylo-profile-header-card'>
                    <div className='khylo-profile-avatar-wrapper'>
                        <div
                            className='khylo-profile-avatar'
                            style={userImageUrl ? { backgroundImage: `url(${userImageUrl})` } : undefined}
                        >
                            {!userImageUrl && (
                                <span className='khylo-profile-avatar__fallback'>
                                    {userInitial}
                                </span>
                            )}
                        </div>

                        {canEdit && appHost.supports('fileinput') && (
                            <div
                                className='khylo-profile-avatar-overlay'
                                onClick={handleUploadClick}
                                title='Change profile picture'
                                role='button'
                                tabIndex={0}
                            >
                                <PhotoCameraOutlined fontSize='medium' />
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='image/*'
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className='khylo-profile-header-card__info'>
                        <h1 className='khylo-profile-header-card__name'>{user.Name}</h1>

                        <div className='khylo-profile-header-card__meta'>
                            <span className='khylo-profile-meta-role'>
                                {isAdmin ? 'Administrator' : 'Standard Member'}
                            </span>
                            <span className='khylo-profile-meta-dot'>•</span>
                            <span className='khylo-profile-meta-server'>
                                <span className='khylo-profile-status-indicator' />
                                Connected to Khylo Server
                            </span>
                        </div>

                        {canEdit && (
                            <div className='khylo-profile-header-card__actions'>
                                {appHost.supports('fileinput') && (
                                    <button
                                        type='button'
                                        className='khylo-profile-action-btn'
                                        onClick={handleUploadClick}
                                    >
                                        <PhotoCameraOutlined style={{ fontSize: '1rem' }} />
                                        Change Photo
                                    </button>
                                )}

                                {userImageUrl && (
                                    <button
                                        type='button'
                                        className='khylo-profile-action-btn khylo-profile-action-btn--ghost'
                                        onClick={handleDeleteImage}
                                    >
                                        <DeleteOutline style={{ fontSize: '1rem' }} />
                                        Remove Photo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Main Content Grid */}
                <div className='khylo-profile-grid'>
                    {/* Left Column: Security & Password */}
                    <div className='khylo-profile-panel'>
                        <div className='khylo-profile-panel__header'>
                            <h2 className='khylo-profile-panel__title'>
                                Security & Password
                            </h2>
                            <p className='khylo-profile-panel__subtitle'>
                                Update your login password to secure your personal streaming profile.
                            </p>
                        </div>

                        <form className='khylo-profile-form' onSubmit={handlePasswordSubmit}>
                            {user.HasConfiguredPassword && (
                                <div className='khylo-profile-field'>
                                    <label className='khylo-profile-field__label' htmlFor='currentPasswordInput'>
                                        Current Password
                                    </label>
                                    <div className='khylo-profile-field__input-wrap'>
                                        <input
                                            id='currentPasswordInput'
                                            type={showCurrent ? 'text' : 'password'}
                                            className='khylo-profile-field__input'
                                            placeholder='Enter current password'
                                            autoComplete='current-password'
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                        <button
                                            type='button'
                                            className='khylo-profile-field__toggle-btn'
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            tabIndex={-1}
                                        >
                                            {showCurrent ? <VisibilityOffOutlined fontSize='small' /> : <VisibilityOutlined fontSize='small' />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className='khylo-profile-field'>
                                <label className='khylo-profile-field__label' htmlFor='newPasswordInput'>
                                    New Password
                                </label>
                                <div className='khylo-profile-field__input-wrap'>
                                    <input
                                        id='newPasswordInput'
                                        type={showNew ? 'text' : 'password'}
                                        className='khylo-profile-field__input'
                                        placeholder='Enter new password'
                                        autoComplete='new-password'
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type='button'
                                        className='khylo-profile-field__toggle-btn'
                                        onClick={() => setShowNew(!showNew)}
                                        tabIndex={-1}
                                    >
                                        {showNew ? <VisibilityOffOutlined fontSize='small' /> : <VisibilityOutlined fontSize='small' />}
                                    </button>
                                </div>
                            </div>

                            <div className='khylo-profile-field'>
                                <label className='khylo-profile-field__label' htmlFor='confirmPasswordInput'>
                                    Confirm New Password
                                </label>
                                <div className='khylo-profile-field__input-wrap'>
                                    <input
                                        id='confirmPasswordInput'
                                        type={showConfirm ? 'text' : 'password'}
                                        className='khylo-profile-field__input'
                                        placeholder='Confirm new password'
                                        autoComplete='new-password'
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type='button'
                                        className='khylo-profile-field__toggle-btn'
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        tabIndex={-1}
                                    >
                                        {showConfirm ? <VisibilityOffOutlined fontSize='small' /> : <VisibilityOutlined fontSize='small' />}
                                    </button>
                                </div>
                            </div>

                            <div className='khylo-profile-form__actions'>
                                <KhyloButton
                                    variant='primary'
                                    size='md'
                                    type='submit'
                                    disabled={isSavingPassword}
                                >
                                    Update Password
                                </KhyloButton>

                                {user.HasConfiguredPassword && !isAdmin && (
                                    <KhyloButton
                                        variant='ghost'
                                        size='md'
                                        type='button'
                                        onClick={handleResetPassword}
                                    >
                                        Reset Password
                                    </KhyloButton>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Preferences & Devices Directory */}
                    <div className='khylo-profile-panel'>
                        <div className='khylo-profile-panel__header'>
                            <h2 className='khylo-profile-panel__title'>
                                Preferences & Devices
                            </h2>
                            <p className='khylo-profile-panel__subtitle'>
                                Direct shortcuts to customize your playback and streaming setup.
                            </p>
                        </div>

                        <div className='khylo-profile-menu-list'>
                            <div
                                className='khylo-profile-menu-item'
                                onClick={() => navigate('/mypreferencesdisplay')}
                                role='button'
                                tabIndex={0}
                            >
                                <div className='khylo-profile-menu-item__icon'>
                                    <TuneOutlined />
                                </div>
                                <div className='khylo-profile-menu-item__text'>
                                    <div className='khylo-profile-menu-item__title'>Display & Localization</div>
                                    <div className='khylo-profile-menu-item__desc'>Language, date format, and interface display</div>
                                </div>
                                <ChevronRightOutlined className='khylo-profile-menu-item__arrow' fontSize='small' />
                            </div>

                            <div
                                className='khylo-profile-menu-item'
                                onClick={() => navigate('/mypreferenceshome')}
                                role='button'
                                tabIndex={0}
                            >
                                <div className='khylo-profile-menu-item__icon'>
                                    <TvOutlined />
                                </div>
                                <div className='khylo-profile-menu-item__text'>
                                    <div className='khylo-profile-menu-item__title'>Home Screen Sections</div>
                                    <div className='khylo-profile-menu-item__desc'>Reorder sections and landing rows</div>
                                </div>
                                <ChevronRightOutlined className='khylo-profile-menu-item__arrow' fontSize='small' />
                            </div>

                            <div
                                className='khylo-profile-menu-item'
                                onClick={() => navigate('/quickconnect')}
                                role='button'
                                tabIndex={0}
                            >
                                <div className='khylo-profile-menu-item__icon'>
                                    <LockOutlined />
                                </div>
                                <div className='khylo-profile-menu-item__text'>
                                    <div className='khylo-profile-menu-item__title'>Quick Connect Device Pairing</div>
                                    <div className='khylo-profile-menu-item__desc'>Pair TV or mobile apps using a 6-digit code</div>
                                </div>
                                <ChevronRightOutlined className='khylo-profile-menu-item__arrow' fontSize='small' />
                            </div>

                            {isAdmin && (
                                <div
                                    className='khylo-profile-menu-item'
                                    onClick={() => navigate('/dashboard')}
                                    role='button'
                                    tabIndex={0}
                                >
                                    <div className='khylo-profile-menu-item__icon'>
                                        <AdminPanelSettingsOutlined />
                                    </div>
                                    <div className='khylo-profile-menu-item__text'>
                                        <div className='khylo-profile-menu-item__title'>Server Dashboard</div>
                                        <div className='khylo-profile-menu-item__desc'>Server status, libraries, and users</div>
                                    </div>
                                    <ChevronRightOutlined className='khylo-profile-menu-item__arrow' fontSize='small' />
                                </div>
                            )}

                            <div className='khylo-profile-menu-divider' />

                            <button
                                type='button'
                                className='khylo-profile-signout-btn'
                                onClick={handleSignOut}
                            >
                                <LogoutOutlined />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Page>
    );
};

export default UserProfile;
