'use client';

import React from 'react';
import { MoreVertical, UtensilsCrossed, Car, ShoppingBag, Receipt, Gamepad2, Heart, GraduationCap, MoreHorizontal, Banknote, Gift, TrendingUp, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Transaction } from '@/types';
import { getCategoryInfo } from '@/lib/expenses';

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Icon mapping helper
const IconMap: Record<string, React.ComponentType<any>> = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Banknote,
  Gift,
  TrendingUp,
  Plus,
};

export default function TransactionItem({
  transaction,
  onClick,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const { t, formatCurrency } = useI18n();
  const catInfo = getCategoryInfo(transaction.category);
  const IconComponent = IconMap[catInfo.icon] || MoreHorizontal;
  const isExpense = transaction.kind === 'expense';

  return (
    <div
      onClick={onClick}
      className="transaction-item flex items-center justify-between border-b border-border/10 last:border-0 cursor-pointer hover:bg-secondary/10 px-2 py-2 rounded-2xl transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Category Icon */}
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${catInfo.color}15`, border: `1px solid ${catInfo.color}25` }}
        >
          <IconComponent size={20} color={catInfo.color} />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <h4 className="text-[13px] sm:text-[14px] font-semibold text-text-primary truncate">
              {t(`category.${transaction.category}`)}
            </h4>
            {transaction.note && (
              <span className="text-[11px] text-text-muted truncate max-w-[120px] md:max-w-[200px] font-normal opacity-85">
                • {transaction.note}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 leading-none">
            <span className="text-[10px] text-text-secondary/70 font-semibold tracking-wider uppercase">
              {t(`payment.${transaction.payment_method}`)}
            </span>
            {transaction.merchant && (
              <span className="text-[10px] text-text-secondary/50 font-normal truncate">
                @{transaction.merchant}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount and Action */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[14px] sm:text-[15px] font-bold font-mono tracking-tight ${
          isExpense ? 'text-expense-red' : 'text-income-green'
        }`}>
          {isExpense ? '−' : '+'}
          {formatCurrency(Number(transaction.amount)).replace('THB', '').trim()}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) onEdit();
          }}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-secondary/40 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center flex-shrink-0"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
}
