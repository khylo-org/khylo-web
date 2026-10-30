import type { UserDto } from '@khylo/sdk/lib/generated-client/models/user-dto';
import React, { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PersonOutline from '@mui/icons-material/PersonOutline';
import PhonelinkLockOutlined from '@mui/icons-material/PhonelinkLockOutlined';
import TvOutlined from '@mui/icons-material/TvOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import ClosedCaptionOutlined from '@mui/icons-material/ClosedCaptionOutlined';
import KeyboardOutlined from '@mui/icons-material/KeyboardOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import DevicesOtherOutlined from '@mui/icons-material/DevicesOtherOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import ExitToAppOutlined from '@mui/icons-material/ExitToAppOutlined';
import PowerSettingsNewOutlined from '@mui/icons-material/PowerSettingsNewOutlined';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';

import { appHost } from 'components/apphost';
import layoutManager from 'components/layoutManager';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import { AppFeature } from 'constants/appFeature';
import { useApi } from 'hooks/useApi';
import { useQuickConnectEnabled } from 'hooks/useQuickConnect';
import { useUsers } from 'hooks/useUsers';
import globalize from 'lib/globalize';
import browser from 'scripts/browser';
import Dashboard from 'utils/dashboard';
import shell from 'scripts/shell';
import keyboardNavigation from 'scripts/keyboardNavigation';

import './settings.scss';

const UserSettingsPage: FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useApi();
    const [ searchParams ] = useSearchParams();
    const {
        data: isQuickConnectEnabled,
        isPending: isQuickConnectEnabledPending
    } = useQuickConnectEnabled();
    const { data: users } = useUsers();
    const [ user, setUser ] = useState<UserDto>();

    const userId = useMemo(() => (
        searchParams.get('userId') || currentUser?.Id
    ), [ currentUser, searchParams ]);

    const isLoggedInUser = useMemo(() => (
        userId && userId === currentUser?.Id
    ), [ currentUser, userId ]);

    useEffect(() => {
        if (userId) {
            if (userId === currentUser?.Id) setUser(currentUser);
            else setUser(users?.find(({ Id }) => userId === Id));
        }
    }, [ currentUser, userId, users ]);

    const userImageUrl = useMemo(() => {
        if (!user?.Id || !user?.PrimaryImageTag) return null;
        return window.ApiClient.getUserImageUrl(user.Id, {
            tag: user.PrimaryImageTag,
            type: 'Primary'
        });
    }, [user?.Id, user?.PrimaryImageTag]);

    if (!userId || !user || isQuickConnectEnabledPending) {
        return <Loading />;
    }

    // gamepad toggle unavailable on EdgeUWP, and smoothscroll unavailable on non-TV layout
    const isControlsPageEmpty = !keyboardNavigation.canEnableGamepad() && !layoutManager.tv;
    const isAdmin = Boolean(isLoggedInUser && user.Policy?.IsAdministrator && !layoutManager.tv);

    return (
        <Page
            id='userSettingsHubPage'
            className='khylo-settings-page noSecondaryNavPage'
            title={globalize.translate('Settings')}
        >
            <div className='khylo-settings-ambient' />

            <div className='khylo-settings-container'>
                {/* Header & User Status Chip */}
                <header className='khylo-settings-header'>
                    <div className='khylo-settings-header__title-wrap'>
                        <h1 className='khylo-settings-header__title'>
                            {globalize.translate('Settings')}
                        </h1>
                        <p className='khylo-settings-header__subtitle'>
                            Configure your playback, appearance, controls, and system preferences
                        </p>
                    </div>

                    <div className='khylo-settings-user-chip'>
                        <div
                            className='khylo-settings-user-chip__avatar'
                            style={userImageUrl ? { backgroundImage: `url("${userImageUrl}")` } : undefined}
                        >
                            {!userImageUrl && (user.Name ? user.Name.charAt(0).toUpperCase() : 'U')}
                        </div>
                        <div className='khylo-settings-user-chip__info'>
                            <span className='khylo-settings-user-chip__name'>{user.Name}</span>
                            <div className='khylo-settings-user-chip__badges'>
                                <span className='khylo-settings-user-chip__badge'>
                                    {user.Policy?.IsAdministrator ? 'Admin' : 'Member'}
                                </span>
                                <span className='khylo-settings-user-chip__status'>Connected</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className='khylo-settings-groups'>
                    {/* 1. Account & Security */}
                    <section className='khylo-settings-group'>
                        <div className='khylo-settings-group__title'>Account & Pairing</div>
                        <div className='khylo-settings-grid'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='khylo-settings-card'
                                onClick={() => navigate(`/userprofile?userId=${userId}`)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/userprofile?userId=${userId}`)}
                            >
                                <div className='khylo-settings-card__icon'>
                                    <PersonOutline />
                                </div>
                                <div className='khylo-settings-card__content'>
                                    <h3 className='khylo-settings-card__title'>
                                        {globalize.translate('Profile')}
                                    </h3>
                                    <p className='khylo-settings-card__desc'>
                                        Account credentials, password change, and profile avatar
                                    </p>
                                </div>
                                <div className='khylo-settings-card__arrow'>
                                    <ChevronRightRounded />
                                </div>
                            </div>

                            {isQuickConnectEnabled && (
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card'
                                    onClick={() => navigate(`/quickconnect?userId=${userId}`)}
                                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/quickconnect?userId=${userId}`)}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <PhonelinkLockOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            Add a device
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Sign in a TV, console or phone with a 6-character code or QR code
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Interface & Layout */}
                    <section className='khylo-settings-group'>
                        <div className='khylo-settings-group__title'>Interface & Personalization</div>
                        <div className='khylo-settings-grid'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='khylo-settings-card'
                                onClick={() => navigate(`/mypreferencesdisplay?userId=${userId}`)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/mypreferencesdisplay?userId=${userId}`)}
                            >
                                <div className='khylo-settings-card__icon'>
                                    <TvOutlined />
                                </div>
                                <div className='khylo-settings-card__content'>
                                    <h3 className='khylo-settings-card__title'>
                                        {globalize.translate('Display')}
                                    </h3>
                                    <p className='khylo-settings-card__desc'>
                                        Display language, themes, screensaver, and client scaling
                                    </p>
                                </div>
                                <div className='khylo-settings-card__arrow'>
                                    <ChevronRightRounded />
                                </div>
                            </div>

                            <div
                                role='button'
                                tabIndex={0}
                                className='khylo-settings-card'
                                onClick={() => navigate(`/mypreferenceshome?userId=${userId}`)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/mypreferenceshome?userId=${userId}`)}
                            >
                                <div className='khylo-settings-card__icon'>
                                    <HomeOutlined />
                                </div>
                                <div className='khylo-settings-card__content'>
                                    <h3 className='khylo-settings-card__title'>
                                        {globalize.translate('Home')}
                                    </h3>
                                    <p className='khylo-settings-card__desc'>
                                        Home screen row ordering, sections, and watched media visibility
                                    </p>
                                </div>
                                <div className='khylo-settings-card__arrow'>
                                    <ChevronRightRounded />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. Playback & Media */}
                    <section className='khylo-settings-group'>
                        <div className='khylo-settings-group__title'>Playback & Media</div>
                        <div className='khylo-settings-grid'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='khylo-settings-card'
                                onClick={() => navigate(`/mypreferencesplayback?userId=${userId}`)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/mypreferencesplayback?userId=${userId}`)}
                            >
                                <div className='khylo-settings-card__icon'>
                                    <PlayCircleOutline />
                                </div>
                                <div className='khylo-settings-card__content'>
                                    <h3 className='khylo-settings-card__title'>
                                        {globalize.translate('TitlePlayback')}
                                    </h3>
                                    <p className='khylo-settings-card__desc'>
                                        Audio channel preferences, video bitrate limits, and transcoding
                                    </p>
                                </div>
                                <div className='khylo-settings-card__arrow'>
                                    <ChevronRightRounded />
                                </div>
                            </div>

                            <div
                                role='button'
                                tabIndex={0}
                                className='khylo-settings-card'
                                onClick={() => navigate(`/mypreferencessubtitles?userId=${userId}`)}
                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/mypreferencessubtitles?userId=${userId}`)}
                            >
                                <div className='khylo-settings-card__icon'>
                                    <ClosedCaptionOutlined />
                                </div>
                                <div className='khylo-settings-card__content'>
                                    <h3 className='khylo-settings-card__title'>
                                        {globalize.translate('Subtitles')}
                                    </h3>
                                    <p className='khylo-settings-card__desc'>
                                        Language preferences, appearance styling, size, and burn-in
                                    </p>
                                </div>
                                <div className='khylo-settings-card__arrow'>
                                    <ChevronRightRounded />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. Controls & Device Settings */}
                    <section className='khylo-settings-group'>
                        <div className='khylo-settings-group__title'>Controls & Device</div>
                        <div className='khylo-settings-grid'>
                            {isLoggedInUser && !browser.mobile && !isControlsPageEmpty && (
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card'
                                    onClick={() => navigate(`/mypreferencescontrols?userId=${userId}`)}
                                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/mypreferencescontrols?userId=${userId}`)}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <KeyboardOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            {globalize.translate('Controls')}
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Gamepad navigation support and smooth scrolling
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>
                            )}

                            {appHost.supports(AppFeature.ClientSettings) && (
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card'
                                    onClick={() => shell.openClientSettings()}
                                    onKeyDown={(e) => e.key === 'Enter' && shell.openClientSettings()}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <DevicesOtherOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            {globalize.translate('ClientSettings')}
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Native app client and local device hardware preferences
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>
                            )}

                            {appHost.supports(AppFeature.DownloadManagement) && (
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card'
                                    onClick={() => shell.openDownloadManager()}
                                    onKeyDown={(e) => e.key === 'Enter' && shell.openDownloadManager()}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <DownloadOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            {globalize.translate('DownloadManager')}
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Manage offline downloads and sync tasks
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 5. Server Administration */}
                    {isAdmin && (
                        <section className='khylo-settings-group'>
                            <div className='khylo-settings-group__title'>
                                {globalize.translate('HeaderAdmin')}
                            </div>
                            <div className='khylo-settings-grid'>
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card'
                                    onClick={() => navigate('/dashboard')}
                                    onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <DashboardOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            {globalize.translate('TabDashboard')}
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Server health, media libraries, user accounts, and system logs
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>

                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card'
                                    onClick={() => navigate('/dashboard/metadata')}
                                    onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard/metadata')}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <EditOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            {globalize.translate('MetadataManager')}
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Manage movie, show, artist, and track metadata and artwork
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 6. Session Management */}
                    {isLoggedInUser && (
                        <section className='khylo-settings-group'>
                            <div className='khylo-settings-group__title'>Session</div>
                            <div className='khylo-settings-grid'>
                                {appHost.supports(AppFeature.MultiServer) && (
                                    <div
                                        role='button'
                                        tabIndex={0}
                                        className='khylo-settings-card'
                                        onClick={() => Dashboard.selectServer()}
                                        onKeyDown={(e) => e.key === 'Enter' && Dashboard.selectServer()}
                                    >
                                        <div className='khylo-settings-card__icon'>
                                            <StorageOutlined />
                                        </div>
                                        <div className='khylo-settings-card__content'>
                                            <h3 className='khylo-settings-card__title'>
                                                {globalize.translate('SelectServer')}
                                            </h3>
                                            <p className='khylo-settings-card__desc'>
                                                Switch to another connected Khylo media server
                                            </p>
                                        </div>
                                        <div className='khylo-settings-card__arrow'>
                                            <ChevronRightRounded />
                                        </div>
                                    </div>
                                )}

                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='khylo-settings-card khylo-settings-card--danger'
                                    onClick={() => Dashboard.logout()}
                                    onKeyDown={(e) => e.key === 'Enter' && Dashboard.logout()}
                                >
                                    <div className='khylo-settings-card__icon'>
                                        <ExitToAppOutlined />
                                    </div>
                                    <div className='khylo-settings-card__content'>
                                        <h3 className='khylo-settings-card__title'>
                                            {globalize.translate('ButtonSignOut')}
                                        </h3>
                                        <p className='khylo-settings-card__desc'>
                                            Sign out of your account on this device
                                        </p>
                                    </div>
                                    <div className='khylo-settings-card__arrow'>
                                        <ChevronRightRounded />
                                    </div>
                                </div>

                                {appHost.supports(AppFeature.ExitMenu) && (
                                    <div
                                        role='button'
                                        tabIndex={0}
                                        className='khylo-settings-card khylo-settings-card--danger'
                                        onClick={() => appHost.exit()}
                                        onKeyDown={(e) => e.key === 'Enter' && appHost.exit()}
                                    >
                                        <div className='khylo-settings-card__icon'>
                                            <PowerSettingsNewOutlined />
                                        </div>
                                        <div className='khylo-settings-card__content'>
                                            <h3 className='khylo-settings-card__title'>
                                                {globalize.translate('ButtonExitApp')}
                                            </h3>
                                            <p className='khylo-settings-card__desc'>
                                                Exit the Khylo client application
                                            </p>
                                        </div>
                                        <div className='khylo-settings-card__arrow'>
                                            <ChevronRightRounded />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default UserSettingsPage;
