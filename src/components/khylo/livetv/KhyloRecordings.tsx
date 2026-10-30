import React, { useState, type FC } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageType } from '@khylo/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RepeatIcon from '@mui/icons-material/Repeat';

import { useApi } from 'hooks/useApi';
import { KhyloMediaCard } from '../media/KhyloMediaCard';
import { KhyloButton } from '../ui/KhyloButton';
import { cancelRecording, cancelSeriesRecording, formatClock, formatDayAndTime } from './liveTvApi';
import './KhyloLiveTvView.scss';

export const RECORDINGS_QUERY_KEY = 'KhyloLiveTvRecordings';

/** The viewer's recordings and what's scheduled to record. */
export const KhyloRecordings: FC<{ canManage: boolean }> = ({ canManage }) => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const [ cancellingId, setCancellingId ] = useState<string | null>(null);

    const { data: recordings, isLoading: isRecordingsLoading } = useQuery({
        queryKey: [ RECORDINGS_QUERY_KEY, 'recorded', user?.Id ],
        queryFn: async () => (await getLiveTvApi(api!).getRecordings({
            userId: user!.Id!,
            enableImages: true,
            imageTypeLimit: 1,
            enableImageTypes: [ ImageType.Primary, ImageType.Thumb ],
            fields: [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ],
            enableUserData: true
        })).data.Items ?? [],
        enabled: Boolean(api && user?.Id)
    });

    const { data: timers, isLoading: isTimersLoading } = useQuery({
        queryKey: [ RECORDINGS_QUERY_KEY, 'scheduled' ],
        queryFn: async () => (await getLiveTvApi(api!).getTimers({ isScheduled: true })).data.Items ?? [],
        enabled: Boolean(api && canManage)
    });

    const { data: seriesTimers } = useQuery({
        queryKey: [ RECORDINGS_QUERY_KEY, 'series' ],
        queryFn: async () => (await getLiveTvApi(api!).getSeriesTimers({})).data.Items ?? [],
        enabled: Boolean(api && canManage)
    });

    const cancel = async (id: string, isSeries: boolean) => {
        if (!api) return;
        setCancellingId(id);
        try {
            await (isSeries ? cancelSeriesRecording(api, id) : cancelRecording(api, id));
            await queryClient.invalidateQueries({ queryKey: [RECORDINGS_QUERY_KEY] });
            await queryClient.invalidateQueries({ queryKey: ['KhyloLiveTvPrograms'] });
        } finally {
            setCancellingId(null);
        }
    };

    const isLoading = isRecordingsLoading || (canManage && isTimersLoading);
    const nothing = !isLoading && !recordings?.length && !timers?.length && !seriesTimers?.length;

    return (
        <div className='khylo-livetv-recordings'>
            {nothing && (
                <div className='khylo-livetv-recordings__empty'>
                    <FiberManualRecordIcon />
                    <h2>No recordings yet</h2>
                    <p>Open any program in the guide and press Record. Recordings show up here when they finish.</p>
                </div>
            )}

            {Boolean(timers?.length) && (
                <section className='khylo-livetv-recordings__section'>
                    <h2 className='khylo-livetv-recordings__title'>Scheduled</h2>
                    <ul className='khylo-livetv-recordings__list'>
                        {timers!.map(timer => (
                            <li key={timer.Id} className='khylo-livetv-recordings__row'>
                                <span className='khylo-livetv-recordings__when'>{formatDayAndTime(timer.StartDate)}</span>
                                <span className='khylo-livetv-recordings__what'>
                                    <span className='khylo-livetv-recordings__name'>{timer.Name}</span>
                                    <span className='khylo-livetv-recordings__sub'>
                                        {[ timer.ChannelName, `until ${formatClock(timer.EndDate)}` ].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <KhyloButton
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => { cancel(timer.Id!, false).catch(() => undefined); }}
                                    disabled={cancellingId === timer.Id}
                                >
                                    Cancel
                                </KhyloButton>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {Boolean(seriesTimers?.length) && (
                <section className='khylo-livetv-recordings__section'>
                    <h2 className='khylo-livetv-recordings__title'>Series recordings</h2>
                    <ul className='khylo-livetv-recordings__list'>
                        {seriesTimers!.map(series => (
                            <li key={series.Id} className='khylo-livetv-recordings__row'>
                                <span className='khylo-livetv-recordings__when'><RepeatIcon /> Every episode</span>
                                <span className='khylo-livetv-recordings__what'>
                                    <span className='khylo-livetv-recordings__name'>{series.Name}</span>
                                    <span className='khylo-livetv-recordings__sub'>{series.RecordAnyChannel ? 'Any channel' : series.ChannelName}</span>
                                </span>
                                <KhyloButton
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => { cancel(series.Id!, true).catch(() => undefined); }}
                                    disabled={cancellingId === series.Id}
                                >
                                    Stop
                                </KhyloButton>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {Boolean(recordings?.length) && (
                <section className='khylo-livetv-recordings__section'>
                    <h2 className='khylo-livetv-recordings__title'>Recorded</h2>
                    <div className='khylo-livetv-recordings__grid'>
                        {recordings!.map(item => (
                            <KhyloMediaCard key={item.Id} item={item} variant='continue' />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
