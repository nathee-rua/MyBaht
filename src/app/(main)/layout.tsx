'use client';

import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50/40 dark:bg-zinc-950/80 flex justify-center relative transition-colors duration-200">
      {/* Premium background radial gradient accents on desktop */}
      <div className="hidden md:block absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.06),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.04),transparent_50%)] -z-20 pointer-events-none" />
      
      {/* Mobile App Shell Container */}
      <div className="w-full max-w-md min-h-screen bg-bg-primary relative flex flex-col md:border-x md:border-border/30 md:shadow-[0_0_40px_rgba(17,24,39,0.05)]">
        <main className="flex-1 w-full flex flex-col pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
