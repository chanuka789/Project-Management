import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, showLabel = false, size = 'md', variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    };

    const variants = {
      default: 'bg-[#0a5082]',
      success: 'bg-[#0a5082]',
      warning: 'bg-black/70',
    };

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={cn(
            'w-full overflow-hidden rounded-full bg-gray-200',
            sizes[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variants[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <p className="mt-1 text-right text-sm font-medium text-gray-600">
            {percentage.toFixed(0)}%
          </p>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
