'use client';

import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary/95 flex justify-center relative">
      {/* Visual background gradient accents on desktop */}
      <div className="hidden md:block absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.04),transparent_50%)] -z-20 pointer-events-none" />
      
      <div className="w-full max-w-md min-h-screen bg-bg-primary relative flex flex-col border-x border-border/10 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
