'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { getTransactions, calculateCategoryBreakdown, calculateSummary } from '@/lib/expenses';
import type { Transaction, DateFilter } from '@/types';
import DonutChart from '@/components/stats/DonutChart';
import CategoryBreakdown from '@/components/stats/CategoryBreakdown';
import TrendChart from '@/components/stats/TrendChart';
import LineChart from '@/components/stats/LineChart';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import { Calendar, ChevronLeft, ChevronRight, BarChart3, RefreshCw } from 'lucide-react';
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from 'date-fns';

export default function StatsPage() {
  const { language, t, formatCurrency } = useI18n();
  const [activeTab, setActiveTab] = useState<'stats' | 'budget' | 'note'>('stats');
  const [currentDate, setCurrentDate] = useState(new Date());
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
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getMonthYearText = () => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return currentDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  const summary = calculateSummary(transactions);
  const breakdown = calculateCategoryBreakdown(transactions, 'expense');

  // Total expense sum
  const totalExpense = transactions
    .filter((tx) => tx.kind === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalIncome = transactions
    .filter((tx) => tx.kind === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-5">
      {/* Header Tabs */}
      <div className="tab-group flex w-full">
        <button
          onClick={() => setActiveTab('stats')}
          className={`tab-item flex-1 text-center py-2 rounded-xl transition font-semibold ${
            activeTab === 'stats' ? 'active' : ''
          }`}
        >
          {t('stats.title')}
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`tab-item flex-1 text-center py-2 rounded-xl transition font-semibold ${
            activeTab === 'budget' ? 'active' : ''
          }`}
        >
          {t('stats.budget')}
        </button>
        <button
          onClick={() => setActiveTab('note')}
          className={`tab-item flex-1 text-center py-2 rounded-xl transition font-semibold ${
            activeTab === 'note' ? 'active' : ''
          }`}
        >
          {t('stats.note')}
        </button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-secondary/30 rounded-2xl p-2.5 border border-border/40">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-border/30 rounded-xl text-text-secondary transition">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 font-bold text-text-primary text-sm">
          <Calendar size={15} className="text-accent-purple" />
          <span>{getMonthYearText()}</span>
        </div>
        <button onClick={handleNextMonth} className="p-2 hover:bg-border/30 rounded-xl text-text-secondary transition">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={24} className="animate-spin text-accent-purple" />
        </div>
      ) : activeTab === 'stats' ? (
        /* Stats Visuals */
        <div className="flex flex-col gap-6 animate-scale-in">
          {/* Income Outcome simple summary */}
          <div className="grid grid-cols-2 gap-3 bg-secondary/15 p-3 rounded-2xl border border-border/20">
            <div className="text-center py-1.5">
              <span className="text-[10px] text-text-muted font-bold block uppercase">{t('transaction.income')}</span>
              <span className="text-sm font-extrabold text-income-green mt-0.5">
                +{formatCurrency(totalIncome).replace('THB', '').trim()}
              </span>
            </div>
            <div className="text-center py-1.5 border-l border-border/25">
              <span className="text-[10px] text-text-muted font-bold block uppercase">{t('transaction.outcome')}</span>
              <span className="text-sm font-extrabold text-expense-red mt-0.5">
                -{formatCurrency(totalExpense).replace('THB', '').trim()}
              </span>
            </div>
          </div>

          {/* Donut Chart Component */}
          {breakdown.length > 0 ? (
            <div className="card-base p-4 flex flex-col items-center">
              <DonutChart
                data={breakdown}
                month={currentDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'short' })}
                total={totalExpense}
              />
            </div>
          ) : null}

          {/* Category Breakdown list */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider pl-1">
              Category Share
            </h3>
            <CategoryBreakdown data={breakdown} />
          </div>

          {/* Trend Bar Chart */}
          <div className="card-base p-4">
            <TrendChart transactions={transactions} />
          </div>

          {/* Line Chart */}
          <div className="card-base p-4">
            <LineChart transactions={transactions} />
          </div>
        </div>
      ) : (
        /* Budget or Notes placeholders matching aesthetics */
        <div className="card-base p-8 text-center text-text-muted flex flex-col items-center justify-center gap-3">
          <BarChart3 size={32} />
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
