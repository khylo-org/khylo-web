// NOTE: This should be included in the OpenAPI spec ideally
// https://github.com/khylo-org/khylo
export enum HomeSectionType {
    None = 'none',
    SmallLibraryTiles = 'smalllibrarytiles',
    LibraryButtons = 'librarybuttons',
    ActiveRecordings = 'activerecordings',
    Resume = 'resume',
    ResumeAudio = 'resumeaudio',
    LatestMedia = 'latestmedia',
    NextUp = 'nextup',
    LiveTv = 'livetv',
    ResumeBook = 'resumebook'
}

// NOTE: This needs to match the server defaults
// https://github.com/khylo-org/khylo
export const DEFAULT_SECTIONS: HomeSectionType[] = [
    HomeSectionType.SmallLibraryTiles,
    HomeSectionType.Resume,
    HomeSectionType.ResumeAudio,
    HomeSectionType.ResumeBook,
    HomeSectionType.LiveTv,
    HomeSectionType.NextUp,
    HomeSectionType.LatestMedia,
    HomeSectionType.None,
    HomeSectionType.None,
    HomeSectionType.None
];
