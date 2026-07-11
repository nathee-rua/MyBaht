'use client';

import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-container">
      {children}
      <BottomNav />
    </div>
  );
}
