/** The parts of the update status that say when an update began. */
export interface UpdateClock {
    UpdateStartedAt?: string | null;
    ServerTime?: string | null;
}

/**
 * Seconds an update has been running, by the server's clock. The server says when it began and what time it is now, so the
 * count is right however long this page has been open, after a reload, and when this computer's clock is wrong. Between the
 * status refreshes it keeps counting from when the last one arrived.
 */
export function elapsedSeconds(status: UpdateClock | undefined, receivedAt: number, now: number, startedHere?: number): number | undefined {
    const began = status?.UpdateStartedAt ? Date.parse(status.UpdateStartedAt) : NaN;
    const serverNow = status?.ServerTime ? Date.parse(status.ServerTime) : NaN;
    if (Number.isFinite(began) && Number.isFinite(serverNow)) {
        return Math.max(0, Math.floor((serverNow + Math.max(0, now - receivedAt) - began) / 1000));
    }
    if (startedHere !== undefined) return Math.max(0, Math.floor((now - startedHere) / 1000));
    return undefined;
}

export const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
