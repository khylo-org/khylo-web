import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import classNames from 'classnames';
import './KhyloButton.scss';

export type KhyloButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'destructive';
export type KhyloButtonSize = 'sm' | 'md' | 'lg';

export interface KhyloButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: KhyloButtonVariant;
    size?: KhyloButtonSize;
    icon?: ReactNode;
    children?: ReactNode;
    fullWidth?: boolean;
    active?: boolean;
}

export const KhyloButton = forwardRef<HTMLButtonElement, KhyloButtonProps>(({
    variant = 'secondary',
    size = 'md',
    icon,
    children,
    className,
    fullWidth = false,
    active = false,
    disabled = false,
    type = 'button',
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled}
            className={classNames(
                'khylo-btn',
                `khylo-btn--${variant}`,
                `khylo-btn--${size}`,
                {
                    'khylo-btn--full-width': fullWidth,
                    'khylo-btn--active': active,
                    'khylo-btn--icon-only': Boolean(icon && !children)
                },
                className
            )}
            {...props}
        >
            {icon && <span className='khylo-btn__icon'>{icon}</span>}
            {children && <span className='khylo-btn__label'>{children}</span>}
        </button>
    );
});

KhyloButton.displayName = 'KhyloButton';
