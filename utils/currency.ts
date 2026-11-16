import { Account, Category, CurrencyCode, Transaction } from '../types';

/**
 * Formats an amount in RD$ (DOP) or US$ (USD) with tabular-friendly two-decimal precision.
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'DOP', showSign = false): string {
  const absVal = Math.abs(amount);
  const formattedNumber = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = currency === 'USD' ? 'US$' : 'RD$';
  const sign = showSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : amount < 0 ? '-' : '';
  return `${sign}${prefix} ${formattedNumber}`;
}

/**
 * Converts an amount from `fromCurrency` to `toCurrency` using the provided USD->DOP exchange rate.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) return amount;
  const safeRate = exchangeRate > 0 ? exchangeRate : 60.5;
  if (fromCurrency === 'USD' && toCurrency === 'DOP') {
    return Number((amount * safeRate).toFixed(2));
  }
  // DOP -> USD
  return Number((amount / safeRate).toFixed(2));
}

/**
 * Converts any amount into base currency (DOP / RD$).
 */
export function toBaseDOP(amount: number, currency: CurrencyCode, exchangeRate: number): number {
  return convertCurrency(amount, currency, 'DOP', exchangeRate);
}

/**
 * Computes Consolidated Net Worth in DOP:
 * - For cash, debit, savings: adds account balance (converted to DOP)
 * - For credit_card: subtracts used debt (`balance`) from net worth
 */
export function calculateNetWorthDOP(accounts: Account[], exchangeRate: number): {
  totalNetWorthDOP: number;
  totalAssetsDOP: number;
  totalDebtDOP: number;
} {
  let totalAssetsDOP = 0;
  let totalDebtDOP = 0;

  for (const acc of accounts) {
    const amountInDOP = toBaseDOP(acc.balance, acc.currency, exchangeRate);
    if (acc.type === 'credit_card') {
      totalDebtDOP += amountInDOP;
    } else {
      totalAssetsDOP += amountInDOP;
    }
  }

  return {
    totalNetWorthDOP: Number((totalAssetsDOP - totalDebtDOP).toFixed(2)),
    totalAssetsDOP: Number(totalAssetsDOP.toFixed(2)),
    totalDebtDOP: Number(totalDebtDOP.toFixed(2)),
  };
}

/**
 * Applies or reverses a transaction atomically on the accounts array.
 * direction = 1 to apply a new transaction, -1 to revert a deleted/edited transaction.
 *
 * Rules:
 * - Expense:
 *    - cash/debit/savings: subtracts from `balance`
 *    - credit_card: increases used debt (`balance`)
 * - Income:
 *    - cash/debit/savings: adds to `balance`
 *    - credit_card: reduces used debt (`balance`)
 * - Transfer:
 *    - Origin account acts like an expense (money leaves origin account)
 *    - Destination account acts like an income (money enters destination account, converted if currencies differ)
 */
export function applyTransactionToAccounts(
  accounts: Account[],
  tx: Transaction,
  direction: 1 | -1 = 1
): Account[] {
  return accounts.map((acc) => {
    let updatedBalance = acc.balance;

    // 1. Check if this account is the origin account
    if (acc.id === tx.accountId) {
      const amountInOriginCurrency = convertCurrency(
        tx.amount,
        tx.currency,
        acc.currency,
        tx.exchangeRate
      );

      if (tx.type === 'expense' || tx.type === 'transfer') {
        if (acc.type === 'credit_card') {
          updatedBalance += direction * amountInOriginCurrency;
        } else {
          updatedBalance -= direction * amountInOriginCurrency;
        }
      } else if (tx.type === 'income') {
        if (acc.type === 'credit_card') {
          updatedBalance = Math.max(0, updatedBalance - direction * amountInOriginCurrency);
        } else {
          updatedBalance += direction * amountInOriginCurrency;
        }
      }
    }

    // 2. Check if this account is the destination account in a transfer
    if (tx.type === 'transfer' && tx.destinationAccountId && acc.id === tx.destinationAccountId) {
      const amountInDestCurrency = convertCurrency(
        tx.amount,
        tx.currency,
        acc.currency,
        tx.exchangeRate
      );

      if (acc.type === 'credit_card') {
        // Paying off credit card debt via transfer
        updatedBalance = Math.max(0, updatedBalance - direction * amountInDestCurrency);
      } else {
        updatedBalance += direction * amountInDestCurrency;
      }
    }

    return {
      ...acc,
      balance: Number(updatedBalance.toFixed(2)),
    };
  });
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a readable Spanish label.
 */
export function formatDateSpanish(dateStr: string): string {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const dateObj = new Date(year, month, day);

  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${weekdays[dateObj.getDay()]}, ${day} ${months[month]} ${year}`;
}

/**
 * Exports all transactions to CSV format string.
 */
export function generateTransactionsCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    'ID',
    'Fecha',
    'Tipo',
    'Comercio / Nota',
    'Categoria',
    'Cuenta Origen',
    'Cuenta Destino',
    'Monto',
    'Moneda',
    'Tasa Cambio',
    'Equivalente RD$',
    'Cuotas',
  ];

  const rows = transactions.map((tx) => {
    const eqDOP = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate).toFixed(2);
    const installments = tx.installmentInfo
      ? `${tx.installmentInfo.currentInstallment}/${tx.installmentInfo.totalMonths} (${tx.installmentInfo.monthlyInstallmentAmount.toFixed(2)}/mes)`
      : 'Contado';
    const cleanNote = `"${(tx.note || '').replace(/"/g, '""')}"`;
    return [
      tx.id,
      tx.date,
      tx.type.toUpperCase(),
      cleanNote,
      `"${categoryMap.get(tx.categoryId) || 'Transferencia'}"`,
      `"${accountMap.get(tx.accountId) || tx.accountId}"`,
      `"${tx.destinationAccountId ? accountMap.get(tx.destinationAccountId) || '' : ''}"`,
      tx.amount.toFixed(2),
      tx.currency,
      tx.exchangeRate.toFixed(2),
      eqDOP,
      `"${installments}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
