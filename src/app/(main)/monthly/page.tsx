'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ArrowLeft, 
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
import { getTransactions, getTransactionClassification } from '@/lib/expenses';
import type { Transaction } from '@/types';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import { startOfYear, endOfYear, format } from 'date-fns';

export default function MonthlyPage() {
  const { t, formatCurrency } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentYear] = useState(new Date());

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
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 0);
    return () => clearTimeout(timer);
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
    if (c.includes('travel') || c.includes('car') || c.includes('รถ') || c.includes('เดินทาง') || c.includes('transport')) return <Car size={16} />;
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
    if (c.includes('travel') || c.includes('car') || c.includes('รถ') || c.includes('เดินทาง') || c.includes('transport')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiError(msg || 'Failed to generate AI summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (selectedMonthIndex !== null && !aiSummaries[selectedMonthIndex]) {
      const timer = setTimeout(() => {
        loadAISummary(selectedMonthIndex);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthIndex, aiSummaries]);

  const renderAiSummary = (text: string) => {
    const expIndex = text.indexOf('**Explanation**:') !== -1 ? text.indexOf('**Explanation**:') : text.indexOf('1. **Explanation**:');
    const recIndex = text.indexOf('**Recommendation**:') !== -1 ? text.indexOf('**Recommendation**:') : text.indexOf('2. **Recommendation**:');
    
    if (expIndex !== -1 && recIndex !== -1) {
      const explanationText = text.substring(expIndex + (text.includes('1. **Explanation**:') ? 19 : 16), recIndex).trim();
      const recommendationText = text.substring(recIndex + (text.includes('2. **Recommendation**:') ? 22 : 19)).trim();
      
      return (
        <div className="flex flex-col gap-2.5 text-[13px] leading-normal font-normal text-text-secondary">
          <div className="bg-bg-tertiary/30 p-3 rounded-xl border border-border/40">
            <span className="font-bold text-text-primary block mb-1">Insight</span>
            <p className="leading-relaxed">{explanationText}</p>
          </div>
          <div className="bg-accent-purple/5 p-3 rounded-xl border border-accent-purple/20">
            <span className="font-bold text-accent-purple block mb-1">Recommendation</span>
            <p className="leading-relaxed">{recommendationText}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="text-[13px] leading-relaxed font-normal text-text-secondary whitespace-pre-line">
        {text}
      </div>
    );
  };

  const hasAnyData = Object.values(monthlyGroups).some(txs => txs.length > 0);

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-4">
      {selectedMonthIndex === null ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight">{t('summary.monthlyOverview')}</h1>
            <div className="flex items-center gap-1.5 bg-secondary/40 rounded-[10px] h-8 px-2.5 border border-[#111827]/[0.08] dark:border-border/30 text-xs font-semibold text-text-secondary">
              <Calendar size={14} className="text-accent-purple" />
              <span>{currentYear.getFullYear()}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={24} className="animate-spin text-accent-purple" />
            </div>
          ) : !hasAnyData ? (
            <div className="p-6 text-center text-text-secondary border border-dashed border-border/40 rounded-[18px] bg-bg-secondary flex flex-col items-center justify-center gap-3">
              <Calendar size={32} className="text-accent-purple" />
              <span className="text-xs font-semibold">{t('common.noData')}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-24">
              {Array.from({ length: 12 }, (_, i) => 11 - i).map((monthIndex) => {
                const txs = monthlyGroups[monthIndex];
                if (!txs || txs.length === 0) return null;

                const income = txs
                  .filter((tx) => tx.kind === 'income')
                  .reduce((sum, tx) => sum + Number(tx.amount), 0);
                const living = txs
                  .filter((tx) => tx.kind === 'expense' && getTransactionClassification(tx) === 'living')
                  .reduce((sum, tx) => sum + Number(tx.amount), 0);
                const dca = txs
                  .filter((tx) => tx.kind === 'expense' && getTransactionClassification(tx) === 'dca')
                  .reduce((sum, tx) => sum + Number(tx.amount), 0);
                const ytdLiving = transactions
                  .filter((tx) => {
                    const txDate = new Date(tx.date);
                    const txMonth = txDate.getMonth();
                    return tx.kind === 'expense' && 
                           getTransactionClassification(tx) === 'living' && 
                           txMonth <= monthIndex;
                  })
                  .reduce((sum, tx) => sum + Number(tx.amount), 0);

                return (
                  <button
                    type="button"
                    key={monthIndex}
                    onClick={() => setSelectedMonthIndex(monthIndex)}
                    className="h-[148px] p-3.5 flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02] text-left cursor-pointer border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)] w-full"
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-[22px] font-bold text-text-primary capitalize leading-none tracking-tight">{getMonthName(monthIndex)}</h3>
                      <ChevronRight size={16} className="text-text-muted" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-border/10 pt-2.5 w-full">
                      {/* Income */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 rounded-xl bg-income-green/10 text-income-green flex-shrink-0 flex items-center justify-center w-7 h-7">
                          <TrendingUp size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-text-muted uppercase block leading-none mb-1">Income</span>
                          <span className="text-[14px] font-extrabold font-mono tracking-tight leading-none text-income-green truncate block">
                            {formatCurrency(income).replace('THB', '').trim()}
                          </span>
                        </div>
                      </div>

                      {/* Living */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 rounded-xl bg-expense-red/10 text-expense-red flex-shrink-0 flex items-center justify-center w-7 h-7">
                          <TrendingDown size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-text-muted uppercase block leading-none mb-1">Living</span>
                          <span className="text-[14px] font-extrabold font-mono tracking-tight leading-none text-expense-red truncate block">
                            {formatCurrency(living).replace('THB', '').trim()}
                          </span>
                        </div>
                      </div>

                      {/* DCA */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 rounded-xl bg-cyan-500/10 text-cyan-500 flex-shrink-0 flex items-center justify-center w-7 h-7">
                          <DollarSign size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-text-muted uppercase block leading-none mb-1">DCA Target</span>
                          <span className="text-[14px] font-extrabold font-mono tracking-tight leading-none text-cyan-500 truncate block">
                            {formatCurrency(dca).replace('THB', '').trim()}
                          </span>
                        </div>
                      </div>

                      {/* Cumulative YTD */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 rounded-xl bg-purple-500/10 text-purple-500 flex-shrink-0 flex items-center justify-center w-7 h-7">
                          <Calendar size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-text-muted uppercase block leading-none mb-1">Cumul YTD</span>
                          <span className="text-[14px] font-extrabold font-mono tracking-tight leading-none text-purple-500 truncate block">
                            {formatCurrency(ytdLiving).replace('THB', '').trim()}
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
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedMonthIndex(null)}
              className="w-10 h-10 flex items-center justify-center border border-[#111827]/[0.08] dark:border-border/40 hover:bg-secondary/40 transition cursor-pointer text-text-primary rounded-xl active:scale-95 flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-[26px] font-bold text-text-primary capitalize leading-none tracking-tight">
                {getMonthName(selectedMonthIndex)} {currentYear.getFullYear()}
              </h1>
              <span className="text-[11px] text-text-muted font-semibold block uppercase tracking-wide mt-1 leading-none">
                {monthlyGroups[selectedMonthIndex].length} transactions total
              </span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col gap-3.5 border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary shadow-[0_6px_20px_rgba(17,24,39,0.04)] rounded-[18px] animate-scale-in mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center w-8 h-8">
                  <Brain size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">
                    AI Insight & Trend Analysis
                  </h3>
                  <span className="text-[9px] text-text-muted font-bold lowercase tracking-normal block leading-none mt-0.5">
                    Monthly Pattern Summary
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadAISummary(selectedMonthIndex)}
                disabled={generatingSummary}
                className="w-9 h-9 flex items-center justify-center hover:bg-secondary/40 text-accent-purple rounded-xl transition cursor-pointer disabled:opacity-40 flex-shrink-0 border border-border/40 active:scale-95"
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
              renderAiSummary(aiSummaries[selectedMonthIndex])
            ) : (
              <div className="text-xs text-text-muted italic py-2 text-center">
                No summary generated yet. Click refresh to analyze.
              </div>
            )}
          </div>

          <h2 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-5 mb-1 pl-1">
            Detailed Transactions
          </h2>

          <div className="flex flex-col gap-2 pb-[96px]">
            {monthlyGroups[selectedMonthIndex].length === 0 ? (
              <div className="text-center py-10 text-text-muted text-xs font-medium border border-dashed border-border/40 p-4 rounded-xl">
                No transactions for this month.
              </div>
            ) : (
              monthlyGroups[selectedMonthIndex]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((tx) => {
                  const isIncome = tx.kind === 'income';
                  const amountStr = (isIncome ? '+' : '−') + formatCurrency(Number(tx.amount)).replace('THB', '').trim();
                  
                  const isLargeAmount = Number(tx.amount) >= 10000;
                  const amountFontSizeClass = isLargeAmount ? 'text-[20px] sm:text-[22px]' : 'text-[16px] sm:text-[18px]';

                  return (
                    <div
                      key={tx.id}
                      className="h-[76px] px-3 py-2.5 flex items-center justify-between border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary hover:bg-secondary/10 transition-colors rounded-[18px] shadow-[0_4px_12px_rgba(17,24,39,0.02)] animate-scale-in"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 border ${getCategoryColor(tx.category)}`}>
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="flex items-center">
                            <span className="text-[13px] sm:text-[14px] font-semibold text-text-primary capitalize leading-none">
                              {t(`category.${tx.category.toLowerCase()}`) || tx.category}
                            </span>
                            {tx.payment_method && (
                              <span className="h-4.5 px-1.5 flex items-center justify-center rounded bg-secondary/50 border border-border/20 text-[9px] font-bold text-text-secondary/70 uppercase leading-none tracking-wider ml-1.5">
                                {tx.payment_method}
                              </span>
                            )}
                          </div>
                          {tx.merchant && (
                            <span className="text-[11px] text-text-secondary/70 block truncate mt-0.5 leading-none">
                              {tx.merchant}
                            </span>
                          )}
                          {tx.note && (
                            <span className="text-[11px] font-normal italic text-text-muted/80 block truncate mt-0.5 leading-none">
                              &ldquo;{tx.note}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2 flex flex-col justify-center">
                        <span className={`${amountFontSizeClass} font-bold font-mono tracking-tight leading-none ${isIncome ? 'text-income-green' : 'text-expense-red'}`}>
                          {amountStr}
                        </span>
                        <span className="text-[10px] text-text-muted/70 block font-semibold tracking-wide uppercase mt-1 leading-none">
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

      <AddTransactionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}
