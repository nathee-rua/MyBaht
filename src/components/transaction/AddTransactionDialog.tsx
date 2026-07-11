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
      <div className="w-full max-w-md bg-bg-primary rounded-t-[28px] border-t border-border flex flex-col h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/20 flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary cursor-pointer">
            <X size={20} />
          </button>
          <span className="text-base font-bold text-text-primary">
            {editTransaction ? t('transaction.edit') : t('transaction.add')}
          </span>
          {!editTransaction ? (
            <button
              onClick={() => setShowScanDialog(true)}
              className="flex items-center gap-1 text-xs font-bold text-accent-purple bg-accent-purple/10 px-3 py-1.5 rounded-full border border-accent-purple/30 hover:bg-accent-purple/20 transition cursor-pointer"
            >
              <Sparkles size={12} />
              <span>AI SCAN</span>
            </button>
          ) : (
            <button onClick={handleDelete} className="text-xs font-bold text-expense-red hover:underline cursor-pointer">
              {t('common.delete')}
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-4">
          {/* Income vs Outcome Tab */}
          <div className="tab-group flex w-full">
            <button
              type="button"
              className={`tab-item flex-1 text-center py-2.5 rounded-xl transition font-semibold cursor-pointer ${
                kind === 'expense' ? 'active text-expense-red' : ''
              }`}
              onClick={() => setKind('expense')}
            >
              {t('transaction.outcome')}
            </button>
            <button
              type="button"
              className={`tab-item flex-1 text-center py-2.5 rounded-xl transition font-semibold cursor-pointer ${
                kind === 'income' ? 'active text-income-green' : ''
              }`}
              onClick={() => setKind('income')}
            >
              {t('transaction.income')}
            </button>
          </div>

          {/* Amount Display */}
          <div className="flex flex-col items-center justify-center py-4 bg-secondary/30 rounded-2xl border border-border/30">
            <span className="text-xs text-text-muted">{t('transaction.amount')} (THB)</span>
            <span className={`text-3xl font-extrabold mt-1 ${kind === 'expense' ? 'text-expense-red' : 'text-income-green'}`}>
              {formatCurrency(amount).replace('THB', '').trim()}
            </span>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <CalendarIcon size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary font-bold block">{t('transaction.date')}</label>
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

          {/* Category Selector Grid */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider pl-1">{t('transaction.category')}</label>
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl animate-fade-in" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {categories.map((cat) => {
                const IconComponent = IconMap[cat.icon] || MoreHorizontal;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-accent-purple/15 border border-accent-purple text-text-primary font-bold shadow-sm' 
                        : 'border border-transparent text-text-secondary hover:bg-secondary/20'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 text-white"
                      style={{ 
                        backgroundColor: isSelected ? cat.color : `${cat.color}15`,
                        border: isSelected ? `1px solid ${cat.color}` : `1px solid ${cat.color}25`
                      }}
                    >
                      <IconComponent size={18} color={isSelected ? '#FFFFFF' : cat.color} />
                    </div>
                    <span className="text-[10px] truncate w-full text-center">{t(`category.${cat.id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method / Asset Picker */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider pl-1">{t('transaction.asset')}</label>
            <div className="grid grid-cols-5 gap-1.5 p-2 rounded-2xl" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl transition cursor-pointer select-none text-[10px] ${
                      isSelected 
                        ? 'bg-accent-purple/15 border border-accent-purple text-text-primary font-bold shadow-sm' 
                        : 'border border-transparent text-text-secondary hover:bg-secondary/20 hover:text-text-primary'
                    }`}
                  >
                    <span className="text-lg mb-1 leading-none">
                      {pm.id === 'cash' && '💵'}
                      {pm.id === 'bank' && '🏦'}
                      {pm.id === 'credit_card' && '💳'}
                      {pm.id === 'e_wallet' && '📱'}
                      {pm.id === 'savings' && '🐷'}
                    </span>
                    <span className="truncate w-full text-center text-[9px] tracking-tight">{t(`payment.${pm.id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Merchant Input */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <AlignLeft size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary font-bold block">{t('transaction.merchant')}</label>
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

          {/* Notes Input */}
          <div className="flex items-center gap-3 p-3 rounded-2xl mb-8" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <AlignLeft size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary font-bold block">{t('transaction.note')}</label>
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
        <div className="flex-shrink-0">
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
