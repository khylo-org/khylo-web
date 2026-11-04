import type { AsyncRoute } from 'components/router/AsyncRoute';
import { AppType } from 'constants/appType';

/**
 * ROUTE ORDERING IS CRITICAL.
 *
 * React Router matches routes in declaration order.
 * Dynamic segments (e.g. :libraryId, :pluginId, :id, :userId)
 * MUST be declared AFTER all static paths at the same level.
 *
 * Wrong order:  libraries/:libraryId  →  libraries/metadata  (metadata never matches)
 * Correct order: libraries/metadata  →  libraries/:libraryId
 */
export const ASYNC_ADMIN_ROUTES: AsyncRoute[] = [
    // ── Overview ──────────────────────────────────────────────────────────────
    { path: '', type: AppType.Dashboard },

    // ── Libraries (static paths before dynamic :libraryId) ────────────────────
    { path: 'libraries', type: AppType.Dashboard },
    { path: 'libraries/create', type: AppType.Dashboard },
    { path: 'libraries/display', type: AppType.Dashboard },
    { path: 'libraries/metadata', type: AppType.Dashboard },
    { path: 'libraries/nfo', type: AppType.Dashboard },
    // Dynamic LAST — otherwise /libraries/metadata matches this instead
    { path: 'libraries/:libraryId', page: 'libraries/edit', type: AppType.Dashboard },

    // ── Metadata Manager ───────────────────────────────────────────────────────
    { path: 'metadata', type: AppType.Dashboard },

    // ── Plugins (static paths before dynamic :pluginId) ────────────────────────
    { path: 'plugins', type: AppType.Dashboard },
    { path: 'plugins/repositories', type: AppType.Dashboard },
    // Dynamic LAST — otherwise /plugins/repositories matches this instead
    { path: 'plugins/:pluginId', page: 'plugins/plugin', type: AppType.Dashboard },

    // ── Tasks (static paths before dynamic :id) ────────────────────────────────
    { path: 'tasks', type: AppType.Dashboard },
    // Dynamic LAST
    { path: 'tasks/:id', page: 'tasks/task', type: AppType.Dashboard },

    // ── Users (static paths before dynamic :userId) ────────────────────────────
    { path: 'users', type: AppType.Dashboard },
    { path: 'users/add', type: AppType.Dashboard },
    // Dynamic LAST — otherwise /users/add matches :userId/add (broken)
    { path: 'users/:userId/:tab', page: 'users/edit', type: AppType.Dashboard },

    // ── Logs (static paths before dynamic :file) ───────────────────────────────
    { path: 'logs', type: AppType.Dashboard },
    // Dynamic LAST
    { path: 'logs/:file', page: 'logs/file', type: AppType.Dashboard },

    // ── Playback Engine ────────────────────────────────────────────────────────
    { path: 'playback/resume', type: AppType.Dashboard },
    { path: 'playback/streaming', type: AppType.Dashboard },
    { path: 'playback/transcoding', type: AppType.Dashboard },
    { path: 'playback/trickplay', type: AppType.Dashboard },

    // ── The rest (no sub-path conflicts) ──────────────────────────────────────
    { path: 'activity', type: AppType.Dashboard },
    { path: 'backups', type: AppType.Dashboard },
    { path: 'branding', type: AppType.Dashboard },
    { path: 'devices', type: AppType.Dashboard },
    { path: 'invitations', type: AppType.Dashboard },
    { path: 'homeprofiles', type: AppType.Dashboard },
    { path: 'import', type: AppType.Dashboard },
    { path: 'livechannels', type: AppType.Dashboard },
    { path: 'keys', type: AppType.Dashboard },
    { path: 'networking', type: AppType.Dashboard },
    { path: 'settings', type: AppType.Dashboard },
    { path: 'updates', type: AppType.Dashboard },
    { path: 'webhooks', type: AppType.Dashboard },

    // ── Live TV (legacy, keep at end) ─────────────────────────────────────────
    { path: 'livetv', type: AppType.Dashboard },
    { path: 'livetv/recordings', type: AppType.Dashboard },
    { path: 'livetv/tuner', type: AppType.Dashboard },
    { path: 'livetv/guide', type: AppType.Dashboard },
    { path: 'livetv/channels', type: AppType.Dashboard }
];
