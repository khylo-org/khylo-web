import { RecordingStatus } from '@khylo/sdk/lib/generated-client/models/recording-status';
import { SeriesStatus } from '@khylo/sdk/lib/generated-client/models/series-status';

export const ItemStatus = {
    ...RecordingStatus,
    ...SeriesStatus
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ItemStatus = typeof ItemStatus[keyof typeof ItemStatus] | null | undefined;
