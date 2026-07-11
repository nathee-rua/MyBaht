'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface SummaryCardsProps {
  income: number;
  expense: number;
  total: number;
}

export default function SummaryCards({ income, expense, total }: SummaryCardsProps) {
  const { t, formatCurrency } = useI18n();

  return (
    <div className="grid grid-cols-3 gap-3 my-2">
      {/* Income Card */}
      <div className="summary-card summary-card-income flex flex-col justify-between h-[90px]">
        <div className="flex items-center justify-between text-income-green">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-90">
            {t('transaction.income')}
          </span>
          <div className="p-0.5 rounded-full bg-income-green/10">
            <ArrowUpRight size={14} />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-[15px] font-bold text-income-green block truncate">
            {formatCurrency(income).replace('THB', '').trim()}
          </span>
        </div>
      </div>

      {/* Outcome Card */}
      <div className="summary-card summary-card-expense flex flex-col justify-between h-[90px]">
        <div className="flex items-center justify-between text-expense-red">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-90">
            {t('transaction.outcome')}
          </span>
          <div className="p-0.5 rounded-full bg-expense-red/10">
            <ArrowDownRight size={14} />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-[15px] font-bold text-expense-red block truncate">
            {formatCurrency(expense).replace('THB', '').trim()}
          </span>
        </div>
      </div>

      {/* Total/Net Card */}
      <div className="summary-card summary-card-total flex flex-col justify-between h-[90px]">
        <div className="flex items-center justify-between text-total-purple">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-90">
            {t('summary.net')}
          </span>
          <div className="p-0.5 rounded-full bg-total-purple/10">
            <Wallet size={13} />
          </div>
        </div>
        <div className="mt-2">
          <span className={`text-[15px] font-bold block truncate ${
            total >= 0 ? 'text-total-purple' : 'text-expense-red'
          }`}>
            {formatCurrency(total).replace('THB', '').trim()}
          </span>
        </div>
      </div>
    </div>
  );
}
