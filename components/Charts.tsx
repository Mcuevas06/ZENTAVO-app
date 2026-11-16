import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useZentavo } from '../store/ZentavoContext';
import { formatCurrency } from '../utils/currency';

interface IncomeVsExpenseProps {
  incomeDOP: number;
  expenseDOP: number;
}

export const IncomeVsExpenseChart: React.FC<IncomeVsExpenseProps> = ({
  incomeDOP,
  expenseDOP,
}) => {
  const { colors } = useZentavo();
  const maxVal = Math.max(incomeDOP, expenseDOP, 1);
  const incomePct = Math.min(100, (incomeDOP / maxVal) * 100);
  const expensePct = Math.min(100, (expenseDOP / maxVal) * 100);
  const savingsRate =
    incomeDOP > 0 ? Math.round(((incomeDOP - expenseDOP) / incomeDOP) * 100) : 0;

  return (
    <View style={styles.chartBox}>
      <View style={styles.barGroup}>
        <View style={styles.barLabelRow}>
          <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
            Ingresos del Mes
          </Text>
          <Text style={[styles.barValue, { color: colors.emerald }]}>
            +{formatCurrency(incomeDOP, 'DOP')}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
          <View
            style={[
              styles.barFill,
              { width: `${incomePct}%`, backgroundColor: colors.emerald },
            ]}
          />
        </View>
      </View>

      <View style={styles.barGroup}>
        <View style={styles.barLabelRow}>
          <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
            Gastos del Mes
          </Text>
          <Text style={[styles.barValue, { color: colors.danger }]}>
            -{formatCurrency(expenseDOP, 'DOP')}
          </Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
          <View
            style={[
              styles.barFill,
              { width: `${expensePct}%`, backgroundColor: colors.danger },
            ]}
          />
        </View>
      </View>

      <View
        style={[
          styles.netBanner,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
          Flujo Neto Mensual:
        </Text>
        <Text
          style={[
            styles.netAmount,
            {
              color: incomeDOP - expenseDOP >= 0 ? colors.emerald : colors.danger,
            },
          ]}
        >
          {formatCurrency(incomeDOP - expenseDOP, 'DOP', true)} ({savingsRate}% ahorro)
        </Text>
      </View>
    </View>
  );
};

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amountDOP: number;
  percentage: number;
}

export const CategoryDonutChart: React.FC<{ slices: CategorySlice[]; totalDOP: number }> = ({
  slices,
  totalDOP,
}) => {
  const { colors } = useZentavo();
  const [selectedSlice, setSelectedSlice] = useState<CategorySlice | null>(
    slices[0] || null
  );

  const active = selectedSlice || slices[0];

  return (
    <View style={styles.donutContainer}>
      {/* Interactive Visual Ring + Stacked Distribution */}
      <View style={styles.ringWrapper}>
        <View
          style={[
            styles.donutOuterRing,
            {
              borderColor: active ? active.color : colors.emerald,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <View style={[styles.donutInnerHole, { backgroundColor: colors.surface }]}>
            <Text style={[styles.donutCenterSub, { color: colors.textSecondary }]}>
              {active ? active.name : 'Total Gastos'}
            </Text>
            <Text style={[styles.donutCenterMain, { color: colors.textPrimary }]}>
              {formatCurrency(active ? active.amountDOP : totalDOP, 'DOP')}
            </Text>
            {active && (
              <Text style={[styles.donutCenterPct, { color: active.color }]}>
                {active.percentage.toFixed(1)}% del total
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Proportional Segmented Spectrum Bar */}
      <View style={styles.segmentedBar}>
        {slices.map((s) => (
          <View
            key={s.categoryId}
            style={{
              flex: Math.max(s.percentage, 3),
              backgroundColor: s.color,
              height: 12,
            }}
          />
        ))}
      </View>

      {/* Interactive Legend List */}
      <View style={styles.legendList}>
        {slices.map((s) => {
          const isSelected = active?.categoryId === s.categoryId;
          return (
            <TouchableOpacity
              key={s.categoryId}
              style={[
                styles.legendRow,
                {
                  backgroundColor: isSelected
                    ? colors.surfaceElevated
                    : 'transparent',
                  borderColor: isSelected ? s.color : colors.border,
                },
              ]}
              onPress={() => setSelectedSlice(s)}
            >
              <View style={[styles.colorDot, { backgroundColor: s.color }]} />
              <Text
                style={[styles.legendName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {s.name}
              </Text>
              <Text style={[styles.legendPct, { color: colors.textSecondary }]}>
                {s.percentage.toFixed(1)}%
              </Text>
              <Text style={[styles.legendAmt, { color: colors.textPrimary }]}>
                {formatCurrency(s.amountDOP, 'DOP')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export interface MonthlyPoint {
  monthLabel: string;
  incomeDOP: number;
  expenseDOP: number;
}

export const MonthlyEvolutionChart: React.FC<{ data: MonthlyPoint[] }> = ({ data }) => {
  const { colors } = useZentavo();
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.incomeDOP, d.expenseDOP]),
    10000
  );

  return (
    <View style={styles.evolutionWrapper}>
      <View style={styles.columnsContainer}>
        {data.map((pt) => {
          const incHeight = Math.max(8, Math.round((pt.incomeDOP / maxVal) * 110));
          const expHeight = Math.max(8, Math.round((pt.expenseDOP / maxVal) * 110));
          return (
            <View key={pt.monthLabel} style={styles.monthColumn}>
              <View style={styles.barsPair}>
                <View
                  style={[
                    styles.verticalBar,
                    { height: incHeight, backgroundColor: colors.emerald },
                  ]}
                />
                <View
                  style={[
                    styles.verticalBar,
                    { height: expHeight, backgroundColor: colors.danger },
                  ]}
                />
              </View>
              <Text style={[styles.monthText, { color: colors.textSecondary }]}>
                {pt.monthLabel}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendPair}>
        <View style={styles.legendChip}>
          <View style={[styles.colorDot, { backgroundColor: colors.emerald }]} />
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Ingresos</Text>
        </View>
        <View style={styles.legendChip}>
          <View style={[styles.colorDot, { backgroundColor: colors.danger }]} />
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Gastos</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartBox: {
    gap: 12,
  },
  barGroup: {
    gap: 5,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  netBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  netAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  donutContainer: {
    alignItems: 'center',
  },
  ringWrapper: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuterRing: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInnerHole: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  donutCenterSub: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  donutCenterMain: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  donutCenterPct: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  segmentedBar: {
    flexDirection: 'row',
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  legendList: {
    width: '100%',
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  legendAmt: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 95,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  evolutionWrapper: {
    paddingTop: 8,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 8,
  },
  monthColumn: {
    alignItems: 'center',
    gap: 6,
  },
  barsPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  verticalBar: {
    width: 12,
    borderRadius: 4,
  },
  monthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendPair: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
