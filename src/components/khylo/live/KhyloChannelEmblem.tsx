import React, { useEffect, useState, type FC, type ReactElement } from 'react';
import classNames from 'classnames';

import AcUnit from '@mui/icons-material/AcUnit';
import AddRoad from '@mui/icons-material/AddRoad';
import Animation from '@mui/icons-material/Animation';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import AutoFixHigh from '@mui/icons-material/AutoFixHigh';
import Bookmarks from '@mui/icons-material/Bookmarks';
import BugReport from '@mui/icons-material/BugReport';
import CameraRoll from '@mui/icons-material/CameraRoll';
import Casino from '@mui/icons-material/Casino';
import ChildCare from '@mui/icons-material/ChildCare';
import Diamond from '@mui/icons-material/Diamond';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import FamilyRestroom from '@mui/icons-material/FamilyRestroom';
import Favorite from '@mui/icons-material/Favorite';
import FiberNew from '@mui/icons-material/FiberNew';
import Fingerprint from '@mui/icons-material/Fingerprint';
import Flag from '@mui/icons-material/Flag';
import Forest from '@mui/icons-material/Forest';
import Gavel from '@mui/icons-material/Gavel';
import GpsFixed from '@mui/icons-material/GpsFixed';
import Grade from '@mui/icons-material/Grade';
import Groups from '@mui/icons-material/Groups';
import HistoryEdu from '@mui/icons-material/HistoryEdu';
import HourglassTop from '@mui/icons-material/HourglassTop';
import Landscape from '@mui/icons-material/Landscape';
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment';
import LocalHospital from '@mui/icons-material/LocalHospital';
import LocalPolice from '@mui/icons-material/LocalPolice';
import Lock from '@mui/icons-material/Lock';
import MenuBook from '@mui/icons-material/MenuBook';
import Mic from '@mui/icons-material/Mic';
import MilitaryTech from '@mui/icons-material/MilitaryTech';
import Movie from '@mui/icons-material/Movie';
import MusicNote from '@mui/icons-material/MusicNote';
import NightsStay from '@mui/icons-material/NightsStay';
import Pets from '@mui/icons-material/Pets';
import Public from '@mui/icons-material/Public';
import Replay from '@mui/icons-material/Replay';
import RocketLaunch from '@mui/icons-material/RocketLaunch';
import Sailing from '@mui/icons-material/Sailing';
import Satellite from '@mui/icons-material/Satellite';
import School from '@mui/icons-material/School';
import SentimentVerySatisfied from '@mui/icons-material/SentimentVerySatisfied';
import Shield from '@mui/icons-material/Shield';
import SmartToy from '@mui/icons-material/SmartToy';
import SportsFootball from '@mui/icons-material/SportsFootball';
import SportsMartialArts from '@mui/icons-material/SportsMartialArts';
import Star from '@mui/icons-material/Star';
import Theaters from '@mui/icons-material/Theaters';
import TheaterComedy from '@mui/icons-material/TheaterComedy';
import Thunderstorm from '@mui/icons-material/Thunderstorm';
import Tv from '@mui/icons-material/Tv';
import Videocam from '@mui/icons-material/Videocam';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Weekend from '@mui/icons-material/Weekend';
import Whatshot from '@mui/icons-material/Whatshot';

import { useApi } from 'hooks/useApi';
import type { LiveChannel } from './liveChannelsApi';
import './KhyloChannelEmblem.scss';

