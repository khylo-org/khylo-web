import React, { type FC, type CSSProperties } from 'react';
import classNames from 'classnames';
import './KhyloSkeleton.scss';

export interface KhyloSkeletonProps {
    variant?: 'text' | 'rectangular' | 'card' | 'circular';
    aspectRatio?: '16:9' | '2:3' | '1:1' | 'wide';
    width?: string | number;
    height?: string | number;
    className?: string;
    style?: CSSProperties;
}

export const KhyloSkeleton: FC<KhyloSkeletonProps> = ({
    variant = 'rectangular',
    aspectRatio,
    width,
    height,
    className,
    style
}) => {
    return (
        <div
            className={classNames(
                'khylo-skeleton',
                `khylo-skeleton--${variant}`,
                {
                    [`khylo-skeleton--ratio-${aspectRatio?.replace(':', '-')}`]: Boolean(aspectRatio)
                },
                className
            )}
            style={{
                width,
                height,
                ...style
            }}
            aria-hidden='true'
        />
    );
};
