import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Account } from '../types';
import { formatCurrency, toBaseDOP } from '../utils/currency';
import { useZentavo } from '../store/ZentavoContext';

interface AccountCarouselProps {
  onAddAccountPress: () => void;
  onSelectAccount?: (account: Account) => void;
}

const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  cash: 'Efectivo',
  debit: 'Cuenta Débito',
  savings: 'Ahorros',
  credit_card: 'Tarjeta de Crédito',
};

const ACCOUNT_TYPE_ICONS: Record<Account['type'], string> = {
  cash: '💵',
  debit: '🏦',
  savings: '🐷',
  credit_card: '💳',
};

export const AccountCarousel: React.FC<AccountCarouselProps> = ({
  onAddAccountPress,
  onSelectAccount,
}) => {
  const { accounts, exchangeRate, colors } = useZentavo();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {accounts.map((acc) => {
        const isCredit = acc.type === 'credit_card';
        const limit = acc.creditLimit || 0;
        const availableCredit = isCredit ? Math.max(0, limit - acc.balance) : 0;
        const creditUtilization =
          isCredit && limit > 0 ? Math.min(100, (acc.balance / limit) * 100) : 0;

        return (
          <TouchableOpacity
            key={acc.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderTopColor: acc.color,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => onSelectAccount && onSelectAccount(acc)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.typeTag}>
                <Text style={styles.typeIcon}>{ACCOUNT_TYPE_ICONS[acc.type]}</Text>
                <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                  {ACCOUNT_TYPE_LABELS[acc.type]}
                </Text>
              </View>
              <View
                style={[
                  styles.currencyBadge,
                  { backgroundColor: acc.currency === 'USD' ? colors.infoSoft : colors.emeraldSoft },
                ]}
              >
                <Text
                  style={[
                    styles.currencyBadgeText,
                    { color: acc.currency === 'USD' ? colors.info : colors.emerald },
                  ]}
                >
                  {acc.currency === 'USD' ? 'US$' : 'RD$'}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.accountName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {acc.name}
            </Text>

            {isCredit ? (
              <View style={styles.creditSection}>
                <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
                  Deuda Actual Usada
                </Text>
                <Text style={[styles.balanceValue, { color: colors.danger }]}>
                  {formatCurrency(acc.balance, acc.currency)}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${creditUtilization}%`,
                        backgroundColor:
                          creditUtilization > 80
                            ? colors.danger
                            : creditUtilization > 50
                            ? colors.warning
                            : colors.emerald,
                      },
                    ]}
                  />
                </View>
                <View style={styles.creditFooter}>
                  <Text style={[styles.creditMeta, { color: colors.emerald }]}>
                    Disp: {formatCurrency(availableCredit, acc.currency)}
                  </Text>
                  <Text style={[styles.creditMeta, { color: colors.textMuted }]}>
                    Corte día {acc.cutoffDay || 15} · Pago {acc.dueDay || 5}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.standardSection}>
                <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
                  Saldo Disponible
                </Text>
                <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
                  {formatCurrency(acc.balance, acc.currency)}
                </Text>
                {acc.currency === 'USD' ? (
                  <Text style={[styles.convertedHint, { color: colors.emerald }]}>
                    ≈ {formatCurrency(toBaseDOP(acc.balance, 'USD', exchangeRate), 'DOP')}
                  </Text>
                ) : (
                  <Text style={[styles.convertedHint, { color: colors.textMuted }]}>
                    Moneda Base (DOP)
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Add Account Button Card */}
      <TouchableOpacity
        style={[
          styles.addCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.emerald,
          },
        ]}
        onPress={onAddAccountPress}
        activeOpacity={0.8}
      >
        <View style={[styles.addCircle, { backgroundColor: colors.emeraldSoft }]}>
          <Text style={[styles.addPlus, { color: colors.emerald }]}>＋</Text>
        </View>
        <Text style={[styles.addTitle, { color: colors.textPrimary }]}>
          + Agregar Cuenta
        </Text>
        <Text style={[styles.addSubtitle, { color: colors.textSecondary }]}>
          Efectivo, Débito, Ahorros o TC en RD$ / US$
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 6,
    paddingRight: 16,
    gap: 12,
  },
  card: {
    width: 245,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderTopWidth: 4,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIcon: {
    fontSize: 15,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  standardSection: {
    marginTop: 4,
  },
  creditSection: {
    marginTop: 2,
  },
  balanceCaption: {
    fontSize: 11,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  convertedHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  creditFooter: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditMeta: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  addCard: {
    width: 175,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addPlus: {
    fontSize: 22,
    fontWeight: '700',
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  addSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
