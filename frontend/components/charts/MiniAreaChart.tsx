'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import ClientChart from '@/components/charts/ClientChart';

interface MiniAreaChartProps {
  data: Array<{ period: string; value: number }>;
  color?: string;
}

export default function MiniAreaChart({ data, color = '#4F8CFF' }: MiniAreaChartProps) {
  return (
    <ClientChart className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`mini-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.38} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={2}
            fill={`url(#mini-${color.replace('#', '')})`}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </ClientChart>
  );
}
