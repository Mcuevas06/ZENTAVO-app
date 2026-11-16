import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Account, AccountType, CurrencyCode } from '../types';
import { useZentavo } from '../store/ZentavoContext';

interface AccountModalProps {
  visible: boolean;
  editingAccount?: Account | null;
  onClose: () => void;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: 'debit', label: 'Cuenta Débito', icon: '🏦' },
  { type: 'savings', label: 'Ahorros', icon: '🐷' },
  { type: 'cash', label: 'Efectivo', icon: '💵' },
  { type: 'credit_card', label: 'Tarjeta Crédito', icon: '💳' },
];

const COLOR_OPTIONS = ['#0F3D68', '#10B981', '#1E293B', '#2563EB', '#7C3AED', '#059669', '#D97706'];

export const AccountModal: React.FC<AccountModalProps> = ({
  visible,
  editingAccount,
  onClose,
}) => {
  const { colors, addAccount, updateAccount, deleteAccount } = useZentavo();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('debit');
  const [currency, setCurrency] = useState<CurrencyCode>('DOP');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('100000');
  const [cutoffDay, setCutoffDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setCurrency(editingAccount.currency);
      setBalance(String(editingAccount.balance));
      setCreditLimit(String(editingAccount.creditLimit || 100000));
      setCutoffDay(String(editingAccount.cutoffDay || 15));
      setDueDay(String(editingAccount.dueDay || 5));
      setColor(editingAccount.color || COLOR_OPTIONS[0]);
    } else {
      setName('');
      setType('debit');
      setCurrency('DOP');
      setBalance('');
      setCreditLimit('100000');
      setCutoffDay('15');
      setDueDay('5');
      setColor(COLOR_OPTIONS[0]);
    }
  }, [editingAccount, visible]);

  const handleSave = () => {
    const trimmedName = name.trim() || 'Nueva Cuenta Zentavo';
    const numericBalance = parseFloat(balance) || 0;
    const payload: Omit<Account, 'id'> = {
      name: trimmedName,
      type,
      currency,
      balance: numericBalance,
      color,
      ...(type === 'credit_card'
        ? {
            creditLimit: parseFloat(creditLimit) || 50000,
            cutoffDay: Math.min(31, Math.max(1, parseInt(cutoffDay, 10) || 15)),
            dueDay: Math.min(31, Math.max(1, parseInt(dueDay, 10) || 5)),
          }
        : {}),
    };

    if (editingAccount) {
      updateAccount({ ...payload, id: editingAccount.id });
    } else {
      addAccount(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (editingAccount) {
      deleteAccount(editingAccount.id);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Financiera'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nombre de la Cuenta o Tarjeta
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceElevated,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ej. BHD León Ahorros, Visa Popular..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo de Cuenta</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((item) => {
                const selected = type === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeBtn,
                      {
                        backgroundColor: selected ? colors.emeraldSoft : colors.surfaceElevated,
                        borderColor: selected ? colors.emerald : colors.border,
                      },
                    ]}
                    onPress={() => setType(item.type)}
                  >
                    <Text style={styles.typeIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.typeText,
                        { color: selected ? colors.emerald : colors.textPrimary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Moneda</Text>
                <View style={styles.currencyRow}>
                  {(['DOP', 'USD'] as CurrencyCode[]).map((curr) => {
                    const active = currency === curr;
                    return (
                      <TouchableOpacity
                        key={curr}
                        style={[
                          styles.currencyPill,
                          {
                            backgroundColor: active ? colors.emerald : colors.surfaceElevated,
                            borderColor: active ? colors.emerald : colors.border,
                          },
                        ]}
                        onPress={() => setCurrency(curr)}
                      >
                        <Text
                          style={{
                            color: active ? '#FFFFFF' : colors.textPrimary,
                            fontWeight: '700',
                            fontSize: 13,
                          }}
                        >
                          {curr === 'DOP' ? 'RD$ (DOP)' : 'US$ (USD)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {type === 'credit_card' ? 'Deuda Usada Actual' : 'Saldo Inicial'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  value={balance}
                  onChangeText={setBalance}
                />
              </View>
            </View>

            {type === 'credit_card' && (
              <View style={styles.creditBox}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Límite de Crédito ({currency === 'USD' ? 'US$' : 'RD$'})
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Día de Corte (1-31)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceElevated,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      value={cutoffDay}
                      onChangeText={setCutoffDay}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Día Límite Pago (1-31)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceElevated,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      value={dueDay}
                      onChangeText={setDueDay}
                    />
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Color Identificador</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: '#FFFFFF',
                    },
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <View style={styles.footerBtns}>
              {editingAccount && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: colors.dangerSoft }]}
                  onPress={handleDelete}
                >
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.emerald }]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>
                  {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    fontSize: 20,
    padding: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minWidth: '47%',
  },
  typeIcon: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  creditBox: {
    marginTop: 4,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 10,
  },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
