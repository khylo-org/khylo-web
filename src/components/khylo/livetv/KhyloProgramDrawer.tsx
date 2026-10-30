import React, { useEffect, useRef, useState, type FC } from 'react';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import CloseIcon from '@mui/icons-material/Close';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RepeatIcon from '@mui/icons-material/Repeat';

import { useApi } from 'hooks/useApi';
import { KhyloButton } from '../ui/KhyloButton';
import {
    cancelRecording,
    cancelSeriesRecording,
    formatClock,
    formatDayAndTime,
    getChannelLogoUrl,
    getProgramImageUrl,
    getProgramSubtitle,
    isAiring,
    recordProgram
} from './liveTvApi';
import '../live/KhyloChannelDrawer.scss';
import './KhyloLiveTvView.scss';

export interface KhyloProgramDrawerProps {
    program: BaseItemDto;
    channel?: BaseItemDto;
    now: number;
    canRecord: boolean;
    onWatch: () => void;
    /** Called after a recording is scheduled or cancelled, so the guide can refresh. */
    onChanged: () => void;
    onClose: () => void;
}

/** A program's details, with Watch (if it's on now) and Record. */
export const KhyloProgramDrawer: FC<KhyloProgramDrawerProps> = ({ program, channel, now, canRecord, onWatch, onChanged, onClose }) => {
    const { api } = useApi();
    const panelRef = useRef<HTMLElement>(null);
    const [ artFailed, setArtFailed ] = useState(false);
    const [ busy, setBusy ] = useState<'one' | 'series' | null>(null);
    const [ error, setError ] = useState<string | null>(null);

    useEffect(() => {
        panelRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const art = artFailed ? null : getProgramImageUrl(api, program, 1280);
    const logo = getChannelLogoUrl(api, channel, 120);
    const subtitle = getProgramSubtitle(program);
    const onNow = isAiring(program, now);
    const isRecording = Boolean(program.TimerId);
    const isSeriesRecording = Boolean(program.SeriesTimerId);

    const run = async (kind: 'one' | 'series', action: () => Promise<void>, failure: string) => {
        if (!api) return;
        setBusy(kind);
        setError(null);
        try {
            await action();
            onChanged();
        } catch {
            setError(failure);
        } finally {
            setBusy(null);
        }
    };

    const toggleOne = () => run(
        'one',
        () => (isRecording ? cancelRecording(api!, program.TimerId!) : recordProgram(api!, program.Id!, false)),
        isRecording ? 'Couldn\'t cancel the recording.' : 'Couldn\'t schedule the recording.'
    );
    const toggleSeries = () => run(
        'series',
        () => (isSeriesRecording ? cancelSeriesRecording(api!, program.SeriesTimerId!) : recordProgram(api!, program.Id!, true)),
        isSeriesRecording ? 'Couldn\'t cancel the series recording.' : 'Couldn\'t schedule the series recording.'
    );

    const kinds = [
        program.IsMovie && 'Movie',
        program.IsSports && 'Sports',
        program.IsNews && 'News',
        program.IsKids && 'Kids',
        program.IsLive && 'Live',
        program.IsPremiere && 'Premiere'
    ].filter(Boolean) as string[];

    return (
        <div className='khylo-channel-drawer' role='presentation'>
            <button type='button' className='khylo-channel-drawer__scrim' onClick={onClose} aria-label='Close program details' tabIndex={-1} />
            <aside className='khylo-channel-drawer__panel' role='dialog' aria-modal='true' aria-label={program.Name ?? 'Program'} ref={panelRef} tabIndex={-1}>
                <div className='khylo-channel-drawer__header'>
                    {art && <img className='khylo-channel-drawer__art' src={art} alt='' onError={() => setArtFailed(true)} />}
                    <div className='khylo-channel-drawer__header-fade' />
                    <button type='button' className='khylo-channel-drawer__close' onClick={onClose} aria-label='Close'>
                        <CloseIcon />
                    </button>
                    <div className='khylo-channel-drawer__heading'>
                        {logo && <img className='khylo-livetv-drawer__logo' src={logo} alt='' />}
                        <span className='khylo-channel-drawer__kicker'>
                            {[ channel?.ChannelNumber && `CH ${channel.ChannelNumber}`, channel?.Name ].filter(Boolean).join(' · ')}
                        </span>
                        <h2 className='khylo-channel-drawer__name'>{program.Name}</h2>
                        {subtitle && <p className='khylo-channel-drawer__description'>{subtitle}</p>}
                    </div>
                </div>

                <div className='khylo-channel-drawer__body'>
                    <p className='khylo-livetv-drawer__when'>
                        {onNow ? `On now · until ${formatClock(program.EndDate)}` : `${formatDayAndTime(program.StartDate)} – ${formatClock(program.EndDate)}`}
                        {program.OfficialRating && <span className='khylo-livetv-drawer__rating'>{program.OfficialRating}</span>}
                    </p>
                    {kinds.length > 0 && (
                        <div className='khylo-livetv-drawer__tags'>
                            {kinds.map(kind => <span key={kind} className='khylo-livetv-drawer__tag'>{kind}</span>)}
                        </div>
                    )}

                    {onNow && (
                        <KhyloButton variant='primary' size='lg' icon={<PlayArrowIcon />} onClick={onWatch} fullWidth>
                            WATCH LIVE
                        </KhyloButton>
                    )}

                    {canRecord && (
                        <div className='khylo-livetv-drawer__record'>
                            <KhyloButton
                                variant='secondary'
                                size='md'
                                icon={<FiberManualRecordIcon className={isRecording ? 'khylo-livetv-drawer__rec-on' : undefined} />}
                                onClick={() => { toggleOne().catch(() => undefined); }}
                                disabled={busy !== null}
                                active={isRecording}
                                fullWidth
                            >
                                {isRecording ? 'Cancel recording' : 'Record this'}
                            </KhyloButton>
                            {program.IsSeries && (
                                <KhyloButton
                                    variant='secondary'
                                    size='md'
                                    icon={<RepeatIcon className={isSeriesRecording ? 'khylo-livetv-drawer__rec-on' : undefined} />}
                                    onClick={() => { toggleSeries().catch(() => undefined); }}
                                    disabled={busy !== null}
                                    active={isSeriesRecording}
                                    fullWidth
                                >
                                    {isSeriesRecording ? 'Stop recording series' : 'Record every episode'}
                                </KhyloButton>
                            )}
                        </div>
                    )}
                    {error && <p className='khylo-livetv-drawer__error' role='alert'>{error}</p>}

                    {program.Overview && (
                        <section className='khylo-channel-drawer__section'>
                            <h3 className='khylo-channel-drawer__section-title'>About</h3>
                            <p className='khylo-livetv-drawer__overview'>{program.Overview}</p>
                        </section>
                    )}
                </div>
            </aside>
        </div>
    );
};
