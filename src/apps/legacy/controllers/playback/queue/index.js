import RemoteControl from 'components/remotecontrol/remotecontrol';
import { playbackManager } from 'components/playback/playbackmanager';
import { clearBackdrop } from 'components/backdrop/backdrop';
import libraryMenu from 'scripts/libraryMenu';
import 'elements/khylo-button/khylo-button';
import 'elements/khylo-button/paper-icon-button-light';
import 'elements/khylo-collapse/khylo-collapse';
import 'elements/khylo-input/khylo-input';
import 'elements/khylo-itemscontainer/khylo-itemscontainer';
import 'elements/khylo-slider/khylo-slider';

export default function (view) {
    const remoteControl = new RemoteControl();
    remoteControl.init(view, view.querySelector('.remoteControlContent'));

    let currentPlayer;

    function onKeyDown(e) {
        if (e.keyCode === 32 && e.target.tagName !== 'BUTTON') {
            playbackManager.playPause(currentPlayer);
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function releaseCurrentPlayer() {
        const player = currentPlayer;
        if (player) currentPlayer = null;
    }

    function bindToPlayer(player) {
        if (player !== currentPlayer) {
            releaseCurrentPlayer();
            currentPlayer = player;
        }
    }

    view.addEventListener('viewshow', function () {
        libraryMenu.setTransparentMenu(true);
        bindToPlayer(playbackManager.getCurrentPlayer());
        document.addEventListener('keydown', onKeyDown);

        clearBackdrop();

        if (remoteControl) {
            remoteControl.onShow();
        }
    });

    view.addEventListener('viewbeforehide', function () {
        libraryMenu.setTransparentMenu(false);
        document.removeEventListener('keydown', onKeyDown);
        releaseCurrentPlayer();

        if (remoteControl) {
            remoteControl.destroy();
        }
    });
}
