'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { getTransactions, calculateCategoryBreakdown, calculateAdvancedSummary } from '@/lib/expenses';
import type { Transaction, InvestmentReminder, InvestmentRecord } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import DonutChart from '@/components/stats/DonutChart';
import CategoryBreakdown from '@/components/stats/CategoryBreakdown';
import TrendChart from '@/components/stats/TrendChart';
import LineChart from '@/components/stats/LineChart';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import { 
  Calendar, ChevronLeft, ChevronRight, BarChart3, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Edit3, Check, X, Bell, 
  TrendingUp, Notebook, Plus, Trash2, AlertTriangle, AlertCircle
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, subMonths, addMonths, eachDayOfInterval, getDay, isSameDay } from 'date-fns';

export default function StatsPage() {
  const { language, t, formatCurrency } = useI18n();
  const [activeTab, setActiveTab] = useState<'stats' | 'budget' | 'note'>('stats');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // --- Budget State ---
  const [livingBudget, setLivingBudget] = useState(() => {
    if (typeof window === 'undefined') return 20000;
    try {
      const saved = localStorage.getItem('mb_living_budget');
      return saved ? Number(saved) : 20000;
    } catch {
      return 20000;
    }
  });

  const [dcaBudget, setDcaBudget] = useState(() => {
    if (typeof window === 'undefined') return 8000;
    try {
      const saved = localStorage.getItem('mb_dca_budget');
      return saved ? Number(saved) : 8000;
    } catch {
      return 8000;
    }
  });

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    const defaults = {
      food: 6000,
      transport: 2500,
      shopping: 4000,
      bills: 5000,
      entertainment: 2000,
      health: 1500,
      education: 2000,
      other: 2000,
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('mb_category_budgets');
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  });

  const [editingBudget, setEditingBudget] = useState<'living' | 'dca' | string | null>(null);
  const [editValue, setEditValue] = useState('');

  // --- Record/Note State ---
  const [dateNotes, setDateNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('mb_date_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('mb_monthly_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [investmentNotes, setInvestmentNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('mb_inv_notes');
      return saved || '';
    } catch {
      return '';
    }
  });

  const [editingNoteType, setEditingNoteType] = useState<'selected' | 'monthly' | 'investment' | null>(null);
  const [noteEditValue, setNoteEditValue] = useState('');

  const [reminders, setReminders] = useState<InvestmentReminder[]>(() => {
    const defaults = [
      { id: 'r1', name: 'DCA Mutual Fund (SET50)', amount: 5000, day_of_month: 5, active: true },
      { id: 'r2', name: 'DCA Crypto (BTC/ETH)', amount: 3000, day_of_month: 15, active: true },
    ] as InvestmentReminder[];
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('mb_reminders');
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  });

  const [records, setRecords] = useState<InvestmentRecord[]>(() => {
    const defaults = [
      { id: 'rc1', name: 'SCB Dividend', amount: 450, date: format(new Date(), 'yyyy-MM-dd'), type: 'dividend' },
    ] as InvestmentRecord[];
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('mb_records');
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  });

  // Add Reminder/Record Form states
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderName, setNewReminderName] = useState('');
  const [newReminderAmount, setNewReminderAmount] = useState('');
  const [newReminderDay, setNewReminderDay] = useState('15');

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecordName, setNewRecordName] = useState('');
  const [newRecordAmount, setNewRecordAmount] = useState('');
  const [newRecordType, setNewRecordType] = useState<'buy' | 'sell' | 'dividend'>('buy');

  // Save budget helper
  const saveBudget = (type: 'living' | 'dca' | string, val: number) => {
    if (type === 'living') {
      setLivingBudget(val);
      localStorage.setItem('mb_living_budget', String(val));
    } else if (type === 'dca') {
      setDcaBudget(val);
      localStorage.setItem('mb_dca_budget', String(val));
    } else {
      const updated = { ...categoryBudgets, [type]: val };
      setCategoryBudgets(updated);
      localStorage.setItem('mb_category_budgets', JSON.stringify(updated));
    }
    setEditingBudget(null);
  };

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
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 0);
    return () => clearTimeout(timer);
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

  // Advanced Summary (using all transactions in the current month)
  const advancedSummary = useMemo(() => {
    return calculateAdvancedSummary(transactions, currentDate);
  }, [transactions, currentDate]);

  // Category spent amounts for the WHOLE month
  const categoryMonthlySpent = useMemo(() => {
    const breakdownAll = calculateCategoryBreakdown(transactions, 'expense');
    const result: Record<string, number> = {};
    for (const item of breakdownAll) {
      result[item.category] = item.amount;
    }
    return result;
  }, [transactions]);

  // Add/delete reminder functions
  const handleAddReminder = () => {
    if (!newReminderName || !newReminderAmount) return;
    const updated = [
      ...reminders,
      {
        id: 'r_' + Date.now(),
        name: newReminderName,
        amount: Number(newReminderAmount),
        day_of_month: Number(newReminderDay),
        active: true
      }
    ];
    setReminders(updated);
    localStorage.setItem('mb_reminders', JSON.stringify(updated));
    setNewReminderName('');
    setNewReminderAmount('');
    setShowAddReminder(false);
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('mb_reminders', JSON.stringify(updated));
  };

  const handleToggleReminder = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setReminders(updated);
    localStorage.setItem('mb_reminders', JSON.stringify(updated));
  };

  // Add/delete record functions
  const handleAddRecord = () => {
    if (!newRecordName || !newRecordAmount) return;
    const updated = [
      ...records,
      {
        id: 'rc_' + Date.now(),
        name: newRecordName,
        amount: Number(newRecordAmount),
        date: format(selectedDay || currentDate, 'yyyy-MM-dd'),
        type: newRecordType
      }
    ];
    setRecords(updated);
    localStorage.setItem('mb_records', JSON.stringify(updated));
    setNewRecordName('');
    setNewRecordAmount('');
    setShowAddRecord(false);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('mb_records', JSON.stringify(updated));
  };

  // Handle Note edits
  const handleSaveNote = (type: 'selected' | 'monthly' | 'investment') => {
    if (type === 'selected' && selectedDay) {
      const key = format(selectedDay, 'yyyy-MM-dd');
      const updated = { ...dateNotes, [key]: noteEditValue };
      setDateNotes(updated);
      localStorage.setItem('mb_date_notes', JSON.stringify(updated));
    } else if (type === 'monthly') {
      const key = format(currentDate, 'yyyy-MM');
      const updated = { ...monthlyNotes, [key]: noteEditValue };
      setMonthlyNotes(updated);
      localStorage.setItem('mb_monthly_notes', JSON.stringify(updated));
    } else if (type === 'investment') {
      setInvestmentNotes(noteEditValue);
      localStorage.setItem('mb_inv_notes', noteEditValue);
    }
    setEditingNoteType(null);
  };

  const startEditingNote = (type: 'selected' | 'monthly' | 'investment') => {
    setEditingNoteType(type);
    if (type === 'selected' && selectedDay) {
      setNoteEditValue(dateNotes[format(selectedDay, 'yyyy-MM-dd')] || '');
    } else if (type === 'monthly') {
      setNoteEditValue(monthlyNotes[format(currentDate, 'yyyy-MM')] || '');
    } else if (type === 'investment') {
      setNoteEditValue(investmentNotes);
    }
  };

  // Filter investment records / reminders for selected day or monthly notes list
  const filteredRecords = useMemo(() => {
    const currentMonthStr = format(currentDate, 'yyyy-MM');
    return records.filter(rc => rc.date.startsWith(currentMonthStr));
  }, [records, currentDate]);

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
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold text-text-primary">
                  {language === 'th' ? 'รายรับทั้งหมด' : 'Total Salary'}
                </span>
                <div className="flex items-center gap-1 text-income-green bg-income-green/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <ArrowUpRight size={10} />
                  <span>INCOME</span>
                </div>
              </div>

              <div className="text-[11px] font-medium text-text-muted opacity-65 mb-2 leading-none">
                Bank Account ••••1965
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[30px] font-bold text-income-green tracking-tight leading-none">
                  {formatCurrency(totalIncome)}
                </span>
              </div>

              <div className="text-[12px] font-medium text-text-muted mt-1 leading-none">
                {language === 'th' ? 'ยอดรวมเดือนนี้' : 'Total income this month'}
              </div>
            </div>

            {/* Total Expense Card */}
            <div className="relative overflow-hidden p-3.5 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col h-[116px] transition-transform duration-200 hover:scale-[1.02] shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold text-text-primary">
                  {language === 'th' ? 'รายจ่ายทั้งหมด' : 'Total Expense'}
                </span>
                <div className="flex items-center gap-1 text-expense-red bg-expense-red/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <ArrowDownLeft size={10} />
                  <span>EXPENSE</span>
                </div>
              </div>

              <div className="text-[11px] font-medium text-text-muted opacity-65 mb-2 leading-none">
                Bank Account ••••1965
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <span className="text-[30px] font-bold text-expense-red tracking-tight leading-none">
                  {formatCurrency(totalExpense)}
                </span>
              </div>

              <div className="text-[12px] font-medium text-text-muted mt-1 leading-none">
                {language === 'th' ? 'ยอดรวมเดือนนี้' : 'Total spent this month'}
              </div>
            </div>
          </div>

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

          {breakdown.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider pl-1">
                Category Share
              </h3>
              <CategoryBreakdown data={breakdown} />
            </div>
          )}

          <div className="p-4 w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <TrendChart transactions={filteredTransactions} />
          </div>

          <div className="p-4 w-full bg-bg-secondary border border-[#111827]/[0.08] dark:border-border/40 rounded-[18px] shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <LineChart transactions={filteredTransactions} />
          </div>
        </div>
      ) : activeTab === 'budget' ? (
        /* Budget Tab */
        <div className="flex flex-col gap-6 animate-scale-in">
          {/* Budget Overview Cards */}
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {/* Living Expense Budget */}
            <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-2 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider">Living Expense</span>
                <button 
                  onClick={() => {
                    setEditingBudget('living');
                    setEditValue(String(livingBudget));
                  }}
                  className="p-1 hover:bg-secondary/40 rounded-lg text-text-muted transition"
                >
                  <Edit3 size={12} />
                </button>
              </div>

              {editingBudget === 'living' ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-bg-primary border border-border/40 rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                    autoFocus
                  />
                  <button 
                    onClick={() => saveBudget('living', Number(editValue))}
                    className="p-1 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-light transition"
                  >
                    <Check size={12} />
                  </button>
                  <button 
                    onClick={() => setEditingBudget(null)}
                    className="p-1 bg-secondary/40 text-text-secondary rounded-lg hover:bg-secondary/60 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xl font-black text-text-primary tracking-tight">
                    {formatCurrency(livingBudget)}
                  </span>
                  <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
                    <span>Spent: {formatCurrency(advancedSummary.monthly.livingExpense)}</span>
                    <span className={livingBudget - advancedSummary.monthly.livingExpense < 0 ? 'text-expense-red font-bold' : 'text-income-green'}>
                      {livingBudget - advancedSummary.monthly.livingExpense < 0 ? 'Over' : 'Left'}: {formatCurrency(Math.abs(livingBudget - advancedSummary.monthly.livingExpense))}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary/20 h-2.5 rounded-full overflow-hidden mt-2.5 border border-border/10">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        (advancedSummary.monthly.livingExpense / livingBudget) >= 1.0 
                          ? 'bg-expense-red' 
                          : (advancedSummary.monthly.livingExpense / livingBudget) >= 0.85 
                            ? 'bg-yellow-500' 
                            : 'bg-accent-purple'
                      }`}
                      style={{ width: `${Math.min((advancedSummary.monthly.livingExpense / livingBudget) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Status alert state */}
                  <div className="mt-2 flex items-center gap-1">
                    {(advancedSummary.monthly.livingExpense / livingBudget) >= 1.0 ? (
                      <span className="text-[9px] font-extrabold text-expense-red bg-expense-red/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                        <AlertTriangle size={8} /> Exceeded Budget!
                      </span>
                    ) : (advancedSummary.monthly.livingExpense / livingBudget) >= 0.85 ? (
                      <span className="text-[9px] font-extrabold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <AlertCircle size={8} /> Near Limit!
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold text-income-green bg-income-green/10 px-2 py-0.5 rounded-full">
                        Healthy State
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Investment DCA Plan */}
            <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-2 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider">Investment DCA Target</span>
                <button 
                  onClick={() => {
                    setEditingBudget('dca');
                    setEditValue(String(dcaBudget));
                  }}
                  className="p-1 hover:bg-secondary/40 rounded-lg text-text-muted transition"
                >
                  <Edit3 size={12} />
                </button>
              </div>

              {editingBudget === 'dca' ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-bg-primary border border-border/40 rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                    autoFocus
                  />
                  <button 
                    onClick={() => saveBudget('dca', Number(editValue))}
                    className="p-1 bg-accent-purple text-white rounded-lg hover:bg-accent-purple-light transition"
                  >
                    <Check size={12} />
                  </button>
                  <button 
                    onClick={() => setEditingBudget(null)}
                    className="p-1 bg-secondary/40 text-text-secondary rounded-lg hover:bg-secondary/60 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xl font-black text-text-primary tracking-tight">
                    {formatCurrency(dcaBudget)}
                  </span>
                  <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
                    <span>Invested: {formatCurrency(advancedSummary.monthly.dca)}</span>
                    <span className="text-accent-purple font-semibold">
                      {Math.max(0, dcaBudget - advancedSummary.monthly.dca) === 0 ? 'Done' : `Left: ${formatCurrency(dcaBudget - advancedSummary.monthly.dca)}`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary/20 h-2.5 rounded-full overflow-hidden mt-2.5 border border-border/10">
                    <div 
                      className="h-full rounded-full bg-income-green transition-all duration-300"
                      style={{ width: `${Math.min((advancedSummary.monthly.dca / dcaBudget) * 100, 100)}%` }}
                    />
                  </div>

                  {/* Bottom helper badge */}
                  <div className="mt-2 flex">
                    {advancedSummary.monthly.dca >= dcaBudget ? (
                      <span className="text-[9px] font-extrabold text-income-green bg-income-green/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <TrendingUp size={8} /> DCA Goal Met!
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold text-text-muted bg-secondary/40 px-2 py-0.5 rounded-full">
                        In Progress ({Math.round((advancedSummary.monthly.dca / dcaBudget) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Budgets */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider pl-1">
              Category Budgets
            </h3>
            
            <div className="flex flex-col gap-2.5">
              {EXPENSE_CATEGORIES.filter(cat => cat.id !== 'other' || categoryBudgets[cat.id]).map((cat) => {
                const spent = categoryMonthlySpent[cat.id] || 0;
                const budget = categoryBudgets[cat.id] || 0;
                const percent = budget > 0 ? (spent / budget) * 100 : 0;
                const isEditing = editingBudget === cat.id;

                return (
                  <div 
                    key={cat.id}
                    className="p-3.5 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-2 shadow-[0_2px_8px_rgba(17,24,39,0.02)]"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary capitalize">{t(`category.${cat.id}`)}</span>
                        {budget > 0 && percent >= 100 && (
                          <span className="text-[8px] font-extrabold text-white bg-expense-red px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            Over Limit
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 bg-bg-primary border border-border/40 rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
                              autoFocus
                            />
                            <button 
                              onClick={() => saveBudget(cat.id, Number(editValue))}
                              className="p-1 text-income-green hover:bg-secondary/40 rounded transition"
                            >
                              <Check size={10} />
                            </button>
                            <button 
                              onClick={() => setEditingBudget(null)}
                              className="p-1 text-text-muted hover:bg-secondary/40 rounded transition"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[11px] font-bold text-text-primary">
                              {formatCurrency(spent)} <span className="text-text-muted font-normal">/ {budget > 0 ? formatCurrency(budget) : 'No Budget'}</span>
                            </span>
                            <button 
                              onClick={() => {
                                setEditingBudget(cat.id);
                                setEditValue(String(budget));
                              }}
                              className="p-1 hover:bg-secondary/40 rounded text-text-muted transition"
                            >
                              <Edit3 size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {budget > 0 && (
                      <div className="w-full bg-secondary/15 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${percent >= 100 ? 'bg-expense-red' : percent >= 85 ? 'bg-yellow-500' : 'bg-accent-purple'}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Record/Note Tab */
        <div className="flex flex-col gap-5 animate-scale-in">
          {/* Notes for selected date */}
          <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-3 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <div className="flex justify-between items-center pb-2 border-b border-border/10">
              <h3 className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <Notebook size={14} className="text-accent-purple" />
                <span>Selected Date Notes</span>
              </h3>
              {selectedDay ? (
                <button
                  onClick={() => startEditingNote('selected')}
                  className="p-1 hover:bg-secondary/40 rounded-lg text-text-muted transition flex items-center gap-1 text-[10px]"
                >
                  <Edit3 size={11} /> Edit Note
                </button>
              ) : (
                <span className="text-[10px] text-text-muted italic">Select date on calendar</span>
              )}
            </div>

            {selectedDay ? (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold text-text-muted">
                  DATE: {format(selectedDay, 'yyyy-MM-dd')}
                </div>
                
                {/* Editable User Note */}
                {editingNoteType === 'selected' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={noteEditValue}
                      onChange={(e) => setNoteEditValue(e.target.value)}
                      placeholder="Type your notes for this day..."
                      className="w-full bg-bg-primary border border-border/40 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => handleSaveNote('selected')}
                        className="px-2.5 py-1 text-[10px] bg-accent-purple text-white rounded-lg hover:bg-accent-purple-light transition flex items-center gap-0.5"
                      >
                        <Check size={10} /> Save
                      </button>
                      <button 
                        onClick={() => setEditingNoteType(null)}
                        className="px-2.5 py-1 text-[10px] bg-secondary/40 text-text-secondary rounded-lg hover:bg-secondary/60 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  dateNotes[format(selectedDay, 'yyyy-MM-dd')] && (
                    <p className="text-xs text-text-primary bg-secondary/10 p-2.5 rounded-xl border border-border/10 leading-relaxed">
                      {dateNotes[format(selectedDay, 'yyyy-MM-dd')]}
                    </p>
                  )
                )}

                {/* Transaction Automatic Notes */}
                {filteredTransactions.filter(t => t.note).length > 0 ? (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider">Transaction Records</span>
                    <ul className="flex flex-col gap-1">
                      {filteredTransactions.filter(t => t.note).map((tx) => (
                        <li key={tx.id} className="text-xs text-text-secondary flex justify-between bg-bg-primary/50 px-2.5 py-1.5 rounded-lg border border-border/10">
                          <span>{tx.note}</span>
                          <span className="font-semibold text-text-primary">{formatCurrency(tx.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  !dateNotes[format(selectedDay, 'yyyy-MM-dd')] && !editingNoteType && (
                    <p className="text-xs text-text-muted italic py-1">No notes recorded for this date.</p>
                  )
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic py-1">Please select a specific date on the calendar above to view or write notes.</p>
            )}
          </div>

          {/* Monthly notes & Investment notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {/* General Monthly Note */}
            <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-3 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
              <div className="flex justify-between items-center pb-2 border-b border-border/10">
                <h3 className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                  <Notebook size={14} className="text-accent-purple" />
                  <span>Monthly General Notes</span>
                </h3>
                <button
                  onClick={() => startEditingNote('monthly')}
                  className="p-1 hover:bg-secondary/40 rounded-lg text-text-muted transition"
                >
                  <Edit3 size={11} />
                </button>
              </div>

              {editingNoteType === 'monthly' ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={noteEditValue}
                    onChange={(e) => setNoteEditValue(e.target.value)}
                    placeholder="General plans or note for this month..."
                    className="w-full bg-bg-primary border border-border/40 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple min-h-[60px]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={() => handleSaveNote('monthly')}
                      className="px-2.5 py-1 text-[10px] bg-accent-purple text-white rounded-lg hover:bg-accent-purple-light transition flex items-center gap-0.5"
                    >
                      <Check size={10} /> Save
                    </button>
                    <button 
                      onClick={() => setEditingNoteType(null)}
                      className="px-2.5 py-1 text-[10px] bg-secondary/40 text-text-secondary rounded-lg hover:bg-secondary/60 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-primary leading-relaxed">
                  {monthlyNotes[format(currentDate, 'yyyy-MM')] || (
                    <span className="text-text-muted italic">No general notes for this month. Write down your financial target or limits!</span>
                  )}
                </p>
              )}
            </div>

            {/* Investment Notes */}
            <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-3 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
              <div className="flex justify-between items-center pb-2 border-b border-border/10">
                <h3 className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-accent-purple" />
                  <span>Investment Planning Notes</span>
                </h3>
                <button
                  onClick={() => startEditingNote('investment')}
                  className="p-1 hover:bg-secondary/40 rounded-lg text-text-muted transition"
                >
                  <Edit3 size={11} />
                </button>
              </div>

              {editingNoteType === 'investment' ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={noteEditValue}
                    onChange={(e) => setNoteEditValue(e.target.value)}
                    placeholder="Asset allocation targets, portfolios DCA, etc..."
                    className="w-full bg-bg-primary border border-border/40 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple min-h-[60px]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={() => handleSaveNote('investment')}
                      className="px-2.5 py-1 text-[10px] bg-accent-purple text-white rounded-lg hover:bg-accent-purple-light transition flex items-center gap-0.5"
                    >
                      <Check size={10} /> Save
                    </button>
                    <button 
                      onClick={() => setEditingNoteType(null)}
                      className="px-2.5 py-1 text-[10px] bg-secondary/40 text-text-secondary rounded-lg hover:bg-secondary/60 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-primary leading-relaxed">
                  {investmentNotes || (
                    <span className="text-text-muted italic">Add investment targets, allocations, or long term portfolios targets here.</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Reminders list */}
          <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-3 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <div className="flex justify-between items-center pb-2 border-b border-border/10">
              <h3 className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <Bell size={14} className="text-accent-purple" />
                <span>Monthly DCA Reminders</span>
              </h3>
              <button
                onClick={() => setShowAddReminder(!showAddReminder)}
                className="p-1 hover:bg-secondary/40 rounded-lg text-accent-purple transition flex items-center gap-0.5 text-[10px] font-bold"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {showAddReminder && (
              <div className="p-3 bg-secondary/10 border border-border/10 rounded-xl flex flex-col gap-2.5 animate-scale-in">
                <span className="text-[10px] font-bold text-text-secondary">ADD NEW DCA REMINDER</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Asset Name"
                    value={newReminderName}
                    onChange={(e) => setNewReminderName(e.target.value)}
                    className="bg-bg-primary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newReminderAmount}
                    onChange={(e) => setNewReminderAmount(e.target.value)}
                    className="bg-bg-primary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Day of Month (1-28)"
                    value={newReminderDay}
                    onChange={(e) => setNewReminderDay(e.target.value)}
                    className="bg-bg-primary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-1.5">
                  <button 
                    onClick={handleAddReminder}
                    className="px-3 py-1 bg-accent-purple text-white rounded-lg text-[10px] font-bold"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setShowAddReminder(false)}
                    className="px-3 py-1 bg-secondary/40 text-text-secondary rounded-lg text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {reminders.length > 0 ? (
              <div className="flex flex-col gap-2">
                {reminders.map((rem) => (
                  <div key={rem.id} className="flex justify-between items-center p-2.5 bg-bg-primary/50 border border-border/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={rem.active}
                        onChange={() => handleToggleReminder(rem.id)}
                        className="accent-accent-purple rounded"
                      />
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold text-text-primary ${!rem.active ? 'line-through opacity-50' : ''}`}>{rem.name}</span>
                        <span className="text-[10px] text-text-muted">Day {rem.day_of_month} of month</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-accent-purple">{formatCurrency(rem.amount)}</span>
                      <button 
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-lg transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic py-1">No monthly reminders set.</p>
            )}
          </div>

          {/* Investment records list */}
          <div className="p-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex flex-col gap-3 shadow-[0_6px_20px_rgba(17,24,39,0.04)]">
            <div className="flex justify-between items-center pb-2 border-b border-border/10">
              <h3 className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                <TrendingUp size={14} className="text-accent-purple" />
                <span>Investment Records (This Month)</span>
              </h3>
              <button
                onClick={() => setShowAddRecord(!showAddRecord)}
                className="p-1 hover:bg-secondary/40 rounded-lg text-accent-purple transition flex items-center gap-0.5 text-[10px] font-bold"
              >
                <Plus size={12} /> Add Record
              </button>
            </div>

            {showAddRecord && (
              <div className="p-3 bg-secondary/10 border border-border/10 rounded-xl flex flex-col gap-2.5 animate-scale-in">
                <span className="text-[10px] font-bold text-text-secondary">ADD INVESTMENT TRANSACTION RECORD</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Asset/Plan"
                    value={newRecordName}
                    onChange={(e) => setNewRecordName(e.target.value)}
                    className="bg-bg-primary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newRecordAmount}
                    onChange={(e) => setNewRecordAmount(e.target.value)}
                    className="bg-bg-primary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  />
                  <select
                    value={newRecordType}
                    onChange={(e) => setNewRecordType(e.target.value as 'buy' | 'sell' | 'dividend')}
                    className="bg-bg-primary border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
                  >
                    <option value="buy">Buy (DCA)</option>
                    <option value="sell">Sell</option>
                    <option value="dividend">Dividend</option>
                  </select>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button 
                    onClick={handleAddRecord}
                    className="px-3 py-1 bg-accent-purple text-white rounded-lg text-[10px] font-bold"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setShowAddRecord(false)}
                    className="px-3 py-1 bg-secondary/40 text-text-secondary rounded-lg text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {filteredRecords.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredRecords.map((rec) => (
                  <div key={rec.id} className="flex justify-between items-center p-2.5 bg-bg-primary/50 border border-border/10 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text-primary">{rec.name}</span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider">{rec.date} • {rec.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-extrabold ${rec.type === 'dividend' ? 'text-income-green' : rec.type === 'sell' ? 'text-accent-purple-light' : 'text-text-primary'}`}>
                        {rec.type === 'dividend' ? '+' : rec.type === 'sell' ? '+' : '-'}{formatCurrency(rec.amount)}
                      </span>
                      <button 
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-lg transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic py-1">No transaction records set for this month.</p>
            )}
          </div>
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

