import actionsheet from '../actionSheet/actionSheet';
import { playbackManager } from '../playback/playbackmanager';
import globalize from 'lib/globalize';
import { ServerConnections } from 'lib/khylo-apiclient';
import qualityoptions from '../qualityOptions';
import * as userSettings from '../../scripts/settings/userSettings';

function showQualityMenu(player, btn) {
    const videoStream = playbackManager.currentMediaSource(player).MediaStreams.filter(function (stream) {
        return stream.Type === 'Video';
    })[0];

    const videoCodec = videoStream ? videoStream.Codec : null;
    const videoBitRate = videoStream ? videoStream.BitRate : null;

    const options = qualityoptions.getVideoQualityOptions({
        currentMaxBitrate: playbackManager.getMaxStreamingBitrate(player),
        isAutomaticBitrateEnabled: playbackManager.enableAutomaticBitrateDetection(player),
        videoCodec,
        videoBitRate,
        enableAuto: true
    });

    const menuItems = options.map(function (o) {
        const opt = {
            name: o.name,
            id: o.bitrate,
            asideText: o.secondaryText
        };

        if (o.selected) {
            opt.selected = true;
        }

        return opt;
    });

    const selectedId = options.filter(function (o) {
        return o.selected;
    });

    const selectedBitrate = selectedId.length ? selectedId[0].bitrate : null;

    return actionsheet.show({
        items: menuItems,
        positionTo: btn
    }).then(function (id) {
        const bitrate = parseInt(id, 10);
        if (bitrate !== selectedBitrate) {
            playbackManager.setMaxStreamingBitrate({
                enableAutomaticBitrateDetection: !bitrate,
                maxBitrate: bitrate
            }, player);
        }
    });
}

function showRepeatModeMenu(player, btn) {
    const menuItems = [];
    const currentValue = playbackManager.getRepeatMode(player);

    menuItems.push({
        name: globalize.translate('RepeatAll'),
        id: 'RepeatAll',
        selected: currentValue === 'RepeatAll'
    });

    menuItems.push({
        name: globalize.translate('RepeatOne'),
        id: 'RepeatOne',
        selected: currentValue === 'RepeatOne'
    });

    menuItems.push({
        name: globalize.translate('None'),
        id: 'RepeatNone',
        selected: currentValue === 'RepeatNone'
    });

    return actionsheet.show({
        items: menuItems,
        positionTo: btn
    }).then(function (mode) {
        if (mode) {
            playbackManager.setRepeatMode(mode, player);
        }
    });
}

function getQualitySecondaryText(player) {
    const state = playbackManager.getPlayerState(player);

    const videoStream = playbackManager.currentMediaSource(player).MediaStreams.filter(function (stream) {
        return stream.Type === 'Video';
    })[0];

    const videoCodec = videoStream ? videoStream.Codec : null;
    const videoBitRate = videoStream ? videoStream.BitRate : null;
    const videoWidth = videoStream ? videoStream.Width : null;
    const videoHeight = videoStream ? videoStream.Height : null;

    const options = qualityoptions.getVideoQualityOptions({
        currentMaxBitrate: playbackManager.getMaxStreamingBitrate(player),
        isAutomaticBitrateEnabled: playbackManager.enableAutomaticBitrateDetection(player),
        videoCodec,
        videoBitRate,
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        enableAuto: true
    });

    let selectedOption = options.filter(function (o) {
        return o.selected;
    });

    if (!selectedOption.length) {
        return null;
    }

    selectedOption = selectedOption[0];
    let text = selectedOption.name;

    if (selectedOption.autoText) {
        if (state.PlayState && state.PlayState.PlayMethod !== 'Transcode') {
            text += ' - Direct';
        } else {
            text += ' ' + selectedOption.autoText;
        }
    }

    return text;
}

function showAspectRatioMenu(player, btn) {
    // each has a name and id
    const currentId = playbackManager.getAspectRatio(player);
    const menuItems = playbackManager.getSupportedAspectRatios(player)
        .map(({ id, name }) => ({
            id,
            name,
            selected: id === currentId
        }));

    return actionsheet.show({
        items: menuItems,
        positionTo: btn
    }).then(function (id) {
        if (id) {
            playbackManager.setAspectRatio(id, player);
            return Promise.resolve();
        }

        return Promise.reject();
    });
}

function showPlaybackRateMenu(player, btn) {
    // each has a name and id
    const currentId = playbackManager.getPlaybackRate(player);
    const menuItems = playbackManager.getSupportedPlaybackRates(player).map(i => ({
        id: i.id,
        name: i.name,
        selected: i.id === currentId
    }));

    return actionsheet.show({
        items: menuItems,
        positionTo: btn
    }).then(function (id) {
        if (id) {
            playbackManager.setPlaybackRate(id, player);
            return Promise.resolve();
        }

        return Promise.reject();
    });
}

