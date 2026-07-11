'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, Menu, Plus, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getTransactions, calculateCategoryBreakdown, createTransaction } from '@/lib/expenses';
import type { Transaction, DateFilter } from '@/types';
import DateSelector from '@/components/dashboard/DateSelector';
import TransactionList from '@/components/dashboard/TransactionList';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import ScanSlipDialog from '@/components/ai/ScanSlipDialog';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleScanSuccess = async (scannedData: any) => {
    try {
      await createTransaction({
        kind: 'expense',
        amount: Number(scannedData.amount) || 0,
        category: scannedData.category || 'other',
        note: scannedData.note || scannedData.merchant || 'Scanned Slip',
        merchant: scannedData.merchant || null,
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

  const filteredTransactions = searchQuery
    ? transactions.filter(
        (tx) =>
          tx.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.merchant?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transactions;

  const income = filteredTransactions
    .filter((tx) => tx.kind === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const expense = filteredTransactions
    .filter((tx) => tx.kind === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const total = income - expense;

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setShowAddDialog(true);
  };

  // Spending Breakdown data
  const breakdown = calculateCategoryBreakdown(transactions, 'expense');
  const chartData = breakdown.map((item) => ({
    name: t(`category.${item.category}`),
    value: item.amount,
    color: item.color,
  }));

  const getGreeting = () => {
    const hours = new Date().getHours();
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

  return (
    <div className="flex flex-col min-h-screen page-container">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-5">
          {showSearch ? (
            <div className="flex-1 relative animate-fade-in">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
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

        {/* Credit Card (Available Balance) widget */}
        <div className="relative mt-2 mb-6 select-none">
          {/* Peeking green card stack */}
          <div 
            className="absolute top-1.5 right-1 w-[92%] h-[176px] rounded-[24px] opacity-25 -z-10 rotate-3 transition-transform duration-300"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          />
          
          {/* Main card */}
          <div 
            className="w-full h-[176px] rounded-[24px] p-6 relative overflow-hidden flex flex-col justify-between shadow-[0_12px_35px_rgba(13,11,26,0.55)] border border-white/10"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)' }}
          >
            {/* Glowing pattern orbs */}
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            {/* Top section: chip, balance */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Available Balance</span>
                <span className="text-2xl font-black text-white mt-0.5 tracking-tight flex items-baseline gap-1">
                  <span>{formatCurrency(total).replace('THB', '').trim()}</span>
                  <span className="text-xs font-bold opacity-80">THB</span>
                </span>
              </div>
              {/* Gold Chip */}
              <div className="w-10 h-7 rounded-md bg-yellow-400/25 border border-yellow-400/40 flex flex-col gap-0.5 p-1.5 justify-center relative overflow-hidden">
                <div className="w-full h-px bg-yellow-400/30" />
                <div className="w-full h-px bg-yellow-400/30" />
                <div className="w-[60%] h-full border-r border-yellow-400/30 absolute left-0 top-0" />
                <div className="w-[30%] h-full border-l border-yellow-400/30 absolute right-0 top-0" />
              </div>
            </div>

            {/* Middle section: Card number */}
            <div className="text-[15px] text-white/80 tracking-[0.22em] font-mono mt-3">
              •••• •••• •••• 8635
            </div>

            {/* Bottom section: Card holder and MasterCard brand circles */}
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] text-white/50 uppercase tracking-wider font-semibold">Card Holder</span>
                <span className="text-xs font-bold text-white tracking-wide uppercase mt-0.5 truncate max-w-[150px]">
                  {username}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-6.5 h-6.5 rounded-full bg-red-500/85 z-10 -mr-2.5" />
                <div className="w-6.5 h-6.5 rounded-full bg-amber-500/85" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Outline Pills */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setShowAddDialog(true);
            }}
            className="flex-1 py-3 px-4 rounded-full border border-orange-500/35 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 text-xs font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">+</span>
            <span>Add Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setShowScanDialog(true)}
            className="flex-1 py-3 px-4 rounded-full border border-orange-500/35 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 text-xs font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>📷</span>
            <span>Scan Slip</span>
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
        <div className="card-base p-5 mb-6">
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
    </div>
  );
}
