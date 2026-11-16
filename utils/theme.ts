export interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primaryNavy: string;
  emerald: string;
  emeraldSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  cardShadow: string;
}

export const DARK_THEME: ThemeColors = {
  mode: 'dark',
  background: '#070E1A',
  surface: '#0F1B2D',
  surfaceElevated: '#16263F',
  border: '#1E3352',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primaryNavy: '#0F3D68',
  emerald: '#10B981',
  emeraldSoft: 'rgba(16, 185, 129, 0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.16)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.16)',
  info: '#3B82F6',
  infoSoft: 'rgba(59, 130, 246, 0.16)',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
};

export const LIGHT_THEME: ThemeColors = {
  mode: 'light',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primaryNavy: '#0B2F52',
  emerald: '#059669',
  emeraldSoft: 'rgba(5, 150, 105, 0.12)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.12)',
  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.12)',
  info: '#2563EB',
  infoSoft: 'rgba(37, 99, 235, 0.12)',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
};
