import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { CurrencyCode } from '../types';
import { useZentavo } from '../store/ZentavoContext';
import {
  formatCurrency,
  formatDateSpanish,
  toBaseDOP,
} from '../utils/currency';
import { CategoryIcon } from '../components/CategoryIcon';

export const PlanningScreen: React.FC = () => {
  const {
    accounts,
    categories,
    transactions,
    budgets,
    recurring,
    goals,
    colors,
    addBudget,
    deleteBudget,
    addRecurring,
    deleteRecurring,
    payRecurringNow,
    addGoal,
    deleteGoal,
    contributeToGoal,
  } = useZentavo();

  // Budget Modal State
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState('cat-food');
  const [budgetLimitInput, setBudgetLimitInput] = useState('15000');

  // Recurring Modal State
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState<CurrencyCode>('DOP');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id || '');
  const [recCategoryId, setRecCategoryId] = useState('cat-services');
  const [recNextDate, setRecNextDate] = useState('2026-11-30');

  // Goal Creation Modal State
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalInitial, setGoalInitial] = useState('0');
  const [goalDeadline, setGoalDeadline] = useState('2027-12-31');

  // Goal Contribution ("Abonar") Modal State
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('5000');
  const [contributeAccountId, setContributeAccountId] = useState<string>(
    accounts[0]?.id || ''
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  // Spent per category in DOP
  const categorySpentMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const dop = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate);
      map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + dop);
    }
    return map;
  }, [transactions]);

  const handleSaveBudget = () => {
    const val = parseFloat(budgetLimitInput);
    if (!val || val <= 0) return;
    addBudget({
      categoryId: selectedBudgetCategory,
      limitAmount: val,
      period: 'monthly',
    });
    setBudgetModalVisible(false);
  };

  const handleSaveRecurring = () => {
    const val = parseFloat(recAmount);
    if (!recTitle.trim() || !val || val <= 0) return;
    addRecurring({
      title: recTitle.trim(),
      amount: val,
      currency: recCurrency,
      accountId: recAccountId || accounts[0]?.id || '',
      categoryId: recCategoryId,
      nextDate: recNextDate,
      frequency: 'monthly',
    });
    setRecTitle('');
    setRecAmount('');
    setRecurringModalVisible(false);
  };

  const handleSaveGoal = () => {
    const targetVal = parseFloat(goalTarget);
    const initVal = parseFloat(goalInitial) || 0;
    if (!goalName.trim() || !targetVal || targetVal <= 0) return;
    addGoal({
      name: goalName.trim(),
      targetAmount: targetVal,
      currentAmount: initVal,
      deadline: goalDeadline,
    });
    setGoalName('');
    setGoalTarget('');
    setGoalModalVisible(false);
  };

  const handleConfirmContribution = () => {
    if (!contributeGoalId) return;
    const amt = parseFloat(contributeAmount);
    if (!amt || amt <= 0) return;
    contributeToGoal(contributeGoalId, amt, contributeAccountId || undefined);
    setContributeGoalId(null);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
        Planificación Financiera
      </Text>
      <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
        Presupuestos mensuales, pagos fijos recurrentes y alcancías de ahorro
      </Text>

      {/* 1. MONTHLY BUDGETS */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          📊 Presupuestos Mensuales
        </Text>
        <TouchableOpacity
          style={[styles.addPill, { backgroundColor: colors.emeraldSoft }]}
          onPress={() => setBudgetModalVisible(true)}
        >
          <Text style={[styles.addPillText, { color: colors.emerald }]}>
            + Crear Límite
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {budgets.map((b, idx) => {
          const cat = categories.find((c) => c.id === b.categoryId);
          const spentDOP = categorySpentMap.get(b.categoryId) || 0;
          const pct = b.limitAmount > 0 ? (spentDOP / b.limitAmount) * 100 : 0;

          // Dynamic Traffic Light Rule: Green < 70%, Yellow 70%-90%, Red > 90%
          const barColor =
            pct > 90
              ? colors.danger
              : pct >= 70
              ? colors.warning
              : colors.emerald;

          const statusLabel =
            pct > 90
              ? 'Crítico (>90%)'
              : pct >= 70
              ? 'Precaución (70%-90%)'
              : 'Saludable (<70%)';

          return (
            <View
              key={b.id}
              style={[
                styles.budgetRow,
                idx < budgets.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.budgetTop}>
                <CategoryIcon
                  icon={cat?.icon || 'utensils'}
                  color={cat?.color || colors.emerald}
                  size={38}
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.budgetTitleRow}>
                    <Text style={[styles.budgetCatName, { color: colors.textPrimary }]}>
                      {cat?.name || 'Categoría'}
                    </Text>
                    <TouchableOpacity onPress={() => deleteBudget(b.id)}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.budgetAmountsRow}>
                    <Text
                      style={[styles.budgetSpentText, { color: colors.textSecondary }]}
                    >
                      Gastado: {formatCurrency(spentDOP, 'DOP')} de{' '}
                      {formatCurrency(b.limitAmount, 'DOP')}
                    </Text>
                    <Text style={[styles.budgetStatusText, { color: barColor }]}>
                      {pct.toFixed(0)}% · {statusLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* 2. RECURRING PAYMENTS / SUBSCRIPTIONS */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          🔄 Pagos Recurrentes & Suscripciones
        </Text>
        <TouchableOpacity
          style={[styles.addPill, { backgroundColor: colors.emeraldSoft }]}
          onPress={() => setRecurringModalVisible(true)}
        >
          <Text style={[styles.addPillText, { color: colors.emerald }]}>
            + Suscripción
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {recurring.map((rec, idx) => {
          const cat = categories.find((c) => c.id === rec.categoryId);
          const acc = accounts.find((a) => a.id === rec.accountId);
          return (
            <View
              key={rec.id}
              style={[
                styles.recurringItem,
                idx < recurring.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.recurringTop}>
                <CategoryIcon
                  icon={cat?.icon || 'bolt'}
                  color={cat?.color || colors.info}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recTitle, { color: colors.textPrimary }]}>
                    {rec.title}
                  </Text>
                  <Text style={[styles.recMeta, { color: colors.textSecondary }]}>
                    Próximo cobro: {formatDateSpanish(rec.nextDate)} ·{' '}
                    {acc?.name || 'Cuenta'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.recAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(rec.amount, rec.currency)}
                  </Text>
                  <TouchableOpacity onPress={() => deleteRecurring(rec.id)}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.payNowButton, { backgroundColor: colors.emerald }]}
                onPress={() => payRecurringNow(rec.id)}
              >
                <Text style={styles.payNowText}>✓ Registrar Pago Ahora</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* 3. SAVINGS GOALS (ALCANCÍAS) */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          🐷 Metas de Ahorro (Alcancías)
        </Text>
        <TouchableOpacity
          style={[styles.addPill, { backgroundColor: colors.emeraldSoft }]}
          onPress={() => setGoalModalVisible(true)}
        >
          <Text style={[styles.addPillText, { color: colors.emerald }]}>
            + Nueva Meta
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.goalsGrid}>
        {goals.map((g) => {
          const pct =
            g.targetAmount > 0
              ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
              : 0;
          const remaining = Math.max(0, g.targetAmount - g.currentAmount);

          return (
            <View
              key={g.id}
              style={[
                styles.goalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.goalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalName, { color: colors.textPrimary }]}>
                    🎯 {g.name}
                  </Text>
                  <Text style={[styles.goalDeadline, { color: colors.textSecondary }]}>
                    Fecha objetivo: {formatDateSpanish(g.deadline)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.goalPctBadge,
                    { backgroundColor: colors.emeraldSoft },
                  ]}
                >
                  <Text style={[styles.goalPctText, { color: colors.emerald }]}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.goalNumbersRow}>
                <View>
                  <Text style={[styles.goalCaption, { color: colors.textSecondary }]}>
                    Ahorrado
                  </Text>
                  <Text style={[styles.goalSavedVal, { color: colors.emerald }]}>
                    {formatCurrency(g.currentAmount, 'DOP')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.goalCaption, { color: colors.textSecondary }]}>
                    Meta Total
                  </Text>
                  <Text style={[styles.goalTargetVal, { color: colors.textPrimary }]}>
                    {formatCurrency(g.targetAmount, 'DOP')}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.surfaceElevated, height: 10 },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: colors.emerald },
                  ]}
                />
              </View>

              <View style={styles.goalFooter}>
                <Text style={[styles.goalRemaining, { color: colors.textMuted }]}>
                  Faltan {formatCurrency(remaining, 'DOP')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.abonarButton,
                      { backgroundColor: colors.primaryNavy },
                    ]}
                    onPress={() => {
                      setContributeGoalId(g.id);
                      setContributeAmount('5000');
                    }}
                  >
                    <Text style={styles.abonarButtonText}>＋ Abonar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteGoalBtn,
                      { backgroundColor: colors.surfaceElevated },
                    ]}
                    onPress={() => deleteGoal(g.id)}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* MODAL: Create Budget */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Configurar Presupuesto Mensual
            </Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Selecciona Categoría
            </Text>
            <View style={styles.catWrap}>
              {expenseCategories.map((c) => {
                const active = c.id === selectedBudgetCategory;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catOption,
                      {
                        backgroundColor: active
                          ? colors.emeraldSoft
                          : colors.surfaceElevated,
                        borderColor: active ? colors.emerald : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedBudgetCategory(c.id)}
                  >
                    <Text
                      style={{
                        color: active ? colors.emerald : colors.textPrimary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Límite Mensual (RD$)
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
              value={budgetLimitInput}
              onChangeText={setBudgetLimitInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.emerald }]}
                onPress={handleSaveBudget}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                  Guardar Presupuesto
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Create Recurring Payment */}
      <Modal
        visible={recurringModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecurringModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Nuevo Pago Recurrente / Suscripción
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Nombre del Servicio / Préstamo
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
              placeholder="Ej. Spotify Duo, Cuota Préstamo..."
              placeholderTextColor={colors.textMuted}
              value={recTitle}
              onChangeText={setRecTitle}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Monto
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
                  placeholder="1500"
                  placeholderTextColor={colors.textMuted}
                  value={recAmount}
                  onChangeText={setRecAmount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Moneda
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['DOP', 'USD'] as CurrencyCode[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.currBtn,
                        {
                          backgroundColor:
                            recCurrency === c
                              ? colors.emerald
                              : colors.surfaceElevated,
                        },
                      ]}
                      onPress={() => setRecCurrency(c)}
                    >
                      <Text
                        style={{
                          color: recCurrency === c ? '#FFFFFF' : colors.textPrimary,
                          fontWeight: '700',
                        }}
                      >
                        {c === 'DOP' ? 'RD$' : 'US$'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Fecha de Próximo Cobro (YYYY-MM-DD)
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
              value={recNextDate}
              onChangeText={setRecNextDate}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setRecurringModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.emerald }]}
                onPress={handleSaveRecurring}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Create Savings Goal */}
      <Modal
        visible={goalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Nueva Meta de Ahorro (Alcancía)
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Nombre del Objetivo
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
              placeholder="Ej. Inicial Apartamento, MacBook Pro..."
              placeholderTextColor={colors.textMuted}
              value={goalName}
              onChangeText={setGoalName}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Monto Meta Total (RD$)
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
              placeholder="150000"
              placeholderTextColor={colors.textMuted}
              value={goalTarget}
              onChangeText={setGoalTarget}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Ahorro Inicial (RD$)
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
              value={goalInitial}
              onChangeText={setGoalInitial}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Fecha Límite (YYYY-MM-DD)
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
              value={goalDeadline}
              onChangeText={setGoalDeadline}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.emerald }]}
                onPress={handleSaveGoal}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Crear Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Contribute ("Abonar") to Savings Goal */}
      <Modal
        visible={Boolean(contributeGoalId)}
        transparent
        animationType="fade"
        onRequestClose={() => setContributeGoalId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              🐷 Abonar a Meta de Ahorro
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Monto a Abonar (RD$)
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
              value={contributeAmount}
              onChangeText={setContributeAmount}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Debitar desde Cuenta
            </Text>
            <View style={styles.catWrap}>
              {accounts.map((acc) => {
                const active = acc.id === contributeAccountId;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.catOption,
                      {
                        backgroundColor: active
                          ? colors.emeraldSoft
                          : colors.surfaceElevated,
                        borderColor: active ? colors.emerald : colors.border,
                      },
                    ]}
                    onPress={() => setContributeAccountId(acc.id)}
                  >
                    <Text
                      style={{
                        color: active ? colors.emerald : colors.textPrimary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setContributeGoalId(null)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.emerald }]}
                onPress={handleConfirmContribution}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                  Confirmar Abono
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  screenTitle: {
    fontSize: 21,
    fontWeight: '900',
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  addPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  budgetRow: {
    paddingVertical: 12,
    gap: 10,
  },
  budgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCatName: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  budgetSpentText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  budgetStatusText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  recurringItem: {
    paddingVertical: 12,
    gap: 10,
  },
  recurringTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  recMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  recAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  payNowButton: {
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  goalsGrid: {
    gap: 12,
  },
  goalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalName: {
    fontSize: 15,
    fontWeight: '800',
  },
  goalDeadline: {
    fontSize: 11,
    marginTop: 2,
  },
  goalPctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalPctText: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  goalNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCaption: {
    fontSize: 11,
  },
  goalSavedVal: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  goalTargetVal: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRemaining: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  abonarButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  abonarButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteGoalBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 5,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOption: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  currBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});
