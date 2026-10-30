import React, { useState } from 'react';
import type { TunerHostInfo } from '@khylo/sdk/lib/generated-client/models/tuner-host-info';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RouterIcon from '@mui/icons-material/Router';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import { useNavigate } from 'react-router-dom';

import ConfirmDialog from 'components/ConfirmDialog';
import { KHYLO_COLORS } from '../../../components/ui';
import { useDeleteTuner } from '../api/useDeleteTuner';
import getSafeSourceLabel from '../utils/getSafeSourceLabel';
import getTunerName from '../utils/getTunerName';
import LiveTvSourceRow from './LiveTvSourceRow';

interface TunerDeviceCardProps {
    tunerHost: TunerHostInfo;
}

const TunerDeviceCard = ({ tunerHost }: TunerDeviceCardProps) => {
    const navigate = useNavigate();
    const [ isDeleteOpen, setIsDeleteOpen ] = useState(false);
    const deleteTuner = useDeleteTuner();
    const isM3u = tunerHost.Type?.toLowerCase() === 'm3u';
    const kind = isM3u ? 'IPTV playlist' : getTunerName(tunerHost.Type);
    let limit: string | undefined;
    if (isM3u) limit = tunerHost.TunerCount ? `${tunerHost.TunerCount} streams at once` : 'No stream limit';
    // Channel selection is a Khylo addition the SDK types don't know about
    const isTrimmed = Boolean((tunerHost as { EnableChannelSelection?: boolean }).EnableChannelSelection);
    const kindLabel = [ kind, limit, isM3u && (isTrimmed ? 'Picked channels' : 'Every channel') ].filter(Boolean).join(' · ');

    return (
        <>
            <LiveTvSourceRow
                icon={isM3u ? <SettingsInputAntennaIcon fontSize='small' /> : <RouterIcon fontSize='small' />}
                title={tunerHost.FriendlyName || kind}
                kind={kindLabel}
                detail={getSafeSourceLabel(tunerHost.Url)}
                actions={
                    <>
                        {isM3u && (
                            <Button
                                variant='text'
                                size='small'
                                onClick={() => navigate(`/dashboard/livetv/channels?tunerId=${tunerHost.Id}`)}
                                sx={{ textTransform: 'none', bgcolor: 'transparent', boxShadow: 'none', color: KHYLO_COLORS.accent, fontWeight: 600, '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover } }}
                            >
                                Choose channels
                            </Button>
                        )}
                        <Button
                            variant='text'
                            size='small'
                            onClick={() => navigate(`/dashboard/livetv/tuner?id=${tunerHost.Id}`)}
                            sx={{ textTransform: 'none', bgcolor: 'transparent', boxShadow: 'none', color: KHYLO_COLORS.textSecondary, '&:hover': { color: KHYLO_COLORS.textPrimary, bgcolor: KHYLO_COLORS.surfaceHover } }}
                        >
                            Edit
                        </Button>
                        <Tooltip title='Remove tuner'>
                            <IconButton size='small' onClick={() => setIsDeleteOpen(true)} sx={{ color: KHYLO_COLORS.textMuted, '&:hover': { color: KHYLO_COLORS.status.danger.fg } }}>
                                <DeleteOutlineIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    </>
                }
            />
            <ConfirmDialog
                open={isDeleteOpen}
                title='Remove tuner'
                text={`Remove "${tunerHost.FriendlyName || kind}"? Its channels disappear from Live TV until you add it again.`}
                onCancel={() => setIsDeleteOpen(false)}
                onConfirm={() => {
                    if (tunerHost.Id) {
                        deleteTuner.mutate({ id: tunerHost.Id }, { onSettled: () => setIsDeleteOpen(false) });
                    }
                }}
                confirmButtonText='Remove'
                confirmButtonColor='error'
            />
        </>
    );
};

export default TunerDeviceCard;
