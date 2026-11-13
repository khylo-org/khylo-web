import { useEffect, useState } from 'react';

import { dominantColor, rgbTriplet, washColor, type Rgb } from './coverTint';

// Pictures already read, so moving between pages never reads the same cover twice
const cache = new Map<string, Rgb | null>();

/** Reads a small copy of the picture and picks its colour. Null when the picture can't be read (no picture, or not allowed). */
function readColor(url: string): Promise<Rgb | null> {
    return new Promise(resolve => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const size = 32;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (!context) {
                    resolve(null);
                    return;
                }
                context.drawImage(image, 0, 0, size, size);
                resolve(dominantColor(context.getImageData(0, 0, size, size).data));
            } catch {
                // A picture from another site can't be read back: the page keeps its neutral tint
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = url;
    });
}

/**
 * The soft tint for a page, taken from its real cover as "r, g, b" for a stylesheet (rgba(var(--kmx-tint), 0.3)).
 * Until the cover has been read, or with no cover, a calm neutral is used.
 */
export function useCoverTint(url?: string | null): string {
    const [ tint, setTint ] = useState<string>(() => rgbTriplet(washColor(url && cache.has(url) ? cache.get(url)! : null)));

    useEffect(() => {
        if (!url) {
            setTint(rgbTriplet(washColor(null)));
            return undefined;
        }
        if (cache.has(url)) {
            setTint(rgbTriplet(washColor(cache.get(url)!)));
            return undefined;
        }
        let cancelled = false;
        void readColor(url).then(color => {
            cache.set(url, color);
            if (!cancelled) setTint(rgbTriplet(washColor(color)));
        });
        return () => {
            cancelled = true;
        };
    }, [ url ]);

    return tint;
}
