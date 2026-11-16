import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Account,
  Budget,
  Category,
  RecurringPayment,
  SavingsGoal,
  Transaction,
  ZentavoState,
} from '../types';
import { INITIAL_ZENTAVO_STATE } from '../utils/seedData';
import {
  applyTransactionToAccounts,
  generateTransactionsCSV,
  toBaseDOP,
} from '../utils/currency';
import { DARK_THEME, LIGHT_THEME, ThemeColors } from '../utils/theme';

const STORAGE_KEY = '@zentavo_store_v2_clean';
const LEGACY_STORAGE_KEY = '@zentavo_offline_store_v1';

interface ZentavoContextValue extends ZentavoState {
  colors: ThemeColors;
  isHydrated: boolean;
  toggleTheme: () => void;
  setExchangeRate: (rate: number) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (accountId: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (updatedTx: Transaction) => void;
  deleteTransaction: (txId: string) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  deleteBudget: (budgetId: string) => void;
  addRecurring: (rec: Omit<RecurringPayment, 'id'>) => void;
  deleteRecurring: (recId: string) => void;
  payRecurringNow: (recId: string) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  deleteGoal: (goalId: string) => void;
  contributeToGoal: (goalId: string, amountDOP: number, sourceAccountId?: string) => void;
  exportCSV: () => string;
  exportBackupJSON: () => string;
  importBackupJSON: (rawJson: string) => { success: boolean; message: string };
  resetDemoData: () => void;
}

const ZentavoContext = createContext<ZentavoContextValue | undefined>(undefined);

async function loadPersistedState(): Promise<ZentavoState | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Error loading Zentavo state:', err);
    return null;
  }
}

async function savePersistedState(state: ZentavoState): Promise<void> {
  try {
    const serialized = JSON.stringify(state);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('Error saving Zentavo state:', err);
  }
}

