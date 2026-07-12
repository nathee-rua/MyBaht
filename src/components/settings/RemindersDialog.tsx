'use client';

import React, { useState } from 'react';
import { X, Bell, TrendingUp, ShieldAlert, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface RemindersDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function RemindersDialog({ open, onClose }: RemindersDialogProps) {
  const { language } = useI18n();

  // Lazy Initial State to avoid calling setState inside useEffect
  const [dcaEnabled, setDcaEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('mb_reminders_config');
      return saved ? JSON.parse(saved).dcaEnabled ?? true : true;
    } catch {
      return true;
    }
  });

  const [dcaDay, setDcaDay] = useState(() => {
    if (typeof window === 'undefined') return 15;
    try {
      const saved = localStorage.getItem('mb_reminders_config');
      return saved ? JSON.parse(saved).dcaDay ?? 15 : 15;
    } catch {
      return 15;
    }
  });

  const [budgetEnabled, setBudgetEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('mb_reminders_config');
      return saved ? JSON.parse(saved).budgetEnabled ?? true : true;
    } catch {
      return true;
    }
  });

  const [budgetThreshold, setBudgetThreshold] = useState(() => {
    if (typeof window === 'undefined') return 85;
    try {
      const saved = localStorage.getItem('mb_reminders_config');
      return saved ? JSON.parse(saved).budgetThreshold ?? 85 : 85;
    } catch {
      return 85;
    }
  });

  const [reportEnabled, setReportEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('mb_reminders_config');
      return saved ? JSON.parse(saved).reportEnabled ?? true : true;
    } catch {
      return true;
    }
  });

  const [derivativeNotes, setDerivativeNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem('mb_reminders_config');
      return saved ? JSON.parse(saved).derivativeNotes ?? '' : '';
    } catch {
      return '';
    }
  });

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    try {
      const config = {
        dcaEnabled,
        dcaDay,
        budgetEnabled,
        budgetThreshold,
        reportEnabled,
        derivativeNotes
      };
      localStorage.setItem('mb_reminders_config', JSON.stringify(config));
      toast.success(language === 'th' ? 'บันทึกการแจ้งเตือนสำเร็จ!' : 'Reminders saved successfully!');
      onClose();
    } catch {
      toast.error('Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-[calc(100%-16px)] mx-2 my-2 max-w-md bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col h-[80vh] animate-scale-in shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-accent-purple animate-bounce" />
            <span className="font-bold text-text-primary text-base">
              {language === 'th' ? 'การแจ้งเตือนและระบบช่วยจำ' : 'Reminders & Alerts Center'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* DCA Due reminder */}
          <div className="p-4 rounded-xl border border-border/40 bg-bg-primary/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-accent-purple" />
                <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">DCA Due Reminders</span>
              </div>
              <input
                type="checkbox"
                checked={dcaEnabled}
                onChange={(e) => setDcaEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-accent-purple focus:ring-accent-purple cursor-pointer accent-accent-purple"
              />
            </div>
            
            {dcaEnabled && (
              <div className="flex flex-col gap-2 mt-1 animate-scale-in">
                <label className="text-[11px] text-text-secondary font-medium">Trigger Day of Month (1-28)</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={dcaDay}
                  onChange={(e) => setDcaDay(Math.min(28, Math.max(1, Number(e.target.value))))}
                  className="w-full bg-bg-primary border border-border/60 rounded-xl px-3 h-10 text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                />
                <span className="text-[9px] text-text-muted italic">
                  Note: A reminder notification will be triggered in stats on day {dcaDay} of every month.
                </span>
              </div>
            )}
          </div>

          {/* Budget Alert Limits */}
          <div className="p-4 rounded-xl border border-border/40 bg-bg-primary/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-expense-red" />
                <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Budget Alert Thresholds</span>
              </div>
              <input
                type="checkbox"
                checked={budgetEnabled}
                onChange={(e) => setBudgetEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-accent-purple focus:ring-accent-purple cursor-pointer accent-accent-purple"
              />
            </div>

            {budgetEnabled && (
              <div className="flex flex-col gap-2 mt-1 animate-scale-in">
                <label className="text-[11px] text-text-secondary font-medium">Alert when Spent exceeds (% of Budget)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={budgetThreshold}
                    onChange={(e) => setBudgetThreshold(Number(e.target.value))}
                    className="w-full accent-accent-purple"
                  />
                  <span className="text-xs font-bold text-text-primary w-10 text-right">{budgetThreshold}%</span>
                </div>
                <span className="text-[9px] text-text-muted italic">
                  Note: Warns on category or total budgets when usage goes above {budgetThreshold}%.
                </span>
              </div>
            )}
          </div>

          {/* Monthly Report Ready */}
          <div className="p-4 rounded-xl border border-border/40 bg-bg-primary/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-income-green" />
                <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Monthly Analysis Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={reportEnabled}
                onChange={(e) => setReportEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-accent-purple focus:ring-accent-purple cursor-pointer accent-accent-purple"
              />
            </div>
            <p className="text-[10px] text-text-secondary leading-normal">
              Notify me automatically on the first day of the month when the previous month&apos;s summary and AI analysis is ready.
            </p>
          </div>

          {/* Derivative/Equity Notes */}
          <div className="p-4 rounded-xl border border-border/40 bg-bg-primary/30 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-500" />
              <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Derivative/Equity Reminders</span>
            </div>
            
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[11px] text-text-secondary font-medium">Notes, Call targets, or exercise reminders</label>
              <textarea
                value={derivativeNotes}
                onChange={(e) => setDerivativeNotes(e.target.value)}
                placeholder="Write specific targets (e.g. BTC cross 70k, exercise SCB calls, gold target 34k...)"
                className="w-full bg-bg-primary border border-border/60 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple min-h-[80px]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-bg-secondary border-t border-border/20 flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 bg-secondary/40 text-text-secondary rounded-xl text-xs font-semibold hover:bg-secondary/60 transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 h-11 bg-accent-purple hover:bg-accent-purple-light text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            Save Reminders
          </button>
        </div>
      </div>
    </div>
  );
}
