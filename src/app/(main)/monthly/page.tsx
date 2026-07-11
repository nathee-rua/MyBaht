'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, ChevronRight, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

  const getMonthName = (monthIndex: number) => {
    const d = new Date(currentYear.getFullYear(), monthIndex, 1);
    return d.toLocaleDateString(undefined, { month: 'long' });
  };

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-text-primary">Monthly Overview</h1>
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
              <div key={monthIndex} className="card-base p-4 flex flex-col gap-3 hover:border-border-light transition cursor-pointer">
                {/* Month Name and Totals */}
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-text-primary capitalize">{getMonthName(monthIndex)}</h3>
                  <ChevronRight size={16} className="text-text-muted" />
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border/10 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-income-green/10 text-income-green">
                      <TrendingUp size={14} />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Income</span>
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
                      <span className="text-[10px] text-text-muted block">Outcome</span>
                      <span className="text-xs font-bold text-expense-red">
                        {formatCurrency(expense).replace('THB', '').trim()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button onClick={() => setShowAddDialog(true)} className="fab">
        <Plus size={24} />
      </button>

      {/* Add Dialog */}
      <AddTransactionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}
