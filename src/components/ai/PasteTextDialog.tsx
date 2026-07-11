'use client';

import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Check, Clipboard } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Category, PaymentMethod } from '@/types';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types';
import { toast } from 'sonner';

interface PasteTextDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: {
    amount: number;
    category: Category;
    merchant?: string;
    note?: string;
    date: string;
    payment_method?: PaymentMethod;
  }) => void;
}

export default function PasteTextDialog({ open, onClose, onSuccess }: PasteTextDialogProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    amount: number;
    category: Category;
    merchant: string;
    note: string;
    date: string;
    payment_method: PaymentMethod;
  } | null>(null);

  if (!open) return null;

  const handleAnalyze = async () => {
    if (!text || text.trim().length === 0) {
      toast.error('Please paste transaction text first');
      return;
    }

    setAnalyzing(false);
    setResult(null);
    setAnalyzing(true);

    try {
      const response = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to parse text');
      }

      const parsed = await response.json();
      setResult({
        amount: parsed.amount || 0,
        category: parsed.category || 'food',
        merchant: parsed.merchant || '',
        note: parsed.note || '',
        date: parsed.date || new Date().toISOString().split('T')[0],
        payment_method: parsed.payment_method || 'cash',
      });
      toast.success('AI text parsing complete!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Parsing failed: ${errorMsg}. Make sure you have configured AI settings.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (result) {
      onSuccess(result);
      onClose();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
        toast.success('Text pasted from clipboard!');
      } else {
        toast.error('Clipboard is empty');
      }
    } catch (err) {
      toast.error('Could not access clipboard. Please paste manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-none border-t-4 border-x-4 border-accent-purple flex flex-col h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-purple" />
            <span className="font-bold text-text-primary">{t('action.pasteText')}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 pb-8 flex flex-col gap-4">
          {!result && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-text-secondary font-medium">
                Copy bank alerts, SMS alerts, LINE Alerts or transfer messages and paste them below:
              </span>
              
              {/* Text Area Input */}
              <div className="relative">
                <textarea
                  id="paste-transaction-textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Example: K-Bank: paid 350.00 THB to STARBUCKS at 15:30 on 11/07/2026."
                  className="w-full h-44 p-3 text-sm font-medium rounded-2xl outline-none focus:ring-2 focus:ring-accent-purple/50 transition-all placeholder:text-text-muted resize-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                
                {/* Clipboard Paste button */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="absolute right-3.5 bottom-3.5 p-2 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple hover:bg-accent-purple/20 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <Clipboard size={14} />
                  <span>Paste Clipboard</span>
                </button>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={analyzing || !text.trim()}
                onClick={handleAnalyze}
                className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none text-white text-sm"
                style={{
                  background: 'var(--color-accent-purple)',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                  opacity: analyzing || !text.trim() ? 0.6 : 1,
                }}
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Analyzing Alert Text...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Parse Text with AI</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Parsed Results Details */}
          {result && (
            <div 
              className="p-5 flex flex-col gap-4 animate-scale-in"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              }}
            >
              <h3 
                className="text-sm font-bold flex items-center gap-1.5 border-b pb-2.5 mb-1 text-accent-purple"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Check size={16} />
                <span>Extracted Transaction Details</span>
              </h3>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.amount')}</label>
                <input
                  id="scan-amount"
                  type="number"
                  value={result.amount}
                  onChange={(e) => setResult({ ...result, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full text-base font-bold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                  }}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.category')}</label>
                <select
                  id="scan-category"
                  value={result.category}
                  onChange={(e) => setResult({ ...result, category: e.target.value as Category })}
                  className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                  }}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-bg-secondary text-text-primary">
                      {t(`category.${cat.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.date')}</label>
                <input
                  id="scan-date"
                  type="date"
                  value={result.date}
                  onChange={(e) => setResult({ ...result, date: e.target.value })}
                  className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                  }}
                />
              </div>

              {/* Asset / Payment Method */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.asset')}</label>
                <select
                  id="scan-asset"
                  value={result.payment_method}
                  onChange={(e) => setResult({ ...result, payment_method: e.target.value as PaymentMethod })}
                  className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                  }}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id} className="bg-bg-secondary text-text-primary">
                      {t(`payment.${pm.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Merchant */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.merchant')}</label>
                <input
                  id="scan-merchant"
                  type="text"
                  value={result.merchant}
                  onChange={(e) => setResult({ ...result, merchant: e.target.value })}
                  placeholder="Shop name"
                  className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                  }}
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.note')}</label>
                <input
                  id="scan-note"
                  type="text"
                  value={result.note}
                  onChange={(e) => setResult({ ...result, note: e.target.value })}
                  placeholder="Notes"
                  className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                  }}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="flex-1 text-sm font-bold border border-border text-text-secondary py-3.5 rounded-2xl hover:bg-secondary/20 cursor-pointer text-center"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 text-sm font-bold text-white py-3.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  style={{
                    background: '#22C55E',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
                  }}
                >
                  <Check size={16} />
                  <span>Apply Transaction</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
