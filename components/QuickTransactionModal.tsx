import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import {
  CurrencyCode,
  InstallmentMonths,
  Transaction,
  TransactionType,
} from '../types';
import { useZentavo } from '../store/ZentavoContext';
import { formatCurrency } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';

interface QuickTransactionModalProps {
  visible: boolean;
  editingTransaction?: Transaction | null;
  onClose: () => void;
}

const INSTALLMENT_OPTIONS: InstallmentMonths[] = [1, 3, 6, 12];
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  visible,
  editingTransaction,
  onClose,
}) => {
  const {
    accounts,
    categories,
    exchangeRate,
    colors,
    addTransaction,
    updateTransaction,
  } = useZentavo();

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [currency, setCurrency] = useState<CurrencyCode>('DOP');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    accounts[1]?.id || accounts[0]?.id || ''
  );
  const [categoryId, setCategoryId] = useState<string>('cat-food');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>('2026-11-13');
  const [splitInstallments, setSplitInstallments] = useState<boolean>(false);
  const [installmentMonths, setInstallmentMonths] = useState<InstallmentMonths>(3);

  const filteredCategories = useMemo(
    () =>
      categories.filter((c) =>
        txType === 'income' ? c.type === 'income' : c.type === 'expense'
      ),
    [categories, txType]
  );

  const selectedOriginAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );

  useEffect(() => {
    if (editingTransaction) {
      setTxType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setCurrency(editingTransaction.currency);
      setAccountId(editingTransaction.accountId);
      setDestinationAccountId(
        editingTransaction.destinationAccountId ||
          accounts.find((a) => a.id !== editingTransaction.accountId)?.id ||
          ''
      );
      setCategoryId(editingTransaction.categoryId);
      setNote(editingTransaction.note);
      setDate(editingTransaction.date);
      if (
        editingTransaction.installmentInfo &&
        editingTransaction.installmentInfo.totalMonths > 1
      ) {
        setSplitInstallments(true);
        setInstallmentMonths(editingTransaction.installmentInfo.totalMonths);
      } else {
        setSplitInstallments(false);
        setInstallmentMonths(3);
      }
    } else {
      const defaultAcc = accounts[0];
      const secondAcc = accounts.find((a) => a.id !== defaultAcc?.id) || defaultAcc;
      setTxType('expense');
      setAmountStr('0');
      setCurrency(defaultAcc?.currency || 'DOP');
      setAccountId(defaultAcc?.id || '');
      setDestinationAccountId(secondAcc?.id || '');
      setCategoryId('cat-food');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitInstallments(false);
      setInstallmentMonths(3);
    }
  }, [editingTransaction, visible]);

  const handleSelectType = (newType: TransactionType) => {
    setTxType(newType);
    if (newType === 'income') {
      setCategoryId('cat-salary');
    } else if (newType === 'expense') {
      setCategoryId('cat-food');
    }
  };

  const handleKeyPress = (key: string) => {
    setAmountStr((prev) => {
      if (key === '⌫') {
        return prev.length > 1 ? prev.slice(0, -1) : '0';
      }
      if (key === '.') {
        return prev.includes('.') ? prev : `${prev}.`;
      }
      if (prev === '0') {
        return key;
      }
      // Limit to 2 decimal places
      const parts = prev.split('.');
      if (parts[1] && parts[1].length >= 2) {
        return prev;
      }
      return prev + key;
    });
  };

  const numericAmount = parseFloat(amountStr) || 0;
  const isOriginCreditCard =
    selectedOriginAccount?.type === 'credit_card' && txType === 'expense';

  const handleSubmit = () => {
    if (numericAmount <= 0 || !accountId) return;

    const defaultNote =
      note.trim() ||
      (txType === 'transfer'
        ? 'Transferencia entre cuentas'
        : categories.find((c) => c.id === categoryId)?.name || 'Movimiento');

    const installmentData =
      isOriginCreditCard && splitInstallments
        ? {
            totalMonths: installmentMonths,
            currentInstallment: 1,
            monthlyInstallmentAmount: Number(
              (numericAmount / installmentMonths).toFixed(2)
            ),
          }
        : undefined;

    if (editingTransaction) {
      updateTransaction({
        id: editingTransaction.id,
        type: txType,
        amount: numericAmount,
        currency,
        exchangeRate: editingTransaction.exchangeRate || exchangeRate,
        accountId,
        destinationAccountId: txType === 'transfer' ? destinationAccountId : undefined,
        categoryId,
        note: defaultNote,
        date,
        installmentInfo: installmentData,
      });
    } else {
      addTransaction({
        type: txType,
        amount: numericAmount,
        currency,
        exchangeRate,
        accountId,
        destinationAccountId: txType === 'transfer' ? destinationAccountId : undefined,
        categoryId,
        note: defaultNote,
        date,
        installmentInfo: installmentData,
      });
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header & Type Selector Tabs */}
          <View style={styles.topHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editingTransaction ? 'Editar Transacción' : 'Registro Rápido'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: colors.textSecondary, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.tabsContainer,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            {(
              [
                { id: 'expense', label: 'Gasto', activeColor: colors.danger },
                { id: 'income', label: 'Ingreso', activeColor: colors.emerald },
                { id: 'transfer', label: 'Transferencia', activeColor: colors.info },
              ] as { id: TransactionType; label: string; activeColor: string }[]
            ).map((tab) => {
              const active = txType === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabPill,
                    active && { backgroundColor: tab.activeColor },
                  ]}
                  onPress={() => handleSelectType(tab.id)}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      { color: active ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Display Amount + Currency Switch */}
            <View
              style={[
                styles.amountDisplayBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.currencySwitchRow}>
                {(['DOP', 'USD'] as CurrencyCode[]).map((c) => {
                  const isSelected = currency === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: isSelected
                            ? colors.emerald
                            : colors.surfaceElevated,
                        },
                      ]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : colors.textSecondary,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {c === 'DOP' ? 'RD$' : 'US$'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={[styles.rateBadge, { color: colors.textMuted }]}>
                  Tasa: 1 US$ = RD$ {exchangeRate.toFixed(2)}
                </Text>
              </View>

              <Text
                style={[
                  styles.amountText,
                  {
                    color:
                      txType === 'expense'
                        ? colors.danger
                        : txType === 'income'
                        ? colors.emerald
                        : colors.info,
                  },
                ]}
              >
                {currency === 'USD' ? 'US$' : 'RD$'} {amountStr}
              </Text>
            </View>

            {/* Large Numeric Keypad */}
            <View style={styles.keypadGrid}>
              {KEYPAD_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.keypadButton,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleKeyPress(key)}
                  activeOpacity={0.65}
                >
                  <Text style={[styles.keypadText, { color: colors.textPrimary }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Origin Account Selector */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {txType === 'transfer' ? 'Cuenta Origen (Sale de)' : 'Cuenta'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalSelector}
            >
              {accounts.map((acc) => {
                const selected = acc.id === accountId;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: selected
                          ? colors.emeraldSoft
                          : colors.surfaceElevated,
                        borderColor: selected ? colors.emerald : colors.border,
                      },
                    ]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <Text
                      style={{
                        color: selected ? colors.emerald : colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {acc.type === 'credit_card' ? '💳 ' : '🏦 '}
                      {acc.name} ({acc.currency === 'USD' ? 'US$' : 'RD$'})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Destination Account Selector (Transfers only) */}
            {txType === 'transfer' && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Cuenta Destino (Entra a)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalSelector}
                >
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => {
                      const selected = acc.id === destinationAccountId;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.accountChip,
                            {
                              backgroundColor: selected
                                ? colors.infoSoft
                                : colors.surfaceElevated,
                              borderColor: selected ? colors.info : colors.border,
                            },
                          ]}
                          onPress={() => setDestinationAccountId(acc.id)}
                        >
                          <Text
                            style={{
                              color: selected ? colors.info : colors.textPrimary,
                              fontWeight: '700',
                              fontSize: 13,
                            }}
                          >
                            {acc.name} ({acc.currency === 'USD' ? 'US$' : 'RD$'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}

            {/* Special Credit Card Installment Feature */}
            {isOriginCreditCard && (
              <View
                style={[
                  styles.installmentCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.emerald,
                  },
                ]}
              >
                <View style={styles.installmentHeader}>
                  <View>
                    <Text style={[styles.installmentTitle, { color: colors.textPrimary }]}>
                      💳 Dividir en cuotas (meses)
                    </Text>
                    <Text
                      style={[styles.installmentSub, { color: colors.textSecondary }]}
                    >
                      Programa cargos mensuales en tu tarjeta de crédito
                    </Text>
                  </View>
                  <Switch
                    value={splitInstallments}
                    onValueChange={setSplitInstallments}
                    trackColor={{ false: colors.border, true: colors.emerald }}
                  />
                </View>

                {splitInstallments && (
                  <View style={styles.installmentBody}>
                    <View style={styles.monthsRow}>
                      {INSTALLMENT_OPTIONS.map((m) => {
                        const active = installmentMonths === m;
                        return (
                          <TouchableOpacity
                            key={m}
                            style={[
                              styles.monthBtn,
                              {
                                backgroundColor: active
                                  ? colors.emerald
                                  : colors.surface,
                                borderColor: active ? colors.emerald : colors.border,
                              },
                            ]}
                            onPress={() => setInstallmentMonths(m)}
                          >
                            <Text
                              style={{
                                color: active ? '#FFFFFF' : colors.textPrimary,
                                fontWeight: '800',
                                fontSize: 13,
                              }}
                            >
                              {m} {m === 1 ? 'mes' : 'meses'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={[styles.installmentQuote, { color: colors.emerald }]}>
                      Cuota mensual estimada:{' '}
                      {formatCurrency(numericAmount / installmentMonths, currency)} / mes
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Category Grid (Expense / Income) */}
            {txType !== 'transfer' && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Categoría
                </Text>
                <View style={styles.categoryGrid}>
                  {filteredCategories.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryCard,
                          {
                            backgroundColor: selected
                              ? `${cat.color}22`
                              : colors.surfaceElevated,
                            borderColor: selected ? cat.color : colors.border,
                          },
                        ]}
                        onPress={() => setCategoryId(cat.id)}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} size={32} />
                        <Text
                          style={[
                            styles.categoryName,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Note / Merchant & Date */}
            <View style={styles.inputsRow}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Comercio / Nota
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Ej. Supermercado Nacional, Uber..."
                  placeholderTextColor={colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Fecha
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={setDate}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    txType === 'expense'
                      ? colors.danger
                      : txType === 'income'
                      ? colors.emerald
                      : colors.info,
                  opacity: numericAmount > 0 ? 1 : 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={numericAmount <= 0}
            >
              <Text style={styles.submitButtonText}>
                {editingTransaction
                  ? 'Actualizar Movimiento'
                  : txType === 'expense'
                  ? 'Registrar Gasto'
                  : txType === 'income'
                  ? 'Registrar Ingreso'
                  : 'Ejecutar Transferencia'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    maxHeight: '93%',
    borderTopWidth: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabPillText: {
    fontWeight: '700',
    fontSize: 13,
  },
  amountDisplayBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  currencySwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBadge: {
    marginLeft: 'auto',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  keypadButton: {
    width: '31.5%',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadText: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
  },
  horizontalSelector: {
    marginBottom: 8,
  },
  accountChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  installmentCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  installmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  installmentTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  installmentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  installmentBody: {
    marginTop: 10,
  },
  monthsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monthBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  installmentQuote: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
