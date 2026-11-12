import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [ path ] : [];
});

const dashboard = join(__dirname, '..', '..', '..');

// The library list is kept in the cache under one name. A page that tells the cache to refresh a differently spelled name
// refreshes nothing, and the change it just made doesn't show until the page is reloaded. This happened with the switches on
// the library pages, and with rename, add folder and remove.
describe('the cache name of the library list', () => {
    const key = /export const QUERY_KEY = '([^']+)'/.exec(readFileSync(join(__dirname, 'useVirtualFolders.ts'), 'utf8'))?.[1];

    it('is found in the hook that keeps the list', () => {
        expect(key).toBe('VirtualFolders');
    });

    it('is the one every page refreshes: none spells it out differently', () => {
        const wrong = walk(dashboard).filter(file => {
            const text = readFileSync(file, 'utf8');
            return [ ...text.matchAll(/queryKey:\s*\[\s*['"]virtualfolders['"]/gi) ].some(match => !match[0].includes(`'${key}'`));
        });

        expect(wrong).toEqual([]);
    });
});
