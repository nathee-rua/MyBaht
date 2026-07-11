'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { getTransactions } from '@/lib/expenses';
import AISettingsDialog from '@/components/ai/AISettingsDialog';
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
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: 14,
        background: hovered
          ? danger
            ? 'rgba(239,68,68,0.08)'
            : `linear-gradient(135deg, ${C.bgSecondary}, ${C.bgTertiary}40)`
          : danger
            ? 'rgba(239,68,68,0.04)'
            : C.bgSecondary,
        border: `1px solid ${hovered ? (danger ? 'rgba(239,68,68,0.3)' : C.border) : C.borderSubtle}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 4px 20px rgba(124,58,237,0.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon container with gradient */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: iconGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: danger ? '#F87171' : C.textPrimary,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
      </div>
      {rightContent && <div style={{ flexShrink: 0 }}>{rightContent}</div>}
    </div>
  );
}

/* ──────────── Section header ──────────── */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 4,
        paddingBottom: 8,
        paddingTop: 4,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ──────────── Divider ──────────── */
function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${C.border}60, transparent)`,
        margin: '4px 0',
      }}
    />
  );
}

/* ──────────────────── Main Page Component ──────────────────── */
export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  /* ────────── Pill badge for values ────────── */
  const ValuePill = ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: color || C.accentLight,
        background: `${color || C.accent}18`,
        padding: '4px 10px',
        borderRadius: 8,
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </span>
  );

  return (
    <div
      className="page-container"
      style={{
        padding: '16px 16px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        minHeight: '100dvh',
        background: C.bgPrimary,
      }}
    >
      {/* ═══════════ Header ═══════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={18} color="#fff" />
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.textPrimary,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {t('settings.title')}
        </h1>
      </div>

      {/* ═══════════ Account Section ═══════════ */}
      <div>
        <div
          style={{
            borderRadius: 18,
            padding: '20px 18px',
            background: `linear-gradient(135deg, ${C.bgSecondary}, ${C.bgTertiary}80)`,
            border: `1px solid ${C.border}80`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* Gradient avatar */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.accent}, #EC4899, ${C.accentLight})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 4px 24px ${C.accent}40`,
            }}
          >
            <User size={26} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.textMuted,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              MyBaht {t('settings.account')}
            </p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.textPrimary,
                margin: '4px 0 0',
              }}
            >
              Active Session
            </p>
          </div>
          {/* Status dot */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 8px rgba(34,197,94,0.5)',
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      <Divider />

      {/* ═══════════ Preferences ═══════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader
          icon={<Palette size={13} color={C.textMuted} />}
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

      <Divider />

      {/* ═══════════ AI & Automation ═══════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader
          icon={<Bot size={13} color={C.textMuted} />}
          label={language === 'th' ? 'AI และระบบอัตโนมัติ' : 'AI & Automation'}
        />

        <SettingRow
          icon={<Sparkles size={18} color="#F472B6" />}
          iconGradient="linear-gradient(135deg, rgba(244,114,182,0.25), rgba(236,72,153,0.1))"
          label={t('settings.ai')}
          rightContent={
            <ChevronRight size={16} color={C.textMuted} />
          }
          onClick={() => setShowAiDialog(true)}
        />

        <SettingRow
          icon={<Send size={18} color="#38BDF8" />}
          iconGradient="linear-gradient(135deg, rgba(56,189,248,0.25), rgba(14,165,233,0.1))"
          label={t('settings.telegram')}
          rightContent={
            <ChevronRight size={16} color={C.textMuted} />
          }
          onClick={() => router.push('/settings/telegram')}
        />
      </div>

      <Divider />

      {/* ═══════════ Data ═══════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader
          icon={<Database size={13} color={C.textMuted} />}
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
                style={{
                  width: 16,
                  height: 16,
                  border: `2px solid ${C.border}`,
                  borderTop: '2px solid #34D399',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              <ChevronRight size={16} color={C.textMuted} />
            )
          }
          onClick={handleExportCSV}
        />
      </div>

      <Divider />

      {/* ═══════════ Danger Zone ═══════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader
          icon={<ShieldAlert size={13} color={C.textMuted} />}
          label={language === 'th' ? 'โซนอันตราย' : 'Danger Zone'}
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
      <div
        style={{
          textAlign: 'center',
          paddingTop: 12,
          paddingBottom: 80,
        }}
      >
        <p style={{ fontSize: 11, color: C.textMuted, margin: 0, fontWeight: 500 }}>
          MyBaht v1.0.0
        </p>
        <p style={{ fontSize: 10, color: `${C.textMuted}80`, margin: '4px 0 0', fontWeight: 400 }}>
          {language === 'th' ? 'สร้างด้วย ❤️ สำหรับการจัดการการเงินที่ดีกว่า' : 'Built with ❤️ for better financial management'}
        </p>
      </div>

      {/* ═══════════ AI Settings Modal ═══════════ */}
      <AISettingsDialog open={showAiDialog} onClose={() => setShowAiDialog(false)} />

      {/* ═══════════ Add Transaction Modal ═══════════ */}
      <AddTransactionDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={() => {}} />

      {/* Spinner keyframe (for export loading) */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
