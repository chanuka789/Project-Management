import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend.value < 0) return <TrendingDown className="h-4 w-4 text-error" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm card-hover',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
        {(description || trend) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {trend && (
              <div className={cn('flex items-center gap-1', getTrendColor())}>
                {getTrendIcon()}
                <span className="text-sm font-medium">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
