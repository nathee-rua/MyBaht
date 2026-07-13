'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Language = 'th' | 'en';

const translations: Record<string, Record<Language, string>> = {
  // App
  'app.name': { th: 'เงินฉัน', en: 'MyBaht' },
  'app.tagline': { th: 'ติดตามรายรับรายจ่ายอัจฉริยะ', en: 'Smart Expense & Income Tracker' },
  
  // Navigation
  'nav.home': { th: 'หน้าหลัก', en: 'Home' },
  'nav.stats': { th: 'สถิติ', en: 'Stats' },
  'nav.list': { th: 'รายการ', en: 'List' },
  'nav.settings': { th: 'ตั้งค่า', en: 'Settings' },
  
  // Auth
  'auth.welcome': { th: 'ยินดีต้อนรับสู่ MyBaht', en: 'WELCOME BACK TO MYBAHT' },
  'auth.subtitle': { th: 'แอปติดตามรายรับรายจ่ายที่ใช้งานง่าย', en: 'An Easy-to-Use Expense and Income Tracker Application' },
  'auth.login': { th: 'เข้าสู่ระบบ', en: 'Login' },
  'auth.register': { th: 'สร้างบัญชี', en: 'Create an Account' },
  'auth.social': { th: 'หรือเข้าสู่ระบบด้วย', en: 'Or continue login with' },
  'auth.email': { th: 'อีเมล', en: 'Email' },
  'auth.username': { th: 'ชื่อผู้ใช้งาน', en: 'Username' },
  'auth.password': { th: 'รหัสผ่าน', en: 'Password' },
  'auth.confirmPassword': { th: 'ยืนยันรหัสผ่าน', en: 'Confirm Password' },
  'auth.logout': { th: 'ออกจากระบบ', en: 'Logout' },
  
  // Transaction
  'transaction.title': { th: 'ธุรกรรม', en: 'Transaction' },
  'transaction.income': { th: 'รายรับ', en: 'Income' },
  'transaction.outcome': { th: 'รายจ่าย', en: 'Outcome' },
  'transaction.total': { th: 'รวม', en: 'Total' },
  'transaction.add': { th: 'เพิ่มรายการ', en: 'Add Transaction' },
  'transaction.edit': { th: 'แก้ไขรายการ', en: 'Edit Transaction' },
  'transaction.delete': { th: 'ลบรายการ', en: 'Delete Transaction' },
  'transaction.amount': { th: 'จำนวนเงิน', en: 'Amount' },
  'transaction.category': { th: 'หมวดหมู่', en: 'Category' },
  'transaction.note': { th: 'หมายเหตุ', en: 'Notes' },
  'transaction.date': { th: 'วันที่', en: 'Date' },
  'transaction.merchant': { th: 'ร้านค้า', en: 'Merchant' },
  'transaction.asset': { th: 'ช่องทางชำระ', en: 'Asset' },
  'transaction.selectDate': { th: 'เลือกวันที่', en: 'Select Date' },
  'transaction.save': { th: 'บันทึก', en: 'Save' },
  'transaction.reset': { th: 'ล้างข้อมูล', en: 'Reset' },
  'transaction.transfer': { th: 'โอน', en: 'Transfer' },
  
  // Date filters
  'filter.daily': { th: 'รายวัน', en: 'Daily' },
  'filter.weekly': { th: 'รายสัปดาห์', en: 'Weekly' },
  'filter.monthly': { th: 'รายเดือน', en: 'Monthly' },
  'filter.calendar': { th: 'ปฏิทิน', en: 'Calendar' },
  
  // Categories - Expense
  'category.food': { th: 'อาหาร', en: 'Food' },
  'category.transport': { th: 'เดินทาง', en: 'Transport' },
  'category.shopping': { th: 'ช้อปปิ้ง', en: 'Shopping' },
  'category.bills': { th: 'ค่าบริการ', en: 'Bills' },
  'category.entertainment': { th: 'บันเทิง', en: 'Entertainment' },
  'category.health': { th: 'สุขภาพ', en: 'Health' },
  'category.education': { th: 'การศึกษา', en: 'Education' },
  'category.other': { th: 'อื่นๆ', en: 'Other' },
  
  // Categories - Income
  'category.salary': { th: 'เงินเดือน', en: 'Salary' },
  'category.bonus': { th: 'โบนัส', en: 'Bonus' },
  'category.investment': { th: 'การลงทุน', en: 'Investment' },
  'category.gift': { th: 'ของขวัญ', en: 'Gift' },
  'category.otherIncome': { th: 'รายได้อื่น', en: 'Other Income' },
  
  // Payment methods
  'payment.cash': { th: 'เงินสด', en: 'Cash' },
  'payment.bank': { th: 'ธนาคาร', en: 'Bank' },
  'payment.credit_card': { th: 'บัตรเครดิต', en: 'Credit Card' },
  'payment.e_wallet': { th: 'กระเป๋าเงินอิเล็กทรอนิกส์', en: 'E-Wallet' },
  'payment.savings': { th: 'ออมทรัพย์', en: 'Savings' },
  
  // Stats
  'stats.title': { th: 'สถิติ', en: 'Stats' },
  'stats.budget': { th: 'งบประมาณ', en: 'Budget' },
  'stats.note': { th: 'บันทึก', en: 'Note' },
  'stats.investment': { th: 'การลงทุน', en: 'Investment' },
  'stats.spending': { th: 'ค่าใช้จ่ายเดือนนี้', en: 'Spend this month' },
  'stats.ascending': { th: 'น้อยไปมาก', en: 'Ascending' },
  'stats.descending': { th: 'มากไปน้อย', en: 'Descending' },
  'stats.trend': { th: 'แนวโน้ม', en: 'Trends' },
  'stats.overview': { th: 'ภาพรวม', en: 'Overview' },
  
  // Settings
  'settings.title': { th: 'ตั้งค่า', en: 'Settings' },
  'settings.language': { th: 'ภาษา', en: 'Language' },
  'settings.theme': { th: 'ธีม', en: 'Theme' },
  'settings.ai': { th: 'ตั้งค่า AI', en: 'AI Settings' },
  'settings.telegram': { th: 'เชื่อมต่อ Telegram', en: 'Connect Telegram' },
  'settings.line': { th: 'เชื่อมต่อ LINE', en: 'Connect LINE' },
  'settings.export': { th: 'ส่งออกเป็น Excel', en: 'Export to Excel' },
  'settings.account': { th: 'จัดการบัญชี', en: 'Account' },
  
  // AI
  'ai.settings': { th: 'ตั้งค่า AI', en: 'AI Settings' },
  'ai.provider': { th: 'ผู้ให้บริการ AI', en: 'AI Provider' },
  'ai.apiKey': { th: 'API Key', en: 'API Key' },
  'ai.model': { th: 'โมเดล', en: 'Model' },
  'ai.testConnection': { th: 'ทดสอบการเชื่อมต่อ', en: 'Test Connection' },
  'ai.scanSlip': { th: 'สแกนใบเสร็จ', en: 'Scan Receipt' },
  'ai.analyzing': { th: 'กำลังวิเคราะห์...', en: 'Analyzing...' },
  
  // Telegram
  'telegram.connect': { th: 'เชื่อมต่อ Telegram Bot', en: 'Connect Telegram Bot' },
  'telegram.linked': { th: 'เชื่อมต่อแล้ว', en: 'Linked' },
  'telegram.unlinked': { th: 'ยังไม่เชื่อมต่อ', en: 'Not linked' },

  // LINE
  'line.connect': { th: 'เชื่อมต่อ LINE Bot', en: 'Connect LINE Bot' },
  'line.linked': { th: 'เชื่อมต่อแล้ว', en: 'Linked' },
  'line.unlinked': { th: 'ยังไม่เชื่อมต่อ', en: 'Not linked' },
  
  // Common
  'common.save': { th: 'บันทึก', en: 'Save' },
  'common.cancel': { th: 'ยกเลิก', en: 'Cancel' },
  'common.delete': { th: 'ลบ', en: 'Delete' },
  'common.edit': { th: 'แก้ไข', en: 'Edit' },
  'common.confirm': { th: 'ยืนยัน', en: 'Confirm' },
  'common.search': { th: 'ค้นหา', en: 'Search' },
  'common.noData': { th: 'ไม่มีข้อมูล', en: 'No data' },
  'common.loading': { th: 'กำลังโหลด...', en: 'Loading...' },
  'common.error': { th: 'เกิดข้อผิดพลาด', en: 'Error occurred' },
  'common.success': { th: 'สำเร็จ', en: 'Success' },

  // Summary
  'summary.today': { th: 'วันนี้', en: 'Today' },
  'summary.week': { th: '7 วัน', en: '7 Days' },
  'summary.month': { th: 'เดือนนี้', en: 'This Month' },
  'summary.year': { th: 'ปีนี้', en: 'This Year' },
  'summary.recent': { th: 'รายการล่าสุด', en: 'Recent Expenses' },
  'summary.monthlyOverview': { th: 'ภาพรวมรายเดือน', en: 'Monthly Overview' },

  // Custom Filters
  'filter.thisMonth': { th: 'เดือนนี้', en: 'This Month' },
  'filter.thisWeek': { th: 'สัปดาห์นี้', en: 'This Week' },
  'filter.today': { th: 'วันนี้', en: 'Today' },
  'filter.allCategories': { th: 'ทุกหมวดหมู่', en: 'All Categories' },
  'filter.allPrices': { th: 'ทุกราคา', en: 'All Prices' },
  'filter.under500': { th: 'ต่ำกว่า ฿500', en: 'Under ฿500' },
  'filter.500to5000': { th: '฿500 - ฿5,000', en: '฿500 - ฿5,000' },
  'filter.over5000': { th: 'เกิน ฿5,000', en: 'Over ฿5,000' },

  // Credit Card widgets
  'card.availableBalance': { th: 'ยอดเงินคงเหลือ', en: 'Available Balance' },
  'card.cardHolder': { th: 'เจ้าของบัตร', en: 'Card Holder' },
  'card.cash': { th: 'เงินสด', en: 'CASH' },

  // Actions
  'action.addExpense': { th: 'เพิ่มรายจ่าย', en: 'Add Expense' },
  'action.scanSlip': { th: 'สแกนสลิป', en: 'Scan Slip' },
  'action.pasteText': { th: 'วางข้อความ AI', en: 'Paste Text AI' },

  // Days
  'day.sunday': { th: 'อาทิตย์', en: 'Sunday' },
  'day.monday': { th: 'จันทร์', en: 'Monday' },
  'day.tuesday': { th: 'อังคาร', en: 'Tuesday' },
  'day.wednesday': { th: 'พุธ', en: 'Wednesday' },
  'day.thursday': { th: 'พฤหัสบดี', en: 'Thursday' },
  'day.friday': { th: 'ศุกร์', en: 'Friday' },
  'day.saturday': { th: 'เสาร์', en: 'Saturday' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'th';
    try {
      const saved = localStorage.getItem('mybaht-lang') as Language | null;
      if (saved && (saved === 'th' || saved === 'en')) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'th';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mybaht-lang', lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDate = useCallback((date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, formatCurrency, formatDate }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
