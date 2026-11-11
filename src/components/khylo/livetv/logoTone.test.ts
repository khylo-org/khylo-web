import { describe, expect, it } from 'vitest';

import { classifyLogo } from './logoTone';

type Pixel = [ number, number, number, number ];
const SEE_THROUGH: Pixel = [ 0, 0, 0, 0 ];
const WHITE: Pixel = [ 255, 255, 255, 255 ];
const BLACK: Pixel = [ 0, 0, 0, 255 ];
const RED: Pixel = [ 200, 30, 40, 255 ];
const NAVY: Pixel = [ 10, 20, 70, 255 ];

// A logo as it comes from a channel: some pixels of the logo on a see-through background
const logo = (ink: Pixel, inkPixels: number, otherInk?: Pixel, otherPixels = 0) => {
    const total = 1024;
    const data: number[] = [];
    for (let i = 0; i < total; i++) {
        let pixel = SEE_THROUGH;
        if (i < inkPixels) pixel = ink;
        else if (i < inkPixels + otherPixels) pixel = otherInk ?? ink;
        data.push(...pixel);
    }
    return data;
};

const solid = (pixel: Pixel) => Array.from({ length: 1024 }, () => pixel).flat();

describe('choosing the tile a channel logo sits on', () => {
    it('puts a white logo on a dark tile, where it can be seen', () => {
        expect(classifyLogo(logo(WHITE, 300))).toBe('dark');
    });

    it('keeps a dark logo on the light tile', () => {
        expect(classifyLogo(logo(BLACK, 300))).toBe('light');
        expect(classifyLogo(logo(NAVY, 300))).toBe('light');
    });

    it('keeps a colourful logo on the light tile', () => {
        expect(classifyLogo(logo(RED, 300))).toBe('light');
    });

    it('keeps a coloured badge with a little white lettering on the light tile', () => {
        expect(classifyLogo(logo(RED, 250, WHITE, 80))).toBe('light');
    });

    it('puts a mostly white logo with a small coloured part on a dark tile', () => {
        expect(classifyLogo(logo(WHITE, 280, RED, 60))).toBe('dark');
    });

    it('leaves a logo picture that has its own white background on the light tile', () => {
        expect(classifyLogo(solid(WHITE))).toBe('light');
    });

    it('puts a logo picture with its own black background on a dark tile so it blends in', () => {
        expect(classifyLogo(solid(BLACK))).toBe('dark');
    });

    it('keeps the light tile when there is nothing to look at', () => {
        expect(classifyLogo([])).toBe('light');
        expect(classifyLogo(solid(SEE_THROUGH))).toBe('light');
    });

    it('ignores the faint see-through edge of a logo', () => {
        const faint: Pixel = [ 255, 255, 255, 60 ];

        expect(classifyLogo(logo(faint, 200, WHITE, 100))).toBe('dark');
    });
});
