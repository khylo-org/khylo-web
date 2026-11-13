import React, { useEffect, useState, type FC, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { bindResumeRefreshOnPlaybackStop } from '../home/resumeRefresh';
import { KhyloNavRail } from './KhyloNavRail';
import { KhyloTopBar } from './KhyloTopBar';
import { KhyloMusicModeContext } from './KhyloMusicModeContext';
import { KhyloMusicSidebar } from '../music/KhyloMusicSidebar';
import { KhyloMetadataEditorHost } from '../metadata/KhyloMetadataEditor';
import { KhyloMusicOverlays } from '../music/KhyloMusicOverlays';
import './KhyloAppShell.scss';

export interface KhyloAppShellProps {
    children?: ReactNode;
}

const FULLSCREEN_ROUTES = ['/video', '/playback', '/login', '/selectserver', '/addserver', '/invite', '/signin', '/forgotpassword', '/forgotpasswordpin'];

// Pages whose artwork runs edge to edge under the (transparent) top bar
const FULL_BLEED_ROUTES = ['/home', '/details'];

export const KhyloAppShell: FC<KhyloAppShellProps> = ({ children }) => {
    const location = useLocation();

    useEffect(() => {
        bindResumeRefreshOnPlaybackStop();
    }, []);

    const isFullscreen = FULLSCREEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(`${r}/`));

    const [ isPinned, setIsPinned ] = useState(() => {
        try {
            return localStorage.getItem('khylo_nav_pinned') === 'true';
        } catch {
            return false;
        }
    });

    const handleTogglePin = () => {
        setIsPinned(prev => {
            const next = !prev;
            try {
                localStorage.setItem('khylo_nav_pinned', String(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const isVideoRoute = location.pathname === '/video' || location.pathname.startsWith('/video/');
    const isFullBleed = FULL_BLEED_ROUTES.includes(location.pathname);

    // The music view swaps the app rail for its own sidebar (see KhyloMusicModeContext)
    const [ isMusicMode, setIsMusicMode ] = useState(false);

    // Leaving the music section (and its album, artist and playlist pages) puts the app rail back
    const { pathname } = location;
    useEffect(() => {
        const inMusicRoutes = pathname === '/music' || pathname.startsWith('/music/') || pathname === '/details';
        if (!inMusicRoutes) setIsMusicMode(false);
    }, [pathname]);

    return (
        <KhyloMusicModeContext.Provider value={setIsMusicMode}>
            <div
                className={classNames('khylo-shell', {
                    'khylo-shell--pinned': isPinned,
                    'khylo-shell--fullscreen': isFullscreen,
                    'khylo-shell--video': isVideoRoute,
                    'khylo-shell--music': isMusicMode
                })}
            >
                {/* Left Navigation Rail (Spec 10-14); hidden by CSS on wide screens while Music is open */}
                {!isFullscreen && <KhyloNavRail isPinned={isPinned} onTogglePin={handleTogglePin} />}

                {/* Music sidebar: drawn here, outside the page, so it stays put as music pages change */}
                {!isFullscreen && isMusicMode && <KhyloMusicSidebar />}

                {/* Main Area: Top Bar + Content (Spec 10, 15) */}
                <div className={classNames('khylo-shell__main', { 'khylo-shell__main--fullscreen': isFullscreen })}>
                    {!isFullscreen && <KhyloTopBar />}
                    <main
                        className={classNames('khylo-shell__content', {
                            'khylo-shell__content--fullscreen': isFullscreen,
                            'khylo-shell__content--video': isVideoRoute,
                            // Music pages sit below the top bar in their own panel, even on /details
                            'khylo-shell__content--bleed': isFullBleed && !isMusicMode
                        })}
                        id='khyloMainContent'
                    >
                        {children}
                    </main>
                </div>
                <KhyloMetadataEditorHost />
                {/* Playlist picker, playlist dialog and short messages, for every music button in the app */}
                <KhyloMusicOverlays />
            </div>
        </KhyloMusicModeContext.Provider>
    );
};
