'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, BarChart3, FileText, Settings } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const navItems = [
  { href: '/', icon: House, labelKey: 'nav.home' },
  { href: '/stats', icon: BarChart3, labelKey: 'nav.stats' },
  { href: '/monthly', icon: FileText, labelKey: 'nav.list' },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="no-underline">
              <div className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="font-medium">{t(item.labelKey)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
