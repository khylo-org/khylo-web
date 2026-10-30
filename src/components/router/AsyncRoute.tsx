import React, { type ComponentType, useLayoutEffect } from 'react';
import type { RouteObject } from 'react-router-dom';

import viewManager from 'components/viewManager/viewManager';
import { AppType } from 'constants/appType';

export interface AsyncRoute {
    /** The URL path for this route. */
    path: string
    /**
     * The relative path to the page component in the routes directory.
     * Will fallback to using the `path` value if not specified.
     */
    page?: string
    /** The app that this page is part of. */
    type?: AppType
}

const importRoute = (page: string, type: AppType) => {
    switch (type) {
        case AppType.Dashboard:
            return import(/* webpackChunkName: "[request]" */ `../../apps/dashboard/routes/${page}`);
        case AppType.Modern:
            return import(/* webpackChunkName: "[request]" */ `../../apps/modern/routes/${page}`);
        case AppType.Legacy:
            return import(/* webpackChunkName: "[request]" */ `../../apps/legacy/routes/${page}`);
    }
};

/**
 * Wraps a React page so that any active legacy (ViewManager) view, such as the video player, is hidden
 * when the page is shown. The stock `Page` component does this itself, but pages that don't use it
 * (e.g. the Khylo home, library, details and music views) would otherwise leave the previous legacy
 * view, including the video player's control bar, visible on top of them.
 */
export const withLegacyViewHidden = (PageComponent: ComponentType) => {
    const PageWithLegacyViewHidden = () => {
        // Before the first paint, so the previous screen never shows over this one
        useLayoutEffect(() => {
            viewManager.hideView();
        }, []);

        return <PageComponent />;
    };
    PageWithLegacyViewHidden.displayName = `WithLegacyViewHidden(${PageComponent.displayName || PageComponent.name || 'Page'})`;
    return PageWithLegacyViewHidden;
};

export const toAsyncPageRoute = ({
    path,
    page,
    type = AppType.Legacy
}: AsyncRoute): RouteObject => {
    return {
        path,
        lazy: async () => {
            const {
                // If there is a default export, use it as the Component for compatibility
                default: DefaultComponent,
                Component: NamedComponent,
                ...route
            } = await importRoute(page ?? path, type);

            const Component = DefaultComponent ?? NamedComponent;

            return {
                ...route,
                Component: Component ? withLegacyViewHidden(Component) : undefined
            };
        }
    };
};
