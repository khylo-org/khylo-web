import React, { type FC, type ReactNode } from 'react';
import './KhyloMusicView.scss';

export interface KhyloMusicLayoutProps {
    children: ReactNode;
    panel?: ReactNode;
}

/**
 * The music section's workspace: the page in a main panel that scrolls on its own, plus an
 * optional right-hand panel. The sidebar is drawn by the app shell (KhyloAppShell) so it stays
 * fixed while pages change. Used by the music page and by album, artist, song and playlist pages.
 */
export const KhyloMusicLayout: FC<KhyloMusicLayoutProps> = ({ children, panel }) => (
    <div className='khylo-music'>
        <div className='khylo-music__stage'>
            <div className='khylo-music__content'>
                {children}
            </div>
            {panel}
        </div>
    </div>
);
