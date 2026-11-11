/**
 * Channel logos sit on a small tile. Most are dark or colourful and read well on a light tile, but many IPTV logos are
 * white (made for a dark screen) and vanish on one. This picks the tile from the logo's own pixels.
 */
export type LogoTone = 'light' | 'dark';

// Pixels counted as "light" are nearly white; a logo that is mostly those needs a dark tile
const LIGHT_LUMINANCE = 0.85;
const MOSTLY_LIGHT = 0.6;
// A logo with (almost) no see-through pixels is a picture with its own background
const SOLID_IMAGE = 0.05;
const DARK_BACKGROUND = 0.3;

/** The tile a logo needs, from its RGBA pixels (four numbers per pixel). */
export function classifyLogo(rgba: ArrayLike<number>): LogoTone {
    const pixels = Math.floor(rgba.length / 4);
    if (pixels === 0) return 'light';

    let seeThrough = 0;
    let visible = 0;
    let light = 0;
    let luminanceSum = 0;
    for (let i = 0; i < pixels * 4; i += 4) {
        const luminance = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
        luminanceSum += luminance;
        const alpha = rgba[i + 3];
        if (alpha < 16) {
            seeThrough++;
        } else if (alpha >= 128) {
            visible++;
            if (luminance >= LIGHT_LUMINANCE) light++;
        }
    }

    // Its own solid background decides: a dark one looks right on a dark tile, anything else keeps the light tile
    if (seeThrough / pixels < SOLID_IMAGE) return luminanceSum / pixels < DARK_BACKGROUND ? 'dark' : 'light';
    if (visible === 0) return 'light';
    return light / visible >= MOSTLY_LIGHT ? 'dark' : 'light';
}

const SAMPLE_SIZE = 32;
const tones = new Map<string, LogoTone>();

/**
 * The tile for a loaded logo image. Looks at a small copy of it, once per picture. If the browser won't let the page read
 * the picture (one from another website) the light tile is kept, which is how every logo looked before.
 */
export function logoToneFor(image: HTMLImageElement): LogoTone {
    const key = image.currentSrc || image.src;
    const known = tones.get(key);
    if (known) return known;

    let tone: LogoTone = 'light';
    try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
            context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
            tone = classifyLogo(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
        }
    } catch {
        tone = 'light';
    }
    tones.set(key, tone);
    return tone;
}
