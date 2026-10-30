import { createContext, useContext } from 'react';

/**
 * Lets the music view ask the shell to swap its app rail for the music sidebar.
 * The shell owns the state; the view calls the setter on mount and clears it on unmount.
 */
export const KhyloMusicModeContext = createContext<(enabled: boolean) => void>(() => undefined);

export const useSetKhyloMusicMode = () => useContext(KhyloMusicModeContext);
