import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import { useZentavo } from '../store/ZentavoContext';
import { toBaseDOP } from '../utils/currency';
import {
  CategoryDonutChart,
  CategorySlice,
  MonthlyEvolutionChart,
  MonthlyPoint,
} from '../components/Charts';

export const AnalyticsSettingsScreen: React.FC = () => {
  const {
    categories,
    transactions,
    exchangeRate,
    theme,
    colors,
    setExchangeRate,
    toggleTheme,
    exportCSV,
    resetDemoData,
  } = useZentavo();

  const [rateInput, setRateInput] = useState(String(exchangeRate));
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [resetFeedback, setResetFeedback] = useState<boolean>(false);

  // Compute Category Donut Slices (Expenses only, excluding transfers)
  const { slices, totalExpenseDOP } = useMemo(() => {
    const totals = new Map<string, number>();
    let grandTotal = 0;

    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const dop = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate);
      totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + dop);
      grandTotal += dop;
    }

    const result: CategorySlice[] = Array.from(totals.entries())
      .map(([catId, amountDOP]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          categoryId: catId,
          name: cat?.name || 'Otros',
          color: cat?.color || '#10B981',
          icon: cat?.icon || 'utensils',
          amountDOP,
          percentage: grandTotal > 0 ? (amountDOP / grandTotal) * 100 : 0,
        };
      })
      .sort((a, b) => b.amountDOP - a.amountDOP);

    return { slices: result, totalExpenseDOP: grandTotal };
  }, [transactions, categories]);

  // Compute 6-Month Evolution strictly from actual user transactions
  const monthlyEvolution: MonthlyPoint[] = useMemo(() => {
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const last6: { key: string; label: string; incomeDOP: number; expenseDOP: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last6.push({
        key: ym,
        label: monthLabels[d.getMonth()],
        incomeDOP: 0,
        expenseDOP: 0,
      });
    }

    for (const tx of transactions) {
      if (tx.type === 'transfer') continue;
      const ym = tx.date.slice(0, 7);
      const bucket = last6.find((b) => b.key === ym) || last6[last6.length - 1];
      const dop = toBaseDOP(tx.amount, tx.currency, tx.exchangeRate);
      if (tx.type === 'income') bucket.incomeDOP += dop;
      else if (tx.type === 'expense') bucket.expenseDOP += dop;
    }

    return last6.map((b) => ({
      monthLabel: b.label,
      incomeDOP: b.incomeDOP,
      expenseDOP: b.expenseDOP,
    }));
  }, [transactions]);

  const handleRateChange = (text: string) => {
    setRateInput(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      setExchangeRate(parsed);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportCSV();
    setCsvPreview(csvContent);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zentavo_movimientos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setCsvFeedback('✓ Archivo CSV generado con éxito');
    setTimeout(() => setCsvFeedback(null), 4000);
  };

  const handleResetDemo = () => {
    resetDemoData();
    setRateInput('60.5');
    setCsvPreview(null);
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 3000);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
        Análisis & Ajustes
      </Text>
      <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
        Inteligencia financiera, tasa multimoneda y respaldo de datos
      </Text>

      {/* 1. Category Expense Distribution (Donut Chart) */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          🍩 Distribución de Gastos por Categoría
        </Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          Toca cualquier categoría para inspeccionar su peso porcentual
        </Text>

        <CategoryDonutChart slices={slices} totalDOP={totalExpenseDOP} />
      </View>

      {/* 2. Monthly Evolution */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          📈 Evolución Mensual (6 Meses)
        </Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          Comparativa histórica de Ingresos vs. Gastos consolidados en RD$
        </Text>

        <MonthlyEvolutionChart data={monthlyEvolution} />
      </View>

      {/* 3. Real-Time Exchange Rate Configuration (US$ -> RD$) */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          💱 Tasa de Cambio en Tiempo Real (US$ → RD$)
        </Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          Actualiza automáticamente el Patrimonio Consolidado y las conversiones multimoneda
        </Text>

        <View style={styles.rateInputRow}>
          <View
            style={[
              styles.ratePrefixBox,
              { backgroundColor: colors.primaryNavy },
            ]}
          >
            <Text style={styles.ratePrefixText}>1 US$ = RD$</Text>
          </View>
          <TextInput
            style={[
              styles.rateInput,
              {
                backgroundColor: colors.surfaceElevated,
                color: colors.emerald,
                borderColor: colors.emerald,
              },
            ]}
            keyboardType="numeric"
            value={rateInput}
            onChangeText={handleRateChange}
          />
        </View>

        <View style={styles.presetRatesRow}>
          {[59.5, 60.5, 61.25, 62.0].map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetChip,
                {
                  backgroundColor:
                    exchangeRate === preset
                      ? colors.emerald
                      : colors.surfaceElevated,
                  borderColor:
                    exchangeRate === preset ? colors.emerald : colors.border,
                },
              ]}
              onPress={() => {
                setRateInput(preset.toFixed(2));
                setExchangeRate(preset);
              }}
            >
              <Text
                style={{
                  color: exchangeRate === preset ? '#FFFFFF' : colors.textPrimary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                RD$ {preset.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 4. Appearance & Data Actions */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          ⚙️ Preferencias & Datos Locales
        </Text>

        <TouchableOpacity
          style={[
            styles.settingRow,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
          onPress={toggleTheme}
        >
          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
            {theme === 'dark' ? '🌙 Modo Oscuro Activo' : '☀️ Modo Claro Activo'}
          </Text>
          <Text style={{ color: colors.emerald, fontWeight: '800', fontSize: 13 }}>
            Cambiar a {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.primaryNavy, borderColor: colors.emerald },
          ]}
          onPress={handleExportCSV}
        >
          <Text style={styles.actionButtonText}>
            📥 Exportar Movimientos a CSV
          </Text>
        </TouchableOpacity>

        {csvFeedback && (
          <Text style={[styles.feedbackText, { color: colors.emerald }]}>
            {csvFeedback}
          </Text>
        )}

        {csvPreview && (
          <View
            style={[
              styles.csvPreviewBox,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.csvPreviewHeader}>
              <Text style={{ color: colors.emerald, fontSize: 11, fontWeight: '800' }}>
                VISTA PREVIA CSV GENERADO ({transactions.length} registros)
              </Text>
              <TouchableOpacity onPress={() => setCsvPreview(null)}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.csvPreviewCode, { color: colors.textSecondary }]}
              numberOfLines={8}
            >
              {csvPreview}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.resetButton,
            { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
          ]}
          onPress={handleResetDemo}
        >
          <Text style={[styles.resetButtonText, { color: colors.danger }]}>
            🗑️ Restablecer y Borrar Todos los Datos (En Blanco)
          </Text>
        </TouchableOpacity>

        {resetFeedback && (
          <Text style={[styles.feedbackText, { color: colors.warning }]}>
            ✓ Todos los registros han sido borrados (App 100% en blanco)
          </Text>
        )}
      </View>
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
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ratePrefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ratePrefixText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  rateInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  presetRatesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  resetButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 6,
  },
  csvPreviewBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  csvPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  csvPreviewCode: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
