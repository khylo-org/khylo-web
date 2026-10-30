import React from 'react';
import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import ThemeCss from 'components/ThemeCss';
import { KhyloAppShell } from 'components/khylo/shell';
import { LibraryProvider } from './features/libraries/hooks/useLibrary';

import './AppOverrides.scss';

export const Component = () => {
    return (
        <LibraryProvider>
            {/*
              * Do NOT wrap the Outlet in StrictMode. Legacy ViewManager pages (including the video player)
              * are imperative; StrictMode's dev double-mount loads the view twice, which fires
              * 'viewbeforehide' on the first instance and stops playback right after it starts.
              */}
            <KhyloAppShell>
                <Box
                    component='main'
                    sx={{
                        position: 'relative',
                        width: '100%',
                        flexGrow: 1
                    }}
                >
                    <AppBody>
                        <Outlet />
                    </AppBody>
                </Box>
            </KhyloAppShell>
            <ThemeCss />
            <CustomCss />
        </LibraryProvider>
    );
};