function showSkipIntroMenu(btn) {
    const isEnabled = userSettings.autoSkipIntro();
    const currentDelay = userSettings.autoSkipIntroDelay();

    const options = [
        { id: 'off', name: 'Off (Manual Prompt)', selected: !isEnabled },
        { id: '0', name: 'Instant (0 seconds)', selected: isEnabled && currentDelay === 0 },
        { id: '2', name: '2 seconds', selected: isEnabled && currentDelay === 2 },
        { id: '3', name: '3 seconds (Default)', selected: isEnabled && currentDelay === 3 },
        { id: '5', name: '5 seconds', selected: isEnabled && currentDelay === 5 },
        { id: '10', name: '10 seconds', selected: isEnabled && currentDelay === 10 }
    ];

    return actionsheet.show({
        items: options,
        positionTo: btn,
        title: 'Auto-Skip Intro'
    }).then(function (val) {
        if (!val) return;
        if (val === 'off') {
            userSettings.autoSkipIntro(false);
        } else {
            userSettings.autoSkipIntro(true);
            userSettings.autoSkipIntroDelay(parseInt(val, 10));
        }
    });
}

function showSkipCreditsMenu(btn) {
    const isEnabled = userSettings.autoSkipCredits();
    const currentDelay = userSettings.autoSkipCreditsDelay();

    const options = [
        { id: 'off', name: 'Off (Manual Prompt)', selected: !isEnabled },
        { id: '0', name: 'Instant (0 seconds)', selected: isEnabled && currentDelay === 0 },
        { id: '3', name: '3 seconds', selected: isEnabled && currentDelay === 3 },
        { id: '5', name: '5 seconds (Default)', selected: isEnabled && currentDelay === 5 },
        { id: '8', name: '8 seconds', selected: isEnabled && currentDelay === 8 },
        { id: '10', name: '10 seconds', selected: isEnabled && currentDelay === 10 }
    ];

    return actionsheet.show({
        items: options,
        positionTo: btn,
        title: 'Auto-Skip Credits'
    }).then(function (val) {
        if (!val) return;
        if (val === 'off') {
            userSettings.autoSkipCredits(false);
        } else {
            userSettings.autoSkipCredits(true);
            userSettings.autoSkipCreditsDelay(parseInt(val, 10));
        }
    });
}

function showNextEpisodeTimerMenu(btn) {
    const currentDelay = userSettings.autoPlayNextDelay ? userSettings.autoPlayNextDelay() : 15;
    const isAutoPlay = userSettings.autoPlayNext ? userSettings.autoPlayNext() : true;

    const options = [
        { id: 'off', name: 'Off (Do Not Auto-Play)', selected: !isAutoPlay },
        { id: '0', name: 'Instant (0 seconds)', selected: isAutoPlay && currentDelay === 0 },
        { id: '5', name: '5 seconds', selected: isAutoPlay && currentDelay === 5 },
        { id: '10', name: '10 seconds', selected: isAutoPlay && currentDelay === 10 },
        { id: '15', name: '15 seconds (Default)', selected: isAutoPlay && currentDelay === 15 },
        { id: '30', name: '30 seconds', selected: isAutoPlay && currentDelay === 30 }
    ];

    return actionsheet.show({
        items: options,
        positionTo: btn,
        title: 'Next Episode Countdown'
    }).then(function (val) {
        if (!val) return;
        if (val === 'off') {
            userSettings.autoPlayNext(false);
        } else {
            userSettings.autoPlayNext(true);
            userSettings.autoPlayNextDelay(parseInt(val, 10));
        }
    });
}

function showSleepProtectionMenu(btn) {
    const currentVal = userSettings.sleepProtection ? userSettings.sleepProtection() : '2';

    const options = [
        { id: 'off', name: 'Off (Continuous Play)', selected: currentVal === 'off' },
        { id: '1', name: '1 Hour', selected: currentVal === '1' },
        { id: '2', name: '2 Hours (Default)', selected: currentVal === '2' },
        { id: '3', name: '3 Hours', selected: currentVal === '3' },
        { id: '4', name: '4 Hours', selected: currentVal === '4' }
    ];

    return actionsheet.show({
        items: options,
        positionTo: btn,
        title: 'Sleep Protection'
    }).then(function (val) {
        if (val) {
            userSettings.sleepProtection(val);
        }
    });
}

