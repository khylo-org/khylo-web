import React, { type FC } from 'react';
import classNames from 'classnames';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { useApi } from 'hooks/useApi';
import { KhyloMediaCard } from '../media/KhyloMediaCard';
import { getItemImageUrl } from '../media/mediaUtils';
import './KhyloForYouPanel.scss';

export interface KhyloForYouPanelProps {
    title: string;
    reason: string;
    items: BaseItemDto[];
    backdropItem?: BaseItemDto;
    className?: string;
    onItemClick?: (item: BaseItemDto) => void;
}

export const KhyloForYouPanel: FC<KhyloForYouPanelProps> = ({
    title,
    reason,
    items,
    backdropItem,
    className,
    onItemClick
}) => {
    const { api } = useApi();

    if (!items || items.length === 0) {
        return null;
    }

    const leadItem = backdropItem || items[0];
    const backdropUrl = getItemImageUrl(api, leadItem, 'backdrop', 1200);

    return (
        <section className={classNames('khylo-foryou-panel', className)} aria-label={title}>
            {/* Ambient Background Artwork (Spec 41) */}
            {backdropUrl && (
                <div
                    className='khylo-foryou-panel__bg'
                    style={{ backgroundImage: `url(${backdropUrl})` }}
                />
            )}
            <div className='khylo-foryou-panel__overlay' />

            <div className='khylo-foryou-panel__content'>
                {/* Header with Title & Reason (Spec 40 & 41) */}
                <div className='khylo-foryou-panel__header'>
                    <div className='khylo-foryou-panel__badge'>FOR YOU</div>
                    <h2 className='khylo-foryou-panel__title'>{title}</h2>
                    <p className='khylo-foryou-panel__reason'>{reason}</p>
                </div>

                {/* 3-5 Media Items in Wide Context (Spec 41) */}
                <div className='khylo-foryou-panel__items'>
                    {items.slice(0, 5).map(item => (
                        <div key={item.Id} className='khylo-foryou-panel__item-wrapper'>
                            <KhyloMediaCard
                                item={item}
                                variant='poster'
                                onItemClick={onItemClick}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
