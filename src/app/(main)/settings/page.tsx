'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { getTransactions } from '@/lib/expenses';
import AISettingsDialog from '@/components/ai/AISettingsDialog';
import RemindersDialog from '@/components/settings/RemindersDialog';
import AddTransactionDialog from '@/components/transaction/AddTransactionDialog';
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
  Palette,
  Bot,
  Database,
  ShieldAlert,
  MessageCircle,
  Bell,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const C = {
  bgPrimary: 'var(--color-bg-primary)',
  bgSecondary: 'var(--color-bg-secondary)',
  bgTertiary: 'var(--color-bg-tertiary)',
  accent: 'var(--color-accent-purple)',
  accentLight: 'var(--color-accent-purple-light)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  border: 'var(--color-border)',
  borderSubtle: 'var(--color-border-light)',
};

/* ──────────── Reusable setting row ──────────── */
function SettingRow({
  icon,
  iconGradient,
  label,
  rightContent,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  iconGradient: string;
  label: string;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between h-[64px] px-4 rounded-[18px] transition-all duration-200 border w-full text-left active:scale-[0.99] select-none cursor-pointer ${
        danger
          ? 'border-red-500/20 hover:border-red-500/40 bg-red-500/[0.02] hover:bg-red-500/[0.06] text-red-500 shadow-sm'
          : 'border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary hover:bg-bg-tertiary/20 hover:border-border/80 shadow-sm hover:shadow-[0_4px_20px_rgba(124,58,237,0.06)]'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon container with gradient */}
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconGradient }}
        >
          {icon}
        </div>
        <span
          className={`text-[14px] sm:text-[15px] font-semibold tracking-wide ${
            danger ? 'text-red-500/90' : 'text-text-primary'
          }`}
        >
          {label}
        </span>
      </div>
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
    </button>
  );
}

/* ──────────── Section header ──────────── */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1.5 pt-3 leading-none flex-shrink-0">
      {icon}
      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

/* ────────── Pill badge for values ────────── */
function ValuePill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center h-6.5 text-[11px] font-semibold px-2.5 rounded-[8px] tracking-wide"
      style={{
        color: color || C.accentLight,
        background: `${color || C.accent}15`,
      }}
    >
      {children}
    </span>
  );
}

