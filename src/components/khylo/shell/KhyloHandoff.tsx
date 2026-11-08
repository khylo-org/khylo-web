import React, { useCallback, useEffect, useRef, useState, type FC } from 'react';
import CastOutlined from '@mui/icons-material/CastOutlined';
import axios from 'axios';

import { useApi } from 'hooks/useApi';
import { playbackManager } from 'components/playback/playbackmanager';
import './KhyloHandoff.scss';

interface HandoffDevice {
    SessionId: string;
    DeviceName?: string | null;
    Client?: string | null;
    DeviceType?: string | null;
    IsPlaying: boolean;
    NowPlayingName?: string | null;
    NowPlayingSeriesName?: string | null;
    PositionTicks?: number | null;
    RunTimeTicks?: number | null;
}

interface MirrorInfo {
    SourceSessionId: string;
    Targets: { SessionId: string }[];
}

const TICKS_PER_SECOND = 10_000_000;

const progress = (d: HandoffDevice) => {
    if (!d.PositionTicks || !d.RunTimeTicks) return '';
    const left = Math.max(0, Math.round((d.RunTimeTicks - d.PositionTicks) / TICKS_PER_SECOND / 60));
    return left > 0 ? `${left} min left` : '';
};

/**
 * Handoff: move what is playing to another of your devices (or bring what another device is playing here),
 * continuing from the same moment.
 */
