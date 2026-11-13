/**
 * A tiny channel between the buttons in the music pages and the playlist picker / dialog / messages that
 * KhyloMusicOverlays draws once for the whole app. Any button (a song row, the Now Playing page, the sidebar)
 * can open them without the pages passing props around.
 */

export type MusicUiEvent =
    | { type: 'picker'; songIds: string[]; label?: string; anchor?: { left: number; right: number; top: number; bottom: number } | null }
    | { type: 'dialog'; playlistId?: string; songIds?: string[] }
    | { type: 'toast'; message: string; tone?: 'ok' | 'error' };

type Listener = (event: MusicUiEvent) => void;

const listeners = new Set<Listener>();

export function onMusicUi(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function emit(event: MusicUiEvent): void {
    listeners.forEach(listener => {
        listener(event);
    });
}

const rectOf = (element?: Element | null) => {
    if (!element) return null;
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return { left, right, top, bottom };
};

/** Opens "Add to playlist" for one or more songs, next to the button that was pressed. */
export function openPlaylistPicker(songIds: string[], options?: { label?: string; anchor?: Element | null }): void {
    if (songIds.length === 0) return;
    emit({ type: 'picker', songIds, label: options?.label, anchor: rectOf(options?.anchor) });
}

/** Opens the playlist dialog: a new playlist (optionally starting with some songs) or an existing one's details. */
export function openPlaylistDialog(options?: { playlistId?: string; songIds?: string[] }): void {
    emit({ type: 'dialog', playlistId: options?.playlistId, songIds: options?.songIds });
}

/** A short message at the bottom of the screen ("Added to Night Drive"). */
export function showMusicToast(message: string, tone: 'ok' | 'error' = 'ok'): void {
    emit({ type: 'toast', message, tone });
}
