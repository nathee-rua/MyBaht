'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, BarChart3, FileText, Settings, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleOpenAddTx = () => {
    window.dispatchEvent(new CustomEvent('open-add-transaction'));
  };

  const isSettings = pathname === '/settings';

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 h-[80px] pb-safe flex items-end select-none pointer-events-none">
      {/* SVG Background with Center Dip */}
      <div className="absolute inset-0 -z-10 w-full h-full pointer-events-auto">
        <svg
          viewBox="0 0 375 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-bg-secondary"
          style={{ filter: 'drop-shadow(0 -4px 10px rgba(0, 0, 0, 0.15))' }}
          preserveAspectRatio="none"
        >
          <path
            d="M0 20 H140 C150 20 153 28 159 36 C167 48 178 52 187.5 52 C197 52 208 48 216 36 C222 28 225 20 235 20 H375 V80 H0 Z"
            fill="currentColor"
            stroke="var(--color-border)"
            strokeWidth="1.5"
            className="opacity-95"
          />
        </svg>
      </div>
 
      {/* Floating Center Action Button */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-[12px] z-50 pointer-events-auto">
        <button
          id="global-add-transaction-btn"
          type="button"
          onClick={handleOpenAddTx}
          className={`w-14 h-14 rounded-full bg-accent-purple text-white flex items-center justify-center shadow-[0_10px_30px_rgba(124,58,237,0.18)] hover:scale-105 active:scale-95 cursor-pointer border border-accent-purple-light/20 transition-all duration-300 ${
            isSettings ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          }`}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
 
      {/* Navigation Links */}
      <div className="w-full grid grid-cols-5 h-[60px] items-center px-2 max-w-lg mx-auto pointer-events-auto">
        {/* Home */}
        <Link href="/" className="flex flex-col items-center justify-center no-underline text-text-muted hover:text-accent-purple-light transition-colors">
          <div className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-accent-purple font-bold' : ''}`}>
            <House size={20} strokeWidth={isActive('/') ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold tracking-wide mt-0.5">{t('nav.home')}</span>
          </div>
        </Link>
 
        {/* List */}
        <Link href="/monthly" className="flex flex-col items-center justify-center no-underline text-text-muted hover:text-accent-purple-light transition-colors">
          <div className={`flex flex-col items-center gap-1 ${isActive('/monthly') ? 'text-accent-purple font-bold' : ''}`}>
            <FileText size={20} strokeWidth={isActive('/monthly') ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold tracking-wide mt-0.5">{t('nav.list')}</span>
          </div>
        </Link>
 
        {/* Spacer for Floating Button */}
        <div className="w-full h-full pointer-events-none" />
 
        {/* Stats */}
        <Link href="/stats" className="flex flex-col items-center justify-center no-underline text-text-muted hover:text-accent-purple-light transition-colors">
          <div className={`flex flex-col items-center gap-1 ${isActive('/stats') ? 'text-accent-purple font-bold' : ''}`}>
            <BarChart3 size={20} strokeWidth={isActive('/stats') ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold tracking-wide mt-0.5">{t('nav.stats')}</span>
          </div>
        </Link>
 
        {/* Settings */}
        <Link href="/settings" className="flex flex-col items-center justify-center no-underline text-text-muted hover:text-accent-purple-light transition-colors">
          <div className={`flex flex-col items-center gap-1 ${isActive('/settings') ? 'text-accent-purple font-bold' : ''}`}>
            <Settings size={20} strokeWidth={isActive('/settings') ? 2.5 : 1.8} />
            <span className="text-[11px] font-semibold tracking-wide mt-0.5">{t('nav.settings')}</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}
