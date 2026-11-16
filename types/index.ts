export type AccountType = 'cash' | 'debit' | 'savings' | 'credit_card';
export type CurrencyCode = 'DOP' | 'USD';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type CategoryType = 'expense' | 'income';
export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';
export type RecurringFrequency = 'monthly' | 'biweekly' | 'weekly' | 'yearly';
export type InstallmentMonths = 1 | 3 | 6 | 12;

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  /**
   * For cash/debit/savings: current available funds.
   * For credit_card: current used debt balance.
   */
  balance: number;
  creditLimit?: number;
  cutoffDay?: number;
  dueDay?: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export interface InstallmentInfo {
  totalMonths: InstallmentMonths;
  currentInstallment: number;
  monthlyInstallmentAmount: number;
  parentTransactionId?: string;
  scheduledDates?: string[];
}

export interface Transaction {
  id: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  note: string;
  date: string; // ISO date string YYYY-MM-DD or full ISO
  installmentInfo?: InstallmentInfo;
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number; // Stored in base currency DOP
  period: BudgetPeriod;
}

export interface RecurringPayment {
  id: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  categoryId: string;
  nextDate: string; // YYYY-MM-DD
  frequency: RecurringFrequency;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number; // In DOP
  currentAmount: number; // In DOP
  deadline: string; // YYYY-MM-DD
}

export interface ZentavoState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringPayment[];
  goals: SavingsGoal[];
  exchangeRate: number; // 1 USD = X DOP (default 60.50)
  theme: 'dark' | 'light';
}
