import React, { FC, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useLocale } from 'hooks/useLocale';
import KhyloAdminShell from './components/shell/KhyloAdminShell';
import './AppOverrides.scss';

export const Component: FC = () => {
    const { dateFnsLocale } = useLocale();

    useEffect(() => {
        document.body.classList.add('dashboardDocument');
        return () => {
            document.body.classList.remove('dashboardDocument');
        };
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateFnsLocale}>
            <KhyloAdminShell>
                <Outlet />
            </KhyloAdminShell>
        </LocalizationProvider>
    );
};

export default Component;
