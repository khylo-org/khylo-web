/** Pure helpers for playlists: no network, so they can be tested on their own. */

/** A copy of the list with one entry moved from one place to another (the rest keep their order). */
export function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
    const copy = [ ...list ];
    if (from < 0 || from >= copy.length) return copy;
    const target = Math.max(0, Math.min(to, copy.length - 1));
    const [ entry ] = copy.splice(from, 1);
    copy.splice(target, 0, entry);
    return copy;
}

/**
 * The songs that still need adding. The server lets the same song into a playlist twice, but then it can only
 * address both copies as one (removing or moving acts on the first match), so Khylo never adds a song twice.
 */
export function idsToAdd(existing: readonly string[], wanted: readonly string[]): string[] {
    const have = new Set(existing);
    const result: string[] = [];
    for (const id of wanted) {
        if (!have.has(id)) {
            have.add(id);
            result.push(id);
        }
    }
    return result;
}

/** A name as the server should store it: no stray spaces at the ends or doubled inside. Empty when there is nothing left. */
export function cleanPlaylistName(name: string): string {
    return name.replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** "My playlist", then "My playlist 2", "My playlist 3"... the first one not already used. */
export function nextDefaultName(existingNames: readonly string[], base = 'My playlist'): string {
    const taken = new Set(existingNames.map(name => name.trim().toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let n = 2; n < 10000; n++) {
        const candidate = `${base} ${n}`;
        if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return `${base} ${Date.now()}`;
}

/** Whether every one of the songs is already in the playlist. */
export function containsAll(playlistIds: ReadonlySet<string>, songIds: readonly string[]): boolean {
    return songIds.length > 0 && songIds.every(id => playlistIds.has(id));
}

/** "1 song", "12 songs". */
export function songCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'song' : 'songs'}`;
}