export const ZentavoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ZentavoState>(INITIAL_ZENTAVO_STATE);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    loadPersistedState().then((saved) => {
      if (mounted) {
        if (saved && Array.isArray(saved.accounts) && Array.isArray(saved.transactions)) {
          setState(saved);
        } else {
          savePersistedState(INITIAL_ZENTAVO_STATE);
        }
        setIsHydrated(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      savePersistedState(state);
    }
  }, [state, isHydrated]);

  const toggleTheme = () => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const setExchangeRate = (rate: number) => {
    if (isNaN(rate) || rate <= 0) return;
    setState((prev) => ({
      ...prev,
      exchangeRate: Number(rate.toFixed(2)),
    }));
  };

  const addAccount = (accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: `acc-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  };

  const updateAccount = (updated: Account) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === updated.id ? updated : a)),
    }));
  };

  const deleteAccount = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== accountId),
      transactions: prev.transactions.filter(
        (t) => t.accountId !== accountId && t.destinationAccountId !== accountId
      ),
    }));
  };

  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    // If credit card installment is selected (> 1 month), build scheduled monthly dates
    let installmentInfo = txData.installmentInfo;
    if (installmentInfo && installmentInfo.totalMonths > 1) {
      const baseDate = new Date(txData.date + 'T12:00:00');
      const scheduledDates: string[] = [];
      for (let i = 0; i < installmentInfo.totalMonths; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        scheduledDates.push(d.toISOString().split('T')[0]);
      }
      installmentInfo = {
        ...installmentInfo,
        monthlyInstallmentAmount: Number(
          (txData.amount / installmentInfo.totalMonths).toFixed(2)
        ),
        scheduledDates,
      };
    }

    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      installmentInfo,
    };

    setState((prev) => {
      const updatedAccounts = applyTransactionToAccounts(prev.accounts, newTx, 1);
      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: [newTx, ...prev.transactions],
      };
    });
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setState((prev) => {
      const oldTx = prev.transactions.find((t) => t.id === updatedTx.id);
      if (!oldTx) return prev;

      // 1. Revert old transaction effect on accounts
      const revertedAccounts = applyTransactionToAccounts(prev.accounts, oldTx, -1);
      // 2. Apply updated transaction effect on accounts
      const finalAccounts = applyTransactionToAccounts(revertedAccounts, updatedTx, 1);

      return {
        ...prev,
        accounts: finalAccounts,
        transactions: prev.transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t)),
      };
    });
  };

  const deleteTransaction = (txId: string) => {
    setState((prev) => {
      const targetTx = prev.transactions.find((t) => t.id === txId);
      if (!targetTx) return prev;

      const updatedAccounts = applyTransactionToAccounts(prev.accounts, targetTx, -1);
      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: prev.transactions.filter((t) => t.id !== txId),
      };
    });
  };

  const addBudget = (budgetData: Omit<Budget, 'id'>) => {
    setState((prev) => {
      // Replace if same category already has a budget
      const filtered = prev.budgets.filter((b) => b.categoryId !== budgetData.categoryId);
      return {
        ...prev,
        budgets: [
          ...filtered,
          {
            ...budgetData,
            id: `bgt-${Date.now()}`,
          },
        ],
      };
    });
  };

  const deleteBudget = (budgetId: string) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.filter((b) => b.id !== budgetId),
    }));
  };

  const addRecurring = (recData: Omit<RecurringPayment, 'id'>) => {
    setState((prev) => ({
      ...prev,
      recurring: [
        ...prev.recurring,
        {
          ...recData,
          id: `rec-${Date.now()}`,
        },
      ],
    }));
  };

  const deleteRecurring = (recId: string) => {
    setState((prev) => ({
      ...prev,
      recurring: prev.recurring.filter((r) => r.id !== recId),
    }));
  };

  const payRecurringNow = (recId: string) => {
    setState((prev) => {
      const rec = prev.recurring.find((r) => r.id === recId);
      if (!rec) return prev;

      const todayStr = new Date().toISOString().split('T')[0];
      const paymentTx: Transaction = {
        id: `tx-${Date.now()}`,
        accountId: rec.accountId,
        categoryId: rec.categoryId,
        type: 'expense',
        amount: rec.amount,
        currency: rec.currency,
        exchangeRate: prev.exchangeRate,
        note: `${rec.title} (Pago Recurrente)`,
        date: todayStr,
      };

      // Advance nextDate according to frequency
      const nextD = new Date(rec.nextDate + 'T12:00:00');
      if (rec.frequency === 'monthly') nextD.setMonth(nextD.getMonth() + 1);
      else if (rec.frequency === 'biweekly') nextD.setDate(nextD.getDate() + 14);
      else if (rec.frequency === 'weekly') nextD.setDate(nextD.getDate() + 7);
      else if (rec.frequency === 'yearly') nextD.setFullYear(nextD.getFullYear() + 1);

      const updatedAccounts = applyTransactionToAccounts(prev.accounts, paymentTx, 1);

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: [paymentTx, ...prev.transactions],
        recurring: prev.recurring.map((r) =>
          r.id === recId ? { ...r, nextDate: nextD.toISOString().split('T')[0] } : r
        ),
      };
    });
  };

  const addGoal = (goalData: Omit<SavingsGoal, 'id'>) => {
    setState((prev) => ({
      ...prev,
      goals: [
        ...prev.goals,
        {
          ...goalData,
          id: `goal-${Date.now()}`,
        },
      ],
    }));
  };

  const deleteGoal = (goalId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
  };

  const contributeToGoal = (goalId: string, amountDOP: number, sourceAccountId?: string) => {
    if (amountDOP <= 0) return;
    setState((prev) => {
      const targetGoal = prev.goals.find((g) => g.id === goalId);
      if (!targetGoal) return prev;

      let updatedAccounts = prev.accounts;
      let updatedTransactions = prev.transactions;

      if (sourceAccountId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const goalTx: Transaction = {
          id: `tx-${Date.now()}`,
          accountId: sourceAccountId,
          categoryId: 'cat-business',
          type: 'expense',
          amount: amountDOP,
          currency: 'DOP',
          exchangeRate: prev.exchangeRate,
          note: `Abono a Meta: ${targetGoal.name}`,
          date: todayStr,
        };
        updatedAccounts = applyTransactionToAccounts(prev.accounts, goalTx, 1);
        updatedTransactions = [goalTx, ...prev.transactions];
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: updatedTransactions,
        goals: prev.goals.map((g) =>
          g.id === goalId
            ? { ...g, currentAmount: Number((g.currentAmount + amountDOP).toFixed(2)) }
            : g
        ),
      };
    });
  };

  const exportCSV = () => {
    return generateTransactionsCSV(state.transactions, state.accounts, state.categories);
  };

  const exportBackupJSON = () => {
    const backupPayload = {
      app: 'Zentavo',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: state,
    };
    return JSON.stringify(backupPayload, null, 2);
  };

  const importBackupJSON = (rawJson: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawJson);
      const candidate: ZentavoState = parsed?.data && Array.isArray(parsed.data.accounts)
        ? parsed.data
        : parsed;

      if (
        !candidate ||
        !Array.isArray(candidate.accounts) ||
        !Array.isArray(candidate.transactions) ||
        !Array.isArray(candidate.categories)
      ) {
        return {
          success: false,
          message: 'Estructura JSON inválida: faltan cuentas, categorías o transacciones.',
        };
      }

      setState(candidate);
      savePersistedState(candidate);
      return {
        success: true,
        message: `Respaldo importado con éxito (${candidate.accounts.length} cuentas, ${candidate.transactions.length} movimientos).`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al leer el archivo JSON. Verifica que el formato sea válido.',
      };
    }
  };

  const resetDemoData = () => {
    const cleanState: ZentavoState = {
      ...INITIAL_ZENTAVO_STATE,
      accounts: [],
      transactions: [],
      budgets: [],
      recurring: [],
      goals: [],
    };
    setState(cleanState);
    savePersistedState(cleanState);
  };

  const colors = useMemo(
    () => (state.theme === 'dark' ? DARK_THEME : LIGHT_THEME),
    [state.theme]
  );

  const value: ZentavoContextValue = {
    ...state,
    colors,
    isHydrated,
    toggleTheme,
    setExchangeRate,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    addRecurring,
    deleteRecurring,
    payRecurringNow,
    addGoal,
    deleteGoal,
    contributeToGoal,
    exportCSV,
    exportBackupJSON,
    importBackupJSON,
    resetDemoData,
  };

  return <ZentavoContext.Provider value={value}>{children}</ZentavoContext.Provider>;
};

export function useZentavo(): ZentavoContextValue {
  const ctx = useContext(ZentavoContext);
  if (!ctx) {
    throw new Error('useZentavo debe usarse dentro de un ZentavoProvider');
  }
  return ctx;
}
