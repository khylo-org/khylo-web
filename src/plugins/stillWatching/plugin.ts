import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';

import confirm from 'components/confirm/confirm';
import globalize from 'lib/globalize';
import inputManager from 'scripts/inputManager';
import { currentSettings as userSettings } from 'scripts/settings/userSettings';
import { type InterceptOptions, PreplayInterceptPlugin } from 'types/plugin';

import { ID, StillWatchingConfiguration, StillWatchingOptions } from './constants';

/** List of item types that should display a still watching prompt. */
const SUPPORTED_ITEM_TYPES: Set<BaseItemKind> = new Set([
    BaseItemKind.Episode
]);

class StillWatchingPlugin extends PreplayInterceptPlugin {
    name = 'Still Watching';
    id = ID;
    priority = 10; // Run after plugins that validate access

    /** The start time of the current play session or since the last reset. */
    private sessionStartTime?: Date;
    /** A set of item IDs that have been played in the current session or since the last reset. */
    private readonly playedItems = new Set<string>();

    /** Resets the play session, clearing the start time and played items. */
    private resetSession() {
        this.sessionStartTime = new Date();
        this.playedItems.clear();
    }

    async intercept({
        isFirstItem,
        item
    }: InterceptOptions) {
        // Reset the session at the start of a new play session
        if (isFirstItem) this.resetSession();

        // Check sleep protection setting from userSettings
        const sleepHours = userSettings.sleepProtection ? userSettings.sleepProtection() : '2';

        console.debug(`[StillWatchingPlugin] Sleep protection setting: ${sleepHours}; Session start: ${this.sessionStartTime}; Idle time: ${inputManager.idleTime() / 1000}s; Played items: ${this.playedItems.size}`);

        // If sleep protection is disabled ('off'), do nothing.
        if (sleepHours === 'off') return;

        // Bail if the item is not supported or if it lacks an ID
        if (!item.Id || !item.Type || !SUPPORTED_ITEM_TYPES.has(item.Type)) return;

        const hours = parseInt(sleepHours, 10) || 2;
        const duration = hours * 3600000; // MILLISECONDS_PER_HOUR
        const count = Math.max(hours * 2, 2);
        const id = item.Id;
        const idleTime = inputManager.idleTime();
        const sessionDuration = this.sessionStartTime ? Date.now() - this.sessionStartTime.getTime() : 0;

        if (
            // Check that the session has lasted at least the minimum duration
            sessionDuration >= duration
            // Check that the user has been idle for at least the minimum duration or played the count limit
            && (idleTime >= duration || this.playedItems.size >= count)
        ) {
            return confirm({
                title: 'Sleep Protection',
                text: 'Are you still watching? Khylo Sleep Protection paused playback to preserve your spot.',
                cancelText: globalize.translate('StopWatching'),
                confirmText: globalize.translate('ContinueWatching')
            }).then(() => {
                this.resetSession();
                this.playedItems.add(id);
            });
        }

        this.playedItems.add(id);
    }
}

export default StillWatchingPlugin;
