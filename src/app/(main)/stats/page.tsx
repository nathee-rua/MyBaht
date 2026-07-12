'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { getTransactions, calculateCategoryBreakdown } from '@/lib/expenses';
import type { Transaction } from '@/types';
import DonutChart from '@/components/stats/DonutChart';
import CategoryBreakdown from '@/components/stats/CategoryBreakdown';
import TrendChart from '@/components/stats/TrendChart';
import LineChart from '@/components/stats/LineChart';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import { Calendar, ChevronLeft, ChevronRight, BarChart3, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { startOfMonth, endOfMonth, format, subMonths, addMonths, eachDayOfInterval, getDay, isSameDay } from 'date-fns';

export default function StatsPage() {
  const { language, t, formatCurrency } = useI18n();
  const [activeTab, setActiveTab] = useState<'stats' | 'budget' | 'note'>('stats');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Listen to bottom navigation center plus button event
  useEffect(() => {
    const handleOpenAddTx = () => {
      setShowAddDialog(true);
    };
    window.addEventListener('open-add-transaction', handleOpenAddTx);
    return () => window.removeEventListener('open-add-transaction', handleOpenAddTx);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const data = await getTransactions({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDay(null);
  };

  const getMonthYearText = () => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return currentDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  // Get all days of the current month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Sunday is 0, Monday is 1, etc.
  const startDayOfWeek = useMemo(() => {
    return getDay(startOfMonth(currentDate));
  }, [currentDate]);

  const dayNames = language === 'th' 
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] 
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Filter transactions based on selected day (if any)
  const filteredTransactions = useMemo(() => {
    if (!selectedDay) return transactions;
    const selectedDayStr = format(selectedDay, 'yyyy-MM-dd');
    return transactions.filter((tx) => tx.date === selectedDayStr);
  }, [transactions, selectedDay]);

  const breakdown = calculateCategoryBreakdown(filteredTransactions, 'expense');

  // Total expense sum
  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.kind === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.kind === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [filteredTransactions]);

  // Display date for donut chart center label
  const chartPeriodText = useMemo(() => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    if (selectedDay) {
      return selectedDay.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
      });
    }
    return currentDate.toLocaleDateString(locale, {
      month: 'short',
    });
  }, [selectedDay, currentDate, language]);

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-5">
      {/* Header Tabs (Pill Style) */}
      <div className="flex justify-center w-full px-1 mb-1 mt-2">
        <div className="flex items-center bg-bg-tertiary/40 border border-border/40 rounded-full p-1 h-11 w-full shadow-sm">
          {(['stats', 'budget', 'note'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                className={`flex-1 text-center h-9 text-[12px] font-semibold transition-all duration-200 cursor-pointer select-none rounded-full ${
                  isActive
                    ? 'bg-white dark:bg-bg-secondary text-accent-purple shadow-sm font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {t(tab === 'stats' ? 'stats.title' : `stats.${tab}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini Calendar Date Selector */}
      <div className="p-3.5 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary shadow-[0_6px_20px_rgba(17,24,39,0.04)] flex flex-col gap-3 transition-all duration-200">
        {/* Month Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handlePrevMonth} 
            className="w-9 h-9 hover:bg-secondary/40 rounded-xl transition text-text-secondary active:scale-95 cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2 font-bold text-sm text-text-primary">
            <Calendar size={15} className="text-accent-purple" />
            <span>{getMonthYearText()}</span>
            {selectedDay && (
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                {format(selectedDay, 'd MMM')}
              </span>
            )}
          </div>
          
          <button 
            onClick={handleNextMonth} 
            className="w-9 h-9 hover:bg-secondary/40 rounded-xl transition text-text-secondary active:scale-95 cursor-pointer flex items-center justify-center"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day initials */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] font-extrabold tracking-wider opacity-60 text-text-secondary">
          {dayNames.map((name, i) => (
            <div key={i} className="py-0.5">
              {name}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-2 text-center mt-1">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {daysInMonth.map((day) => {
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const isToday = isSameDay(day, new Date());
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasTx = transactions.some((tx) => tx.date === dateStr);

            return (
              <button
                key={day.toString()}
                onClick={() => {
                  if (selectedDay && isSameDay(day, selectedDay)) {
                    setSelectedDay(null);
                  } else {
                    setSelectedDay(day);
                  }
                }}
                className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer active:scale-95 ${
                  isSelected 
                    ? 'bg-accent-purple text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)] font-bold' 
                    : isToday
                      ? 'border-2 border-accent-purple text-accent-purple font-bold bg-accent-purple/5'
                      : 'text-text-primary hover:bg-secondary/40'
                }`}
              >
                <span>{format(day, 'd')}</span>
                {hasTx && (
                  <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-accent-purple animate-pulse'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={24} className="animate-spin text-accent-purple" />
        </div>
      ) : activeTab === 'stats' ? (
        /* Stats Visuals */
        <div className="flex flex-col gap-6 animate-scale-in">
          {/* Side-by-Side Account Total Cards (Editorial Neutral style) */}
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {/* Total Salary Card */}
            <div className="relative overflow-hidden p-3.5 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col h-[116px] transition-transform duration-200 hover:scale-[1.02] shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
              {/* Title row */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold text-text-primary">
                  {language === 'th' ? 'รายรับทั้งหมด' : 'Total Salary'}
                </span>
                <div className="flex items-center gap-1 text-income-green bg-income-green/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <ArrowUpRight size={10} />
                  <span>INCOME</span>
                </div>
              </div>

              {/* Meta row under title */}
              <div className="text-[11px] font-medium text-text-muted opacity-65 mb-2 leading-none">
                Bank Account ••••1965
              </div>

              {/* Center Amount Block */}
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[30px] font-bold text-income-green tracking-tight leading-none">
                  {formatCurrency(totalIncome)}
                </span>
              </div>

              {/* Bottom helper label */}
              <div className="text-[12px] font-medium text-text-muted mt-1 leading-none">
                {language === 'th' ? 'ยอดรวมเดือนนี้' : 'Total income this month'}
              </div>
            </div>

            {/* Total Expense Card */}
            <div className="relative overflow-hidden p-3.5 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col h-[116px] transition-transform duration-200 hover:scale-[1.02] shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
              {/* Title row */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold text-text-primary">
                  {language === 'th' ? 'รายจ่ายทั้งหมด' : 'Total Expense'}
                </span>
                <div className="flex items-center gap-1 text-expense-red bg-expense-red/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <ArrowDownLeft size={10} />
                  <span>EXPENSE</span>
                </div>
              </div>

              {/* Meta row under title */}
              <div className="text-[11px] font-medium text-text-muted opacity-65 mb-2 leading-none">
                Bank Account ••••1965
              </div>

              {/* Center Amount Block */}
              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[30px] font-bold text-expense-red tracking-tight leading-none">
                  {formatCurrency(totalExpense)}
                </span>
              </div>

              {/* Bottom helper label */}
              <div className="text-[12px] font-medium text-text-muted mt-1 leading-none">
                {language === 'th' ? 'ยอดรวมเดือนนี้' : 'Total spent this month'}
              </div>
            </div>
          </div>

          {/* Donut Chart Component */}
          {breakdown.length > 0 ? (
            <div className="p-4 flex flex-col items-center w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
              <DonutChart
                data={breakdown}
                month={chartPeriodText}
                total={totalExpense}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-text-secondary flex flex-col items-center justify-center gap-3 w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)] animate-fade-in">
              <BarChart3 size={32} className="text-accent-purple" />
              <span className="text-xs font-semibold">{t('common.noData')}</span>
            </div>
          )}

          {/* Category Breakdown list */}
          {breakdown.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider pl-1">
                Category Share
              </h3>
              <CategoryBreakdown data={breakdown} />
            </div>
          )}

          {/* Trend Bar Chart */}
          <div className="p-4 w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <TrendChart transactions={filteredTransactions} />
          </div>

          {/* Line Chart */}
          <div className="p-4 w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <LineChart transactions={filteredTransactions} />
          </div>
        </div>
      ) : (
        /* Budget or Notes placeholders matching aesthetics */
        <div className="p-8 text-center text-text-secondary flex flex-col items-center justify-center gap-3 w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
          <BarChart3 size={32} className="text-accent-purple" />
          <span className="text-xs font-semibold">Coming Soon in next update!</span>
        </div>
      )}
      {/* Add Dialog */}
      <AddTransactionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}
