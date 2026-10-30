import React, { FC, useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import type { VirtualFolderInfo } from '@khylo/sdk/lib/generated-client/models/virtual-folder-info';
import { getLibraryStructureApi } from '@khylo/sdk/lib/utils/api/library-structure-api';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import LibraryCreator from 'apps/dashboard/features/libraries/components/LibraryCreator';
import { StepButtons } from './khylo';

/**
 * First-run setup: the libraries, made with the same steps as the dashboard's New Library page.
 */
export const Component: FC = () => {
    const navigate = useNavigate();
    const { api } = useApi();
    const [ libraries, setLibraries ] = useState<VirtualFolderInfo[] | null>(null);
    const [ adding, setAdding ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!api) return;
        const result = await getLibraryStructureApi(api).getVirtualFolders();
        setLibraries(result.data);
        if (result.data.length === 0) setAdding(true);
    }, [api]);

    useEffect(() => {
        load().catch(() => setError('Couldn\'t load your libraries.'));
    }, [load]);

    const remove = async (name: string) => {
        if (!api) return;
        try {
            await getLibraryStructureApi(api).removeVirtualFolder({ name, refreshLibrary: false });
            await load();
        } catch {
            setError(`Couldn't remove ${name}.`);
        }
    };

    return (
        <div className='page standalonePage wizardPage' style={{ position: 'relative', zIndex: 1 }}>
            <div className='padded-left padded-right padded-top'>
                <div className='ui-corner-all ui-shadow wizardContent'>
                    <Typography component='h1' sx={{ fontSize: '1.6rem', fontWeight: 700, mb: 1 }}>Set up your media libraries</Typography>
                    <Typography sx={{ opacity: 0.75, lineHeight: 1.6, mb: 3 }}>
                        Point Khylo at the folders with your movies, shows, music, audiobooks and books. New files show up by themselves from then on. You can add more any time in the Dashboard.
                    </Typography>

                    {(libraries ?? []).map(library => (
                        <Stack key={library.Name} direction='row' spacing={1.5} alignItems='center' sx={{ py: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <FolderSpecialIcon sx={{ opacity: 0.7 }} />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600 }}>{library.Name}</Typography>
                                <Typography variant='body2' sx={{ opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {(library.Locations ?? []).join(' · ')}
                                </Typography>
                            </Box>
                            <IconButton size='small' aria-label={`Remove ${library.Name}`} onClick={() => { void remove(library.Name ?? ''); }}>
                                <DeleteOutlineIcon fontSize='small' />
                            </IconButton>
                        </Stack>
                    ))}

                    {adding ? (
                        <Box sx={{ mt: 2, mb: 3 }}>
                            <LibraryCreator
                                onCreated={() => {
                                    setAdding(false);
                                    void load();
                                }}
                                onCancel={() => setAdding(false)}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ mt: 2, mb: 3 }}>
                            <Button variant='outlined' startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add a library</Button>
                        </Box>
                    )}

                    {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}

                    <StepButtons onNext={() => navigate('/wizard/settings')} nextLabel={libraries?.length ? 'Next' : 'Skip for now'} />
                </div>
            </div>
        </div>
    );
};

export default Component;
