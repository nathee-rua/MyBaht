import { createClient } from '@/lib/supabase/client';
import type { Transaction, TransactionFormData, SummaryData, CategoryBreakdownItem, ChartDataPoint, Category, TransactionClassification, AdvancedSummaryData } from '@/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CHART_COLORS } from '@/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

// ===== CRUD Operations =====

export async function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  kind?: 'expense' | 'income';
  category?: Category;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
}): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from('transactions')
    .select('*');

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }
  if (filters?.kind) {
    query = query.eq('kind', filters.kind);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const sortBy = filters?.sortBy || 'date';
  const sortOrder = filters?.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTransaction(formData: TransactionFormData): Promise<Transaction> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      kind: formData.kind,
      amount: formData.amount,
      category: formData.category,
      note: formData.note || null,
      merchant: formData.merchant || null,
      payment_method: formData.payment_method,
      date: formData.date,
      source: 'manual',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, formData: Partial<TransactionFormData>): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ===== Summary Calculations =====

export function calculateSummary(transactions: Transaction[]): SummaryData {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const yearStart = format(startOfYear(now), 'yyyy-MM-dd');

  let todayExpense = 0;
  let weekExpense = 0;
  let monthExpense = 0;
  let yearExpense = 0;
  let monthIncome = 0;
  let yearIncome = 0;

  for (const tx of transactions) {
    const txDate = tx.date;
    const isExpense = tx.kind === 'expense';
    const amount = Number(tx.amount);

    if (isExpense) {
      if (txDate === todayStr) todayExpense += amount;
      if (txDate >= weekStart) weekExpense += amount;
      if (txDate >= monthStart) monthExpense += amount;
      if (txDate >= yearStart) yearExpense += amount;
    } else {
      if (txDate >= monthStart) monthIncome += amount;
      if (txDate >= yearStart) yearIncome += amount;
    }
  }

  return {
    todayExpense,
    weekExpense,
    monthExpense,
    yearExpense,
    monthIncome,
    yearIncome,
    net: yearIncome - yearExpense,
  };
}

// ===== Category Breakdown =====

export function calculateCategoryBreakdown(transactions: Transaction[], kind: 'expense' | 'income' = 'expense'): CategoryBreakdownItem[] {
  const filtered = transactions.filter(tx => tx.kind === kind);
  const total = filtered.reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const breakdown: CategoryBreakdownItem[] = [];

  for (const cat of categories) {
    const catTransactions = filtered.filter(tx => tx.category === cat.id);
    const amount = catTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    if (amount > 0) {
      breakdown.push({
        category: cat.id,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        count: catTransactions.length,
        color: cat.color,
      });
    }
  }

  return breakdown.sort((a, b) => b.amount - a.amount);
}

// ===== Chart Data =====

export function getChartData(transactions: Transaction[], period: 'daily' | 'weekly' | 'monthly'): ChartDataPoint[] {
  const now = new Date();
  let intervals: Date[];
  let formatStr: string;

  switch (period) {
    case 'daily': {
      const start = subDays(now, 6);
      intervals = eachDayOfInterval({ start, end: now });
      formatStr = 'dd/MM';
      break;
    }
    case 'weekly': {
      const start = subDays(now, 27);
      intervals = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });
      formatStr = 'dd/MM';
      break;
    }
    case 'monthly': {
      const start = startOfYear(now);
      intervals = eachMonthOfInterval({ start, end: now });
      formatStr = 'MMM';
      break;
    }
  }

  return intervals.map(date => {
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case 'daily':
        periodStart = startOfDay(date);
        periodEnd = endOfDay(date);
        break;
      case 'weekly':
        periodStart = startOfWeek(date, { weekStartsOn: 1 });
        periodEnd = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'monthly':
        periodStart = startOfMonth(date);
        periodEnd = endOfMonth(date);
        break;
    }

    const startStr = format(periodStart, 'yyyy-MM-dd');
    const endStr = format(periodEnd, 'yyyy-MM-dd');

    const periodTx = transactions.filter(tx => tx.date >= startStr && tx.date <= endStr);
    const income = periodTx.filter(tx => tx.kind === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
    const expense = periodTx.filter(tx => tx.kind === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      label: format(date, formatStr),
      income,
      expense,
      net: income - expense,
    };
  });
}

// ===== Category Helpers =====

export function getCategoryInfo(categoryId: string) {
  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return allCategories.find(c => c.id === categoryId) || { id: categoryId, icon: 'MoreHorizontal', color: '#6B7280' };
}

export function getCategoryColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// ===== Advanced Analysis & Classifications =====

export function getTransactionClassification(tx: Transaction): TransactionClassification {
  if (tx.classification) return tx.classification;
  
  // Backward compatibility fallback rules:
  if (tx.category === 'investment') return 'dca';
  if (tx.payment_method === 'savings') return 'transfer';
  return 'living';
}

export function calculateAdvancedSummary(
  transactions: Transaction[],
  referenceDate: Date = new Date()
): AdvancedSummaryData {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed

  const monthly = { livingExpense: 0, dca: 0, transfer: 0, income: 0 };
  const cumulativeYear = { livingExpense: 0, dca: 0, transfer: 0, income: 0 };
  const cumulativeAll = { livingExpense: 0, dca: 0, transfer: 0, income: 0 };

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const txYear = txDate.getFullYear();
    const txMonth = txDate.getMonth();

    const amount = Number(tx.amount);
    const classification = getTransactionClassification(tx);
    const isIncome = tx.kind === 'income';

    // 1. Cumulative All
    if (isIncome) {
      cumulativeAll.income += amount;
    } else {
      if (classification === 'living') cumulativeAll.livingExpense += amount;
      else if (classification === 'dca') cumulativeAll.dca += amount;
      else if (classification === 'transfer') cumulativeAll.transfer += amount;
    }

    // 2. Cumulative Year
    if (txYear === refYear) {
      if (isIncome) {
        cumulativeYear.income += amount;
      } else {
        if (classification === 'living') cumulativeYear.livingExpense += amount;
        else if (classification === 'dca') cumulativeYear.dca += amount;
        else if (classification === 'transfer') cumulativeYear.transfer += amount;
      }

      // 3. Monthly
      if (txMonth === refMonth) {
        if (isIncome) {
          monthly.income += amount;
        } else {
          if (classification === 'living') monthly.livingExpense += amount;
          else if (classification === 'dca') monthly.dca += amount;
          else if (classification === 'transfer') monthly.transfer += amount;
        }
      }
    }
  }

  return { monthly, cumulativeYear, cumulativeAll };
}