function showWithUser(options, player, user) {
    const supportedCommands = playbackManager.getSupportedCommands(player);

    const menuItems = [];
    if (supportedCommands.indexOf('SetAspectRatio') !== -1) {
        const currentAspectRatioId = playbackManager.getAspectRatio(player);
        const currentAspectRatio = playbackManager.getSupportedAspectRatios(player).filter(function (i) {
            return i.id === currentAspectRatioId;
        })[0];

        menuItems.push({
            name: globalize.translate('AspectRatio'),
            id: 'aspectratio',
            asideText: currentAspectRatio ? currentAspectRatio.name : null
        });
    }

    if (supportedCommands.indexOf('PlaybackRate') !== -1) {
        const currentPlaybackRateId = playbackManager.getPlaybackRate(player);
        const currentPlaybackRate = playbackManager.getSupportedPlaybackRates(player).filter(i => i.id === currentPlaybackRateId)[0];

        menuItems.push({
            name: globalize.translate('PlaybackRate'),
            id: 'playbackrate',
            asideText: currentPlaybackRate ? currentPlaybackRate.name : null
        });
    }

    if (options.quality && supportedCommands.includes('SetMaxStreamingBitrate')
            && user?.Policy?.EnableVideoPlaybackTranscoding) {
        const secondaryQualityText = getQualitySecondaryText(player);

        menuItems.push({
            name: globalize.translate('Quality'),
            id: 'quality',
            asideText: secondaryQualityText
        });
    }

    const repeatMode = playbackManager.getRepeatMode(player);

    if (supportedCommands.indexOf('SetRepeatMode') !== -1 && playbackManager.currentMediaSource(player).RunTimeTicks) {
        menuItems.push({
            name: globalize.translate('RepeatMode'),
            id: 'repeatmode',
            asideText: repeatMode === 'RepeatNone' ? globalize.translate('None') : globalize.translate('' + repeatMode)
        });
    }

    if (options.suboffset) {
        menuItems.push({
            name: globalize.translate('SubtitleOffset'),
            id: 'suboffset',
            asideText: null
        });
    }

    if (options.stats) {
        menuItems.push({
            name: globalize.translate('PlaybackData'),
            id: 'stats',
            asideText: null
        });
    }

    // --- Khylo Smart Playback & Binge Controls Menu Options ---
    const isEpisode = playbackManager.currentItem(player)?.Type === 'Episode';
    if (isEpisode) {
        const introText = userSettings.autoSkipIntro()
            ? (userSettings.autoSkipIntroDelay() === 0 ? 'Instant' : `${userSettings.autoSkipIntroDelay()}s`)
            : 'Manual Prompt';
        menuItems.push({
            name: 'Auto-Skip Intro',
            id: 'autoskipintro',
            asideText: introText
        });

        const creditsText = userSettings.autoSkipCredits()
            ? (userSettings.autoSkipCreditsDelay() === 0 ? 'Instant' : `${userSettings.autoSkipCreditsDelay()}s`)
            : 'Manual Prompt';
        menuItems.push({
            name: 'Auto-Skip Credits',
            id: 'autoskipcredits',
            asideText: creditsText
        });

        const nextDelay = userSettings.autoPlayNextDelay ? userSettings.autoPlayNextDelay() : 15;
        const autoNextText = (userSettings.autoPlayNext ? userSettings.autoPlayNext() : true)
            ? `${nextDelay}s delay`
            : 'Off';
        menuItems.push({
            name: 'Next Episode Countdown',
            id: 'nextepisodetimer',
            asideText: autoNextText
        });

        const sleepHours = userSettings.sleepProtection ? userSettings.sleepProtection() : '2';
        menuItems.push({
            name: 'Sleep Protection',
            id: 'sleepprotection',
            asideText: sleepHours === 'off' ? 'Off' : `${sleepHours}h`
        });
    }

    return actionsheet.show({
        items: menuItems,
        positionTo: options.positionTo
    }).then(function (id) {
        return handleSelectedOption(id, options, player);
    });
}

export function show(options) {
    const player = options.player;
    const currentItem = playbackManager.currentItem(player);

    if (!currentItem?.ServerId) {
        return showWithUser(options, player, null);
    }

    const apiClient = ServerConnections.getApiClient(currentItem.ServerId);
    return apiClient.getCurrentUser().then(function (user) {
        return showWithUser(options, player, user);
    });
}

function handleSelectedOption(id, options, player) {
    switch (id) {
        case 'quality':
            return showQualityMenu(player, options.positionTo);
        case 'aspectratio':
            return showAspectRatioMenu(player, options.positionTo);
        case 'playbackrate':
            return showPlaybackRateMenu(player, options.positionTo);
        case 'repeatmode':
            return showRepeatModeMenu(player, options.positionTo);
        case 'stats':
            if (options.onOption) {
                options.onOption('stats');
            }
            return Promise.resolve();
        case 'suboffset':
            if (options.onOption) {
                options.onOption('suboffset');
            }
            return Promise.resolve();
        case 'autoskipintro':
            return showSkipIntroMenu(options.positionTo);
        case 'autoskipcredits':
            return showSkipCreditsMenu(options.positionTo);
        case 'nextepisodetimer':
            return showNextEpisodeTimerMenu(options.positionTo);
        case 'sleepprotection':
            return showSleepProtectionMenu(options.positionTo);
        default:
            break;
    }

    return Promise.reject();
}

export default {
    show: show
};
