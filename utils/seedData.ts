import {
  Account,
  Budget,
  Category,
  RecurringPayment,
  SavingsGoal,
  Transaction,
  ZentavoState,
} from '../types';

export const INITIAL_EXCHANGE_RATE = 60.5;

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Comida & Supermercado', type: 'expense', icon: 'utensils', color: '#F59E0B' },
  { id: 'cat-transport', name: 'Transporte & Combustible', type: 'expense', icon: 'car', color: '#3B82F6' },
  { id: 'cat-services', name: 'Servicios & Facturas', type: 'expense', icon: 'bolt', color: '#8B5CF6' },
  { id: 'cat-health', name: 'Salud & Farmacia', type: 'expense', icon: 'heart', color: '#EC4899' },
  { id: 'cat-home', name: 'Hogar & Alquiler', type: 'expense', icon: 'home', color: '#06B6D4' },
  { id: 'cat-leisure', name: 'Ocio & Suscripciones', type: 'expense', icon: 'film', color: '#F97316' },
  { id: 'cat-salary', name: 'Salario & Nómina', type: 'income', icon: 'briefcase', color: '#10B981' },
  { id: 'cat-business', name: 'Negocios & Freelance', type: 'income', icon: 'trending-up', color: '#14B8A6' },
];

export const INITIAL_ACCOUNTS: Account[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_RECURRING: RecurringPayment[] = [];

export const INITIAL_GOALS: SavingsGoal[] = [];

export const INITIAL_ZENTAVO_STATE: ZentavoState = {
  accounts: INITIAL_ACCOUNTS,
  categories: INITIAL_CATEGORIES,
  transactions: INITIAL_TRANSACTIONS,
  budgets: INITIAL_BUDGETS,
  recurring: INITIAL_RECURRING,
  goals: INITIAL_GOALS,
  exchangeRate: INITIAL_EXCHANGE_RATE,
  theme: 'dark',
};
