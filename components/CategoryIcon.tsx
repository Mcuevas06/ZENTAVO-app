import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ICON_EMOJI_MAP: Record<string, string> = {
  utensils: '🍽️',
  car: '⛽',
  bolt: '⚡',
  heart: '🏥',
  home: '🏠',
  film: '🎬',
  briefcase: '💼',
  'trending-up': '📈',
  transfer: '⇄',
  cash: '💵',
  debit: '🏦',
  savings: '🐷',
  credit_card: '💳',
};

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ icon, color, size = 42 }) => {
  const symbol = ICON_EMOJI_MAP[icon] || '💠';
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: `${color}22`,
          borderColor: `${color}55`,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.48 }}>{symbol}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
