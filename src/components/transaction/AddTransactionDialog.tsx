'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar as CalendarIcon, Tag, CreditCard, AlignLeft, Sparkles,
  UtensilsCrossed, Car, ShoppingBag, Receipt, Gamepad2, Heart, 
  GraduationCap, MoreHorizontal, Banknote, Gift, TrendingUp, Plus 
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { TransactionKind, Category, PaymentMethod, Transaction } from '@/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/types';
import { createTransaction, updateTransaction, deleteTransaction } from '@/lib/expenses';
import CalculatorKeypad from './CalculatorKeypad';
import { toast } from 'sonner';
import ScanSlipDialog from '@/components/ai/ScanSlipDialog';

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: Transaction | null;
}

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

export default function AddTransactionDialog({
  open,
  onClose,
  onSuccess,
  editTransaction = null,
}: AddTransactionDialogProps) {
  const { t, formatCurrency } = useI18n();
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Category>('food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [showScanDialog, setShowScanDialog] = useState(false);

  useEffect(() => {
    if (editTransaction) {
      setKind(editTransaction.kind);
      setAmount(Number(editTransaction.amount));
      setCategory(editTransaction.category);
      setPaymentMethod(editTransaction.payment_method);
      setDate(editTransaction.date);
      setNote(editTransaction.note || '');
      setMerchant(editTransaction.merchant || '');
    } else {
      setKind('expense');
      setAmount(0);
      setCategory('food');
      setPaymentMethod('cash');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setMerchant('');
    }
  }, [editTransaction, open]);

  // Adjust categories list based on TransactionKind
  useEffect(() => {
    if (!editTransaction) {
      if (kind === 'expense') {
        setCategory('food');
      } else {
        setCategory('salary');
      }
    }
  }, [kind, editTransaction]);

  if (!open) return null;

  const handleSave = async () => {
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, {
          kind,
          amount,
          category,
          note,
          merchant,
          payment_method: paymentMethod,
          date,
        });
        toast.success('Transaction updated');
      } else {
        await createTransaction({
          kind,
          amount,
          category,
          note,
          merchant,
          payment_method: paymentMethod,
          date,
        });
        toast.success('Transaction added');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Error saving transaction: ${errorMsg}`);
    }
  };

  const handleDelete = async () => {
    if (!editTransaction) return;
    if (confirm(t('transaction.delete') + '?')) {
      try {
        await deleteTransaction(editTransaction.id);
        toast.success('Transaction deleted');
        onSuccess();
        onClose();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Error deleting: ${errorMsg}`);
      }
    }
  };

  const handleScanSuccess = (result: {
    amount: number;
    category: Category;
    merchant?: string;
    note?: string;
    date: string;
    payment_method?: PaymentMethod;
  }) => {
    setAmount(result.amount);
    setCategory(result.category);
    if (result.merchant) setMerchant(result.merchant);
    if (result.note) setNote(result.note);
    if (result.date) setDate(result.date);
    if (result.payment_method) setPaymentMethod(result.payment_method);
    setKind('expense');
  };

  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-t-[24px] border-t border-x border-border flex flex-col h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/20 flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary cursor-pointer">
            <X size={20} />
          </button>
          <span className="text-base font-bold text-text-primary">
            {editTransaction ? t('transaction.edit') : t('transaction.add')}
          </span>
          {!editTransaction ? (
            <button
              onClick={() => setShowScanDialog(true)}
              className="flex items-center gap-1 text-[12px] font-semibold text-accent-purple bg-accent-purple/10 px-3 py-1 rounded-full border border-accent-purple/30 hover:bg-accent-purple/20 transition cursor-pointer"
            >
              <Sparkles size={12} />
              <span>AI SCAN</span>
            </button>
          ) : (
            <button 
              onClick={handleDelete} 
              className="bg-expense-red/10 border border-expense-red/30 text-expense-red px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-expense-red/20 active:scale-95 transition cursor-pointer"
            >
              {t('common.delete')}
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 flex flex-col gap-2.5">
          {/* Income vs Outcome Tab (Segment Toggle height 44px) */}
          <div className="flex w-full h-11 p-0.5 bg-bg-tertiary/40 border border-border/40 rounded-xl flex-shrink-0">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center h-10 rounded-lg transition text-xs font-semibold cursor-pointer ${
                kind === 'expense' ? 'bg-white dark:bg-bg-secondary text-expense-red shadow-sm' : 'text-text-secondary'
              }`}
              onClick={() => setKind('expense')}
            >
              {t('transaction.outcome')}
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center h-10 rounded-lg transition text-xs font-semibold cursor-pointer ${
                kind === 'income' ? 'bg-white dark:bg-bg-secondary text-income-green shadow-sm' : 'text-text-secondary'
              }`}
              onClick={() => setKind('income')}
            >
              {t('transaction.income')}
            </button>
          </div>

          {/* Amount Display (Min-height 88px) */}
          <div className="flex flex-col items-center justify-center min-h-[88px] py-2.5 bg-secondary/30 rounded-2xl border border-border/30 flex-shrink-0">
            <span className="text-[13px] font-medium text-text-muted">{t('transaction.amount')} (THB)</span>
            <span className={`${String(amount).length > 6 ? 'text-[42px]' : 'text-[48px]'} font-bold tracking-tight mt-0.5 leading-none ${kind === 'expense' ? 'text-expense-red' : 'text-income-green'}`} style={{ fontFamily: 'var(--font-sans)' }}>
              {formatCurrency(amount).replace('THB', '').trim()}
            </span>
          </div>

          {/* Date Selector (Height 48px) */}
          <div className="flex items-center gap-3 h-12 px-3 rounded-2xl flex-shrink-0" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <CalendarIcon size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-text-secondary block leading-none mb-0.5">{t('transaction.date')}</label>
              <input
                id="transaction-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full focus:outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>

          {/* Category Selector Grid (Item height 64px, icon 36px, text 12px) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-text-secondary pl-1 block">{t('transaction.category')}</label>
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl animate-fade-in" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {categories.map((cat) => {
                const IconComponent = IconMap[cat.icon] || MoreHorizontal;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center h-[64px] rounded-xl transition cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-accent-purple/15 border border-accent-purple text-text-primary font-bold shadow-sm' 
                        : 'border border-transparent text-text-secondary hover:bg-secondary/20'
                    }`}
                  >
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center mb-0.5 text-white flex-shrink-0"
                      style={{ 
                        backgroundColor: isSelected ? cat.color : `${cat.color}15`,
                        border: isSelected ? `1px solid ${cat.color}` : `1px solid ${cat.color}25`
                      }}
                    >
                      <IconComponent size={16} color={isSelected ? '#FFFFFF' : cat.color} />
                    </div>
                    <span className="text-[12px] font-semibold truncate w-full text-center leading-tight">{t(`category.${cat.id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method / Asset Picker (Flex-wrap chips 40px px-3) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-text-secondary pl-1 block">{t('transaction.asset')}</label>
            <div className="flex flex-wrap gap-2 pb-1 px-1 w-full">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-center gap-2 h-10 px-3 rounded-full transition cursor-pointer select-none text-[12px] font-semibold whitespace-nowrap flex-shrink-0 ${
                      isSelected 
                        ? 'bg-accent-purple/15 border border-accent-purple text-text-primary font-bold shadow-sm' 
                        : 'bg-bg-tertiary border border-border/40 text-text-secondary hover:bg-secondary/20 hover:text-text-primary'
                    }`}
                  >
                    <span className="text-sm leading-none">
                      {pm.id === 'cash' && '💵'}
                      {pm.id === 'bank' && '🏦'}
                      {pm.id === 'credit_card' && '💳'}
                      {pm.id === 'e_wallet' && '📱'}
                      {pm.id === 'savings' && '🐷'}
                    </span>
                    <span>{t(`payment.${pm.id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Merchant Input (h-[46px]) */}
          <div className="flex items-center gap-3 h-[46px] px-3 rounded-2xl flex-shrink-0" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <AlignLeft size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-text-secondary block leading-none mb-0.5">{t('transaction.merchant')}</label>
              <input
                id="transaction-merchant"
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Merchant/Shop (Optional)"
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full placeholder:text-text-muted focus:outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>

          {/* Notes Input (h-[46px]) */}
          <div className="flex items-center gap-3 h-[46px] px-3 rounded-2xl flex-shrink-0 mb-1" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <AlignLeft size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-text-secondary block leading-none mb-0.5">{t('transaction.note')}</label>
              <input
                id="transaction-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes (Optional)"
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full placeholder:text-text-muted focus:outline-none"
                style={{ color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Calculator Keypad */}
        <div className="flex-shrink-0 mt-2 border-t border-border/40">
          <CalculatorKeypad
            onValueChange={setAmount}
            onSave={handleSave}
            onReset={() => setAmount(0)}
            initialValue={amount}
          />
        </div>
      </div>

      {/* AI Scan Slip Dialog */}
      <ScanSlipDialog
        open={showScanDialog}
        onClose={() => setShowScanDialog(false)}
        onSuccess={handleScanSuccess}
      />
    </div>
  );
}
