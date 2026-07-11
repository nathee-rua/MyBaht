'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ChevronDown, Sparkles, Plus, Camera } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getTransactions, calculateCategoryBreakdown, createTransaction } from '@/lib/expenses';
import type { Transaction, DateFilter, SlipAnalysisResult } from '@/types';
import DateSelector from '@/components/dashboard/DateSelector';
import TransactionList from '@/components/dashboard/TransactionList';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import ScanSlipDialog from '@/components/ai/ScanSlipDialog';
import PasteTextDialog from '@/components/ai/PasteTextDialog';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface Account {
  name: string;
  gradient: string;
  cardNumber: string;
  iconType: 'all' | 'cash' | 'bank' | 'credit';
  method: 'all' | 'cash' | 'bank' | 'credit_card';
}

const ACCOUNTS: Account[] = [
  {
    name: 'All Accounts',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
    cardNumber: '•••• •••• •••• 8888',
    iconType: 'all',
    method: 'all',
  },
  {
    name: 'Cash Account',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    cardNumber: '•••• •••• •••• 1111',
    iconType: 'cash',
    method: 'cash',
  },
  {
    name: 'Bank Account',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    cardNumber: '•••• •••• •••• 8635',
    iconType: 'bank',
    method: 'bank',
  },
  {
    name: 'Credit Card',
    gradient: 'linear-gradient(135deg, #FF6B4A 0%, #EF4444 100%)',
    cardNumber: '•••• •••• •••• 9999',
    iconType: 'credit',
    method: 'credit_card',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { language, t, formatCurrency } = useI18n();
  const [username, setUsername] = useState('User');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Accounts Carousel State
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  // Horizontal Scrollable Filter Pills State
  const [timeframe, setTimeframe] = useState<'month' | 'week' | 'today'>('month');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('All Prices');


  // Load username
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const emailName = user.email?.split('@')[0] || 'User';
          setUsername(emailName);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    };
    loadUser();
  }, []);

  // Listen to bottom navigation center plus button event
  useEffect(() => {
    const handleOpenAddTx = () => {
      setEditingTx(null);
      setShowAddDialog(true);
    };
    window.addEventListener('open-add-transaction', handleOpenAddTx);
    return () => window.removeEventListener('open-add-transaction', handleOpenAddTx);
  }, []);

  const getDateRange = useCallback(() => {
    let start: Date;
    let end: Date;

    switch (dateFilter) {
      case 'daily':
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case 'weekly':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'calendar':
      default:
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [dateFilter, currentDate]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const data = await getTransactions({ startDate, endDate });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  // Run fetchTransactions asynchronously to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchTransactions();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchTransactions]);

  const handleTimeframeChange = (value: 'month' | 'week' | 'today') => {
    if (value === 'today') {
      setDateFilter('daily');
      setCurrentDate(new Date());
    } else if (value === 'week') {
      setDateFilter('weekly');
      setCurrentDate(new Date());
    } else if (value === 'month') {
      setDateFilter('monthly');
      setCurrentDate(new Date());
    }
  };

  const handleScanSuccess = async (scannedData: SlipAnalysisResult) => {
    try {
      await createTransaction({
        kind: 'expense',
        amount: Number(scannedData.amount) || 0,
        category: scannedData.category || 'other',
        note: scannedData.note || scannedData.merchant || 'Scanned Slip',
        merchant: scannedData.merchant || '',
        payment_method: scannedData.payment_method || 'cash',
        date: scannedData.date || format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Slip scanned and saved successfully!');
      fetchTransactions();
    } catch (err) {
      console.error('Failed to create transaction from slip:', err);
      toast.error('Failed to save scanned slip');
    }
  };

  const handlePasteSuccess = async (parsedData: any) => {
    try {
      await createTransaction({
        kind: 'expense',
        amount: Number(parsedData.amount) || 0,
        category: parsedData.category || 'other',
        note: parsedData.note || parsedData.merchant || 'Pasted Notification',
        merchant: parsedData.merchant || '',
        payment_method: parsedData.payment_method || 'cash',
        date: parsedData.date || format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Alert parsed and saved successfully!');
      fetchTransactions();
    } catch (err) {
      console.error('Failed to create transaction from parsed text:', err);
      toast.error('Failed to save parsed transaction');
    }
  };

  // Helper to calculate available balance for a specific payment method
  const getAccountBalance = (accountMethod: 'all' | 'cash' | 'bank' | 'credit_card') => {
    const acctTxs = transactions.filter((tx) => {
      if (accountMethod === 'all') return true;
      return tx.payment_method === accountMethod;
    });

    const incomeSum = acctTxs
      .filter((tx) => tx.kind === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const expenseSum = acctTxs
      .filter((tx) => tx.kind === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return incomeSum - expenseSum;
  };

  // Apply accounts carousel selection and horizontal filter pills
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        tx.note?.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.merchant?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 2. Accounts Carousel Filter
    const activeAccount = ACCOUNTS[selectedAccountIndex];
    if (activeAccount.method !== 'all') {
      if (tx.payment_method !== activeAccount.method) return false;
    }

    // 3. Category Pill Filter
    if (selectedCategory !== 'All Categories') {
      if (tx.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }

    // 4. Price Range Pill Filter
    if (selectedPriceRange !== 'All Prices') {
      const amount = Number(tx.amount);
      if (selectedPriceRange === 'Under ฿500') {
        if (amount >= 500) return false;
      } else if (selectedPriceRange === '฿500 - ฿5,000') {
        if (amount < 500 || amount > 5000) return false;
      } else if (selectedPriceRange === 'Over ฿5,000') {
        if (amount <= 5000) return false;
      }
    }

    return true;
  });

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setShowAddDialog(true);
  };

  // Spending Breakdown data (filtered by selected account, but ignores category/price/search filters)
  const breakdownTransactions = transactions.filter((tx) => {
    const activeAccount = ACCOUNTS[selectedAccountIndex];
    if (activeAccount.method !== 'all' && tx.payment_method !== activeAccount.method) {
      return false;
    }
    return true;
  });
  const breakdown = calculateCategoryBreakdown(breakdownTransactions, 'expense');
  const chartData = breakdown.map((item) => ({
    name: t(`category.${item.category}`),
    value: item.amount,
    color: item.color,
  }));

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (language === 'th') {
      if (hours < 12) return 'สวัสดีตอนเช้า ☀️';
      if (hours < 17) return 'สวัสดีตอนบ่าย 🌤️';
      return 'สวัสดีตอนเย็น 🌙';
    }
    if (hours < 12) return 'Good Morning ☀️';
    if (hours < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  const getFormattedDate = () => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return new Date().toLocaleDateString(locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const activeAccount = ACCOUNTS[selectedAccountIndex];
  const nextAccountIndex = (selectedAccountIndex + 1) % ACCOUNTS.length;
  const nextAccount = ACCOUNTS[nextAccountIndex];

  const timeframeOptions = [
    { label: 'This Month', value: 'month' as const },
    { label: 'This Week', value: 'week' as const },
    { label: 'Today', value: 'today' as const },
  ];

  const categoryOptions = [
    'All Categories',
    'Food',
    'Shopping',
    'Bills',
    'Entertainment',
    'Salary',
  ];

  const priceOptions = [
    'All Prices',
    'Under ฿500',
    '฿500 - ฿5,000',
    'Over ฿5,000',
  ];

  return (
    <div className="flex flex-col min-h-screen page-container">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-5">
          {showSearch ? (
            <div className="flex-1 relative animate-fade-in">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="dashboard-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, categories..."
                className="w-full bg-secondary/50 border border-border/40 rounded-2xl py-2 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-text-primary tracking-tight">{getGreeting()}</h1>
                <span className="text-[11px] text-text-secondary mt-0.5 font-medium">{getFormattedDate()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer text-text-secondary"
                >
                  <Search size={20} />
                </button>
                {/* Profile Avatar */}
                <div 
                  className="w-9 h-9 rounded-full ml-1 border border-accent-purple/40 bg-gradient-to-tr from-accent-purple to-accent-purple-light flex items-center justify-center text-white font-black text-sm uppercase shadow-sm cursor-pointer"
                  onClick={() => router.push('/settings')}
                >
                  {username.charAt(0)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Credit Card / Accounts Carousel widget */}
        <div className="relative mt-2 mb-3 select-none h-[180px] w-full flex items-center overflow-visible">
          {/* Peeking card (next card in array) */}
          <div 
            className="absolute right-0 w-[92%] h-[166px] rounded-[24px] opacity-40 -z-10 cursor-pointer transition-all duration-500 hover:opacity-60"
            style={{ 
              background: nextAccount.gradient,
              transform: 'translateX(6%) scale(0.93) rotate(3deg) skewY(1deg)',
              transformOrigin: 'right center',
              boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={() => setSelectedAccountIndex(nextAccountIndex)}
          >
            {/* Subtle card text peeking */}
            <div className="absolute inset-0 bg-black/5 flex flex-col justify-between p-5 text-white/40">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {nextAccount.name}
                </span>
              </div>
              <span className="text-[12px] font-mono tracking-widest">
                {nextAccount.cardNumber}
              </span>
            </div>
          </div>
          
          {/* Active Card */}
          <div 
            className="w-[90%] h-[176px] rounded-[24px] py-4 px-5 relative overflow-hidden flex flex-col justify-between border border-white/10 transition-all duration-500 shadow-[0_12px_35px_rgba(0,0,0,0.45)]"
            style={{ 
              background: activeAccount.gradient,
            }}
          >
            {/* Glowing pattern orbs */}
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            {/* Top section: chip, balance */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-white/70 uppercase tracking-widest font-black truncate">
                  {activeAccount.name === 'All Accounts' ? t('card.availableBalance') : `${activeAccount.name} Balance`}
                </span>
                <span className="text-2xl font-black text-white mt-0.5 tracking-tight flex items-baseline gap-1 truncate">
                  <span>{formatCurrency(getAccountBalance(activeAccount.method)).replace('THB', '').trim()}</span>
                  <span className="text-xs font-bold opacity-80">THB</span>
                </span>
              </div>
              
              {/* Gold Chip or Cash Icon / Symbol */}
              {activeAccount.iconType === 'cash' ? (
                <div className="w-10 h-7 rounded-md bg-emerald-400/25 border border-emerald-400/40 flex items-center justify-center text-[15px] font-bold text-emerald-300 flex-shrink-0">
                  ฿
                </div>
              ) : (
                <div className="w-10 h-7 rounded-md bg-yellow-400/25 border border-yellow-400/40 flex flex-col gap-0.5 p-1.5 justify-center relative overflow-hidden flex-shrink-0">
                  <div className="w-full h-px bg-yellow-400/30" />
                  <div className="w-full h-px bg-yellow-400/30" />
                  <div className="w-[60%] h-full border-r border-yellow-400/30 absolute left-0 top-0" />
                  <div className="w-[30%] h-full border-l border-yellow-400/30 absolute right-0 top-0" />
                </div>
              )}
            </div>

            {/* Middle section: Card number */}
            <div className="text-[14px] text-white/80 tracking-[0.20em] font-mono my-1 truncate">
              {activeAccount.cardNumber}
            </div>

            {/* Bottom section: Card holder and MasterCard brand circles */}
            <div className="flex items-end justify-between">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[8px] text-white/50 uppercase tracking-wider font-semibold truncate">{t('card.cardHolder')}</span>
                <span className="text-xs font-bold text-white tracking-wide uppercase mt-0.5 truncate">
                  {username}
                </span>
              </div>
              {activeAccount.iconType === 'cash' ? (
                <span className="text-[10px] font-black text-white/95 bg-white/10 px-2 py-0.5 rounded border border-white/10 flex-shrink-0">{t('card.cash')}</span>
              ) : (
                <div className="flex items-center flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-red-500/85 z-10 -mr-2.5" />
                  <div className="w-6 h-6 rounded-full bg-amber-500/85" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicators for Accounts */}
        <div className="flex justify-center gap-1.5 mb-5">
          {ACCOUNTS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedAccountIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                selectedAccountIndex === idx ? 'w-5 bg-accent-purple' : 'w-1.5 bg-text-muted/40 hover:bg-text-muted/70'
              }`}
              title={ACCOUNTS[idx].name}
            />
          ))}
        </div>

        {/* Quick Action Outline Pills */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setShowAddDialog(true);
            }}
            className="py-3.5 px-2 rounded-2xl border text-xs font-black transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md">
              <Plus size={20} strokeWidth={2.5} />
            </div>
            <span>{t('action.addExpense')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScanDialog(true)}
            className="py-3.5 px-2 rounded-2xl border text-xs font-black transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md">
              <Camera size={18} />
            </div>
            <span>{t('action.scanSlip')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteDialog(true)}
            className="py-3.5 px-2 rounded-2xl border text-xs font-black transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <span>{t('action.pasteText')}</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="mb-6">
          <DateSelector
            filter={dateFilter}
            setFilter={setDateFilter}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        </div>

        {/* Spending Breakdown card with chart */}
        <div 
          className="p-5 mb-6" 
          style={{ 
            background: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 20, 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' 
          }}
        >
          <h3 className="text-xs font-black text-text-primary uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Spending Breakdown</span>
            <span className="text-[10px] text-text-muted font-bold lowercase tracking-normal">this period</span>
          </h3>

          {breakdown.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-xs font-medium">
              No outcome recorded for this period
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {/* Category breakdown listing */}
              <div className="flex-1 flex flex-col gap-2.5 pr-2">
                {breakdown.slice(0, 4).map((item) => {
                  const catName = t(`category.${item.category}`);
                  return (
                    <div key={item.category} className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-text-secondary truncate">{catName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 pl-1">
                        <span className="font-bold text-text-primary">
                          {formatCurrency(item.amount).replace('THB', '').trim()}
                        </span>
                        <span className="text-[10px] text-text-muted">({item.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
                {breakdown.length > 4 && (
                  <div className="text-[10px] text-text-muted font-bold pl-4">
                    + {breakdown.length - 4} more categories
                  </div>
                )}
              </div>

              {/* Responsive Donut Chart */}
              <div className="w-[105px] h-[105px] flex-shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Three Dropdown Selectors */}
      <div className="px-4 mb-6 grid grid-cols-3 gap-2.5">
        {/* Timeframe Dropdown */}
        <div className="relative flex items-center w-full">
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value as any)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-full text-[11px] font-extrabold border shadow-sm focus:outline-none cursor-pointer"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {timeframeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-secondary text-text-primary">
                {t(`filter.${opt.value === 'month' ? 'thisMonth' : opt.value === 'week' ? 'thisWeek' : 'today'}`)}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 pointer-events-none text-accent-purple" />
        </div>

        {/* Category Dropdown */}
        <div className="relative flex items-center w-full">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-full text-[11px] font-extrabold border shadow-sm focus:outline-none cursor-pointer"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat} className="bg-bg-secondary text-text-primary">
                {cat === 'All Categories' ? t('filter.allCategories') : t(`category.${cat.toLowerCase()}`)}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 pointer-events-none text-accent-purple" />
        </div>

        {/* Price Range Dropdown */}
        <div className="relative flex items-center w-full">
          <select
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-full text-[11px] font-extrabold border shadow-sm focus:outline-none cursor-pointer"
            style={{
              background: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {priceOptions.map((price) => {
              let label = price;
              if (price === 'All Prices') label = t('filter.allPrices');
              else if (price === 'Under ฿500') label = t('filter.under500');
              else if (price === '฿500 - ฿5,000') label = t('filter.500to5000');
              else if (price === 'Over ฿5,000') label = t('filter.over5000');
              return (
                <option key={price} value={price} className="bg-bg-secondary text-text-primary">
                  {label}
                </option>
              );
            })}
          </select>
          <ChevronDown size={12} className="absolute right-3 pointer-events-none text-accent-purple" />
        </div>
      </div>

      {/* Recent Expenses Header */}
      <div className="px-4 pb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-black text-text-secondary uppercase tracking-wider">
          {t('summary.recent')}
        </h3>
        <button
          type="button"
          onClick={() => router.push('/monthly')}
          className="text-xs font-bold text-accent-purple-light hover:text-accent-purple transition-colors cursor-pointer"
        >
          View All &gt;
        </button>
      </div>

      {/* Transaction List */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-accent-purple" />
          </div>
        ) : (
          <TransactionList
            transactions={filteredTransactions}
            onEditTransaction={handleEditTx}
            onDeleteTransaction={fetchTransactions}
          />
        )}
      </div>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setEditingTx(null);
        }}
        onSuccess={fetchTransactions}
        editTransaction={editingTx}
      />

      {/* Scan Slip Dialog */}
      <ScanSlipDialog
        open={showScanDialog}
        onClose={() => setShowScanDialog(false)}
        onSuccess={handleScanSuccess}
      />

      {/* Paste Text Dialog */}
      <PasteTextDialog
        open={showPasteDialog}
        onClose={() => setShowPasteDialog(false)}
        onSuccess={handlePasteSuccess}
      />
    </div>
  );
}
