'use client';

import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { DateFilter } from '@/types';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';

interface DateSelectorProps {
  filter: DateFilter;
  setFilter: (filter: DateFilter) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export default function DateSelector({
  filter,
  setFilter,
  currentDate,
  setCurrentDate,
}: DateSelectorProps) {
  const { language, t } = useI18n();

  const handlePrev = () => {
    switch (filter) {
      case 'daily':
        setCurrentDate(subDays(currentDate, 1));
        break;
      case 'weekly':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'monthly':
      case 'calendar':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (filter) {
      case 'daily':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'weekly':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'monthly':
      case 'calendar':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const getFormattedDate = () => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    
    switch (filter) {
      case 'daily':
        return currentDate.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      case 'weekly': {
        const start = subDays(currentDate, currentDate.getDay() - 1);
        const end = addDays(start, 6);
        return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      case 'monthly':
      case 'calendar':
        return currentDate.toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        });
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Tab Selector */}
      <div className="tab-group flex w-full">
        {(['daily', 'weekly', 'monthly', 'calendar'] as DateFilter[]).map((f) => (
          <button
            key={f}
            className={`tab-item flex-1 text-center py-2 rounded-xl transition ${
              filter === f ? 'active' : ''
            }`}
            onClick={() => setFilter(f)}
          >
            {t(`filter.${f}`)}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-secondary/30 rounded-2xl p-2 border border-border/50">
        <button
          onClick={handlePrev}
          className="p-2 hover:bg-border/30 rounded-xl transition text-text-secondary"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 font-semibold">
          <Calendar size={16} className="text-accent-purple" />
          <span className="text-sm md:text-base text-text-primary">
            {getFormattedDate()}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="p-2 hover:bg-border/30 rounded-xl transition text-text-secondary"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
