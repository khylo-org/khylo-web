import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNavigate } from 'react-router-dom';

import KhyloServerFileBrowserModal from 'apps/dashboard/components/browser/KhyloServerFileBrowserModal';
import { hasAdmin, setupRequest } from '../setupSession';
import { SignIn, StepButtons } from './khylo';

interface Library {
    Name: string;
    CollectionType?: string | null;
    Locations?: string[] | null;
}

interface Folder {
    id: number;
    path: string;
}

/** What a library holds. The id is what the server calls it; DVDs are movies, with the disc menu from the disc. */
const KINDS = [
    { id: 'movies', label: 'Movies' },
    { id: 'tvshows', label: 'TV shows' },
    { id: 'music', label: 'Music' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'books', label: 'Books' },
    { id: 'comics', label: 'Comics and manga' },
    { id: 'photos', label: 'Photos' },
    { id: 'musicvideos', label: 'Music videos' },
    { id: 'homevideos', label: 'Home videos' },
    { id: 'dvds', label: 'DVDs' },
    { id: 'mixed', label: 'Mixed media' }
];

const kindLabel = (id?: string | null) => KINDS.find(k => k.id === id)?.label ?? id ?? 'Library';
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/**
 * First-run setup: add the libraries. One short form (what it holds, its name, its folders), and the libraries added so
 * far listed above it, with a button to add another.
 */
