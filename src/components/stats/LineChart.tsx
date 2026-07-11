'use client';

import React, { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useI18n } from '@/lib/i18n';
import { getChartData } from '@/lib/expenses';
import type { Transaction } from '@/types';
import { TrendingUp } from 'lucide-react';

interface NetLineChartProps {
  transactions: Transaction[];
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  const { formatCurrency } = useI18n();

  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;
  const isPositive = value >= 0;

  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: '#1A1530',
        border: '1px solid #3D3660',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <p className="text-xs text-text-secondary mb-1 font-medium">{label}</p>
      <p
        className="text-sm font-bold"
        style={{ color: isPositive ? '#22C55E' : '#EF4444' }}
      >
        {isPositive ? '+' : ''}
        {formatCurrency(value)}
      </p>
      <p className="text-[10px] text-text-muted mt-0.5">
        {isPositive ? 'Net surplus' : 'Net deficit'}
      </p>
    </div>
  );
}

// Custom dot for active point
function CustomActiveDot(props: Record<string, unknown>) {
  const { cx, cy } = props as { cx: number; cy: number };
  return (
    <g>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={8} fill="rgba(139,92,246,0.2)" />
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={5} fill="rgba(139,92,246,0.4)" stroke="#8B5CF6" strokeWidth={1} />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={3} fill="#8B5CF6" />
    </g>
  );
}

// Y axis formatter
function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

export default function NetLineChart({ transactions }: NetLineChartProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    const data = getChartData(transactions, 'monthly');
    const runningData = [];
    let runningNet = 0;
    for (const point of data) {
      runningNet += point.net;
      runningData.push({
        ...point,
        cumulativeNet: runningNet,
      });
    }
    return runningData;
  }, [transactions]);

  const isEmpty = chartData.every(d => d.income === 0 && d.expense === 0);

  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center animate-fade-in" style={{ height: 220 }}>
        <div className="w-8 h-8 rounded-full border-2 border-accent-purple border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 animate-fade-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.1)' }}
        >
          <TrendingUp className="w-8 h-8 text-accent-purple" />
        </div>
        <p className="text-sm text-text-muted">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full">
      <div className="relative w-full flex items-center justify-center" style={{ height: 220 }}>
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
          >
            <defs>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(61,54,96,0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'rgba(139,92,246,0.3)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulativeNet"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="url(#netGradient)"
              dot={false}
              activeDot={<CustomActiveDot />}
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
