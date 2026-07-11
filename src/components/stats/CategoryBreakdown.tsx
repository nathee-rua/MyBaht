'use client';

import React, { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { getCategoryInfo } from '@/lib/expenses';
import type { CategoryBreakdownItem } from '@/types';
import {
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
  Pencil,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Banknote,
  Gift,
  TrendingUp,
  Plus,
  BarChart3,
} from 'lucide-react';

interface CategoryBreakdownProps {
  data: CategoryBreakdownItem[];
  onEditCategory?: (category: string) => void;
}

// Icon map for rendering category icons
const iconMap: Record<string, React.ElementType> = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Banknote,
  Gift,
  TrendingUp,
  Plus,
};

export default function CategoryBreakdown({ data, onEditCategory }: CategoryBreakdownProps) {
  const { t, formatCurrency } = useI18n();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedData = useMemo(() => {
    const sorted = [...data];
    return sortOrder === 'desc'
      ? sorted.sort((a, b) => b.amount - a.amount)
      : sorted.sort((a, b) => a.amount - b.amount);
  }, [data, sortOrder]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.1)' }}
        >
          <BarChart3 className="w-7 h-7 text-accent-purple" />
        </div>
        <p className="text-sm text-text-muted">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Sort Toggle */}
      <div className="flex items-center justify-end mb-3 px-1">
        <button
          onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-purple-light transition-colors px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(45,38,72,0.5)' }}
        >
          {sortOrder === 'desc' ? (
            <>
              <ArrowDownNarrowWide className="w-3.5 h-3.5" />
              {t('stats.descending')}
            </>
          ) : (
            <>
              <ArrowUpNarrowWide className="w-3.5 h-3.5" />
              {t('stats.ascending')}
            </>
          )}
        </button>
      </div>

      {/* Category List */}
      <div className="space-y-1">
        {sortedData.map((item, index) => {
          const catInfo = getCategoryInfo(item.category);
          const IconComponent = iconMap[catInfo.icon] || MoreHorizontal;

          return (
            <div
              key={item.category}
              className="transaction-item group"
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'fadeIn 0.3s ease-out both',
              }}
            >
              {/* Percentage Badge */}
              <div
                className="percentage-badge"
                style={{
                  background: `${item.color}20`,
                  color: item.color,
                }}
              >
                {item.percentage}%
              </div>

              {/* Category Icon */}
              <div
                className="category-icon"
                style={{
                  background: `${item.color}15`,
                }}
              >
                <IconComponent
                  className="w-5 h-5"
                  style={{ color: item.color }}
                />
              </div>

              {/* Category Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {t(`category.${item.category}`)}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {item.count} {item.count === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-text-primary">
                  {formatCurrency(item.amount)}
                </p>
              </div>

              {/* Edit Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCategory?.(item.category);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              >
                <Pencil className="w-4 h-4 text-text-muted hover:text-accent-purple-light transition-colors" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar Visualization */}
      <div className="mt-4 px-1">
        <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(45,38,72,0.5)' }}>
          {sortedData.map((item) => (
            <div
              key={item.category}
              className="h-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                background: item.color,
                minWidth: item.percentage > 0 ? '2px' : '0',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
