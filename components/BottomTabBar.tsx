import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useZentavo } from '../store/ZentavoContext';

export type TabRoute = 'dashboard' | 'transactions' | 'planning' | 'analytics';

interface BottomTabBarProps {
  activeTab: TabRoute;
  onSelectTab: (tab: TabRoute) => void;
  onOpenQuickAdd: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickAdd,
}) => {
  const { colors } = useZentavo();

  const renderTab = (route: TabRoute, label: string, icon: string) => {
    const isActive = activeTab === route;
    return (
      <TouchableOpacity
        key={route}
        style={styles.tabItem}
        onPress={() => onSelectTab(route)}
        activeOpacity={0.75}
      >
        <Text
          style={[
            styles.tabIcon,
            { color: isActive ? colors.emerald : colors.textSecondary },
          ]}
        >
          {icon}
        </Text>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isActive ? colors.emerald : colors.textSecondary,
              fontWeight: isActive ? '700' : '500',
            },
          ]}
        >
          {label}
        </Text>
        {isActive && <View style={[styles.activeDot, { backgroundColor: colors.emerald }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {renderTab('dashboard', 'Inicio', '📊')}
      {renderTab('transactions', 'Historial', '🧾')}

      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[
            styles.fabButton,
            {
              backgroundColor: colors.emerald,
              shadowColor: colors.emerald,
            },
          ]}
          onPress={onOpenQuickAdd}
          activeOpacity={0.85}
        >
          <Text style={styles.fabPlus}>＋</Text>
        </TouchableOpacity>
      </View>

      {renderTab('planning', 'Planificación', '🎯')}
      {renderTab('analytics', 'Análisis', '⚙️')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 74,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
  },
  activeDot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  fabWrapper: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  fabPlus: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
});
