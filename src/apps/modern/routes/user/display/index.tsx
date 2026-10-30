import React, { FC, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { useDisplaySettingForm } from 'apps/modern/features/preferences/hooks/useDisplaySettingForm';
import { DATE_LOCALE_OPTIONS, LANGUAGE_OPTIONS } from 'apps/modern/features/preferences/constants/locales';
import { useScreensavers } from 'apps/modern/features/preferences/hooks/useScreensavers';
import { useThemes } from 'hooks/useThemes';
import { LayoutMode } from 'constants/layoutMode';
import { appHost } from 'components/apphost';
import { AppFeature } from 'constants/appFeature';
import LoadingComponent from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import globalize from 'lib/globalize';
import { KhyloButton } from 'components/khylo/ui/KhyloButton';
import './displayPreferences.scss';

export default function UserDisplayPreferences() {
    const {
        loading,
        submitChanges,
        updateField,
        values
    } = useDisplaySettingForm();

    const { screensavers } = useScreensavers();
    const { themes } = useThemes();

    const handleSubmitForm = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void submitChanges();
    }, [submitChanges]);

    if (loading || !values) {
        return <LoadingComponent />;
    }

    return (
        <Page
            className='userPreferencesPage noSecondaryNavPage'
            id='displayPreferencesPage'
            title={globalize.translate('Display')}
        >
            <div className='khylo-display-pref-container'>
                <form onSubmit={handleSubmitForm}>
                    {/* Header */}
                    <div className='khylo-subpage-header'>
                        <Link to='/mypreferencesmenu' className='khylo-settings-back-link'>
                            ← {globalize.translate('Settings')}
                        </Link>
                        <h1 className='khylo-subpage-title'>{globalize.translate('Display')}</h1>
                        <p className='khylo-subpage-subtitle'>
                            Configure language, visual layout, and media presentation.
                        </p>
                    </div>

                    {/* Group 1: Localization & Language */}
                    <div className='khylo-pref-group'>
                        <div className='khylo-pref-group__header'>
                            <h2>{globalize.translate('Localization')}</h2>
                            <p>Choose your preferred display language and regional formatting.</p>
                        </div>
                        <div className='khylo-pref-group__items'>
                            {appHost.supports(AppFeature.DisplayLanguage) && (
                                <div className='khylo-pref-row'>
                                    <div className='khylo-pref-row__info'>
                                        <div className='khylo-pref-row__title'>{globalize.translate('LabelDisplayLanguage')}</div>
                                        <div className='khylo-pref-row__desc'>
                                            {globalize.translate('LabelDisplayLanguageHelp')}
                                        </div>
                                    </div>
                                    <div className='khylo-pref-row__control'>
                                        <select
                                            className='khylo-pref-select'
                                            value={values.language || ''}
                                            onChange={(e) => updateField({ name: 'language', value: e.target.value })}
                                        >
                                            {LANGUAGE_OPTIONS.map(({ value, label }) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('LabelDateTimeLocale')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('DateTimeLocaleHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <select
                                        className='khylo-pref-select'
                                        value={values.dateTimeLocale || ''}
                                        onChange={(e) => updateField({ name: 'dateTimeLocale', value: e.target.value })}
                                    >
                                        {DATE_LOCALE_OPTIONS.map(({ value, label }) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 2: Appearance & Layout */}
                    <div className='khylo-pref-group'>
                        <div className='khylo-pref-group__header'>
                            <h2>Interface & Appearance</h2>
                            <p>Customize the look and feel, layout mode, and screensavers.</p>
                        </div>
                        <div className='khylo-pref-group__items'>
                            {appHost.supports(AppFeature.DisplayMode) && (
                                <div className='khylo-pref-row'>
                                    <div className='khylo-pref-row__info'>
                                        <div className='khylo-pref-row__title'>{globalize.translate('LabelDisplayMode')}</div>
                                        <div className='khylo-pref-row__desc'>{globalize.translate('DisplayModeHelp')}</div>
                                    </div>
                                    <div className='khylo-pref-row__control'>
                                        <select
                                            className='khylo-pref-select'
                                            value={values.layout || LayoutMode.Auto}
                                            onChange={(e) => updateField({ name: 'layout', value: e.target.value })}
                                        >
                                            <option value={LayoutMode.Auto}>{globalize.translate('Auto')}</option>
                                            <option value={LayoutMode.DesktopLegacy}>{globalize.translate('Desktop')}</option>
                                            <option value={LayoutMode.MobileLegacy}>{globalize.translate('Mobile')}</option>
                                            <option value={LayoutMode.Tv}>{globalize.translate('TV')}</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {themes.length > 0 && (
                                <div className='khylo-pref-row'>
                                    <div className='khylo-pref-row__info'>
                                        <div className='khylo-pref-row__title'>{globalize.translate('LabelTheme')}</div>
                                        <div className='khylo-pref-row__desc'>Interface color palette theme.</div>
                                    </div>
                                    <div className='khylo-pref-row__control'>
                                        <select
                                            className='khylo-pref-select'
                                            value={values.theme || ''}
                                            onChange={(e) => updateField({ name: 'theme', value: e.target.value })}
                                        >
                                            {themes.map(({ id, name }) => (
                                                <option key={id} value={id}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {screensavers.length > 0 && appHost.supports(AppFeature.Screensaver) && (
                                <div className='khylo-pref-row'>
                                    <div className='khylo-pref-row__info'>
                                        <div className='khylo-pref-row__title'>{globalize.translate('LabelScreensaver')}</div>
                                        <div className='khylo-pref-row__desc'>{globalize.translate('ScreensaverHelp')}</div>
                                    </div>
                                    <div className='khylo-pref-row__control'>
                                        <select
                                            className='khylo-pref-select'
                                            value={values.screensaver || 'none'}
                                            onChange={(e) => updateField({ name: 'screensaver', value: e.target.value })}
                                        >
                                            {screensavers.map(({ id, name }) => (
                                                <option key={id} value={id}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('DisableCustomCss')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('LabelDisableCustomCss')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.disableCustomCss)}
                                            onChange={(e) => updateField({ name: 'disableCustomCss', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 3: Library Details & Behavior */}
                    <div className='khylo-pref-group'>
                        <div className='khylo-pref-group__header'>
                            <h2>{globalize.translate('HeaderLibraries')}</h2>
                            <p>Control visual presentation and ambient effects inside media libraries.</p>
                        </div>
                        <div className='khylo-pref-group__items'>
                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('LabelLibraryPageSize')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('LabelLibraryPageSizeHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <input
                                        type='number'
                                        className='khylo-pref-number'
                                        min={0}
                                        max={1000}
                                        value={values.libraryPageSize ?? 50}
                                        onChange={(e) => updateField({ name: 'libraryPageSize', value: e.target.value as any })}
                                    />
                                </div>
                            </div>

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('Backdrops')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('EnableBackdropsHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.enableLibraryBackdrops)}
                                            onChange={(e) => updateField({ name: 'enableLibraryBackdrops', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('ThemeSongs')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('EnableThemeSongsHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.enableLibraryThemeSongs)}
                                            onChange={(e) => updateField({ name: 'enableLibraryThemeSongs', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('ThemeVideos')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('EnableThemeVideosHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.enableLibraryThemeVideos)}
                                            onChange={(e) => updateField({ name: 'enableLibraryThemeVideos', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('DisplayMissingEpisodesWithinSeasons')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('DisplayMissingEpisodesHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.displayMissingEpisodes)}
                                            onChange={(e) => updateField({ name: 'displayMissingEpisodes', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 4: Next Up & Episode Flow */}
                    <div className='khylo-pref-group'>
                        <div className='khylo-pref-group__header'>
                            <h2>{globalize.translate('NextUp')}</h2>
                            <p>Configure continue-watching and upcoming episode behavior.</p>
                        </div>
                        <div className='khylo-pref-group__items'>
                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('LabelMaxDaysForNextUp')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('LabelMaxDaysForNextUpHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <input
                                        type='number'
                                        className='khylo-pref-number'
                                        min={0}
                                        max={1000}
                                        value={values.maxDaysForNextUp ?? 100}
                                        onChange={(e) => updateField({ name: 'maxDaysForNextUp', value: e.target.value as any })}
                                    />
                                </div>
                            </div>

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('EnableRewatchingNextUp')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('EnableRewatchingNextUpHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.enableRewatchingInNextUp)}
                                            onChange={(e) => updateField({ name: 'enableRewatchingInNextUp', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>

                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('EnableEpisodeImagesNextUp')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('EnableEpisodeImagesNextUpHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.episodeImagesInNextUp)}
                                            onChange={(e) => updateField({ name: 'episodeImagesInNextUp', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Group 5: Item Detail Presentation */}
                    <div className='khylo-pref-group'>
                        <div className='khylo-pref-group__header'>
                            <h2>{globalize.translate('ItemDetails')}</h2>
                            <p>Configure banner layout and visual treatment on movie and show details.</p>
                        </div>
                        <div className='khylo-pref-group__items'>
                            <div className='khylo-pref-row'>
                                <div className='khylo-pref-row__info'>
                                    <div className='khylo-pref-row__title'>{globalize.translate('EnableDetailsBanner')}</div>
                                    <div className='khylo-pref-row__desc'>{globalize.translate('EnableDetailsBannerHelp')}</div>
                                </div>
                                <div className='khylo-pref-row__control'>
                                    <label className='khylo-pref-switch'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(values.enableItemDetailsBanner)}
                                            onChange={(e) => updateField({ name: 'enableItemDetailsBanner', value: e.target.checked })}
                                        />
                                        <span className='khylo-pref-switch__slider' />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Floating Save Bar */}
                    <div className='khylo-pref-save-bar'>
                        <span style={{ fontSize: '0.85rem', color: '#858079', marginRight: 'auto' }}>
                            Unsaved preferences will take effect immediately upon saving.
                        </span>
                        <KhyloButton
                            variant='primary'
                            size='md'
                            type='submit'
                        >
                            {globalize.translate('Save')}
                        </KhyloButton>
                    </div>
                </form>
            </div>
        </Page>
    );
}
