'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Tag, CreditCard, AlignLeft, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-t-3xl border-t border-border flex flex-col h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary">
            <X size={20} />
          </button>
          <span className="text-base font-bold text-text-primary">
            {editTransaction ? t('transaction.edit') : t('transaction.add')}
          </span>
          {!editTransaction ? (
            <button
              onClick={() => setShowScanDialog(true)}
              className="flex items-center gap-1 text-xs font-bold text-accent-purple bg-accent-purple/10 px-3 py-1.5 rounded-full border border-accent-purple/30 hover:bg-accent-purple/20 transition"
            >
              <Sparkles size={12} />
              <span>AI SCAN</span>
            </button>
          ) : (
            <button onClick={handleDelete} className="text-xs font-bold text-expense-red hover:underline">
              {t('common.delete')}
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-12">
          {/* Income vs Outcome Tab */}
          <div className="tab-group flex w-full">
            <button
              type="button"
              className={`tab-item flex-1 text-center py-2.5 rounded-xl transition font-semibold ${
                kind === 'expense' ? 'active text-expense-red' : ''
              }`}
              onClick={() => setKind('expense')}
            >
              {t('transaction.outcome')}
            </button>
            <button
              type="button"
              className={`tab-item flex-1 text-center py-2.5 rounded-xl transition font-semibold ${
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
          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl border border-border/10">
            <CalendarIcon size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-muted block">{t('transaction.date')}</label>
              <input
                id="transaction-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full"
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl border border-border/10">
            <Tag size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-muted block">{t('transaction.category')}</label>
              <select
                id="transaction-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-bg-secondary text-text-primary">
                    {t(`category.${cat.id}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Asset/Payment Method Selector */}
          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl border border-border/10">
            <CreditCard size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-muted block">{t('transaction.asset')}</label>
              <select
                id="transaction-asset"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id} className="bg-bg-secondary text-text-primary">
                    {t(`payment.${pm.id}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Merchant Selector (Optional) */}
          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl border border-border/10">
            <AlignLeft size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-muted block">{t('transaction.merchant')}</label>
              <input
                id="transaction-merchant"
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Merchant/Shop (Optional)"
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Notes Selector (Optional) */}
          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl border border-border/10">
            <AlignLeft size={18} className="text-accent-purple" />
            <div className="flex-1">
              <label className="text-[10px] text-text-muted block">{t('transaction.note')}</label>
              <input
                id="transaction-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes (Optional)"
                className="bg-transparent border-0 text-sm font-semibold text-text-primary focus:ring-0 p-0 w-full placeholder:text-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Calculator Keypad */}
        <CalculatorKeypad
          onValueChange={setAmount}
          onSave={handleSave}
          onReset={() => setAmount(0)}
          initialValue={amount}
        />
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
