'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { getTransactions } from '@/lib/expenses';
import AISettingsDialog from '@/components/ai/AISettingsDialog';
import {
  Globe,
  Moon,
  Sun,
  Sparkles,
  Send,
  Download,
  LogOut,
  ChevronRight,
  User,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const transactions = await getTransactions();
      if (transactions.length === 0) {
        toast.error('No transactions to export');
        return;
      }

      // Create CSV content
      const headers = ['Date', 'Kind', 'Category', 'Amount', 'Payment Method', 'Merchant', 'Note'];
      const rows = transactions.map((tx) => [
        tx.date,
        tx.kind,
        tx.category,
        tx.amount,
        tx.payment_method,
        tx.merchant || '',
        tx.note || '',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' + // include BOM for Excel Thai support
        [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `mybaht_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV Export completed successfully!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Export failed: ${errorMsg}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-accent-purple" />
          <h1 className="text-xl font-extrabold text-text-primary">{t('settings.title')}</h1>
        </div>
      </div>

      {/* User Info / Profile Preview */}
      <div className="card-base p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center border border-accent-purple/20 text-accent-purple">
          <User size={24} />
        </div>
        <div>
          <span className="text-xs font-semibold text-text-muted">MyBaht Account</span>
          <h3 className="text-sm font-bold text-text-primary mt-0.5">Active Session</h3>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="flex flex-col gap-3">
        {/* Toggle Theme */}
        <div
          onClick={toggleTheme}
          className="card-base p-4 flex items-center justify-between cursor-pointer hover:border-border-light transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/30 border border-border/20">
              {theme === 'dark' ? (
                <Moon size={18} className="text-accent-purple" />
              ) : (
                <Sun size={18} className="text-amber-500" />
              )}
            </div>
            <span className="text-sm font-bold text-text-primary">{t('settings.theme')}</span>
          </div>
          <span className="text-xs font-semibold text-text-muted capitalize">{theme}</span>
        </div>

        {/* Switch Language */}
        <div
          onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
          className="card-base p-4 flex items-center justify-between cursor-pointer hover:border-border-light transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/30 border border-border/20">
              <Globe size={18} className="text-blue-400" />
            </div>
            <span className="text-sm font-bold text-text-primary">{t('settings.language')}</span>
          </div>
          <span className="text-xs font-bold text-accent-purple-light uppercase">
            {language === 'th' ? 'ภาษาไทย' : 'English'}
          </span>
        </div>

        {/* AI Key & Settings */}
        <div
          onClick={() => setShowAiDialog(true)}
          className="card-base p-4 flex items-center justify-between cursor-pointer hover:border-border-light transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/30 border border-border/20">
              <Sparkles size={18} className="text-pink-400" />
            </div>
            <span className="text-sm font-bold text-text-primary">{t('settings.ai')}</span>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </div>

        {/* Telegram Connection */}
        <div
          onClick={() => router.push('/settings/telegram')}
          className="card-base p-4 flex items-center justify-between cursor-pointer hover:border-border-light transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/30 border border-border/20">
              <Send size={18} className="text-sky-400" />
            </div>
            <span className="text-sm font-bold text-text-primary">{t('settings.telegram')}</span>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </div>

        {/* CSV Export */}
        <div
          onClick={handleExportCSV}
          className="card-base p-4 flex items-center justify-between cursor-pointer hover:border-border-light transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/30 border border-border/20">
              <Download size={18} className="text-green-400" />
            </div>
            <span className="text-sm font-bold text-text-primary">
              {exporting ? 'Exporting...' : t('settings.export')}
            </span>
          </div>
          <ChevronRight size={16} className="text-text-muted" />
        </div>

        {/* Logout Button */}
        <div
          onClick={handleLogout}
          className="card-base p-4 flex items-center justify-between cursor-pointer border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 transition mt-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <LogOut size={18} className="text-red-400" />
            </div>
            <span className="text-sm font-bold text-red-400">{t('auth.logout')}</span>
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      <AISettingsDialog open={showAiDialog} onClose={() => setShowAiDialog(false)} />
    </div>
  );
}
