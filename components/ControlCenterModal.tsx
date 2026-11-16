import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import { Account } from '../types';
import { useZentavo } from '../store/ZentavoContext';
import {
  calculateNetWorthDOP,
  convertCurrency,
  formatCurrency,
  toBaseDOP,
} from '../utils/currency';

interface ControlCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ControlCenterModal: React.FC<ControlCenterModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    accounts,
    transactions,
    exchangeRate,
    colors,
    setExchangeRate,
    updateAccount,
    exportBackupJSON,
    importBackupJSON,
    exportCSV,
  } = useZentavo();

  const [rateDraft, setRateDraft] = useState<string>(String(exchangeRate));
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accDraft, setAccDraft] = useState<{
    balance: string;
    creditLimit: string;
    cutoffDay: string;
    dueDay: string;
  }>({ balance: '0', creditLimit: '0', cutoffDay: '18', dueDay: '8' });

  const [showJsonImportBox, setShowJsonImportBox] = useState<boolean>(false);
  const [jsonInputText, setJsonInputText] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 1. KPI 1: Real Net Worth (Total Assets - Credit Card Debt)
  const netWorth = useMemo(
    () => calculateNetWorthDOP(accounts, exchangeRate),
    [accounts, exchangeRate]
  );

  const netWorthUSD = useMemo(
    () => convertCurrency(netWorth.totalNetWorthDOP, 'DOP', 'USD', exchangeRate),
    [netWorth.totalNetWorthDOP, exchangeRate]
  );

  // 2. KPI 2: Monthly Net Flow (Income - Expenses) & Savings Rate %
  const flowMetrics = useMemo(() => {
    let incomeDOP = 0;
    let expenseDOP = 0;
    for (const tx of transactions) {
      if (tx.type === 'transfer') continue;
      const dop = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate);
      if (tx.type === 'income') incomeDOP += dop;
      else if (tx.type === 'expense') expenseDOP += dop;
    }
    const netFlowDOP = incomeDOP - expenseDOP;
    const savingsPct =
      incomeDOP > 0 ? ((incomeDOP - expenseDOP) / incomeDOP) * 100 : 0;

    return { incomeDOP, expenseDOP, netFlowDOP, savingsPct };
  }, [transactions]);

  // 3. KPI 3: Global Credit Utilization & Next Cutoff Alert
  const creditMetrics = useMemo(() => {
    const creditCards = accounts.filter((a) => a.type === 'credit_card');
    let totalUsedDOP = 0;
    let totalLimitDOP = 0;
    let nextCutoffCard: {
      name: string;
      cutoffDay: number;
      dueDay: number;
      daysRemaining: number;
    } | null = null;

    const todayDay = new Date().getDate();

    for (const cc of creditCards) {
      const usedDOP = toBaseDOP(cc.balance, cc.currency, exchangeRate);
      const limitDOP = toBaseDOP(cc.creditLimit || 0, cc.currency, exchangeRate);
      totalUsedDOP += usedDOP;
      totalLimitDOP += limitDOP;

      const cutoff = cc.cutoffDay || 18;
      const due = cc.dueDay || 8;
      const daysUntilCutoff =
        cutoff >= todayDay ? cutoff - todayDay : 30 - todayDay + cutoff;

      if (!nextCutoffCard || daysUntilCutoff < nextCutoffCard.daysRemaining) {
        nextCutoffCard = {
          name: cc.name,
          cutoffDay: cutoff,
          dueDay: due,
          daysRemaining: daysUntilCutoff,
        };
      }
    }

    const utilizationPct =
      totalLimitDOP > 0 ? (totalUsedDOP / totalLimitDOP) * 100 : 0;

    return {
      totalUsedDOP,
      totalLimitDOP,
      availableDOP: Math.max(0, totalLimitDOP - totalUsedDOP),
      utilizationPct,
      nextCutoffCard,
      cardCount: creditCards.length,
    };
  }, [accounts, exchangeRate]);

  const showTempBanner = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), 4500);
  };

  const handleRateChange = (val: string) => {
    setRateDraft(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setExchangeRate(num);
    }
  };

  const startInlineEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setAccDraft({
      balance: String(acc.balance),
      creditLimit: String(acc.creditLimit || 100000),
      cutoffDay: String(acc.cutoffDay || 18),
      dueDay: String(acc.dueDay || 8),
    });
  };

  const saveInlineEditAccount = (acc: Account) => {
    const updated: Account = {
      ...acc,
      balance: parseFloat(accDraft.balance) || 0,
      ...(acc.type === 'credit_card'
        ? {
            creditLimit: parseFloat(accDraft.creditLimit) || 50000,
            cutoffDay: Math.min(31, Math.max(1, parseInt(accDraft.cutoffDay, 10) || 18)),
            dueDay: Math.min(31, Math.max(1, parseInt(accDraft.dueDay, 10) || 8)),
          }
        : {}),
    };
    updateAccount(updated);
    setEditingAccountId(null);
    showTempBanner('success', `✓ Cuenta "${acc.name}" actualizada en tiempo real.`);
  };

  const handleExportJSON = () => {
    const jsonStr = exportBackupJSON();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentavo_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setJsonInputText(jsonStr);
    showTempBanner('success', '✓ Copia de seguridad .JSON exportada correctamente.');
  };

  const handleImportJSONConfirm = () => {
    if (!jsonInputText.trim()) {
      showTempBanner('error', 'Pega o selecciona un archivo .JSON válido primero.');
      return;
    }
    const res = importBackupJSON(jsonInputText);
    showTempBanner(res.success ? 'success' : 'error', res.message);
    if (res.success) {
      setShowJsonImportBox(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportCSV();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentavo_historial_contable_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    showTempBanner('success', '✓ Historial contable .CSV exportado con éxito.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {/* Executive Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <View>
              <View style={styles.badgeRow}>
                <View style={[styles.execBadge, { backgroundColor: colors.emeraldSoft }]}>
                  <Text style={[styles.execBadgeText, { color: colors.emerald }]}>
                    CONTROL CENTER
                  </Text>
                </View>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                🎛️ Panel de Control Avanzado
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
              onPress={onClose}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {statusBanner && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor:
                    statusBanner.type === 'success'
                      ? colors.emeraldSoft
                      : colors.dangerSoft,
                  borderColor:
                    statusBanner.type === 'success' ? colors.emerald : colors.danger,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    statusBanner.type === 'success' ? colors.emerald : colors.danger,
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {statusBanner.text}
              </Text>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* SECTION 1: KPI CARDS OF FINANCIAL HEALTH */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              1. Indicadores KPI de Salud Financiera
            </Text>

            {/* KPI 1: Patrimonio Neto Real */}
            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: colors.primaryNavy,
                  borderColor: colors.emerald,
                },
              ]}
            >
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiHeroLabel}>PATRIMONIO NETO REAL</Text>
                <Text style={styles.kpiHeroUsd}>
                  ≈ {formatCurrency(netWorthUSD, 'USD')}
                </Text>
              </View>
              <Text style={styles.kpiHeroValue}>
                {formatCurrency(netWorth.totalNetWorthDOP, 'DOP')}
              </Text>
              <View style={styles.kpiSplitBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiSubLabel}>Activos Totales</Text>
                  <Text style={[styles.kpiSubValue, { color: '#34D399' }]}>
                    {formatCurrency(netWorth.totalAssetsDOP, 'DOP')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiSubLabel}>Deuda Tarjetas (TC)</Text>
                  <Text style={[styles.kpiSubValue, { color: '#FCA5A5' }]}>
                    -{formatCurrency(netWorth.totalDebtDOP, 'DOP')}
                  </Text>
                </View>
              </View>
            </View>

            {/* KPI 2 & KPI 3 Row */}
            <View style={styles.kpiGridRow}>
              {/* KPI 2: Flujo Neto del Mes & % Ahorro */}
              <View
                style={[
                  styles.kpiHalfCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.kpiSmallTag, { color: colors.textSecondary }]}>
                  FLUJO NETO DEL MES
                </Text>
                <Text
                  style={[
                    styles.kpiMainNumber,
                    {
                      color:
                        flowMetrics.netFlowDOP >= 0 ? colors.emerald : colors.danger,
                    },
                  ]}
                >
                  {formatCurrency(flowMetrics.netFlowDOP, 'DOP', true)}
                </Text>
                <View
                  style={[
                    styles.savingsPill,
                    {
                      backgroundColor:
                        flowMetrics.savingsPct >= 20
                          ? colors.emeraldSoft
                          : colors.warningSoft,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        flowMetrics.savingsPct >= 20
                          ? colors.emerald
                          : colors.warning,
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    Tasa Ahorro: {flowMetrics.savingsPct.toFixed(1)}%
                  </Text>
                </View>
                <Text style={[styles.kpiMicroMeta, { color: colors.textMuted }]}>
                  Ing: {formatCurrency(flowMetrics.incomeDOP, 'DOP')} · Gas:{' '}
                  {formatCurrency(flowMetrics.expenseDOP, 'DOP')}
                </Text>
              </View>

              {/* KPI 3: Uso Global de Crédito & Alerta Próximo Corte */}
              <View
                style={[
                  styles.kpiHalfCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.kpiSmallTag, { color: colors.textSecondary }]}>
                  USO GLOBAL DE CRÉDITO
                </Text>
                <Text
                  style={[
                    styles.kpiMainNumber,
                    {
                      color:
                        creditMetrics.utilizationPct > 70
                          ? colors.danger
                          : creditMetrics.utilizationPct > 35
                          ? colors.warning
                          : colors.emerald,
                    },
                  ]}
                >
                  {creditMetrics.utilizationPct.toFixed(1)}% usado
                </Text>

                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, creditMetrics.utilizationPct)}%`,
                        backgroundColor:
                          creditMetrics.utilizationPct > 70
                            ? colors.danger
                            : creditMetrics.utilizationPct > 35
                            ? colors.warning
                            : colors.emerald,
                      },
                    ]}
                  />
                </View>

                {creditMetrics.nextCutoffCard ? (
                  <Text style={[styles.kpiCutoffAlert, { color: colors.warning }]}>
                    ⚠️ Próximo corte: día {creditMetrics.nextCutoffCard.cutoffDay} (en{' '}
                    {creditMetrics.nextCutoffCard.daysRemaining} días) · Pago día{' '}
                    {creditMetrics.nextCutoffCard.dueDay}
                  </Text>
                ) : (
                  <Text style={[styles.kpiMicroMeta, { color: colors.textMuted }]}>
                    Sin tarjetas activas
                  </Text>
                )}
              </View>
            </View>

            {/* SECTION 2: QUICK ACCOUNT & CURRENCY MANAGER */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              2. Gestor Rápido de Cuentas y Divisas
            </Text>

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* Exchange Rate Live Bar */}
              <View style={styles.currencyManagerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.managerTitle, { color: colors.textPrimary }]}>
                    💱 Tasa de Cambio (USD → DOP)
                  </Text>
                  <Text style={[styles.managerSub, { color: colors.textSecondary }]}>
                    Conversión instantánea en tiempo real
                  </Text>
                </View>
                <View style={styles.rateEditorBox}>
                  <Text style={[styles.ratePrefix, { color: colors.textSecondary }]}>
                    RD$
                  </Text>
                  <TextInput
                    style={[
                      styles.rateInputField,
                      {
                        backgroundColor: colors.surfaceElevated,
                        color: colors.emerald,
                        borderColor: colors.emerald,
                      },
                    ]}
                    keyboardType="numeric"
                    value={rateDraft}
                    onChangeText={handleRateChange}
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                Edición Rápida de Saldos, Límites de Crédito y Fechas de Corte
              </Text>

              {accounts.map((acc) => {
                const isEditing = editingAccountId === acc.id;
                const isCC = acc.type === 'credit_card';
                return (
                  <View
                    key={acc.id}
                    style={[
                      styles.accountManagerItem,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: isEditing ? colors.emerald : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.accountManagerTop}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.accountManagerName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {isCC ? '💳 ' : '🏦 '}
                          {acc.name} ({acc.currency})
                        </Text>
                        <Text
                          style={[
                            styles.accountManagerMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {isCC
                            ? `Deuda: ${formatCurrency(
                                acc.balance,
                                acc.currency
                              )} · Límite: ${formatCurrency(
                                acc.creditLimit || 0,
                                acc.currency
                              )} · Corte día ${acc.cutoffDay || 18} / Pago día ${
                                acc.dueDay || 8
                              }`
                            : `Saldo disponible: ${formatCurrency(
                                acc.balance,
                                acc.currency
                              )}`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.quickEditBtn,
                          {
                            backgroundColor: isEditing
                              ? colors.border
                              : colors.emeraldSoft,
                          },
                        ]}
                        onPress={() =>
                          isEditing
                            ? setEditingAccountId(null)
                            : startInlineEditAccount(acc)
                        }
                      >
                        <Text
                          style={{
                            color: isEditing
                              ? colors.textPrimary
                              : colors.emerald,
                            fontSize: 12,
                            fontWeight: '800',
                          }}
                        >
                          {isEditing ? 'Cancelar' : 'Ajustar'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isEditing && (
                      <View style={styles.inlineEditForm}>
                        <View style={styles.inlineRow}>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.inlineLabel,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {isCC ? 'Deuda Usada' : 'Saldo Actual'} ({acc.currency})
                            </Text>
                            <TextInput
                              style={[
                                styles.inlineInput,
                                {
                                  backgroundColor: colors.surface,
                                  color: colors.textPrimary,
                                  borderColor: colors.border,
                                },
                              ]}
                              keyboardType="numeric"
                              value={accDraft.balance}
                              onChangeText={(v) =>
                                setAccDraft((p) => ({ ...p, balance: v }))
                              }
                            />
                          </View>

                          {isCC && (
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.inlineLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Límite Crédito ({acc.currency})
                              </Text>
                              <TextInput
                                style={[
                                  styles.inlineInput,
                                  {
                                    backgroundColor: colors.surface,
                                    color: colors.textPrimary,
                                    borderColor: colors.border,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={accDraft.creditLimit}
                                onChangeText={(v) =>
                                  setAccDraft((p) => ({ ...p, creditLimit: v }))
                                }
                              />
                            </View>
                          )}
                        </View>

                        {isCC && (
                          <View style={styles.inlineRow}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.inlineLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Día de Corte (1-31)
                              </Text>
                              <TextInput
                                style={[
                                  styles.inlineInput,
                                  {
                                    backgroundColor: colors.surface,
                                    color: colors.textPrimary,
                                    borderColor: colors.border,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={accDraft.cutoffDay}
                                onChangeText={(v) =>
                                  setAccDraft((p) => ({ ...p, cutoffDay: v }))
                                }
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.inlineLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Día de Pago (1-31)
                              </Text>
                              <TextInput
                                style={[
                                  styles.inlineInput,
                                  {
                                    backgroundColor: colors.surface,
                                    color: colors.textPrimary,
                                    borderColor: colors.border,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={accDraft.dueDay}
                                onChangeText={(v) =>
                                  setAccDraft((p) => ({ ...p, dueDay: v }))
                                }
                              />
                            </View>
                          </View>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.saveInlineBtn,
                            { backgroundColor: colors.emerald },
                          ]}
                          onPress={() => saveInlineEditAccount(acc)}
                        >
                          <Text style={styles.saveInlineBtnText}>
                            ✓ Guardar Cambios en {acc.name}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* SECTION 3: BACKUP & PORTABILITY (.JSON & .CSV) */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              3. Respaldo y Portabilidad (.JSON / .CSV)
            </Text>

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.managerSub, { color: colors.textSecondary }]}>
                Exporta o restaura una copia de seguridad completa de tus cuentas,
                transacciones, presupuestos y metas en formato .JSON, o descarga el
                libro contable en .CSV.
              </Text>

              <View style={styles.backupButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.backupBtn,
                    { backgroundColor: colors.emerald },
                  ]}
                  onPress={handleExportJSON}
                >
                  <Text style={styles.backupBtnText}>
                    📦 Exportar Backup (.JSON)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.backupBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderWidth: 1,
                      borderColor: colors.emerald,
                    },
                  ]}
                  onPress={() => setShowJsonImportBox((prev) => !prev)}
                >
                  <Text style={[styles.backupBtnText, { color: colors.emerald }]}>
                    📂 Importar Backup (.JSON)
                  </Text>
                </TouchableOpacity>
              </View>

              {showJsonImportBox && (
                <View
                  style={[
                    styles.importBox,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.inlineLabel,
                      { color: colors.textPrimary, marginBottom: 6 },
                    ]}
                  >
                    Pega aquí el contenido de tu respaldo .JSON para restaurar:
                  </Text>
                  <TextInput
                    style={[
                      styles.jsonTextarea,
                      {
                        backgroundColor: colors.background,
                        color: colors.textPrimary,
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    numberOfLines={5}
                    placeholder='{"app": "Zentavo", "data": { ... }}'
                    placeholderTextColor={colors.textMuted}
                    value={jsonInputText}
                    onChangeText={setJsonInputText}
                  />
                  <TouchableOpacity
                    style={[
                      styles.saveInlineBtn,
                      { backgroundColor: colors.emerald, marginTop: 8 },
                    ]}
                    onPress={handleImportJSONConfirm}
                  >
                    <Text style={styles.saveInlineBtnText}>
                      ✓ Restaurar Copia de Seguridad Ahora
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.csvExportBtn,
                  {
                    backgroundColor: colors.primaryNavy,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleExportCSV}
              >
                <Text style={styles.backupBtnText}>
                  📊 Exportar Historial Contable (.CSV)
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '94%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  execBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  execBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 10,
  },
  kpiCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiHeroLabel: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  kpiHeroUsd: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiHeroValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  kpiSplitBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 14, 26, 0.42)',
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  kpiSubLabel: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  kpiSubValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  kpiGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiHalfCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  kpiSmallTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiMainNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 6,
    fontVariant: ['tabular-nums'],
  },
  savingsPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  kpiMicroMeta: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  progressBarBg: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  kpiCutoffAlert: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  currencyManagerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  managerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  managerSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  rateEditorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratePrefix: {
    fontSize: 13,
    fontWeight: '800',
  },
  rateInputField: {
    width: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  accountManagerItem: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  accountManagerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountManagerName: {
    fontSize: 13,
    fontWeight: '800',
  },
  accountManagerMeta: {
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  quickEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  inlineEditForm: {
    marginTop: 12,
    gap: 10,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  saveInlineBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveInlineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  backupBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  importBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  jsonTextarea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 11,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  csvExportBtn: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
