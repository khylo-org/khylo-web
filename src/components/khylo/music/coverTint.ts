/**
 * Picks a calm tint from a cover's real colours, for the soft wash at the top of album, artist and playlist pages.
 * Pure maths on pixel data, so it can be tested without a browser.
 */

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

/** The colour a page falls back to when there is no cover to read (a warm neutral, close to Khylo's palette). */
export const FALLBACK_TINT: Rgb = { r: 74, g: 62, b: 56 };

interface Hsl {
    h: number;
    s: number;
    l: number;
}

function toHsl({ r, g, b }: Rgb): Hsl {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    return { h: h / 6, s, l };
}

function fromHsl({ h, s, l }: Hsl): Rgb {
    if (s === 0) {
        const v = Math.round(l * 255);
        return { r: v, g: v, b: v };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const channel = (t: number) => {
        let x = t;
        if (x < 0) x += 1;
        if (x > 1) x -= 1;
        if (x < 1 / 6) return p + (q - p) * 6 * x;
        if (x < 1 / 2) return q;
        if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
        return p;
    };
    return {
        r: Math.round(channel(h + 1 / 3) * 255),
        g: Math.round(channel(h) * 255),
        b: Math.round(channel(h - 1 / 3) * 255)
    };
}

/**
 * The colour that stands out most in the picture: pixels are weighted by how colourful and how mid-light they are,
 * so a black border or a white sleeve does not decide the result. A grey cover gives a grey. Null for no usable pixels.
 * `data` is RGBA, as from a canvas.
 */
export function dominantColor(data: ArrayLike<number>): Rgb | null {
    let wr = 0;
    let wg = 0;
    let wb = 0;
    let weightSum = 0;
    let gr = 0;
    let gg = 0;
    let gb = 0;
    let greySum = 0;

    for (let i = 0; i + 3 < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
        const { s, l } = toHsl(pixel);
        if (l < 0.06 || l > 0.96) continue;

        // For the grey fallback: every usable pixel counts once
        gr += pixel.r;
        gg += pixel.g;
        gb += pixel.b;
        greySum++;

        const weight = s * s * (1 - Math.abs(l - 0.5) * 1.6);
        if (weight > 0) {
            wr += pixel.r * weight;
            wg += pixel.g * weight;
            wb += pixel.b * weight;
            weightSum += weight;
        }
    }

    if (weightSum > 0.5) {
        return { r: Math.round(wr / weightSum), g: Math.round(wg / weightSum), b: Math.round(wb / weightSum) };
    }
    if (greySum > 0) {
        return { r: Math.round(gr / greySum), g: Math.round(gg / greySum), b: Math.round(gb / greySum) };
    }
    return null;
}

/**
 * Turns the picked colour into one that is safe behind white text on a near-black page: not too bright, not too
 * saturated, never neon. Null gives the neutral fallback.
 */
export function washColor(color: Rgb | null): Rgb {
    if (!color) return FALLBACK_TINT;
    const { h, s, l } = toHsl(color);
    return fromHsl({ h, s: Math.min(s, 0.5), l: Math.min(Math.max(l, 0.2), 0.36) });
}

/** "74, 62, 56": the form a CSS custom property holds so a stylesheet can write rgba(var(--tint), 0.3). */
export function rgbTriplet(color: Rgb): string {
    return `${color.r}, ${color.g}, ${color.b}`;
}
