import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Account, Transaction } from '../types';
import { useZentavo } from '../store/ZentavoContext';
import {
  calculateNetWorthDOP,
  convertCurrency,
  formatCurrency,
  formatDateSpanish,
  toBaseDOP,
} from '../utils/currency';
import { AccountCarousel } from '../components/AccountCarousel';
import { AccountModal } from '../components/AccountModal';
import { CategoryIcon } from '../components/CategoryIcon';
import { IncomeVsExpenseChart } from '../components/Charts';

interface DashboardScreenProps {
  onNavigateToTransactions: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenControlCenter?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToTransactions,
  onEditTransaction,
  onOpenControlCenter,
}) => {
  const {
    accounts,
    categories,
    transactions,
    exchangeRate,
    colors,
    theme,
    toggleTheme,
  } = useZentavo();

  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const netWorth = useMemo(
    () => calculateNetWorthDOP(accounts, exchangeRate),
    [accounts, exchangeRate]
  );

  const netWorthUSD = useMemo(
    () => convertCurrency(netWorth.totalNetWorthDOP, 'DOP', 'USD', exchangeRate),
    [netWorth.totalNetWorthDOP, exchangeRate]
  );

  // Monthly Summary (Income vs Expenses, excluding transfers as per business rules)
  const monthlyStats = useMemo(() => {
    let incomeDOP = 0;
    let expenseDOP = 0;
    const categoryTotals = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.type === 'transfer') continue; // Transfers do not alter monthly income/expense stats
      const amountDOP = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate);
      if (tx.type === 'income') {
        incomeDOP += amountDOP;
      } else if (tx.type === 'expense') {
        expenseDOP += amountDOP;
        categoryTotals.set(
          tx.categoryId,
          (categoryTotals.get(tx.categoryId) || 0) + amountDOP
        );
      }
    }

    const top3Categories = Array.from(categoryTotals.entries())
      .map(([catId, total]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Otros',
          icon: cat?.icon || 'utensils',
          color: cat?.color || '#10B981',
          totalDOP: total,
          pct: expenseDOP > 0 ? (total / expenseDOP) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalDOP - a.totalDOP)
      .slice(0, 3);

    return {
      incomeDOP,
      expenseDOP,
      top3Categories,
    };
  }, [transactions, categories]);

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions]
  );

  const handleAddAccount = () => {
    setEditingAccount(null);
    setAccountModalVisible(true);
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountModalVisible(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: colors.emerald }]}>
              <Text style={styles.logoText}>Z</Text>
            </View>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
              Zentavo
            </Text>
          </View>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Control Financiero Multimoneda RD$ / US$
          </Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[
              styles.controlCenterBtn,
              {
                backgroundColor: colors.emeraldSoft,
                borderColor: colors.emerald,
              },
            ]}
            onPress={onOpenControlCenter}
            activeOpacity={0.8}
          >
            <Text style={[styles.controlCenterBtnText, { color: colors.emerald }]}>
              🎛️ Panel de Control
            </Text>
          </TouchableOpacity>
          <View
            style={[
              styles.rateChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.rateChipText, { color: colors.emerald }]}>
              1 US$ = RD$ {exchangeRate.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.themeBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={toggleTheme}
          >
            <Text style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tarjeta Principal estilo Wallet + Acciones Rápidas */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.primaryNavy,
            borderColor: colors.emerald,
          },
        ]}
      >
        <View style={styles.heroHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.heroLabel}>ZENTAVO BALANCE</Text>
            <View style={styles.heroUsdPill}>
              <Text style={styles.heroUsdText}>
                ≈ {formatCurrency(netWorthUSD, 'USD')}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 22 }}>💳</Text>
        </View>

        <Text style={styles.heroAmount}>
          {formatCurrency(netWorth.totalNetWorthDOP, 'DOP')}
        </Text>
        <Text
          style={{
            color: '#CBD5E1',
            fontSize: 13,
            letterSpacing: 2.2,
            fontWeight: '600',
            marginBottom: 14,
            fontVariant: ['tabular-nums'],
          }}
        >
          •••• •••• •••• 8834
        </Text>

        <View style={styles.heroMetricsRow}>
          <View style={styles.heroMetricItem}>
            <Text style={styles.heroMetricLabel}>Activos Líquidos</Text>
            <Text style={[styles.heroMetricValue, { color: '#34D399' }]}>
              {formatCurrency(netWorth.totalAssetsDOP, 'DOP')}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroMetricItem}>
            <Text style={styles.heroMetricLabel}>Deuda Tarjetas (TC)</Text>
            <Text style={[styles.heroMetricValue, { color: '#FCA5A5' }]}>
              -{formatCurrency(netWorth.totalDebtDOP, 'DOP')}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.14)',
          }}
        >
          <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '700' }}>
            Miguel Cuevas
          </Text>
          <Text
            style={{
              color: '#F8FAFC',
              fontSize: 13,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}
          >
            12/28
          </Text>
        </View>
      </View>

      {/* Botones de Acción Rápida */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginBottom: 18,
        }}
      >
        {[
          { icon: '↑', label: 'Enviar' },
          { icon: '↓', label: 'Recibir' },
          { icon: '+', label: 'Recargar' },
        ].map((act) => (
          <TouchableOpacity
            key={act.label}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={handleAddAccount}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                backgroundColor: colors.emeraldSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.emerald, fontWeight: '900', fontSize: 13 }}>
                {act.icon}
              </Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              {act.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Accounts Horizontal Carousel */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Mis Cuentas & Tarjetas
        </Text>
        <TouchableOpacity onPress={handleAddAccount}>
          <Text style={[styles.sectionAction, { color: colors.emerald }]}>
            + Nueva Cuenta
          </Text>
        </TouchableOpacity>
      </View>

      <AccountCarousel
        onAddAccountPress={handleAddAccount}
        onSelectAccount={handleEditAccount}
      />

      {/* Monthly Summary: Income vs Expenses + Top 3 Categories */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Resumen del Mes Actual
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Comparativa consolidada en RD$ (sin incluir transferencias internas)
        </Text>

        <IncomeVsExpenseChart
          incomeDOP={monthlyStats.incomeDOP}
          expenseDOP={monthlyStats.expenseDOP}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.top3Heading, { color: colors.textPrimary }]}>
          🔥 Top 3 Categorías con Mayor Gasto
        </Text>

        {monthlyStats.top3Categories.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, paddingVertical: 6 }}>
            Aún no hay gastos registrados este mes.
          </Text>
        ) : (
          monthlyStats.top3Categories.map((cat, idx) => (
            <View key={cat.id} style={styles.topCatRow}>
              <CategoryIcon icon={cat.icon} color={cat.color} size={36} />
              <View style={styles.topCatInfo}>
                <View style={styles.topCatLabelRow}>
                  <Text style={[styles.topCatName, { color: colors.textPrimary }]}>
                    #{idx + 1} {cat.name}
                  </Text>
                  <Text style={[styles.topCatAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(cat.totalDOP, 'DOP')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.topCatProgressBg,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View
                    style={[
                      styles.topCatProgressFill,
                      {
                        width: `${Math.min(100, cat.pct)}%`,
                        backgroundColor: cat.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Latest Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Últimas Transacciones
        </Text>
        <TouchableOpacity onPress={onNavigateToTransactions}>
          <Text style={[styles.sectionAction, { color: colors.emerald }]}>
            Ver Historial →
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 6 },
        ]}
      >
        {recentTransactions.length === 0 ? (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              textAlign: 'center',
              paddingVertical: 18,
            }}
          >
            Sin transacciones registradas. Crea una cuenta y presiona el botón ＋ para empezar.
          </Text>
        ) : (
          recentTransactions.map((tx, index) => {
          const cat = categories.find((c) => c.id === tx.categoryId);
          const acc = accounts.find((a) => a.id === tx.accountId);
          const destAcc = tx.destinationAccountId
            ? accounts.find((a) => a.id === tx.destinationAccountId)
            : null;
          const isTransfer = tx.type === 'transfer';

          return (
            <TouchableOpacity
              key={tx.id}
              style={[
                styles.txRow,
                index < recentTransactions.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => onEditTransaction(tx)}
              activeOpacity={0.75}
            >
              <CategoryIcon
                icon={isTransfer ? 'transfer' : cat?.icon || 'utensils'}
                color={isTransfer ? colors.info : cat?.color || colors.emerald}
                size={42}
              />

              <View style={styles.txDetails}>
                <Text
                  style={[styles.txNote, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {tx.note}
                </Text>
                <Text
                  style={[styles.txMeta, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {isTransfer
                    ? `${acc?.name || 'Origen'} → ${destAcc?.name || 'Destino'}`
                    : `${cat?.name || 'General'} · ${acc?.name || 'Cuenta'}`}
                </Text>
                {tx.installmentInfo && tx.installmentInfo.totalMonths > 1 && (
                  <Text style={[styles.installmentBadge, { color: colors.warning }]}>
                    💳 Cuota {tx.installmentInfo.currentInstallment}/
                    {tx.installmentInfo.totalMonths} (
                    {formatCurrency(
                      tx.installmentInfo.monthlyInstallmentAmount,
                      tx.currency
                    )}
                    /mes)
                  </Text>
                )}
              </View>

              <View style={styles.txRight}>
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
                  {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '⇄ '}
                  {formatCurrency(tx.amount, tx.currency)}
                </Text>
                <Text style={[styles.txDate, { color: colors.textMuted }]}>
                  {formatDateSpanish(tx.date)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }))}
      </View>

      <AccountModal
        visible={accountModalVisible}
        editingAccount={editingAccount}
        onClose={() => setAccountModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlCenterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  controlCenterBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  rateChipText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroUsdPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroUsdText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    borderRadius: 14,
    padding: 12,
  },
  heroMetricItem: {
    flex: 1,
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: 12,
  },
  heroMetricLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    marginBottom: 2,
  },
  heroMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginTop: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  top3Heading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  topCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  topCatInfo: {
    flex: 1,
    gap: 5,
  },
  topCatLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topCatName: {
    fontSize: 13,
    fontWeight: '700',
  },
  topCatAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  topCatProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  topCatProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  txDetails: {
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
  installmentBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
  },
});