export const KhyloHandoff: FC = () => {
    const { api } = useApi();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [ isOpen, setIsOpen ] = useState(false);
    const [ devices, setDevices ] = useState<HandoffDevice[]>([]);
    const [ following, setFollowing ] = useState<string[]>([]);
    const [ busy, setBusy ] = useState(false);
    const [ message, setMessage ] = useState('');

    const headers = useCallback(() => ({ Authorization: `MediaBrowser Token="${api?.accessToken}"` }), [ api ]);

    const load = useCallback(async () => {
        if (!api) return;
        try {
            const response = await axios.get<HandoffDevice[]>(`${api.basePath}/Khylo/Handoff/Devices`, { headers: headers() });
            setDevices(response.data ?? []);
            const mirrors = await axios.get<MirrorInfo[]>(`${api.basePath}/Khylo/Mirror`, { headers: headers() });
            setFollowing((mirrors.data ?? []).flatMap(m => m.Targets.map(t => t.SessionId)));
        } catch (err) {
            console.warn('[KhyloHandoff] failed to load devices', err);
            setDevices([]);
        }
    }, [ api, headers ]);

    useEffect(() => {
        if (!isOpen) return undefined;
        setMessage('');
        load().catch(console.warn);
        const timer = setInterval(() => load().catch(console.warn), 5000);
        const outside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', outside);
        return () => {
            clearInterval(timer);
            document.removeEventListener('mousedown', outside);
        };
    }, [ isOpen, load ]);

    const run = async (body: { FromSessionId?: string; ToSessionId?: string }, done: string) => {
        if (!api) return;
        setBusy(true);
        try {
            await axios.post(`${api.basePath}/Khylo/Handoff`, body, { headers: headers() });
            setMessage(done);
            setTimeout(() => setIsOpen(false), 1200);
        } catch (err) {
            console.warn('[KhyloHandoff] handoff failed', err);
            setMessage('That didn’t work. Make sure the other device is open and signed in as you.');
        } finally {
            setBusy(false);
        }
    };

    // When this screen follows another, ask where it is every second and close the gap by playing a little faster or slower
    // (a jump only when it is far out)
    useEffect(() => {
        if (!api) return undefined;
        let nudged = false;
        const timer = setInterval(() => {
            (async () => {
                if (!playbackManager.isPlaying()) return;
                const before = performance.now();
                let reference: { ItemId: string; PositionTicks: number; IsPaused: boolean } | null = null;
                try {
                    reference = (await axios.get(`${api.basePath}/Khylo/Mirror/Reference`, { headers: headers() })).data;
                } catch {
                    reference = null;
                }
                const current = playbackManager.currentItem();
                const sameItem = reference && current?.Id && reference.ItemId.replace(/-/g, '') === String(current.Id).replace(/-/g, '');
                if (!reference || reference.IsPaused || playbackManager.paused() || !sameItem) {
                    if (nudged) playbackManager.setPlaybackRate(1);
                    nudged = false;
                    return;
                }
                // The answer was worked out about half the round trip ago
                const wanted = reference.PositionTicks / TICKS_PER_SECOND * 1000 + (performance.now() - before) / 2;
                const offset = Number(playbackManager.currentTime()) - wanted;
                if (Math.abs(offset) > 1500) {
                    playbackManager.seek((wanted + 300) * 10_000);
                    playbackManager.setPlaybackRate(1);
                    nudged = false;
                } else if (Math.abs(offset) > 120) {
                    playbackManager.setPlaybackRate(offset > 0 ? 0.94 : 1.06);
                    nudged = true;
                } else if (nudged) {
                    playbackManager.setPlaybackRate(1);
                    nudged = false;
                }
            })().catch(console.warn);
        }, 1000);
        return () => clearInterval(timer);
    }, [ api, headers ]);

    // Mirror: other devices follow this one, so the same thing plays on each. Tapping a device again lets it go.
    const toggleMirror = async (d: HandoffDevice) => {
        if (!api) return;
        setBusy(true);
        try {
            if (following.includes(d.SessionId)) {
                await axios.delete(`${api.basePath}/Khylo/Mirror`, { headers: headers(), params: { sessionId: d.SessionId } });
            } else {
                await axios.post(`${api.basePath}/Khylo/Mirror`, { TargetSessionIds: [ d.SessionId ] }, { headers: headers() });
            }
            await load();
        } catch (err) {
            console.warn('[KhyloHandoff] mirror failed', err);
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            const reason = axios.isAxiosError(err) && typeof err.response?.data === 'string' ? err.response.data : '';
            if (status === 404) setMessage('Your Khylo Server needs updating to use Mirror.');
            else if (status === 400 && reason) setMessage(reason);
            else setMessage('That didn’t work. Make sure the other device is open and signed in as you.');
        } finally {
            setBusy(false);
        }
    };

    const playingHere = playbackManager.isPlaying();
    const others = devices.filter(d => d.IsPlaying);

    return (
        <div className='khylo-handoff' ref={wrapperRef}>
            <button
                type='button'
                className='khylo-topbar__action-btn'
                title='Handoff to another device'
                aria-label='Handoff to another device'
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <CastOutlined />
            </button>
            {isOpen && (
                <div className='khylo-handoff__panel' role='dialog' aria-label='Handoff'>
                    <div className='khylo-handoff__title'>Handoff</div>
                    {message && <div className='khylo-handoff__message'>{message}</div>}
                    {!message && devices.length === 0 && (
                        <div className='khylo-handoff__empty'>
                            No other devices of yours are open right now. Open Khylo on your phone, tablet or TV, signed in as you.
                        </div>
                    )}

                    {others.length > 0 && !message && (
                        <>
                            <div className='khylo-handoff__section'>Bring to this device</div>
                            {others.map(d => (
                                <button
                                    key={`pull-${d.SessionId}`}
                                    type='button'
                                    className='khylo-handoff__row'
                                    disabled={busy}
                                    onClick={() => run({ FromSessionId: d.SessionId }, `Now playing here, from ${d.DeviceName ?? 'your other device'}.`).catch(console.warn)}
                                >
                                    <span className='khylo-handoff__name'>{d.DeviceName ?? d.Client}</span>
                                    <span className='khylo-handoff__detail'>
                                        {[ d.NowPlayingSeriesName, d.NowPlayingName, progress(d) ].filter(Boolean).join(' · ')}
                                    </span>
                                </button>
                            ))}
                        </>
                    )}

                    {playingHere && devices.length > 0 && !message && (
                        <>
                            <div className='khylo-handoff__section'>Send what I&rsquo;m watching to</div>
                            {devices.map(d => (
                                <button
                                    key={`push-${d.SessionId}`}
                                    type='button'
                                    className='khylo-handoff__row'
                                    disabled={busy}
                                    onClick={() => run({ ToSessionId: d.SessionId }, `Sent to ${d.DeviceName ?? 'your other device'}.`).catch(console.warn)}
                                >
                                    <span className='khylo-handoff__name'>{d.DeviceName ?? d.Client}</span>
                                    <span className='khylo-handoff__detail'>{d.IsPlaying ? 'Will replace what it is playing' : 'Ready'}</span>
                                </button>
                            ))}
                        </>
                    )}
                    {playingHere && devices.length > 0 && !message && (
                        <>
                            <div className='khylo-handoff__section'>Mirror what I&rsquo;m watching on</div>
                            {devices.map(d => (
                                <button
                                    key={`mirror-${d.SessionId}`}
                                    type='button'
                                    className='khylo-handoff__row'
                                    disabled={busy}
                                    onClick={() => toggleMirror(d).catch(console.warn)}
                                >
                                    <span className='khylo-handoff__name'>{d.DeviceName ?? d.Client}</span>
                                    <span className='khylo-handoff__detail'>
                                        {following.includes(d.SessionId) ? 'Following this screen · click to stop' : 'Plays the same thing, together'}
                                    </span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
