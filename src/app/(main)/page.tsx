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
  const [aiReady, setAiReady] = useState(false);
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
  const [showPasteDialog, setShowPasteDialog] = useState(false);


  // Load username and AI Ready status
  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const emailName = user.email?.split('@')[0] || 'User';
          setUsername(emailName);

          // Fetch AI settings to check if AI is ready
          const { data: settings } = await supabase
            .from('user_settings')
            .select('ai_provider, ai_model, ai_api_key_encrypted')
            .eq('user_id', user.id)
            .maybeSingle();

          if (settings && settings.ai_provider && settings.ai_model && settings.ai_api_key_encrypted) {
            setAiReady(true);
          }
        }
      } catch (err) {
        console.error('Failed to load user info / AI settings:', err);
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
      <div className="px-4 pt-4 pb-2">
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
                  className="w-9 h-9 rounded-full ml-1 border border-border bg-bg-secondary flex items-center justify-center text-text-primary font-bold text-sm uppercase cursor-pointer"
                  onClick={() => router.push('/settings')}
                >
                  {username.charAt(0)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Simplified Bank-Like Balance Card */}
        <div className="mt-3 mb-6 select-none w-full">
          <div 
            className="w-full h-[154px] rounded-2xl p-[18px] relative overflow-hidden flex flex-col justify-between border border-border/60 transition-all duration-300 shadow-md"
            style={{ 
              background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)', // Premium dark slate card for both light and dark themes
            }}
          >
            {/* Top row: Account Name & AI Ready Badge */}
            <div className="flex justify-between items-center w-full z-10">
              <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider opacity-[0.72]">
                {activeAccount.name === 'All Accounts' ? t('card.availableBalance') : `${activeAccount.name}`}
              </span>
              <div className="flex items-center gap-2">
                {aiReady && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-400 rounded-full select-none">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span>AI READY</span>
                  </div>
                )}
                {activeAccount.iconType === 'cash' ? (
                  <span className="text-[10px] font-bold text-gray-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">{t('card.cash')}</span>
                ) : (
                  <div className="w-8 h-5.5 rounded bg-amber-400/20 border border-amber-400/30 flex flex-col gap-0.5 p-1 justify-center relative overflow-hidden">
                    <div className="w-full h-px bg-amber-400/40" />
                    <div className="w-full h-px bg-amber-400/40" />
                    <div className="w-[60%] h-full border-r border-amber-400/40 absolute left-0 top-0" />
                  </div>
                )}
              </div>
            </div>

            {/* Center Section: Centered balance with large editorial text */}
            <div className="flex flex-col items-center justify-center my-auto z-10">
              <span className="text-[42px] font-bold text-white tracking-tight leading-none flex items-baseline justify-center gap-1.5">
                <span className="text-sm font-semibold text-gray-400">฿</span>
                <span>{formatCurrency(getAccountBalance(activeAccount.method)).replace('THB', '').trim()}</span>
              </span>
            </div>

            {/* Bottom Section: Card holder & card number */}
            <div className="flex justify-between items-end w-full z-10 text-[11px] text-gray-400">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">{t('card.cardHolder')}</span>
                <span className="font-bold text-white tracking-wide uppercase mt-0.5">
                  {username}
                </span>
              </div>
              <div className="font-mono tracking-wider text-right text-gray-300">
                {activeAccount.cardNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Indicators for Accounts */}
        <div className="flex justify-center gap-1.5 mb-8">
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

        {/* Quick Actions (Minimalist Editorial Rounded style) */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setShowAddDialog(true);
            }}
            className="h-[72px] rounded-2xl border border-border/60 text-[14px] font-semibold transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-sm hover:border-accent-purple/50 bg-bg-secondary text-text-primary"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent-purple/10 text-accent-purple flex-shrink-0">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <span className="mt-1">{t('action.addExpense')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScanDialog(true)}
            className="h-[72px] rounded-2xl border border-border/60 text-[14px] font-semibold transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-sm hover:border-accent-purple/50 bg-bg-secondary text-text-primary"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent-purple/10 text-accent-purple flex-shrink-0">
              <Camera size={16} />
            </div>
            <span className="mt-1">{t('action.scanSlip')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteDialog(true)}
            className="h-[72px] rounded-2xl border border-border/60 text-[14px] font-semibold transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-sm hover:border-accent-purple/50 bg-bg-secondary text-text-primary"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent-purple/10 text-accent-purple flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <span className="mt-1">{t('action.pasteText')}</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="px-4 mb-6">
          <DateSelector
            filter={dateFilter}
            setFilter={setDateFilter}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        </div>

        {/* Spending Breakdown card with chart */}
        <div className="px-4 mb-6">
          <div 
            className="p-5" 
            style={{ 
              background: 'var(--color-bg-secondary)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 16, 
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)' 
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
    </div>

      {/* Three Dropdown Selectors (Premium Rounded style) */}
      <div className="px-4 mt-8 mb-3 flex justify-center gap-2 w-full">
        {/* Timeframe Dropdown */}
        <div className="relative flex items-center flex-1 max-w-[125px]">
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value as any)}
            className="w-full h-9 appearance-none pl-3 pr-8 rounded-2xl text-[12px] font-semibold border border-border/60 shadow-sm focus:outline-none cursor-pointer hover:border-accent-purple/60 transition-all"
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {timeframeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-secondary text-text-primary">
                {t(`filter.${opt.value === 'month' ? 'thisMonth' : opt.value === 'week' ? 'thisWeek' : 'today'}`)}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 pointer-events-none text-text-secondary" />
        </div>

        {/* Category Dropdown */}
        <div className="relative flex items-center flex-1 max-w-[125px]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-9 appearance-none pl-3 pr-8 rounded-2xl text-[12px] font-semibold border border-border/60 shadow-sm focus:outline-none cursor-pointer hover:border-accent-purple/60 transition-all"
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat} className="bg-bg-secondary text-text-primary">
                {cat === 'All Categories' ? t('filter.allCategories') : t(`category.${cat.toLowerCase()}`)}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 pointer-events-none text-text-secondary" />
        </div>

        {/* Price Range Dropdown */}
        <div className="relative flex items-center flex-1 max-w-[125px]">
          <select
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="w-full h-9 appearance-none pl-3 pr-8 rounded-2xl text-[12px] font-semibold border border-border/60 shadow-sm focus:outline-none cursor-pointer hover:border-accent-purple/60 transition-all"
            style={{
              background: 'var(--color-bg-secondary)',
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
          <ChevronDown size={14} className="absolute right-3.5 pointer-events-none text-text-secondary" />
        </div>
      </div>

      {/* Subtitle bar / Section header for Recent Transactions (Premium Rounded with Divider) */}
      <div className="px-4 mt-6 mb-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <span className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-accent-purple rounded-full" />
            {t('summary.recent')}
          </span>
          <button
            type="button"
            onClick={() => router.push('/monthly')}
            className="text-xs font-bold text-accent-purple hover:text-accent-purple-light transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{language === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
            <span>&gt;</span>
          </button>
        </div>
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