const Libraries: FC = () => {
    const navigate = useNavigate();
    const nextFolderId = useRef(0);
    const newFolder = useCallback((): Folder => {
        nextFolderId.current += 1;
        return { id: nextFolderId.current, path: '' };
    }, []);

    const [ libraries, setLibraries ] = useState<Library[] | null>(null);
    const [ adding, setAdding ] = useState(false);
    const [ kind, setKind ] = useState('movies');
    const [ name, setName ] = useState('Movies');
    const [ nameEdited, setNameEdited ] = useState(false);
    const [ folders, setFolders ] = useState<Folder[]>(() => [{ id: 0, path: '' }]);
    const [ browsing, setBrowsing ] = useState<number | null>(null);
    const [ more, setMore ] = useState(false);
    const [ monitor, setMonitor ] = useState(true);
    const [ chapters, setChapters ] = useState(true);
    const [ trickplay, setTrickplay ] = useState(false);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const load = useCallback(async () => {
        const list = await setupRequest<Library[]>('GET', '/Library/VirtualFolders');
        setLibraries(list ?? []);
        if (!list?.length) setAdding(true);
    }, []);

    useEffect(() => {
        load().catch(e => {
            setLibraries([]);
            setAdding(true);
            setError(`Couldn't load your libraries. ${errorText(e)}`);
        });
    }, [load]);

    const chooseKind = (id: string) => {
        setKind(id);
        if (!nameEdited) setName(kindLabel(id));
    };

    // The next kind of library that isn't there yet, so "Add another" doesn't start on Movies again
    const reset = () => {
        const used = new Set((libraries ?? []).map(l => l.Name.toLowerCase()));
        const next = KINDS.find(k => !used.has(k.label.toLowerCase())) ?? KINDS[0];
        setKind(next.id);
        setName(next.label);
        setNameEdited(false);
        setFolders([newFolder()]);
        setMore(false);
        setError(null);
    };

    const startAdding = () => {
        reset();
        setAdding(true);
    };

    const cancelAdding = () => {
        reset();
        setAdding(false);
    };

    const create = async () => {
        const paths = folders.map(f => f.path.trim()).filter(Boolean);
        if (!name.trim()) {
            setError('Give the library a name.');
            return;
        }
        if (!paths.length) {
            setError('Choose at least one folder.');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            const collectionType = kind === 'dvds' ? 'movies' : kind;
            const query = new URLSearchParams({ name: name.trim(), collectionType, paths: paths.join(','), refreshLibrary: 'true' });
            await setupRequest('POST', `/Library/VirtualFolders?${query.toString()}`, {
                LibraryOptions: {
                    EnableRealtimeMonitor: monitor,
                    EnableChapterImageExtraction: chapters,
                    EnableTrickplayImageExtraction: trickplay
                }
            });
            await load();
            reset();
            setAdding(false);
        } catch (e) {
            setError(`Couldn't add the library. ${errorText(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (libraryName: string) => {
        try {
            await setupRequest('DELETE', `/Library/VirtualFolders?name=${encodeURIComponent(libraryName)}&refreshLibrary=false`);
            await load();
        } catch (e) {
            setError(`Couldn't remove ${libraryName}. ${errorText(e)}`);
        }
    };

    const setFolderPath = (id: number, path: string) => setFolders(f => f.map(x => (x.id === id ? { ...x, path } : x)));

    return (
        <>
            <Typography component='h1' sx={{ fontSize: '1.6rem', fontWeight: 600, mb: 0.5 }}>Add your media</Typography>
            <Typography sx={{ opacity: 0.7, lineHeight: 1.6, mb: 2.5 }}>
                Point Khylo at the folders with your movies, shows, music and books. New files show up by themselves. You can add more any time in the Dashboard.
            </Typography>

            {(libraries ?? []).map(library => (
                <Stack
                    key={library.Name}
                    direction='row'
                    spacing={1.5}
                    alignItems='center'
                    sx={{ py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                            {library.Name}
                            <Typography component='span' variant='body2' sx={{ opacity: 0.6, ml: 1 }}>{kindLabel(library.CollectionType)}</Typography>
                        </Typography>
                        <Typography variant='body2' sx={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {(library.Locations ?? []).join(' · ')}
                        </Typography>
                    </Box>
                    <IconButton size='small' aria-label={`Remove ${library.Name}`} onClick={() => { void remove(library.Name); }}>
                        <DeleteOutlineIcon fontSize='small' />
                    </IconButton>
                </Stack>
            ))}

            {adding ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField select size='small' label='What is in it?' value={kind} onChange={e => chooseKind(e.target.value)} sx={{ minWidth: 200 }}>
                            {KINDS.map(k => <MenuItem key={k.id} value={k.id}>{k.label}</MenuItem>)}
                        </TextField>
                        <TextField
                            size='small'
                            label='Name'
                            value={name}
                            onChange={e => {
                                setName(e.target.value);
                                setNameEdited(true);
                            }}
                            sx={{ flexGrow: 1 }}
                        />
                    </Stack>

                    {folders.map((folder, position) => (
                        <Stack key={folder.id} direction='row' spacing={1}>
                            <TextField
                                size='small'
                                fullWidth
                                label={position === 0 ? 'Folder' : 'Another folder'}
                                placeholder='D:\Movies or \\nas\Movies'
                                value={folder.path}
                                onChange={e => setFolderPath(folder.id, e.target.value)}
                            />
                            <Button variant='outlined' color='inherit' startIcon={<FolderOpenIcon />} onClick={() => setBrowsing(folder.id)}>Browse</Button>
                            {folders.length > 1 && (
                                <IconButton aria-label='Remove this folder' onClick={() => setFolders(f => f.filter(x => x.id !== folder.id))}>
                                    <DeleteOutlineIcon fontSize='small' />
                                </IconButton>
                            )}
                        </Stack>
                    ))}
                    <Box>
                        <Button size='small' color='inherit' startIcon={<AddIcon />} onClick={() => setFolders(f => [ ...f, newFolder() ])}>Add another folder</Button>
                        <Button size='small' color='inherit' onClick={() => setMore(m => !m)} sx={{ ml: 1 }}>{more ? 'Fewer options' : 'More options'}</Button>
                    </Box>

                    <Collapse in={more}>
                        <Stack sx={{ pl: 0.5 }}>
                            <FormControlLabel control={<Switch checked={monitor} onChange={e => setMonitor(e.target.checked)} />} label='Watch the folders for new files' />
                            <FormControlLabel control={<Switch checked={chapters} onChange={e => setChapters(e.target.checked)} />} label='Make chapter pictures' />
                            <FormControlLabel control={<Switch checked={trickplay} onChange={e => setTrickplay(e.target.checked)} />} label='Make seek-bar previews (uses more of the computer)' />
                        </Stack>
                    </Collapse>

                    <Stack direction='row' spacing={1.5}>
                        <Button variant='contained' disabled={busy} onClick={() => { void create(); }}>{busy ? 'Adding…' : 'Add library'}</Button>
                        {!!libraries?.length && <Button color='inherit' disabled={busy} onClick={cancelAdding}>Cancel</Button>}
                    </Stack>
                </Stack>
            ) : (
                <Box sx={{ mt: 2 }}>
                    <Button variant='outlined' color='inherit' startIcon={<AddIcon />} onClick={startAdding}>Add another library</Button>
                </Box>
            )}

            {error && <Alert severity='error' sx={{ mt: 2 }}>{error}</Alert>}

            <StepButtons onNext={() => navigate('/wizard/settings')} nextLabel={libraries?.length ? 'Next' : 'Skip for now'} disabled={busy} />

            <KhyloServerFileBrowserModal
                open={browsing !== null}
                initialPath={folders.find(f => f.id === browsing)?.path ?? ''}
                onClose={() => setBrowsing(null)}
                onSelect={path => {
                    if (browsing !== null) setFolderPath(browsing, path);
                    setBrowsing(null);
                }}
            />
        </>
    );
};

export const Component: FC = () => {
    const [ signedIn, setSignedIn ] = useState(hasAdmin());

    return (
        <div className='page standalonePage wizardPage' style={{ position: 'relative', zIndex: 1 }}>
            <div className='padded-left padded-right padded-top'>
                <div className='ui-corner-all ui-shadow wizardContent'>
                    {signedIn ? <Libraries /> : <SignIn onSignedIn={() => setSignedIn(true)} />}
                </div>
            </div>
        </div>
    );
};

export default Component;
