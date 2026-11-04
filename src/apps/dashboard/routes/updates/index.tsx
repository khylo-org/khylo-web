import React, { FC } from 'react';

import Page from 'components/Page';

import { KhyloUpdatesPanel } from '../../components/KhyloUpdatesPanel';
import { KhyloPage, KhyloPageHeader } from '../../components/ui';

export const Component: FC = () => (
    <Page id='dashboardUpdatesPage' title='Updates' className='type-interior mainAnimatedPage'>
        <KhyloPage maxWidth={1080}>
            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'System' },
                    { label: 'Updates' }
                ]}
                title='Updates'
                subtitle='See when a newer version of Khylo is out, choose which releases to follow, and install them.'
            />
            <KhyloUpdatesPanel />
        </KhyloPage>
    </Page>
);

Component.displayName = 'UpdatesPage';
