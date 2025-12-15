'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceChartProps {
  data: {
    name: string;
    planned: number;
    actual: number;
  }[];
  title?: string;
  dataKeyPlanned?: string;
  dataKeyActual?: string;
}

export function PerformanceChart({
  data,
  title,
  dataKeyPlanned = 'planned',
  dataKeyActual = 'actual',
}: PerformanceChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-black mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#737373', fontSize: 12 }}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <YAxis
            tick={{ fill: '#737373', fontSize: 12 }}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#171717', fontWeight: 600 }}
          />
          <Legend />
          <Bar
            dataKey={dataKeyPlanned}
            name="Planned"
            fill="#0a5082"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey={dataKeyActual}
            name="Actual"
            fill="#0a5082"
            fillOpacity={0.5}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
