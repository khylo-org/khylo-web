import React, { FC, ReactNode, HTMLAttributes } from 'react';
import classNames from 'classnames';
import './KhyloGlassCard.scss';

export interface KhyloGlassCardProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
    variant?: 'default' | 'elevated' | 'subtle';
    interactive?: boolean;
    className?: string;
}

export const KhyloGlassCard: FC<KhyloGlassCardProps> = ({
    children,
    variant = 'default',
    interactive = false,
    className,
    ...rest
}) => {
    return (
        <div
            className={classNames(
                'khylo-glass-card',
                `khylo-glass-card--${variant}`,
                { 'khylo-glass-card--interactive': interactive },
                className
            )}
            {...rest}
        >
            {children}
        </div>
    );
};

export default KhyloGlassCard;
