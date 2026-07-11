'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useI18n } from '@/lib/i18n';
import { getChartData } from '@/lib/expenses';
import type { Transaction, DateFilter, ChartDataPoint } from '@/types';
import { BarChart3 } from 'lucide-react';

interface TrendChartProps {
  transactions: Transaction[];
}

type Period = 'daily' | 'weekly' | 'monthly';

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  const { formatCurrency } = useI18n();

  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: '#1A1530',
        border: '1px solid #3D3660',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <p className="text-xs text-text-secondary mb-2 font-medium">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-xs text-text-muted capitalize">{entry.name}</span>
          <span className="text-xs font-bold text-text-primary ml-auto">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Custom tick formatter for Y axis
function formatYAxis(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

export default function TrendChart({ transactions }: TrendChartProps) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>('daily');

  const periods: { key: Period; label: string }[] = [
    { key: 'daily', label: t('filter.daily') },
    { key: 'weekly', label: t('filter.weekly') },
    { key: 'monthly', label: t('filter.monthly') },
  ];

  const chartData = useMemo(
    () => getChartData(transactions, period),
    [transactions, period]
  );

  const isEmpty = chartData.every(d => d.income === 0 && d.expense === 0);

  return (
    <div className="animate-fade-in">
      {/* Period Tabs */}
      <div className="tab-group mb-4">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`tab-item flex-1 text-center ${
              period === p.key ? 'active' : ''
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.1)' }}
          >
            <BarChart3 className="w-8 h-8 text-accent-purple" />
          </div>
          <p className="text-sm text-text-muted">{t('common.noData')}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
            barCategoryGap="25%"
            barGap={4}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={1} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.6} />
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
              cursor={{ fill: 'rgba(124,58,237,0.08)' }}
            />
            <Bar
              dataKey="income"
              name={t('transaction.income')}
              fill="url(#incomeGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="expense"
              name={t('transaction.outcome')}
              fill="url(#expenseGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
