import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Transaction, TransactionType } from '../types';
import { useZentavo } from '../store/ZentavoContext';
import {
  formatCurrency,
  formatDateSpanish,
  toBaseDOP,
} from '../utils/currency';
import { CategoryIcon } from '../components/CategoryIcon';

interface TransactionsScreenProps {
  onEditTransaction: (tx: Transaction) => void;
}

type TypeFilter = 'all' | TransactionType;

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onEditTransaction,
}) => {
  const {
    accounts,
    categories,
    transactions,
    colors,
    deleteTransaction,
  } = useZentavo();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (
          accountFilter !== 'all' &&
          tx.accountId !== accountFilter &&
          tx.destinationAccountId !== accountFilter
        ) {
          return false;
        }
        if (q.length > 0) {
          const catName =
            categories.find((c) => c.id === tx.categoryId)?.name.toLowerCase() || '';
          const noteMatch = tx.note.toLowerCase().includes(q);
          const catMatch = catName.includes(q);
          return noteMatch || catMatch;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, typeFilter, accountFilter, categories]);

  // Group chronologically by day and calculate daily net balance in DOP
  const groupedByDay = useMemo(() => {
    const groups = new Map<
      string,
      { date: string; items: Transaction[]; netDOP: number }
    >();

    for (const tx of filteredTransactions) {
      const dayKey = tx.date.split('T')[0];
      if (!groups.has(dayKey)) {
        groups.set(dayKey, { date: dayKey, items: [], netDOP: 0 });
      }
      const group = groups.get(dayKey)!;
      group.items.push(tx);

      const eqDOP = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate);
      if (tx.type === 'income') {
        group.netDOP += eqDOP;
      } else if (tx.type === 'expense') {
        group.netDOP -= eqDOP;
      }
    }

    return Array.from(groups.values());
  }, [filteredTransactions]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header & Filters */}
      <View
        style={[
          styles.filterHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Historial de Movimientos
        </Text>

        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por comercio, nota o categoría..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'expense', label: 'Gastos' },
              { id: 'income', label: 'Ingresos' },
              { id: 'transfer', label: 'Transferencias' },
            ] as { id: TypeFilter; label: string }[]
          ).map((f) => {
            const active = typeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? colors.emerald
                      : colors.surfaceElevated,
                    borderColor: active ? colors.emerald : colors.border,
                  },
                ]}
                onPress={() => setTypeFilter(f.id)}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Account Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterPillsRow, { marginTop: 6 }]}
        >
          <TouchableOpacity
            style={[
              styles.accountFilterChip,
              {
                backgroundColor:
                  accountFilter === 'all' ? colors.primaryNavy : colors.surfaceElevated,
                borderColor:
                  accountFilter === 'all' ? colors.emerald : colors.border,
              },
            ]}
            onPress={() => setAccountFilter('all')}
          >
            <Text
              style={{
                color: accountFilter === 'all' ? '#FFFFFF' : colors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              Todas las Cuentas
            </Text>
          </TouchableOpacity>
          {accounts.map((acc) => {
            const active = accountFilter === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accountFilterChip,
                  {
                    backgroundColor: active
                      ? colors.primaryNavy
                      : colors.surfaceElevated,
                    borderColor: active ? colors.emerald : colors.border,
                  },
                ]}
                onPress={() => setAccountFilter(acc.id)}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {acc.name} ({acc.currency === 'USD' ? 'US$' : 'RD$'})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Chronological Daily List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {groupedByDay.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🗂️</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No se encontraron movimientos
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Prueba cambiando los filtros o registra una nueva transacción con el botón ＋
            </Text>
          </View>
        ) : (
          groupedByDay.map((group) => (
            <View
              key={group.date}
              style={[
                styles.dayGroupCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* Day Header with Daily Net Balance */}
              <View
                style={[
                  styles.dayHeader,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
                  📅 {formatDateSpanish(group.date)}
                </Text>
                <Text
                  style={[
                    styles.dayNet,
                    {
                      color:
                        group.netDOP > 0
                          ? colors.emerald
                          : group.netDOP < 0
                          ? colors.danger
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Balance neto: {formatCurrency(group.netDOP, 'DOP', true)}
                </Text>
              </View>

              {/* Day Transactions */}
              {group.items.map((tx, idx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                const acc = accounts.find((a) => a.id === tx.accountId);
                const destAcc = tx.destinationAccountId
                  ? accounts.find((a) => a.id === tx.destinationAccountId)
                  : null;
                const isTransfer = tx.type === 'transfer';

                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txItem,
                      idx < group.items.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.txMainRow}>
                      <CategoryIcon
                        icon={isTransfer ? 'transfer' : cat?.icon || 'utensils'}
                        color={isTransfer ? colors.info : cat?.color || colors.emerald}
                        size={40}
                      />

                      <View style={styles.txInfo}>
                        <Text
                          style={[styles.txNote, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {tx.note}
                        </Text>
                        <Text
                          style={[styles.txMeta, { color: colors.textSecondary }]}
                        >
                          {isTransfer
                            ? `Transferencia: ${acc?.name || 'Origen'} → ${
                                destAcc?.name || 'Destino'
                              }`
                            : `${cat?.name || 'General'} · ${acc?.name || 'Cuenta'}`}
                        </Text>
                        {tx.installmentInfo &&
                          tx.installmentInfo.totalMonths > 1 && (
                            <Text
                              style={[
                                styles.installmentTag,
                                { color: colors.warning },
                              ]}
                            >
                              💳 Plan de Cuotas: {tx.installmentInfo.currentInstallment}/
                              {tx.installmentInfo.totalMonths} meses (
                              {formatCurrency(
                                tx.installmentInfo.monthlyInstallmentAmount,
                                tx.currency
                              )}
                              /mes)
                            </Text>
                          )}
                      </View>

                      <View style={styles.txAmountCol}>
                        <Text
                          style={[
                            styles.txAmount,
                            {
                              color:
                                tx.type === 'expense'
                                  ? colors.danger
                                  : tx.type === 'income'
                                  ? colors.emerald
                                  : colors.info,
                            },
                          ]}
                        >
                          {tx.type === 'expense'
                            ? '-'
                            : tx.type === 'income'
                            ? '+'
                            : '⇄ '}
                          {formatCurrency(tx.amount, tx.currency)}
                        </Text>
                        {tx.currency === 'USD' && (
                          <Text
                            style={[styles.txConverted, { color: colors.textMuted }]}
                          >
                            ≈{' '}
                            {formatCurrency(
                              toBaseDOP(tx.amount, 'USD', tx.exchangeRate),
                              'DOP'
                            )}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Edit & Delete Actions (Recalculates Account Balance Atomically) */}
                    <View style={styles.actionsBar}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.surfaceElevated },
                        ]}
                        onPress={() => onEditTransaction(tx)}
                      >
                        <Text
                          style={[styles.actionBtnText, { color: colors.textPrimary }]}
                        >
                          ✏️ Editar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: colors.dangerSoft },
                        ]}
                        onPress={() => deleteTransaction(tx.id)}
                      >
                        <Text
                          style={[styles.actionBtnText, { color: colors.danger }]}
                        >
                          🗑️ Eliminar (Recalcular Saldo)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  filterPillsRow: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  accountFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  emptyBox: {
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  dayGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayNet: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  txItem: {
    padding: 14,
  },
  txMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txInfo: {
    flex: 1,
  },
  txNote: {
    fontSize: 14,
    fontWeight: '700',
  },
  txMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  installmentTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  txConverted: {
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
