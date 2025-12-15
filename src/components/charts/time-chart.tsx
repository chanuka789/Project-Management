'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TimeChartProps {
  data: {
    date: string;
    hours: number;
    target?: number;
  }[];
  title?: string;
}

export function TimeChart({ data, title }: TimeChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-black mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#737373', fontSize: 12 }}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <YAxis
            tick={{ fill: '#737373', fontSize: 12 }}
            axisLine={{ stroke: '#e5e5e5' }}
            label={{
              value: 'Hours',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#737373' },
            }}
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
          <Line
            type="monotone"
            dataKey="hours"
            name="Hours Worked"
            stroke="#0a5082"
            strokeWidth={2}
            dot={{ fill: '#0a5082', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#0a5082' }}
          />
          {data[0]?.target !== undefined && (
            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke="#171717"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