/* ──────────────────── Main Page Component ──────────────────── */
export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [username, setUsername] = useState('User');

  const handleResetSettings = async () => {
    if (!confirm(language === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้น?' : 'Are you sure you want to reset all settings to defaults?')) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({
          ai_provider: null,
          ai_api_key_encrypted: null,
          ai_model: null,
          telegram_chat_id: null,
          line_chat_id: null,
          line_link_code: null,
          line_link_code_expires: null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Clear local storage config
      localStorage.removeItem('mb_living_budget');
      localStorage.removeItem('mb_dca_budget');
      localStorage.removeItem('mb_category_budgets');
      localStorage.removeItem('mb_reminders_config');

      toast.success(language === 'th' ? 'รีเซ็ตการตั้งค่าเรียบร้อยแล้ว!' : 'Settings reset successfully!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Reset failed: ${msg}`);
    }
  };

  const handleResetAllData = async () => {
    const confirmation = prompt(
      language === 'th'
        ? 'กรุณาพิมพ์ "DELETE ALL" เพื่อยืนยันการลบธุรกรรม บันทึก และระบบแจ้งเตือนทั้งหมดอย่างถาวร:'
        : 'Type "DELETE ALL" to confirm deleting all your transactions, budgets, notes, and reminders permanently:'
    );

    if (confirmation !== 'DELETE ALL') {
      toast.error(language === 'th' ? 'การยืนยันไม่ถูกต้อง ยกเลิกการรีเซ็ตข้อมูล' : 'Confirmation mismatch. Reset cancelled.');
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Clear all local storage
      localStorage.clear();

      toast.success(language === 'th' ? 'ลบข้อมูลผู้ใช้ทั้งหมดสำเร็จแล้ว!' : 'All app data deleted successfully!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Wipe failed: ${msg}`);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.email ? user.email.split('@')[0] : 'User';
        setUsername(name);
      }
    };
    fetchUser();
  }, []);

  // Listen to bottom navigation center plus button event
  useEffect(() => {
    const handleOpenAddTx = () => {
      setShowAddDialog(true);
    };
    window.addEventListener('open-add-transaction', handleOpenAddTx);
    return () => window.removeEventListener('open-add-transaction', handleOpenAddTx);
  }, []);

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
    <div className="page-container px-4 py-4 pb-28 flex flex-col gap-5 bg-bg-primary min-h-screen">
      {/* ═══════════ Header ═══════════ */}
      <div className="flex items-center gap-2.5 pb-2">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-accent-purple to-accent-purple-light flex items-center justify-center flex-shrink-0">
          <Settings size={20} color="#fff" />
        </div>
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-none">
          {t('settings.title')}
        </h1>
      </div>

      {/* ═══════════ Account Section (Editorial Minimal style) ═══════════ */}
      <div>
        <div className="h-[108px] px-4 rounded-[18px] border border-[#111827]/[0.08] dark:border-border/40 bg-bg-secondary flex items-center gap-3.5 shadow-[0_6px_20px_rgba(17,24,39,0.04)] w-full">
          {/* Neutral avatar */}
          <div className="w-12 h-12 rounded-[12px] bg-bg-tertiary/40 border border-border/40 flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-accent-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider leading-none mb-0.5">
              MyBaht {t('settings.account')}
            </p>
            <p className="text-[22px] font-bold text-text-primary leading-none tracking-tight mt-1.5">
              {username}
            </p>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="h-5 px-2 flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 uppercase tracking-wider leading-none">
                Secure Vault Active
              </span>
            </div>
          </div>
          {/* Status dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
        </div>
      </div>

      {/* ═══════════ Preferences ═══════════ */}
      <div className="flex flex-col gap-2.5">
        <SectionHeader
          icon={<Palette size={13} className="text-text-muted" />}
          label={language === 'th' ? 'การตั้งค่าทั่วไป' : 'Preferences'}
        />

        <SettingRow
          icon={
            theme === 'dark' ? (
              <Moon size={18} color="#C4B5FD" />
            ) : (
              <Sun size={18} color="#FBBF24" />
            )
          }
          iconGradient={
            theme === 'dark'
              ? `linear-gradient(135deg, ${C.accent}30, ${C.accentLight}20)`
              : 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))'
          }
          label={t('settings.theme')}
          rightContent={
            <ValuePill>
              {theme === 'dark'
                ? language === 'th'
                  ? 'มืด'
                  : 'Dark'
                : language === 'th'
                  ? 'สว่าง'
                  : 'Light'}
            </ValuePill>
          }
          onClick={toggleTheme}
        />

        <SettingRow
          icon={<Globe size={18} color="#60A5FA" />}
          iconGradient="linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.1))"
          label={t('settings.language')}
          rightContent={
            <ValuePill color="#60A5FA">
              {language === 'th' ? 'ภาษาไทย' : 'English'}
            </ValuePill>
          }
          onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
        />
      </div>

      {/* ═══════════ AI & Automation ═══════════ */}
      <div className="flex flex-col gap-2.5">
        <SectionHeader
          icon={<Bot size={13} className="text-text-muted" />}
          label={language === 'th' ? 'AI และระบบอัตโนมัติ' : 'AI & Automation'}
        />

        <SettingRow
          icon={<Sparkles size={18} color="#F472B6" />}
          iconGradient="linear-gradient(135deg, rgba(244,114,182,0.25), rgba(236,72,153,0.1))"
          label={t('settings.ai')}
          rightContent={
            <ChevronRight size={16} className="text-text-muted" />
          }
          onClick={() => setShowAiDialog(true)}
        />

        <SettingRow
          icon={<Send size={18} color="#38BDF8" />}
          iconGradient="linear-gradient(135deg, rgba(56,189,248,0.25), rgba(14,165,233,0.1))"
          label={t('settings.telegram')}
          rightContent={
            <ChevronRight size={16} className="text-text-muted" />
          }
          onClick={() => router.push('/settings/telegram')}
        />

        <SettingRow
          icon={<MessageCircle size={18} color="#22C55E" />}
          iconGradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.1))"
          label={t('settings.line')}
          rightContent={
            <ChevronRight size={16} className="text-text-muted" />
          }
          onClick={() => router.push('/settings/line')}
        />

        <SettingRow
          icon={<Bell size={18} color="#A855F7" />}
          iconGradient="linear-gradient(135deg, rgba(168,85,247,0.25), rgba(147,51,234,0.1))"
          label={language === 'th' ? 'การแจ้งเตือน & ระบบช่วยจำ' : 'Reminders & Alerts'}
          rightContent={
            <ChevronRight size={16} className="text-text-muted" />
          }
          onClick={() => setShowRemindersDialog(true)}
        />
      </div>

      {/* ═══════════ Data ═══════════ */}
      <div className="flex flex-col gap-2.5">
        <SectionHeader
          icon={<Database size={13} className="text-text-muted" />}
          label={language === 'th' ? 'ข้อมูล' : 'Data'}
        />

        <SettingRow
          icon={<Download size={18} color="#34D399" />}
          iconGradient="linear-gradient(135deg, rgba(52,211,153,0.25), rgba(16,185,129,0.1))"
          label={exporting
            ? (language === 'th' ? 'กำลังส่งออก...' : 'Exporting...')
            : t('settings.export')}
          rightContent={
            exporting ? (
              <div
                className="w-4 h-4 border-2 border-border border-t-emerald-400 rounded-full animate-spin"
              />
            ) : (
              <ChevronRight size={16} className="text-text-muted" />
            )
          }
          onClick={handleExportCSV}
        />
      </div>

      {/* ═══════════ Danger Zone ═══════════ */}
      <div className="flex flex-col gap-2.5">
        <SectionHeader
          icon={<ShieldAlert size={13} className="text-text-muted" />}
          label={language === 'th' ? 'โซนอันตราย' : 'Danger Zone'}
        />

        <SettingRow
          icon={<RotateCcw size={18} color="#EAB308" />}
          iconGradient="linear-gradient(135deg, rgba(234,179,8,0.2), rgba(202,138,4,0.08))"
          label={language === 'th' ? 'รีเซ็ตการตั้งค่าทั้งหมด' : 'Reset Settings Only'}
          onClick={handleResetSettings}
        />

        <SettingRow
          icon={<Trash2 size={18} color="#EF4444" />}
          iconGradient="linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.08))"
          label={language === 'th' ? 'รีเซ็ตลบข้อมูลในแอปทั้งหมด' : 'Reset All App Data'}
          onClick={handleResetAllData}
          danger
        />

        <SettingRow
          icon={<LogOut size={18} color="#F87171" />}
          iconGradient="linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.08))"
          label={t('auth.logout')}
          onClick={handleLogout}
          danger
        />
      </div>

      {/* ═══════════ App Version Footer ═══════════ */}
      <div className="text-center py-6 pb-12 mt-2 leading-none flex-shrink-0">
        <p className="text-[11px] text-text-muted font-semibold">
          MyBaht v1.2.0
        </p>
        <p className="text-[10px] text-text-muted/70 mt-1.5 font-normal leading-normal">
          {language === 'th' ? 'สร้างด้วย ❤️ สำหรับการจัดการการเงินที่ดีกว่า' : 'Built with ❤️ for better financial management'}
        </p>
      </div>

      {/* ═══════════ AI Settings Modal ═══════════ */}
      <AISettingsDialog open={showAiDialog} onClose={() => setShowAiDialog(false)} />

      {/* ═══════════ Reminders Alerts Modal ═══════════ */}
      <RemindersDialog open={showRemindersDialog} onClose={() => setShowRemindersDialog(false)} />

      {/* ═══════════ Add Transaction Modal ═══════════ */}
      <AddTransactionDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={() => {}} />
    </div>
  );
}
