import { ServerConnections } from 'lib/khylo-apiclient';

/**
 * First-run setup signs in as the admin it just created, so the Khylo steps after the basics (profiles,
 * importing history, Live TV, signing in devices) can set things up for real. Kept in memory only, for
 * this setup session.
 */
let credentials: { username: string; password: string } | null = null;
let token: string | null = null;

const CLIENT = 'MediaBrowser Client="Khylo Setup", Device="Web", DeviceId="khylo-setup", Version="1.0"';

/** Remembers the admin account typed on the "Tell us about yourself" step. */
export function rememberAdmin(username: string, password: string) {
    credentials = { username, password };
    token = null;
}

/** Whether setup knows the admin's sign-in (false after a page reload). */
export const hasAdmin = () => credentials !== null || token !== null;

export const serverBase = () => (ServerConnections.currentApiClient()?.serverAddress() ?? '').replace(/\/$/, '');

async function signIn(): Promise<string> {
    if (token) return token;
    if (!credentials) throw new Error('Sign in first.');

    const response = await fetch(`${serverBase()}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: CLIENT },
        body: JSON.stringify({ Username: credentials.username, Pw: credentials.password })
    });
    if (!response.ok) throw new Error('Couldn\'t sign in with that username and password.');
    const result = await response.json() as { AccessToken: string };
    token = result.AccessToken;
    return token;
}

/** Signs in with a username and password typed on a setup step (after a reload). */
export async function signInWith(username: string, password: string) {
    rememberAdmin(username, password);
    await signIn();
}

/** Calls the server as the admin; resolves to the parsed JSON (or null for empty answers). */
export async function setupRequest<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const accessToken = await signIn();
    const response = await fetch(`${serverBase()}${path}`, {
        method,
        headers: {
            Authorization: `${CLIENT}, Token="${accessToken}"`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text && text.length < 300 ? text.replace(/^"|"$/g, '') : `The server answered ${response.status}.`);
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
}

/** Uploads a file as the admin (a program guide from this computer); resolves to the parsed JSON answer. */
export async function setupUpload<T = unknown>(path: string, file: File): Promise<T> {
    const accessToken = await signIn();
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${serverBase()}${path}`, {
        method: 'POST',
        headers: { Authorization: `${CLIENT}, Token="${accessToken}"` },
        body
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text && text.length < 300 ? text.replace(/^"|"$/g, '') : `The server answered ${response.status}.`);
    }
    return await response.json() as T;
}
