import React, { FC, HTMLAttributes } from 'react';
import classNames from 'classnames';
import './KhyloProgressBar.scss';

export interface KhyloProgressBarProps extends HTMLAttributes<HTMLDivElement> {
    progress: number; // 0 to 100
    size?: 'thin' | 'default' | 'thick';
    color?: 'orange' | 'green';
    className?: string;
}

export const KhyloProgressBar: FC<KhyloProgressBarProps> = ({
    progress,
    size = 'default',
    color = 'orange',
    className,
    ...rest
}) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div
            className={classNames(
                'khylo-progress-bar',
                `khylo-progress-bar--${size}`,
                `khylo-progress-bar--${color}`,
                className
            )}
            role='progressbar'
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            {...rest}
        >
            <div
                className='khylo-progress-bar__fill'
                style={{ width: `${clampedProgress}%` }}
            />
        </div>
    );
};

export default KhyloProgressBar;
