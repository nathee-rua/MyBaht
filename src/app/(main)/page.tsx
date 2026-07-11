'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Star, Menu, Plus, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getTransactions } from '@/lib/expenses';
import type { Transaction, DateFilter } from '@/types';
import DateSelector from '@/components/dashboard/DateSelector';
import SummaryCards from '@/components/dashboard/SummaryCards';
import TransactionList from '@/components/dashboard/TransactionList';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardPage() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          {showSearch ? (
            <div className="flex-1 relative animate-fade-in">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
              <input
                id="dashboard-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, categories..."
                className="w-full bg-secondary/50 border border-border/40 rounded-xl py-2 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
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
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text-primary">{t('transaction.title')}</h1>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
                >
                  <Search size={20} style={{ color: '#9CA3AF' }} />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
                >
                  <Star size={20} style={{ color: '#9CA3AF' }} />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
                >
                  <Menu size={20} style={{ color: '#9CA3AF' }} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Date Selector */}
        <DateSelector
          filter={dateFilter}
          setFilter={setDateFilter}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />

        {/* Summary Cards */}
        <SummaryCards income={income} expense={expense} total={total} />
      </div>

      {/* Transaction List */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: '#7C3AED' }} />
          </div>
        ) : (
          <TransactionList
            transactions={filteredTransactions}
            onEditTransaction={handleEditTx}
            onDeleteTransaction={fetchTransactions}
          />
        )}
      </div>

      {/* FAB */}
      <button
        id="add-transaction-fab"
        type="button"
        className="fab"
        onClick={() => {
          setEditingTx(null);
          setShowAddDialog(true);
        }}
      >
        <Plus size={28} />
      </button>

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
    </div>
  );
}