/** An icon for each built-in channel (key without the "-tv" / "-movies" suffix). */
const ICONS: Record<string, ReactElement> = {
    'classic': <Tv />,
    'classic-movies': <CameraRoll />,
    'sitcoms': <Weekend />,
    'comedy': <TheaterComedy />,
    'animation': <Animation />,
    'anime': <AutoAwesome />,
    'kids': <ChildCare />,
    'family': <FamilyRestroom />,
    'drama': <Theaters />,
    'medical': <LocalHospital />,
    'legal': <Gavel />,
    'teen': <School />,
    'soaps': <Favorite />,
    'crime': <Fingerprint />,
    'procedurals': <LocalPolice />,
    'scifi': <RocketLaunch />,
    'action': <LocalFireDepartment />,
    'superhero': <Shield />,
    'horror': <NightsStay />,
    'war': <MilitaryTech />,
    'western': <Landscape />,
    'westerns': <Landscape />,
    'miniseries': <Bookmarks />,
    'top-rated': <Grade />,
    'reality': <Videocam />,
    'game-shows': <Casino />,
    'talk': <Mic />,
    'docuseries': <Public />,
    'documentaries': <Public />,
    'true-crime': <Fingerprint />,
    'adventure': <Forest />,
    'action-comedies': <Whatshot />,
    'romcoms': <Favorite />,
    'romance': <Favorite />,
    'mystery': <VisibilityOff />,
    'thriller': <VisibilityOff />,
    'fantasy': <AutoFixHigh />,
    'history': <HistoryEdu />,
    'music': <MusicNote />,
    'biopics': <MenuBook />,
    'sports': <SportsFootball />,
    'film-noir': <CameraRoll />,
    'tv': <Tv />,
    'indie': <Movie />,
    'animated': <Animation />,
    'heist': <Diamond />,
    'spy': <VisibilityOff />,
    'martial-arts': <SportsMartialArts />,
    'cop': <LocalPolice />,
    'gangster': <Groups />,
    'assassin': <GpsFixed />,
    'revenge': <Replay />,
    'prison': <Lock />,
    'courtroom': <Gavel />,
    'disaster': <Thunderstorm />,
    'survival': <Forest />,
    'racing': <DirectionsCar />,
    'road-trip': <AddRoad />,
    'pirate': <Sailing />,
    'ww2': <Flag />,
    'space': <RocketLaunch />,
    'alien': <Satellite />,
    'time-travel': <HourglassTop />,
    'dystopia': <Whatshot />,
    'robot': <SmartToy />,
    'zombie': <BugReport />,
    'slasher': <NightsStay />,
    'haunted': <NightsStay />,
    'creature-features': <BugReport />,
    'found-footage': <Videocam />,
    'witch': <AutoFixHigh />,
    'buddy-comedies': <Groups />,
    'spoof': <SentimentVerySatisfied />,
    'animal': <Pets />,
    'book': <MenuBook />,
    'cult': <Star />,
    'just-added': <FiberNew />,
    'christmas': <AcUnit />,
    'halloween': <NightsStay />,
    'valentines': <Favorite />
};

const ERA_KEY = /^(\d{2}s|\d{4}s)-/;

function getIcon(key: string): ReactElement | undefined {
    return ICONS[key] ?? ICONS[key.replace(/-(tv|movies)$/, '')];
}

/** Short label for era channels, e.g. "'80s" or "2010s". */
function getEraLabel(key: string): string | null {
    const match = ERA_KEY.exec(key);
    if (!match) return null;
    const era = match[1];
    return era.length === 3 ? `'${era}` : era;
}

export interface KhyloChannelEmblemProps {
    channel: Pick<LiveChannel, 'Id' | 'Key' | 'Name'>;
    size?: 'sm' | 'lg';
    className?: string;
}

/**
 * A channel's emblem: the official logo for network channels, the collection's artwork for
 * collection channels, and a clean icon (or era label) for everything else.
 */
export const KhyloChannelEmblem: FC<KhyloChannelEmblemProps> = ({ channel, size = 'sm', className }) => {
    const { api } = useApi();
    const [ imageFailed, setImageFailed ] = useState(false);
    const key = channel.Key ?? '';

    useEffect(() => {
        setImageFailed(false);
    }, [channel.Id]);

    let content: ReactElement;
    let variant = 'icon';

    if (key.startsWith('network:') && api && !imageFailed) {
        variant = 'logo';
        content = (
            <img
                src={`${api.basePath}/LiveChannels/${channel.Id}/Logo`}
                alt={channel.Name}
                loading='lazy'
                onError={() => setImageFailed(true)}
            />
        );
    } else if (key.startsWith('network:')) {
        // No logo available: the network's name as a wordmark
        variant = 'wordmark';
        content = <span className='khylo-channel-emblem__wordmark'>{channel.Name}</span>;
    } else if (key.startsWith('collection:') && api && !imageFailed) {
        variant = 'artwork';
        content = (
            <img
                src={`${api.basePath}/Items/${key.slice('collection:'.length)}/Images/Primary?maxHeight=120`}
                alt=''
                loading='lazy'
                onError={() => setImageFailed(true)}
            />
        );
    } else {
        const era = getEraLabel(key);
        content = era ? <span className='khylo-channel-emblem__era'>{era}</span> : (getIcon(key) ?? <Movie />);
    }

    return (
        <span
            className={classNames('khylo-channel-emblem', `khylo-channel-emblem--${variant}`, `khylo-channel-emblem--${size}`, className)}
            aria-hidden='true'
        >
            {content}
        </span>
    );
};
