'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface FinanceChartProps {
  data: {
    name: string;
    revenue: number;
    cost: number;
    profit?: number;
  }[];
  title?: string;
}

export function FinanceChart({ data, title }: FinanceChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-black mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0a5082" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0a5082" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#171717" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#171717" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#737373', fontSize: 12 }}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <YAxis
            tick={{ fill: '#737373', fontSize: 12 }}
            axisLine={{ stroke: '#e5e5e5' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#171717', fontWeight: 600 }}
            formatter={(value?: number) => formatCurrency(value ?? 0)}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Contract Value"
            stroke="#0a5082"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
          <Area
            type="monotone"
            dataKey="cost"
            name="Total Cost"
            stroke="#171717"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCost)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
