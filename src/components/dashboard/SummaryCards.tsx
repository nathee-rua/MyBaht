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
      <div className="summary-card flex flex-col justify-between h-[116px] p-3.5 rounded-[18px] transition-transform duration-200 hover:scale-[1.02] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
        <div className="flex items-center justify-between text-income-green">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-90">
            {t('transaction.income')}
          </span>
          <div className="p-0.5 rounded-full bg-income-green/10 flex items-center justify-center">
            <ArrowUpRight size={14} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center mt-1">
          <span className="text-[18px] sm:text-[22px] md:text-[28px] font-bold text-income-green tracking-tight leading-none truncate w-full">
            {formatCurrency(income).replace('THB', '').trim()}
          </span>
        </div>
      </div>

      {/* Outcome Card */}
      <div className="summary-card flex flex-col justify-between h-[116px] p-3.5 rounded-[18px] transition-transform duration-200 hover:scale-[1.02] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
        <div className="flex items-center justify-between text-expense-red">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-90">
            {t('transaction.outcome')}
          </span>
          <div className="p-0.5 rounded-full bg-expense-red/10 flex items-center justify-center">
            <ArrowDownRight size={14} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center mt-1">
          <span className="text-[18px] sm:text-[22px] md:text-[28px] font-bold text-expense-red tracking-tight leading-none truncate w-full">
            {formatCurrency(expense).replace('THB', '').trim()}
          </span>
        </div>
      </div>

      {/* Total/Net Card */}
      <div className="summary-card flex flex-col justify-between h-[116px] p-3.5 rounded-[18px] transition-transform duration-200 hover:scale-[1.02] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
        <div className="flex items-center justify-between text-total-purple">
          <span className="text-[11px] font-medium tracking-wide uppercase opacity-90">
            {t('summary.net')}
          </span>
          <div className="p-0.5 rounded-full bg-total-purple/10 flex items-center justify-center">
            <Wallet size={13} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center mt-1">
          <span className={`text-[18px] sm:text-[22px] md:text-[28px] font-bold tracking-tight leading-none truncate w-full ${
            total >= 0 ? 'text-total-purple' : 'text-expense-red'
          }`}>
            {formatCurrency(total).replace('THB', '').trim()}
          </span>
        </div>
      </div>
    </div>
  );
}
