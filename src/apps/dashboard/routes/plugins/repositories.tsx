import React, { FC, useCallback, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';

import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';
import { useRepositories } from 'apps/dashboard/features/plugins/api/useRepositories';
import { useSetRepositories } from 'apps/dashboard/features/plugins/api/useSetRepositories';
import RepositoryListItem from 'apps/dashboard/features/plugins/components/RepositoryListItem';
import NewRepositoryForm from 'apps/dashboard/features/plugins/components/NewRepositoryForm';
import type { RepositoryInfo } from '@khylo/sdk/lib/generated-client/models/repository-info';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloStatusBadge,
    KhyloSectionPanel,
    KhyloEmptyState
} from '../../components/ui';

export const Component: FC = () => {
    const { data: repositories, isPending, isError } = useRepositories();
    const [isRepositoryFormOpen, setIsRepositoryFormOpen] = useState(false);
    const setRepositories = useSetRepositories();

    const repoList = useMemo(() => repositories || [], [repositories]);

    const onDelete = useCallback((repository: RepositoryInfo) => {
        if (repositories) {
            setRepositories.mutate({
                repositoryInfo: repositories.filter(currentRepo => currentRepo.Url !== repository.Url)
            });
        }
    }, [repositories, setRepositories]);

    const onRepositoryAdd = useCallback((repository: RepositoryInfo) => {
        if (repositories) {
            setRepositories.mutate({
                repositoryInfo: [
                    ...repositories,
                    repository
                ]
            }, {
                onSettled: () => {
                    setIsRepositoryFormOpen(false);
                }
            });
        }
    }, [repositories, setRepositories]);

    if (isPending) return <Loading />;

    return (
        <Page id='repositories' title='Plugin Repositories' className='type-interior mainAnimatedPage'>
            <KhyloPage maxWidth={1000}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Extensions', to: '/dashboard/plugins' },
                        { label: 'Repositories' }
                    ]}
                    title='Extension Repositories'
                    subtitle='External catalog manifest URLs supplying plugin distributions and automated updates.'
                    badge={
                        <KhyloStatusBadge
                            label={`${repoList.length} Repositories Registered`}
                            color={repoList.length > 0 ? 'healthy' : 'idle'}
                        />
                    }
                    actions={
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            onClick={() => setIsRepositoryFormOpen(true)}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                color: KHYLO_COLORS.textPrimary,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Add Repository
                        </Button>
                    }
                />

                {isError && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Failed to load repository manifests.
                    </Alert>
                )}

                {repoList.length === 0 ? (
                    <KhyloEmptyState
                        icon={<StorageIcon />}
                        title='No plugin repositories configured'
                        description='Add an official or community manifest URL to discover and install plugins.'
                        action={
                            <Button
                                variant='contained'
                                startIcon={<AddIcon />}
                                onClick={() => setIsRepositoryFormOpen(true)}
                                sx={{
                                    bgcolor: KHYLO_COLORS.accent,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                }}
                            >
                                Add Repository
                            </Button>
                        }
                    />
                ) : (
                    <KhyloSectionPanel title='Configured Repository Feeds' accent>
                        <List sx={{ p: 0 }}>
                            {repoList.map(repo => (
                                <Box
                                    key={repo.Url}
                                    sx={{
                                        '& .MuiListItem-root': {
                                            py: 1.5,
                                            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                            '&:last-child': { borderBottom: 'none' }
                                        }
                                    }}
                                >
                                    <RepositoryListItem
                                        repository={repo}
                                        onDelete={onDelete}
                                    />
                                </Box>
                            ))}
                        </List>
                    </KhyloSectionPanel>
                )}

                <NewRepositoryForm
                    open={isRepositoryFormOpen}
                    onClose={() => setIsRepositoryFormOpen(false)}
                    onAdd={onRepositoryAdd}
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'RepositoriesPage';
export default Component;
