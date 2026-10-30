import type { UserItemDataDto } from '@khylo/sdk/lib/generated-client/models/user-item-data-dto';

export interface ProgressOptions {
    containerClass: string,
    type?: string | null,
    userData?: UserItemDataDto,
    mediaType?: string
}
