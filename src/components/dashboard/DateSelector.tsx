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
      {/* Tab Selector (Pill Style) */}
      <div className="flex justify-center w-full px-2 mb-1">
        <div className="flex items-center bg-bg-tertiary/40 border border-border/40 rounded-full p-1 w-full max-w-[420px] mx-auto shadow-inner">
          {(['daily', 'weekly', 'monthly', 'calendar'] as DateFilter[]).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                className={`flex-1 text-center py-2.5 text-[11px] font-black transition-all duration-300 cursor-pointer select-none rounded-full ${
                  isActive
                    ? 'bg-white dark:bg-bg-secondary text-accent-purple shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setFilter(f)}
              >
                {t(`filter.${f}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Navigation (Premium Rounded) */}
      <div className="flex items-center justify-between bg-bg-secondary rounded-2xl p-3.5 border border-border/60 shadow-md">
        <button
          onClick={handlePrev}
          className="p-2 hover:bg-secondary/40 rounded-xl transition text-text-secondary active:scale-95 cursor-pointer flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 font-bold text-text-primary">
          <Calendar size={16} className="text-accent-purple" />
          <span className="text-sm tracking-wide">
            {getFormattedDate()}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="p-2 hover:bg-secondary/40 rounded-xl transition text-text-secondary active:scale-95 cursor-pointer flex items-center justify-center"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
