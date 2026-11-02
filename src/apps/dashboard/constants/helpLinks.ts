// Khylo's guides, on its GitHub page. Pages without a guide of their own go to the contents page.
const DOCS = 'https://github.com/khylo-org/khylo/blob/main/Install';

export const HelpLinks = [
    {
        paths: ['/dashboard/devices'],
        url: `${DOCS}/first-setup.md`
    }, {
        paths: ['/dashboard/libraries'],
        url: `${DOCS}/first-setup.md`
    }, {
        paths: [
            '/dashboard/livetv',
            '/dashboard/livetv/tuner',
            '/dashboard/recordings'
        ],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/livetv/guide'],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/networking'],
        url: `${DOCS}/remote-access.md`
    }, {
        paths: ['/dashboard/playback/transcoding'],
        url: `${DOCS}/hardware-transcoding.md`
    }, {
        paths: ['/dashboard/plugins'],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/plugins/repositories'],
        url: `${DOCS}/README.md`
    }, {
        paths: [
            '/dashboard/branding',
            '/dashboard/settings'
        ],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/tasks'],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/users'],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/users/:userId/:tab'],
        url: `${DOCS}/README.md`
    }, {
        paths: ['/dashboard/backups'],
        url: `${DOCS}/backup-restore-update.md`
    }
];
