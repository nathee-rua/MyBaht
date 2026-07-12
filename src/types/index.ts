export type TransactionKind = 'expense' | 'income';

export type ExpenseCategory = 
  | 'food' 
  | 'transport' 
  | 'shopping' 
  | 'bills' 
  | 'entertainment' 
  | 'health' 
  | 'education' 
  | 'other';

export type IncomeCategory = 
  | 'salary' 
  | 'bonus' 
  | 'investment' 
  | 'gift' 
  | 'otherIncome';

export type Category = ExpenseCategory | IncomeCategory;

export type PaymentMethod = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'savings';

export type AIProvider = 'openai' | 'openrouter' | 'google' | 'grok' | 'nvidia' | 'opencode' | 'llm7';

export type Language = 'th' | 'en';
export type Theme = 'dark' | 'light';

export type DateFilter = 'daily' | 'weekly' | 'monthly' | 'calendar';

export interface Transaction {
  id: string;
  user_id: string;
  kind: TransactionKind;
  amount: number;
  category: Category;
  note: string | null;
  merchant: string | null;
  payment_method: PaymentMethod;
  date: string; // ISO date string YYYY-MM-DD
  source: 'manual' | 'telegram' | 'receipt_scan';
  ai_extracted: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  classification?: TransactionClassification;
}

export interface UserSettings {
  user_id: string;
  ai_provider: AIProvider | null;
  ai_api_key_encrypted: string | null;
  ai_model: string | null;
  language: Language;
  theme: Theme;
  telegram_chat_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  kind: TransactionKind;
  amount: number;
  category: Category;
  note: string;
  merchant: string;
  payment_method: PaymentMethod;
  date: string;
  classification?: TransactionClassification;
}

export interface SlipAnalysisResult {
  amount: number;
  category: Category;
  merchant?: string;
  note?: string;
  date: string;
  payment_method?: PaymentMethod;
}

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  baseUrl: string;
  modelsEndpoint: string;
  keyPrefix: string;
  icon: string;
}

export interface AIModel {
  id: string;
  name: string;
  supportsVision: boolean;
}

export interface SummaryData {
  todayExpense: number;
  weekExpense: number;
  monthExpense: number;
  yearExpense: number;
  monthIncome: number;
  yearIncome: number;
  net: number;
}

export interface CategoryBreakdownItem {
  category: Category;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; icon: string; color: string }[] = [
  { id: 'food', icon: 'UtensilsCrossed', color: '#F59E0B' },
  { id: 'transport', icon: 'Car', color: '#06B6D4' },
  { id: 'shopping', icon: 'ShoppingBag', color: '#EC4899' },
  { id: 'bills', icon: 'Receipt', color: '#EF4444' },
  { id: 'entertainment', icon: 'Gamepad2', color: '#8B5CF6' },
  { id: 'health', icon: 'Heart', color: '#22C55E' },
  { id: 'education', icon: 'GraduationCap', color: '#3B82F6' },
  { id: 'other', icon: 'MoreHorizontal', color: '#6B7280' },
];

export const INCOME_CATEGORIES: { id: IncomeCategory; icon: string; color: string }[] = [
  { id: 'salary', icon: 'Banknote', color: '#22C55E' },
  { id: 'bonus', icon: 'Gift', color: '#F59E0B' },
  { id: 'investment', icon: 'TrendingUp', color: '#06B6D4' },
  { id: 'gift', icon: 'Heart', color: '#EC4899' },
  { id: 'otherIncome', icon: 'Plus', color: '#6B7280' },
];

export const PAYMENT_METHODS: { id: PaymentMethod; icon: string }[] = [
  { id: 'cash', icon: 'Banknote' },
  { id: 'bank', icon: 'Building2' },
  { id: 'credit_card', icon: 'CreditCard' },
  { id: 'e_wallet', icon: 'Smartphone' },
  { id: 'savings', icon: 'PiggyBank' },
];

export const CHART_COLORS = [
  '#7C3AED', '#06B6D4', '#F59E0B', '#EF4444', '#22C55E', 
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#3B82F6',
  '#A855F7', '#84CC16'
];

// ===== Investment & Advanced Analysis Foundation =====

export type TransactionClassification = 'living' | 'dca' | 'transfer';

export type DataMode = 'monthly' | 'cumulativeYear' | 'cumulativeAll';

export interface AdvancedSummaryData {
  monthly: {
    livingExpense: number;
    dca: number;
    transfer: number;
    income: number;
  };
  cumulativeYear: {
    livingExpense: number;
    dca: number;
    transfer: number;
    income: number;
  };
  cumulativeAll: {
    livingExpense: number;
    dca: number;
    transfer: number;
    income: number;
  };
}

export interface InvestmentPlan {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_dca_target: number;
  start_date: string;
  target_date?: string;
  asset_type?: 'stocks' | 'crypto' | 'mutual_funds' | 'gold' | 'other';
  notes?: string;
  created_at?: string;
}

export interface InvestmentRecord {
  id: string;
  plan_id?: string;
  transaction_id?: string;
  amount: number;
  date: string;
  price?: number;
  units?: number;
  type: 'buy' | 'sell' | 'dividend';
  name?: string; // Add name support for custom record names
}

export interface InvestmentReminder {
  id: string;
  user_id?: string;
  plan_id?: string;
  day_of_month: number;
  amount: number;
  message?: string;
  active: boolean;
  name?: string; // Add name support for custom reminder names
}

// Supabase investment schema interfaces
export interface InvestmentDbAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  type: 'stocks' | 'crypto' | 'mutual_funds' | 'gold' | 'other';
  created_at: string;
  updated_at: string;
}

export interface InvestmentDbRecord {
  id: string;
  user_id: string;
  asset_id: string;
  date: string; // ISO date string YYYY-MM-DD
  type: 'buy' | 'sell' | 'dividend';
  amount: number;
  price?: number | null;
  units?: number | null;
  created_at: string;
  updated_at: string;
  asset?: InvestmentDbAsset; // joined details
}
