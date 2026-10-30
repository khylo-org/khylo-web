import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import type { BaseItemDtoQueryResult } from '@khylo/sdk/lib/generated-client/models/base-item-dto-query-result';

export interface SectionOptions {
    enableOverflow: boolean
}

export type SectionContainerElement = {
    fetchData: () => Promise<BaseItemDtoQueryResult | BaseItemDto[]>
    getItemsHtml: (items: BaseItemDto[]) => void
    parentContainer: HTMLElement
} & Element;
