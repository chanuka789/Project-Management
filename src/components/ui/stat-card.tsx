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
    if (trend.value > 0) return <TrendingUp className="h-4 w-4 text-[#0a5082]" />;
    if (trend.value < 0) return <TrendingDown className="h-4 w-4 text-black/60" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-[#0a5082]';
    if (trend.value < 0) return 'text-black/60';
    return 'text-gray-400';
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm card-hover',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0a5082]/10 text-[#0a5082]">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-black">{value}</p>
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && (
              <div className={cn('flex items-center gap-1', getTrendColor())}>
                {getTrendIcon()}
                <span className="text-sm font-medium">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
