import { getDisplayVersion } from '@khylo/sdk/lib/utils/versioning';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import React from 'react';

import { useSystemInfo } from 'hooks/useSystemInfo';
import ListItemLink from 'components/ListItemLink';

import khyloLogo from 'assets/img/khylo-logo.png';

const DrawerHeaderLink = () => {
    const { data: systemInfo } = useSystemInfo();

    const version = getDisplayVersion(systemInfo?.Version);

    return (
        <ListItemLink
            to='/'
            sx={{
                padding: '18px 16px',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, width: '100%' }}>
                <Box
                    component='img'
                    src={khyloLogo}
                    alt='Khylo'
                    sx={{ height: '28px', width: 'auto', maxWidth: '140px', objectFit: 'contain', alignSelf: 'flex-start' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.disabled',
                            fontWeight: 500,
                            fontSize: '0.72rem'
                        }}
                    >
                        Server Administration
                    </Typography>
                    {version && (
                        <Chip
                            label={`v${version}`}
                            size='small'
                            sx={{
                                height: '18px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                backgroundColor: 'rgba(217, 119, 50, 0.12)',
                                color: 'var(--khylo-brand, #D97732)',
                                border: '1px solid rgba(217, 119, 50, 0.25)'
                            }}
                        />
                    )}
                </Box>
            </Box>
        </ListItemLink>
    );
};

export default DrawerHeaderLink;
