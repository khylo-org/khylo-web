import { describe, expect, it } from 'vitest';

import { cleanPlaylistName, containsAll, idsToAdd, moveInList, nextDefaultName, songCountLabel } from './playlistRules';

describe('moveInList', () => {
    it('moves an entry later and earlier, keeping the rest in order', () => {
        expect(moveInList([ 'a', 'b', 'c', 'd' ], 0, 2)).toEqual([ 'b', 'c', 'a', 'd' ]);
        expect(moveInList([ 'a', 'b', 'c', 'd' ], 3, 1)).toEqual([ 'a', 'd', 'b', 'c' ]);
    });

    it('does not change the list it was given', () => {
        const list = [ 1, 2, 3 ];
        moveInList(list, 0, 2);
        expect(list).toEqual([ 1, 2, 3 ]);
    });

    it('keeps the list when moved to its own place or from a place that is not there', () => {
        expect(moveInList([ 'a', 'b' ], 1, 1)).toEqual([ 'a', 'b' ]);
        expect(moveInList([ 'a', 'b' ], 5, 0)).toEqual([ 'a', 'b' ]);
        expect(moveInList([ 'a', 'b' ], -1, 0)).toEqual([ 'a', 'b' ]);
    });

    it('clamps a target past either end', () => {
        expect(moveInList([ 'a', 'b', 'c' ], 0, 99)).toEqual([ 'b', 'c', 'a' ]);
        expect(moveInList([ 'a', 'b', 'c' ], 2, -4)).toEqual([ 'c', 'a', 'b' ]);
    });
});

describe('idsToAdd', () => {
    it('leaves out songs already in the playlist', () => {
        expect(idsToAdd([ 'a', 'b' ], [ 'b', 'c', 'd' ])).toEqual([ 'c', 'd' ]);
    });

    it('never adds the same song twice in one go', () => {
        expect(idsToAdd([], [ 'x', 'y', 'x' ])).toEqual([ 'x', 'y' ]);
    });

    it('adds nothing when everything is already there', () => {
        expect(idsToAdd([ 'a', 'b' ], [ 'a', 'b' ])).toEqual([]);
    });
});

describe('cleanPlaylistName', () => {
    it('trims and tidies spaces', () => {
        expect(cleanPlaylistName('  Night   Drive \n')).toBe('Night Drive');
    });

    it('is empty when only spaces', () => {
        expect(cleanPlaylistName('   ')).toBe('');
    });

    it('stops at a sensible length', () => {
        expect(cleanPlaylistName('x'.repeat(500))).toHaveLength(120);
    });
});

describe('nextDefaultName', () => {
    it('uses the plain name when free', () => {
        expect(nextDefaultName([ 'Gym' ])).toBe('My playlist');
    });

    it('counts up past names already taken, ignoring case and spaces', () => {
        expect(nextDefaultName([ 'my playlist', 'My playlist 2 ' ])).toBe('My playlist 3');
    });
});

describe('containsAll', () => {
    it('is true only when every song is in the playlist', () => {
        expect(containsAll(new Set([ 'a', 'b' ]), [ 'a', 'b' ])).toBe(true);
        expect(containsAll(new Set([ 'a' ]), [ 'a', 'b' ])).toBe(false);
    });

    it('is false for no songs', () => {
        expect(containsAll(new Set([ 'a' ]), [])).toBe(false);
    });
});

describe('songCountLabel', () => {
    it('says song or songs', () => {
        expect(songCountLabel(0)).toBe('0 songs');
        expect(songCountLabel(1)).toBe('1 song');
        expect(songCountLabel(8)).toBe('8 songs');
    });
});
