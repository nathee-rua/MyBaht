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
      <div className="flex justify-center w-full px-2 mb-1 mt-2">
        <div className="flex items-center bg-bg-tertiary/40 border border-border/40 rounded-full p-1 w-full max-w-[420px] mx-auto shadow-inner">
          {(['stats', 'budget', 'note'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                className={`flex-1 text-center py-2.5 text-xs font-black transition-all duration-300 cursor-pointer select-none rounded-full ${
                  isActive
                    ? 'bg-white dark:bg-bg-secondary text-accent-purple shadow-sm'
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
      <div 
        className="p-4 rounded-2xl border flex flex-col gap-3.5 transition-all shadow-sm animate-fade-in"
        style={{ 
          background: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)' 
        }}
      >
        {/* Month Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handlePrevMonth} 
            className="p-1.5 hover:bg-secondary/40 rounded-xl text-text-secondary transition cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2 font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <Calendar size={15} className="text-accent-purple" style={{ color: 'var(--color-accent-purple)' }} />
            <span>{getMonthYearText()}</span>
            {selectedDay && (
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                {format(selectedDay, 'd MMM')}
              </span>
            )}
          </div>
          
          <button 
            onClick={handleNextMonth} 
            className="p-1.5 hover:bg-secondary/40 rounded-xl text-text-secondary transition cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day initials */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] font-extrabold tracking-wider opacity-60" style={{ color: 'var(--color-text-secondary)' }}>
          {dayNames.map((name, i) => (
            <div key={i} className="py-0.5">
              {name}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-2 text-center mt-0.5">
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
                className={`relative aspect-square w-8 h-8 mx-auto flex flex-col items-center justify-center rounded-xl transition text-xs font-semibold cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : isToday
                      ? 'border font-bold'
                      : 'hover:bg-secondary/60'
                }`}
                style={{
                  background: isSelected ? 'var(--color-accent-purple)' : 'transparent',
                  borderColor: isToday ? 'var(--color-accent-purple)' : 'transparent',
                  color: isSelected 
                    ? '#FFFFFF' 
                    : isToday 
                      ? 'var(--color-accent-purple)' 
                      : 'var(--color-text-primary)',
                  boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none',
                }}
              >
                <span>{format(day, 'd')}</span>
                {hasTx && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full animate-pulse"
                    style={{
                      background: isSelected ? '#FFFFFF' : 'var(--color-accent-purple)',
                    }}
                  />
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
          {/* Side-by-Side Account Total Cards */}
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {/* Total Salary Card (Purple) */}
            <div 
              className="relative overflow-hidden p-4 rounded-2xl border flex flex-col justify-between h-32 transition-transform duration-200 hover:scale-[1.02] shadow-lg cursor-pointer"
              style={{ 
                background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              {/* Decorative Background Circles */}
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute right-6 -top-6 w-12 h-12 rounded-full bg-white/5 pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-extrabold text-purple-200/90 uppercase tracking-wider">
                    {language === 'th' ? 'รายรับทั้งหมด' : 'Total Salary'}
                  </span>
                  <span className="text-[9px] text-purple-200/70 font-semibold tracking-wide">
                    Bank Account ********1965
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight size={14} className="text-white/80" />
                  <div className="w-5 h-4 rounded-sm bg-white/20 border border-white/30 flex flex-col justify-between p-0.5 overflow-hidden">
                    <div className="w-1.5 h-1 bg-white/40 rounded-sm" />
                    <div className="w-3 h-[0.5px] bg-white/30" />
                  </div>
                </div>
              </div>
              
              <div className="mt-auto">
                <span className="text-[10px] text-purple-200/60 block font-medium">Total Balance</span>
                <span className="text-lg font-black text-white tracking-tight">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
            </div>

            {/* Total Expense Card (Orange/Coral) */}
            <div 
              className="relative overflow-hidden p-4 rounded-2xl border flex flex-col justify-between h-32 transition-transform duration-200 hover:scale-[1.02] shadow-lg cursor-pointer"
              style={{ 
                background: 'linear-gradient(135deg, #FF6B4A 0%, #D93B15 100%)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              {/* Decorative Background Circles */}
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute right-6 -top-6 w-12 h-12 rounded-full bg-white/5 pointer-events-none" />

              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-extrabold text-orange-200/90 uppercase tracking-wider">
                    {language === 'th' ? 'รายจ่ายทั้งหมด' : 'Total Expense'}
                  </span>
                  <span className="text-[9px] text-orange-200/70 font-semibold tracking-wide">
                    Bank Account ********1965
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft size={14} className="text-white/80" />
                  <div className="w-5 h-4 rounded-sm bg-white/20 border border-white/30 flex flex-col justify-between p-0.5 overflow-hidden">
                    <div className="w-1.5 h-1 bg-white/40 rounded-sm" />
                    <div className="w-3 h-[0.5px] bg-white/30" />
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <span className="text-[10px] text-orange-200/60 block font-medium">Total Spent</span>
                <span className="text-lg font-black text-white tracking-tight">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
            </div>
          </div>

          {/* Donut Chart Component */}
          {breakdown.length > 0 ? (
            <div 
              className="p-4 flex flex-col items-center w-full" 
              style={{ 
                background: 'var(--color-bg-secondary)', 
                border: '1px solid var(--color-border)', 
                borderRadius: 20, 
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' 
              }}
            >
              <DonutChart
                data={breakdown}
                month={chartPeriodText}
                total={totalExpense}
              />
            </div>
          ) : (
            <div 
              className="p-8 text-center text-text-secondary flex flex-col items-center justify-center gap-3 w-full" 
              style={{ 
                background: 'var(--color-bg-secondary)', 
                border: '1px solid var(--color-border)', 
                borderRadius: 20 
              }}
            >
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
          <div 
            className="p-4 w-full" 
            style={{ 
              background: 'var(--color-bg-secondary)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 20, 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' 
            }}
          >
            <TrendChart transactions={filteredTransactions} />
          </div>

          {/* Line Chart */}
          <div 
            className="p-4 w-full" 
            style={{ 
              background: 'var(--color-bg-secondary)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 20, 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' 
            }}
          >
            <LineChart transactions={filteredTransactions} />
          </div>
        </div>
      ) : (
        /* Budget or Notes placeholders matching aesthetics */
        <div 
          className="p-8 text-center text-text-secondary flex flex-col items-center justify-center gap-3 w-full" 
          style={{ 
            background: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 20 
          }}
        >
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
