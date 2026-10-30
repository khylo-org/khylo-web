import React, { FC, ReactNode, HTMLAttributes } from 'react';
import classNames from 'classnames';
import './KhyloBadge.scss';

export interface KhyloBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children?: ReactNode;
    color?: 'default' | 'orange' | 'green' | 'blue' | 'gold';
    pill?: boolean;
    filled?: boolean;
    className?: string;
}

export const KhyloBadge: FC<KhyloBadgeProps> = ({
    children,
    color = 'default',
    pill = false,
    filled = false,
    className,
    ...rest
}) => {
    return (
        <span
            className={classNames(
                'khylo-badge',
                `khylo-badge--${color}`,
                {
                    'khylo-badge--pill': pill,
                    'khylo-badge--filled': filled
                },
                className
            )}
            {...rest}
        >
            {children}
        </span>
    );
};

export default KhyloBadge;
