import icon from 'assets/img/khylo-icon.png';
import Button from '@mui/material/Button/Button';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

import { useSystemInfo } from 'hooks/useSystemInfo';

const ServerButton: FC = () => {
    const {
        data: systemInfo,
        isPending
    } = useSystemInfo();

    return (
        <Button
            variant='text'
            size='large'
            color='inherit'
            startIcon={
                <img
                    src={icon}
                    alt='Khylo'
                    aria-hidden
                    style={{
                        maxHeight: '1.4em',
                        maxWidth: '1.4em',
                        borderRadius: '4px'
                    }}
                />
            }
            component={Link}
            to='/'
            sx={{
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'var(--khylo-surface-contrast, #FAF8F5)'
            }}
        >
            {isPending ? '' : (systemInfo?.ServerName || 'Khylo')}
        </Button>
    );
};

export default ServerButton;
