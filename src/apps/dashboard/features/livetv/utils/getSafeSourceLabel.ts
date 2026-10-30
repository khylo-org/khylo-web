/**
 * A label for a tuner or guide address that is safe to show on screen. IPTV links usually carry
 * the account's username and password (in the path or query), so web addresses are reduced to
 * their site; files on the server are shown as-is.
 */
const getSafeSourceLabel = (source?: string | null): string => {
    if (!source) return '';
    try {
        const url = new URL(source);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return `${url.host}${url.pathname.length > 1 || url.search ? '/…' : ''}`;
        }
    } catch {
        // Not a web address: a file path or an IP address
    }
    return source;
};

export default getSafeSourceLabel;
