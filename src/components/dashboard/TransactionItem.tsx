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
      className="transaction-item flex items-center justify-between border-b border-border/20 last:border-0"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Category Icon */}
        <div
          className="category-icon text-white"
          style={{ backgroundColor: `${catInfo.color}20`, border: `1px solid ${catInfo.color}40` }}
        >
          <IconComponent size={20} color={catInfo.color} />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="text-[14px] font-bold text-text-primary truncate">
              {t(`category.${transaction.category}`)}
            </h4>
            {transaction.note && (
              <span className="text-[11px] text-text-secondary truncate max-w-[120px] md:max-w-[200px]">
                • {transaction.note}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-text-muted capitalize">
              {t(`payment.${transaction.payment_method}`)}
            </span>
            {transaction.merchant && (
              <span className="text-[11px] text-text-muted truncate">
                @{transaction.merchant}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount and Action */}
      <div className="flex items-center gap-2">
        <span className={`text-[14px] font-bold ${
          isExpense ? 'text-expense-red' : 'text-income-green'
        }`}>
          {isExpense ? '-' : '+'}
          {formatCurrency(Number(transaction.amount)).replace('THB', '').trim()}
        </span>
        <div className="relative group">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
            }}
            className="p-1 text-text-muted hover:text-text-primary rounded-lg transition"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
