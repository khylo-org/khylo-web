import { describe, expect, it } from 'vitest';

import { forgetSavedLogin, isNewInstallAtKnownAddress } from './serverIdentity';

describe('a different server at an address this browser knows', () => {
    // The bug: removing Khylo and installing it again showed "Server Mismatch" in front of the first-time setup
    it('is accepted quietly when it is a new Khylo nobody has set up yet', () => {
        expect(isNewInstallAtKnownAddress({ Id: 'old' }, { Id: 'new', StartupWizardCompleted: false })).toBe(true);
    });

    it('still gets the warning when it is a server that is already set up', () => {
        expect(isNewInstallAtKnownAddress({ Id: 'old' }, { Id: 'new', StartupWizardCompleted: true })).toBe(false);
        expect(isNewInstallAtKnownAddress({ Id: 'old' }, { Id: 'new' })).toBe(false);
        expect(isNewInstallAtKnownAddress({ Id: 'old' }, { Id: 'new', StartupWizardCompleted: null })).toBe(false);
    });

    it('is not a different server when the ID is the same, or when nothing was saved', () => {
        expect(isNewInstallAtKnownAddress({ Id: 'same' }, { Id: 'same', StartupWizardCompleted: false })).toBe(false);
        expect(isNewInstallAtKnownAddress({}, { Id: 'new', StartupWizardCompleted: false })).toBe(false);
    });

    it('drops the old login before anything is sent to the new server', () => {
        const saved = { Id: 'old', AccessToken: 'secret', UserId: 'someone' };

        forgetSavedLogin(saved, { Id: 'new', StartupWizardCompleted: false });

        expect(saved).toEqual({ Id: 'new', AccessToken: null, UserId: null });
    });
});
