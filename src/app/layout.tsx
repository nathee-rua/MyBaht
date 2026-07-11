import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MyBaht - Smart Expense & Income Tracker',
  description:
    'Track your expenses and income effortlessly with MyBaht. AI-powered receipt scanning, Telegram integration, and beautiful charts.',
  keywords: ['expense tracker', 'income tracker', 'finance', 'budget', 'Thailand', 'baht'],
  authors: [{ name: 'MyBaht' }],
  openGraph: {
    title: 'MyBaht - Smart Expense & Income Tracker',
    description: 'Track your expenses and income effortlessly with MyBaht.',
    type: 'website',
    locale: 'th_TH',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D0B1A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoSansThai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <I18nProvider>
            {children}
            <Toaster
              position="top-center"
              richColors
              theme="dark"
              toastOptions={{
                style: {
                  background: '#1A1530',
                  border: '1px solid #3D3660',
                  color: '#FFFFFF',
                },
              }}
            />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
