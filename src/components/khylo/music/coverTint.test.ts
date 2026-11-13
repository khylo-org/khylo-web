import { describe, expect, it } from 'vitest';

import { FALLBACK_TINT, dominantColor, rgbTriplet, washColor, type Rgb } from './coverTint';

/** RGBA pixel data for a list of colours. */
const pixels = (colors: Array<[number, number, number, number?]>): number[] => colors.flatMap(([r, g, b, a]) => [ r, g, b, a ?? 255 ]);
const repeat = (color: [number, number, number], n: number): Array<[number, number, number]> => Array.from({ length: n }, () => color);

const hue = (c: Rgb) => {
    const max = Math.max(c.r, c.g, c.b);
    return { red: c.r === max, green: c.g === max, blue: c.b === max };
};

describe('dominantColor', () => {
    it('finds the colourful part of a cover with a black border', () => {
        const data = pixels([ ...repeat([0, 0, 0], 60), ...repeat([200, 40, 40], 40) ]);
        const color = dominantColor(data)!;
        expect(hue(color).red).toBe(true);
        expect(color.r).toBeGreaterThan(150);
    });

    it('is not decided by a white sleeve', () => {
        const data = pixels([ ...repeat([250, 250, 250], 70), ...repeat([30, 90, 200], 30) ]);
        const color = dominantColor(data)!;
        expect(hue(color).blue).toBe(true);
    });

    it('prefers the stronger colour', () => {
        const data = pixels([ ...repeat([40, 160, 60], 20), ...repeat([100, 100, 90], 80) ]);
        const color = dominantColor(data)!;
        expect(hue(color).green).toBe(true);
    });

    it('gives a grey for a grey cover', () => {
        const color = dominantColor(pixels(repeat([120, 120, 120], 50)))!;
        expect(color.r).toBe(120);
        expect(color.g).toBe(120);
        expect(color.b).toBe(120);
    });

    it('ignores see-through pixels', () => {
        const data = pixels([ [ 255, 0, 0, 10 ], [ 255, 0, 0, 10 ], [ 20, 200, 20 ], [ 20, 200, 20 ], [ 20, 200, 20 ] ]);
        expect(hue(dominantColor(data)!).green).toBe(true);
    });

    it('is null when there is nothing usable', () => {
        expect(dominantColor([])).toBeNull();
        expect(dominantColor(pixels(repeat([0, 0, 0], 20)))).toBeNull();
        expect(dominantColor(pixels(repeat([255, 255, 255], 20)))).toBeNull();
    });
});

describe('washColor', () => {
    it('falls back to the neutral tint with nothing to go on', () => {
        expect(washColor(null)).toEqual(FALLBACK_TINT);
    });

    it('darkens a bright colour so white text stays readable', () => {
        const wash = washColor({ r: 255, g: 240, b: 80 });
        expect(Math.max(wash.r, wash.g, wash.b)).toBeLessThan(150);
    });

    it('calms a neon colour', () => {
        const wash = washColor({ r: 0, g: 255, b: 120 });
        const spread = Math.max(wash.r, wash.g, wash.b) - Math.min(wash.r, wash.g, wash.b);
        expect(spread).toBeLessThan(110);
    });

    it('keeps the hue', () => {
        const wash = washColor({ r: 60, g: 90, b: 230 });
        expect(hue(wash).blue).toBe(true);
    });

    it('lifts a near-black colour a little rather than leaving the wash invisible', () => {
        const wash = washColor({ r: 10, g: 10, b: 30 });
        expect(Math.max(wash.r, wash.g, wash.b)).toBeGreaterThan(40);
    });
});

describe('rgbTriplet', () => {
    it('writes the form a stylesheet can use', () => {
        expect(rgbTriplet({ r: 74, g: 62, b: 56 })).toBe('74, 62, 56');
    });
});
