'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { Transaction } from '@/types';
import TransactionItem from './TransactionItem';
import { Receipt } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

export default function TransactionList({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionListProps) {
  const { t, formatDate } = useI18n();

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4 border border-border/30">
          <Receipt size={28} className="text-text-muted" />
        </div>
        <p className="text-sm text-text-secondary font-medium">{t('common.noData')}</p>
        <p className="text-xs text-text-muted mt-1">{t('app.tagline')}</p>
      </div>
    );
  }

  // Group transactions by date
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    if (!groups[tx.date]) {
      groups[tx.date] = [];
    }
    groups[tx.date].push(tx);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] pb-8 pr-1">
      {sortedDates.map((date) => {
        const txs = groups[date];
        const dayTotal = txs.reduce((sum, tx) => {
          const val = Number(tx.amount);
          return sum + (tx.kind === 'expense' ? -val : val);
        }, 0);

        return (
          <div 
            key={date} 
            className="p-4 animate-scale-in"
            style={{ 
              background: 'var(--color-bg-secondary)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 20, 
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)' 
            }}
          >
            {/* Group Header */}
            <div className="flex items-center justify-between border-b border-border/10 pb-2 mb-2 text-xs font-semibold text-text-muted">
              <span>{formatDate(date)}</span>
              <span className={dayTotal >= 0 ? 'text-income-green' : 'text-expense-red'}>
                {dayTotal >= 0 ? '+' : ''}
                {dayTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Group Items */}
            <div className="flex flex-col">
              {txs.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onClick={() => onEditTransaction?.(tx)}
                  onEdit={() => onEditTransaction?.(tx)}
                  onDelete={() => onDeleteTransaction?.(tx.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
