/** What this browser saved about a server it has used. */
interface SavedServer {
    Id?: string | null;
    AccessToken?: string | null;
    UserId?: string | null;
}

/** What a server says about itself to anyone who asks. */
interface PublicInfo {
    Id?: string | null;
    StartupWizardCompleted?: boolean | null;
}

/**
 * A different server answers at an address this browser knows. Normally that is worth a warning (it could be someone else's
 * server). But a server that nobody has set up yet is what you get after removing Khylo and installing it again: there is
 * nothing to warn about, and the warning only stood in the way of the first-time setup.
 */
export const isNewInstallAtKnownAddress = (saved: SavedServer, info: PublicInfo) => (
    Boolean(saved.Id) && Boolean(info.Id) && info.Id !== saved.Id && info.StartupWizardCompleted === false
);

/**
 * Makes the saved entry the new server's, and drops the login kept for the old one first, so nothing of it is ever sent
 * to the new server (the same as choosing "Connect Anyway").
 */
export const forgetSavedLogin = (saved: SavedServer, info: PublicInfo) => {
    saved.AccessToken = null;
    saved.UserId = null;
    saved.Id = info.Id;
};
