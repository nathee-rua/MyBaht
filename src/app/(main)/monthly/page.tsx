'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ArrowLeft, 
  Sparkles, 
  Brain, 
  Loader2, 
  Utensils, 
  ShoppingBag, 
  CreditCard, 
  Play, 
  DollarSign, 
  Heart, 
  Car, 
  HelpCircle 
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getTransactions } from '@/lib/expenses';
import type { Transaction } from '@/types';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import { startOfYear, endOfYear, format } from 'date-fns';

export default function MonthlyPage() {
  const { t, formatCurrency } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date());

  // Master-Detail State
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  
  // AI summary states
  const [aiSummaries, setAiSummaries] = useState<Record<number, string>>({});
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfYear(currentYear), 'yyyy-MM-dd');
      const endDate = format(endOfYear(currentYear), 'yyyy-MM-dd');
      const data = await getTransactions({ startDate, endDate });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  // Load transactions on mount and year change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Listen to bottom navigation center plus button event
  useEffect(() => {
    const handleOpenAddTx = () => {
      setShowAddDialog(true);
    };
    window.addEventListener('open-add-transaction', handleOpenAddTx);
    return () => window.removeEventListener('open-add-transaction', handleOpenAddTx);
  }, []);

  // Group by month
  const monthlyGroups: Record<number, Transaction[]> = {};
  for (let i = 0; i < 12; i++) {
    monthlyGroups[i] = [];
  }

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const month = txDate.getMonth();
    monthlyGroups[month].push(tx);
  });

  const { language } = useI18n();

  const getMonthName = (monthIndex: number) => {
    const d = new Date(currentYear.getFullYear(), monthIndex, 1);
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return d.toLocaleDateString(locale, { month: 'long' });
  };

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('food') || c.includes('eat') || c.includes('อาหาร')) return <Utensils size={16} />;
    if (c.includes('shop') || c.includes('ช้อปปิ้ง')) return <ShoppingBag size={16} />;
    if (c.includes('bill') || c.includes('ค่าไฟ') || c.includes('บิล')) return <CreditCard size={16} />;
    if (c.includes('enter') || c.includes('หนัง') || c.includes('บันเทิง')) return <Play size={16} />;
    if (c.includes('salary') || c.includes('income') || c.includes('เงินเดือน')) return <DollarSign size={16} />;
    if (c.includes('health') || c.includes('หมอ') || c.includes('สุขภาพ')) return <Heart size={16} />;
    if (c.includes('travel') || c.includes('car') || c.includes('รถ') || c.includes('เดินทาง')) return <Car size={16} />;
    return <HelpCircle size={16} />;
  };

  const getCategoryColor = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('food')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (c.includes('shop')) return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    if (c.includes('bill')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (c.includes('enter')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (c.includes('salary')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (c.includes('health')) return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
    if (c.includes('travel')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  const loadAISummary = async (monthIdx: number) => {
    setGeneratingSummary(true);
    setAiError('');
    try {
      const txs = monthlyGroups[monthIdx];
      const response = await fetch('/api/ai/monthly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txs, language }),
      });
      
      if (!response.ok) {
        const errMsg = await response.text();
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      setAiSummaries((prev) => ({
        ...prev,
        [monthIdx]: data.summary,
      }));
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Load summary on month change if not cached
  useEffect(() => {
    if (selectedMonthIndex !== null && !aiSummaries[selectedMonthIndex]) {
      loadAISummary(selectedMonthIndex);
    }
  }, [selectedMonthIndex, aiSummaries]);

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-4">
      {selectedMonthIndex === null ? (
        // Master view: List of months
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-text-primary">{t('summary.monthlyOverview')}</h1>
            <div className="flex items-center gap-1.5 bg-secondary/30 rounded-xl px-3 py-1.5 border border-border/20 text-xs font-semibold text-text-secondary">
              <Calendar size={14} className="text-accent-purple" />
              <span>{currentYear.getFullYear()}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={24} className="animate-spin text-accent-purple" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Loop over months (descending from current month) */}
              {Array.from({ length: 12 }, (_, i) => 11 - i).map((monthIndex) => {
                const txs = monthlyGroups[monthIndex];
                const income = txs
                  .filter((tx) => tx.kind === 'income')
                  .reduce((sum, tx) => sum + Number(tx.amount), 0);
                const expense = txs
                  .filter((tx) => tx.kind === 'expense')
                  .reduce((sum, tx) => sum + Number(tx.amount), 0);

                if (txs.length === 0) return null;

                return (
                  <button
                    type="button"
                    key={monthIndex}
                    onClick={() => setSelectedMonthIndex(monthIndex)}
                    className="p-4 flex flex-col gap-3 transition text-left cursor-pointer shadow-sm w-full"
                    style={{ 
                      background: 'var(--color-bg-secondary)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: 20,
                    }}
                  >
                    {/* Month Name and Totals */}
                    <div className="flex items-center justify-between w-full">
                      <h3 className="font-extrabold text-text-primary capitalize">{getMonthName(monthIndex)}</h3>
                      <ChevronRight size={16} className="text-text-muted" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border/10 pt-3 w-full">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-income-green/10 text-income-green">
                          <TrendingUp size={14} />
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">{t('transaction.income')}</span>
                          <span className="text-xs font-bold text-income-green">
                            {formatCurrency(income).replace('THB', '').trim()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-expense-red/10 text-expense-red">
                          <TrendingDown size={14} />
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">{t('transaction.outcome')}</span>
                          <span className="text-xs font-bold text-expense-red">
                            {formatCurrency(expense).replace('THB', '').trim()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // Detail view: Specific month's transaction listing and AI Insights
        <>
          {/* Header with Back Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedMonthIndex(null)}
              className="p-2 border border-border/40 hover:bg-secondary/40 transition cursor-pointer text-text-primary"
              style={{ borderRadius: 12 }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-text-primary capitalize">
                {getMonthName(selectedMonthIndex)} {currentYear.getFullYear()}
              </h1>
              <span className="text-[10px] text-text-muted font-bold block">
                {monthlyGroups[selectedMonthIndex].length} transactions total
              </span>
            </div>
          </div>

          {/* AI Monthly Trend Analysis card */}
          <div 
            className="p-5 flex flex-col gap-3.5 border-2 border-accent-purple bg-accent-purple/5 shadow-sm rounded-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-accent-purple/10 text-accent-purple">
                  <Brain size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
                    AI Insight & Trend Analysis
                  </h3>
                  <span className="text-[9px] text-text-muted font-bold lowercase tracking-normal block">
                    Monthly Pattern Summary
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadAISummary(selectedMonthIndex)}
                disabled={generatingSummary}
                className="p-1.5 hover:bg-accent-purple/10 text-accent-purple rounded transition cursor-pointer disabled:opacity-40"
                title="Regenerate Summary"
              >
                <RefreshCw size={14} className={generatingSummary ? 'animate-spin' : ''} />
              </button>
            </div>

            {generatingSummary ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 size={24} className="animate-spin text-accent-purple" />
                <span className="text-[10px] text-text-secondary font-black animate-pulse">
                  Analyzing expenses, categories, and payment trends...
                </span>
              </div>
            ) : aiError ? (
              <div className="text-xs text-expense-red font-semibold py-2 bg-expense-red/5 p-3 border border-expense-red/10">
                ⚠️ {aiError}
                <div className="text-[9px] text-text-muted mt-1">
                  Check your API key and connection settings.
                </div>
              </div>
            ) : aiSummaries[selectedMonthIndex] ? (
              <div className="text-xs text-text-secondary leading-relaxed font-medium whitespace-pre-line">
                {aiSummaries[selectedMonthIndex]}
              </div>
            ) : (
              <div className="text-xs text-text-muted italic py-2 text-center">
                No summary generated yet. Click refresh to analyze.
              </div>
            )}
          </div>

          {/* Details Listing Header */}
          <h2 className="text-xs font-black text-text-secondary uppercase tracking-wider mt-2">
            Detailed Transactions
          </h2>

          {/* Transaction List */}
          <div className="flex flex-col gap-2.5 pb-8">
            {monthlyGroups[selectedMonthIndex].length === 0 ? (
              <div className="text-center py-10 text-text-muted text-xs font-medium border border-dashed border-border/40 p-4">
                No transactions for this month.
              </div>
            ) : (
              monthlyGroups[selectedMonthIndex]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((tx) => {
                  const isIncome = tx.kind === 'income';
                  const amountStr = (isIncome ? '+' : '-') + formatCurrency(Number(tx.amount)).replace('THB', '').trim();
                  
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 flex items-center justify-between border border-border/40 bg-bg-secondary/40 shadow-sm rounded-none border-l-4"
                      style={{
                        borderLeftColor: isIncome ? 'var(--color-income-green)' : 'var(--color-expense-red)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl flex-shrink-0 border ${getCategoryColor(tx.category)}`}>
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-text-primary capitalize">
                              {t(`category.${tx.category.toLowerCase()}`) || tx.category}
                            </span>
                            {tx.payment_method && (
                              <span className="px-1.5 py-0.5 rounded bg-secondary/50 border border-border/20 text-[8px] font-black text-text-muted uppercase">
                                {tx.payment_method}
                              </span>
                            )}
                          </div>
                          {tx.merchant && (
                            <span className="text-[10px] text-text-secondary block font-semibold truncate">
                              {tx.merchant}
                            </span>
                          )}
                          {tx.note && (
                            <span className="text-[10px] text-text-muted block truncate italic">
                              "{tx.note}"
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <span className={`text-xs font-black ${isIncome ? 'text-income-green' : 'text-expense-red'}`}>
                          {amountStr}
                        </span>
                        <span className="text-[9px] text-text-muted block font-medium mt-0.5">
                          {format(new Date(tx.date), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </>
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
