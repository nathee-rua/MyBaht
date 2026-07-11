'use client';

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { useI18n } from '@/lib/i18n';
import type { CategoryBreakdownItem } from '@/types';
import { CHART_COLORS } from '@/types';
import { PieChart as PieChartIcon } from 'lucide-react';

interface DonutChartProps {
  data: CategoryBreakdownItem[];
  month: string;
  total: number;
}

// Custom active shape for hover effect
function renderActiveShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(innerRadius as number) - 3}
        outerRadius={(outerRadius as number) + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.3))' }}
      />
    </g>
  );
}

// Custom percentage label
function renderLabel(props: any) {
  const {
    cx, cy, midAngle, outerRadius, percentage,
  } = props;

  if (percentage < 5) return null;

  const RADIAN = Math.PI / 180;
  const radius = (outerRadius as number) + 20;
  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#A78BFA"
      textAnchor={x > (cx as number) ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${percentage}%`}
    </text>
  );
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryBreakdownItem }> }) {
  const { t, formatCurrency } = useI18n();

  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;

  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: '#1A1530',
        border: '1px solid #3D3660',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <p className="text-xs text-text-secondary mb-1">
        {t(`category.${item.category}`)}
      </p>
      <p className="text-sm font-bold text-text-primary">
        {formatCurrency(item.amount)}
      </p>
      <p className="text-xs mt-1" style={{ color: item.color }}>
        {item.percentage}% · {item.count} {item.count === 1 ? 'item' : 'items'}
      </p>
    </div>
  );
}

export default function DonutChart({ data, month, total }: DonutChartProps) {
  const { t, formatCurrency } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const PieComponent = Pie as any;

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.1)' }}
        >
          <PieChartIcon className="w-8 h-8 text-accent-purple" />
        </div>
        <p className="text-sm text-text-muted">{t('common.noData')}</p>
      </div>
    );
  }

  // Assign colors from CHART_COLORS if not already set
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="relative animate-fade-in">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <PieComponent
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="amount"
            nameKey="category"
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
            label={renderLabel}
            labelLine={false}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                style={{
                  filter: activeIndex === index
                    ? `drop-shadow(0 0 6px ${entry.color}80)`
                    : 'none',
                  transition: 'filter 0.3s ease',
                }}
              />
            ))}
          </PieComponent>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Text */}
      <div className="chart-center-label">
        <p className="text-xs text-text-muted mb-1">
          {t('stats.spending')}
        </p>
        <p className="text-lg font-bold text-text-primary leading-tight">
          {formatCurrency(total)}
        </p>
        <p className="text-[10px] text-accent-purple-light mt-0.5">{month}</p>
      </div>
    </div>
  );
}
