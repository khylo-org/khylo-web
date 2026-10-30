import React, { useState } from 'react';
import type { ListingsProviderInfo } from '@khylo/sdk/lib/generated-client/models/listings-provider-info';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useNavigate } from 'react-router-dom';

import ConfirmDialog from 'components/ConfirmDialog';
import { KHYLO_COLORS } from '../../../components/ui';
import { useDeleteProvider } from '../api/useDeleteProvider';
import getProviderConfigurationUrl from '../utils/getProviderConfigurationUrl';
import getProviderName from '../utils/getProviderName';
import getSafeSourceLabel from '../utils/getSafeSourceLabel';
import ChannelMappingDialog from './ChannelMappingDialog';
import LiveTvSourceRow from './LiveTvSourceRow';

interface ProviderProps {
    provider: ListingsProviderInfo
}

const actionSx = { textTransform: 'none', bgcolor: 'transparent', boxShadow: 'none', color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.textPrimary, bgcolor: KHYLO_COLORS.surfaceHover } } as const;

const Provider = ({ provider }: ProviderProps) => {
    const navigate = useNavigate();
    const [ isDeleteOpen, setIsDeleteOpen ] = useState(false);
    const [ isMappingOpen, setIsMappingOpen ] = useState(false);
    const deleteProvider = useDeleteProvider();
    const name = getProviderName(provider.Type);
    const isSchedulesDirect = provider.Type?.toLowerCase() === 'schedulesdirect';
    const detail = isSchedulesDirect ? [ provider.ListingsId, provider.ZipCode ].filter(Boolean).join(' · ') : getSafeSourceLabel(provider.Path);

    return (
        <>
            <LiveTvSourceRow
                icon={<EventNoteIcon fontSize='small' />}
                title={name === 'XMLTV' ? 'XMLTV guide' : name}
                kind={provider.EnableAllTuners ? 'All tuners' : `${provider.EnabledTuners?.length ?? 0} tuners`}
                detail={detail}
                actions={
                    <>
                        <Button variant='text' size='small' onClick={() => setIsMappingOpen(true)} sx={actionSx}>
                            Match channels
                        </Button>
                        <Button
                            variant='text'
                            size='small'
                            onClick={() => navigate(`${getProviderConfigurationUrl(provider.Type || '')}&id=${provider.Id}`)}
                            sx={actionSx}
                        >
                            Edit
                        </Button>
                        <Tooltip title='Remove guide'>
                            <IconButton size='small' onClick={() => setIsDeleteOpen(true)} sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.status.danger.fg } }}>
                                <DeleteOutlineIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    </>
                }
            />
            {isMappingOpen && provider.Id && (
                <ChannelMappingDialog open providerId={provider.Id} onClose={() => setIsMappingOpen(false)} />
            )}
            <ConfirmDialog
                open={isDeleteOpen}
                title='Remove guide'
                text='Remove this guide source? Channels keep playing, but the guide will show no information for them.'
                onCancel={() => setIsDeleteOpen(false)}
                onConfirm={() => {
                    if (provider.Id) {
                        deleteProvider.mutate({ id: provider.Id }, { onSettled: () => setIsDeleteOpen(false) });
                    }
                }}
                confirmButtonText='Remove'
                confirmButtonColor='error'
            />
        </>
    );
};

export default Provider;
