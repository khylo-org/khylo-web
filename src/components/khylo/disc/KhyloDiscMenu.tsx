import React, { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import classNames from 'classnames';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';

import { useApi } from 'hooks/useApi';
import { playMediaItem } from '../media/mediaUtils';
import './KhyloDiscMenu.scss';

interface DiscAudio { Index: number; Codec: string; Channels: number; Language?: string; LanguageName?: string; Note?: string }
interface DiscSubtitle { Index: number; Language?: string; LanguageName?: string; Note?: string }
interface DiscChapter { Number: number; StartSeconds: number; StartPositionTicks: number }
interface DiscTitle {
    Number: number;
    IsMain: boolean;
    MediaSourceId: string;
    Seconds: number;
    RunTimeTicks: number;
    Chapters: DiscChapter[];
    Audio: DiscAudio[];
    Subtitles: DiscSubtitle[];
}
interface DiscInfo { IsScrambled: boolean; HasMenuImage: boolean; MainTitle: number; Titles: DiscTitle[] }

type Section = 'play' | 'scenes' | 'tracks' | 'extras';

// eslint-disable-next-line @typescript-eslint/naming-convention
const CODEC_NAMES: Record<string, string> = { ac3: 'Dolby Digital', dts: 'DTS', mp2: 'MPEG audio', pcm_dvd: 'Uncompressed' };

const channelsText = (n: number) => {
    if (n >= 6) return '5.1';
    if (n === 2) return 'Stereo';
    if (n === 1) return 'Mono';
    return `${n} channels`;
};

const clock = (seconds: number) => {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

const audioLabel = (a: DiscAudio, i: number) => {
    const parts = [ a.LanguageName || `Track ${i + 1}`, `${CODEC_NAMES[a.Codec] || a.Codec.toUpperCase()} ${channelsText(a.Channels)}` ];
    if (a.Note) parts.push(a.Note);
    return parts.join(' · ');
};

const subtitleLabel = (s: DiscSubtitle, i: number) => [ s.LanguageName || `Subtitles ${i + 1}`, s.Note ].filter(Boolean).join(' · ');

interface KhyloDiscMenuProps {
    item: BaseItemDto;
    onClose: () => void;
}

/**
 * A disc's menu, made from what's on the disc: play, jump to a scene, pick the sound and subtitles, play an
 * extra. It looks and works the same on every device, and uses the disc's own menu picture behind it.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const KhyloDiscMenu: FC<KhyloDiscMenuProps> = ({ item, onClose }) => {
    const { api } = useApi();
    const [ disc, setDisc ] = useState<DiscInfo | null>(null);
    const [ failed, setFailed ] = useState(false);
    const [ section, setSection ] = useState<Section>('play');
    const [ audioChoice, setAudioChoice ] = useState(0);
    const [ subtitleChoice, setSubtitleChoice ] = useState(-1);

    const itemId = item.Id;

    useEffect(() => {
        if (!api || !itemId) return;
        let cancelled = false;
        axios.request<DiscInfo>({
            method: 'GET',
            url: `${api.basePath}/Khylo/Disc/${itemId}`,
            headers: { Authorization: `MediaBrowser Token="${api.accessToken}"` }
        }).then(r => {
            if (!cancelled) setDisc(r.data);
        }).catch(() => {
            if (!cancelled) setFailed(true);
        });
        return () => {
            cancelled = true;
        };
    }, [ api, itemId ]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [ onClose ]);

    const picture = useCallback((params: string) =>
        api && itemId ? `${api.basePath}/Khylo/Disc/${itemId}/Image?${params}&api_key=${api.accessToken}` : undefined,
    [ api, itemId ]);

    const main = useMemo(() => disc?.Titles.find(t => t.IsMain) ?? disc?.Titles[0], [disc]);
    const extras = useMemo(() => disc?.Titles.filter(t => t !== main) ?? [], [ disc, main ]);

    // The streams ffmpeg found in the feature, in the order the disc numbers its tracks
    const streamIndexes = useMemo(() => {
        const streams = item.MediaSources?.[0]?.MediaStreams ?? [];
        return {
            audio: streams.filter(s => s.Type === 'Audio').map(s => s.Index as number),
            subtitle: streams.filter(s => s.Type === 'Subtitle').map(s => s.Index as number)
        };
    }, [item]);

    const resumeTicks = item.UserData?.PlaybackPositionTicks || 0;

    const play = useCallback((title: DiscTitle | undefined, startPositionTicks: number) => {
        if (!title) return;
        const isFeature = title.IsMain;
        let subtitleStreamIndex: number | undefined;
        if (isFeature) {
            subtitleStreamIndex = subtitleChoice >= 0 ? streamIndexes.subtitle[subtitleChoice] : -1;
        }
        onClose();
        playMediaItem(item, {
            startPositionTicks,
            mediaSourceId: isFeature ? undefined : title.MediaSourceId,
            audioStreamIndex: isFeature ? streamIndexes.audio[audioChoice] : undefined,
            subtitleStreamIndex
        });
    }, [ item, onClose, streamIndexes, audioChoice, subtitleChoice ]);

    const nav: { id: Section; label: string; show: boolean }[] = [
        { id: 'play', label: 'Play', show: true },
        { id: 'scenes', label: 'Scenes', show: Boolean(main && main.Chapters.length > 1) },
        { id: 'tracks', label: 'Audio & Subtitles', show: Boolean(main && (main.Audio.length > 1 || main.Subtitles.length > 0)) },
        { id: 'extras', label: 'Extras', show: extras.length > 0 }
    ];

    let body: ReactNode = null;
    if (failed || disc?.IsScrambled) {
        body = (
            <div className='khylo-disc__message'>
                <h3>{disc?.IsScrambled ? 'This disc is copy-protected' : 'This disc can\'t be read'}</h3>
                <p>
                    {disc?.IsScrambled ?
                        'Discs copied straight from a store-bought DVD are scrambled, and Khylo can\'t play them. Use a copy made without the protection.' :
                        'Khylo couldn\'t read this disc\'s contents. The file may be damaged or not a DVD.'}
                </p>
            </div>
        );
    } else if (!disc || !main) {
        body = <div className='khylo-disc__message'><p>Reading the disc…</p></div>;
    } else if (section === 'play') {
        body = (
            <div className='khylo-disc__panel'>
                <div className='khylo-disc__facts'>
                    <span>{clock(main.Seconds)}</span>
                    <span>{main.Chapters.length} {main.Chapters.length === 1 ? 'chapter' : 'chapters'}</span>
                    {main.Audio.length > 0 && <span>{audioLabel(main.Audio[Math.min(audioChoice, main.Audio.length - 1)], audioChoice)}</span>}
                    <span>{subtitleChoice >= 0 && main.Subtitles[subtitleChoice] ? subtitleLabel(main.Subtitles[subtitleChoice], subtitleChoice) : 'Subtitles off'}</span>
                </div>
                <div className='khylo-disc__actions'>
                    <button type='button' className='khylo-disc__primary' onClick={() => play(main, resumeTicks > 0 ? resumeTicks : 0)}>
                        <PlayArrowRounded />
                        {resumeTicks > 0 ? 'Resume' : 'Play movie'}
                    </button>
                    {resumeTicks > 0 && (
                        <button type='button' className='khylo-disc__secondary' onClick={() => play(main, 0)}>
                            <ReplayRounded />
                            From the beginning
                        </button>
                    )}
                </div>
            </div>
        );
    } else if (section === 'scenes') {
        body = (
            <div className='khylo-disc__scenes'>
                {main.Chapters.map(c => (
                    <button key={c.Number} type='button' className='khylo-disc__scene' onClick={() => play(main, c.StartPositionTicks)}>
                        <img src={picture(`seconds=${Math.floor(c.StartSeconds + 3)}`)} alt='' loading='lazy' />
                        <span className='khylo-disc__scene-name'>Scene {c.Number}</span>
                        <span className='khylo-disc__scene-time'>{clock(c.StartSeconds)}</span>
                    </button>
                ))}
            </div>
        );
    } else if (section === 'tracks') {
        body = (
            <div className='khylo-disc__tracks'>
                {main.Audio.length > 0 && (
                    <div className='khylo-disc__group'>
                        <div className='khylo-disc__group-title'>Audio</div>
                        {main.Audio.map((a, i) => (
                            <button key={a.Index} type='button' className={classNames('khylo-disc__choice', { 'khylo-disc__choice--on': audioChoice === i })} onClick={() => setAudioChoice(i)}>
                                {audioLabel(a, i)}
                            </button>
                        ))}
                    </div>
                )}
                <div className='khylo-disc__group'>
                    <div className='khylo-disc__group-title'>Subtitles</div>
                    <button type='button' className={classNames('khylo-disc__choice', { 'khylo-disc__choice--on': subtitleChoice === -1 })} onClick={() => setSubtitleChoice(-1)}>
                        Off
                    </button>
                    {main.Subtitles.map((s, i) => (
                        <button key={s.Index} type='button' className={classNames('khylo-disc__choice', { 'khylo-disc__choice--on': subtitleChoice === i })} onClick={() => setSubtitleChoice(i)}>
                            {subtitleLabel(s, i)}
                        </button>
                    ))}
                </div>
            </div>
        );
    } else {
        body = (
            <div className='khylo-disc__scenes khylo-disc__scenes--extras'>
                {extras.map(t => (
                    <button key={t.Number} type='button' className='khylo-disc__scene' onClick={() => play(t, 0)}>
                        <img src={picture(`title=${t.Number}&seconds=${Math.floor(Math.min(t.Seconds * 0.1, 30))}`)} alt='' loading='lazy' />
                        <span className='khylo-disc__scene-name'>Extra {t.Number}</span>
                        <span className='khylo-disc__scene-time'>{clock(t.Seconds)}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className='khylo-disc' role='dialog' aria-label={`${item.Name} disc menu`}>
            {disc?.HasMenuImage && <div className='khylo-disc__backdrop' style={{ backgroundImage: `url(${picture('menu=true')})` }} />}
            <div className='khylo-disc__shade' />
            <button type='button' className='khylo-disc__close' onClick={onClose} aria-label='Close'>
                <CloseRounded />
            </button>
            <div className='khylo-disc__layout'>
                <div className='khylo-disc__side'>
                    <div className='khylo-disc__kicker'>DVD</div>
                    <h2 className='khylo-disc__title'>{item.Name}</h2>
                    <nav className='khylo-disc__nav'>
                        {nav.filter(n => n.show).map(n => (
                            <button
                                key={n.id}
                                type='button'
                                className={classNames('khylo-disc__nav-item', { 'khylo-disc__nav-item--on': section === n.id })}
                                onClick={() => setSection(n.id)}
                            >
                                {n.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className='khylo-disc__body'>{body}</div>
            </div>
        </div>
    );
};

export default KhyloDiscMenu;
