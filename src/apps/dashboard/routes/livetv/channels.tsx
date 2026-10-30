import React, { type FC, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LiveTvOptions } from '@khylo/sdk/lib/generated-client/models/live-tv-options';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { QUERY_KEY, useNamedConfiguration } from 'hooks/useNamedConfiguration';
import { queryClient } from 'utils/query/queryClient';
import { ChannelPicker } from 'apps/dashboard/features/livetv/components/ChannelPicker';
import {
    type Selection,
    type SelectableTunerHost,
    LARGE_LINEUP,
    getLineupColor,
    countSelected,
    getPlaylist,
    groupChannels,
    saveSelection
} from 'apps/dashboard/features/livetv/utils/channelSelection';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloStatusBadge,
    KhyloStickyActionBar
} from '../../components/ui';

export const Component: FC = () => {
    const { api } = useApi();
    const navigate = useNavigate();
    const [ searchParams ] = useSearchParams();
    const tunerId = searchParams.get('tunerId') ?? '';

    const { data: config } = useNamedConfiguration<LiveTvOptions>('livetv');
    const tuner = config?.TunerHosts?.find(t => t.Id === tunerId) as SelectableTunerHost | undefined;

    const { data: playlist, isLoading, isError } = useQuery({
        queryKey: [ 'LiveTvPlaylist', tunerId ],
        queryFn: () => getPlaylist(api!, tunerId),
        enabled: Boolean(api && tunerId),
        staleTime: 10 * 60_000
    });

    const [ selection, setSelection ] = useState<Selection | null>(null);
    const [ isSaving, setIsSaving ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const allGroups = useMemo(() => {
        const groups = groupChannels(playlist);
        return groups.live.concat(groups.other);
    }, [playlist]);
    const neverTrimmed = Boolean(tuner && !tuner.EnableChannelSelection);

    // Start from the saved picks; a playlist that was never trimmed starts empty
    useEffect(() => {
        if (!playlist || !tuner || selection) return;
        setSelection({
            groups: new Set((tuner.IncludedGroups ?? []).map(g => g.toLowerCase())),
            included: new Set(tuner.IncludedChannels ?? []),
            excluded: new Set(tuner.ExcludedChannels ?? [])
        });
    }, [ playlist, tuner, selection ]);

    const selectedCount = useMemo(() => (selection ? countSelected(allGroups, selection) : 0), [ allGroups, selection ]);

    const save = async () => {
        if (!api || !selection) return;
        setIsSaving(true);
        setError(null);
        try {
            if (!playlist) return;
            await saveSelection(api, tunerId, playlist, selection);
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            navigate('/dashboard/livetv');
        } catch {
            setError('Couldn\'t save your channels. Try again.');
            setIsSaving(false);
        }
    };

    const total = playlist?.TotalCount ?? 0;
    const countColor = getLineupColor(selectedCount);

    return (
        <Page id='liveTvChannelsPage' title='Choose channels' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1000}>
                <KhyloPageHeader
                    breadcrumbs={[ { label: 'Live TV', to: '/dashboard/livetv' }, { label: 'Choose channels' } ]}
                    title='Choose channels'
                    subtitle={`Pick the groups and channels to bring into Live TV from ${tuner?.FriendlyName || 'this playlist'}. Only these are imported, get guide listings and show up for viewers.`}
                    badge={playlist && selection && <KhyloStatusBadge label={`${selectedCount.toLocaleString()} of ${total.toLocaleString()} selected`} color={countColor} />}
                />

                {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}
                {isError && <Alert severity='error' sx={{ mb: 3 }}>Couldn&apos;t download the playlist from your provider. Check the tuner&apos;s address and try again.</Alert>}
                {neverTrimmed && playlist && (
                    <Alert severity='info' sx={{ mb: 3 }}>
                        {`Right now Live TV imports all ${total.toLocaleString()} entries from this playlist. Pick the groups you actually watch and save to trim it down.`}
                    </Alert>
                )}
                {selectedCount > LARGE_LINEUP && (
                    <Alert severity='warning' sx={{ mb: 3 }}>
                        {`${selectedCount.toLocaleString()} channels is a lot. The guide takes longer to refresh and uses more space; most people pick a few hundred.`}
                    </Alert>
                )}

                {(isLoading || (playlist && !selection)) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
                        <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                        <Typography sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.85rem' }}>Reading the playlist from your provider…</Typography>
                    </Box>
                )}

                {playlist && selection && (
                    <>
                        <ChannelPicker playlist={playlist} selection={selection} onSelectionChange={setSelection} />

                        <KhyloStickyActionBar
                            isDirty
                            isSaving={isSaving}
                            onSave={() => { save().catch(() => undefined); }}
                            onDiscard={() => navigate('/dashboard/livetv')}
                            saveLabel={`Save ${selectedCount.toLocaleString()} channels`}
                            statusMessage='Saving re-imports your channels and refreshes the guide.'
                        />
                    </>
                )}

                {!tunerId && <Alert severity='info'>Open this page from a tuner on the Live TV page.</Alert>}
                {tunerId && config && !tuner && (
                    <Alert severity='info' action={<IconButton size='small' onClick={() => navigate('/dashboard/livetv')}>←</IconButton>}>
                        That tuner no longer exists.
                    </Alert>
                )}
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'LiveTvChannelsPage';
export default Component;
