import React, { type FC } from 'react';
import classNames from 'classnames';
import './AmbientBackdrop.scss';

export interface AmbientBackdropProps {
    imageUrl?: string | null;
    className?: string;
    opacity?: number; // Default 0.07 (7% visual intensity, strictly <= 10% per Spec 8)
    height?: string | number;
}

export const AmbientBackdrop: FC<AmbientBackdropProps> = ({
    imageUrl,
    className,
    opacity = 0.07,
    height = '100%'
}) => {
    if (!imageUrl) {
        return null;
    }

    return (
        <div
            className={classNames('khylo-ambient-field', className)}
            style={{ height }}
            aria-hidden='true'
        >
            <div
                className='khylo-ambient-field__glow'
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    opacity: Math.min(Math.max(opacity, 0.02), 0.1) // Capped at max 10% per spec
                }}
            />
            <div className='khylo-ambient-field__overlay' />
        </div>
    );
};
