import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import LibraryCreator from '../../features/libraries/components/LibraryCreator';
import { KhyloPage, KhyloPageHeader } from '../../components/ui';

export const Component: FC = () => {
    const navigate = useNavigate();

    return (
        <KhyloPage>
            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Media' },
                    { label: 'Media Libraries', to: '/dashboard/libraries' },
                    { label: 'New Library' }
                ]}
                title='Create Media Library'
                subtitle='Staged configuration workflow for provisioning new media domains and storage mounts.'
            />
            <LibraryCreator onCreated={() => navigate('/dashboard/libraries')} onCancel={() => navigate('/dashboard/libraries')} />
        </KhyloPage>
    );
};

export default Component;
