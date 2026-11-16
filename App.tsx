import React, { useState } from 'react';
import { SafeAreaView, StatusBar, View, StyleSheet } from 'react-native';
import { ZentavoProvider, useZentavo } from './store/ZentavoContext';
import { BottomTabBar, TabRoute } from './components/BottomTabBar';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { ControlCenterModal } from './components/ControlCenterModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { PlanningScreen } from './screens/PlanningScreen';
import { AnalyticsSettingsScreen } from './screens/AnalyticsSettingsScreen';
import { Transaction } from './types';

const ZentavoShell: React.FC = () => {
  const { colors, theme } = useZentavo();
  const [activeTab, setActiveTab] = useState<TabRoute>('dashboard');
  const [quickModalVisible, setQuickModalVisible] = useState<boolean>(false);
  const [controlCenterVisible, setControlCenterVisible] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const handleOpenNewTransaction = () => {
    setEditingTx(null);
    setQuickModalVisible(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setQuickModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.screenBody}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onEditTransaction={handleEditTransaction}
            onOpenControlCenter={() => setControlCenterVisible(true)}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsScreen onEditTransaction={handleEditTransaction} />
        )}
        {activeTab === 'planning' && <PlanningScreen />}
        {activeTab === 'analytics' && <AnalyticsSettingsScreen />}
      </View>

      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickAdd={handleOpenNewTransaction}
      />

      <QuickTransactionModal
        visible={quickModalVisible}
        editingTransaction={editingTx}
        onClose={() => {
          setQuickModalVisible(false);
          setEditingTx(null);
        }}
      />

      <ControlCenterModal
        visible={controlCenterVisible}
        onClose={() => setControlCenterVisible(false)}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ZentavoProvider>
      <ZentavoShell />
    </ZentavoProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
});
