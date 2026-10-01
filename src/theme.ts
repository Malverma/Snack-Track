import { createContext, useContext, useMemo } from 'react';

// Dark mode with the purple accent matches the "SnackTrack UI" page in Penpot.

export type Mode = 'dark' | 'light';

export const ACCENTS = [
  { key: 'purple', name: 'Purple', color: '#8B5CF6' },
  { key: 'blue', name: 'Blue', color: '#3B82F6' },
  { key: 'green', name: 'Green', color: '#22A06B' },
  { key: 'orange', name: 'Orange', color: '#F97316' },
  { key: 'pink', name: 'Pink', color: '#EC4899' },
  { key: 'red', name: 'Red', color: '#EF4444' },
] as const;

export type AccentKey = (typeof ACCENTS)[number]['key'];

const BASE = {
  dark: {
    bg: '#121016',
    surface: '#1C1A22',
    ink: '#F2F0F5',
    quiet: '#9C98A6',
    placeholder: '#5E5A66',
    line: '#2C2934',
    danger: '#F06A5A',
    thumb: '#26232D',
    protein: '#5B9BF0',
    fat: '#F2B33D',
    carbs: '#3CC6A8',
  },
  light: {
    bg: '#F6F6F3',
    surface: '#FFFFFF',
    ink: '#1B1B1A',
    quiet: '#6E6E69',
    placeholder: '#A9A9A3',
    line: '#E3E3DE',
    danger: '#C2412D',
    thumb: '#ECECE7',
    protein: '#3E7BD6',
    fat: '#E0A021',
    carbs: '#1FA88A',
  },
};

/** Blends two `#RRGGBB` colors; `t` = 0 gives `a`, 1 gives `b`. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function buildTheme(mode: Mode, accentKey: AccentKey) {
  const base = BASE[mode];
  const accent = (ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0]).color;
  return {
    mode,
    ...base,
    accent,
    accentSoft: mix(base.bg, accent, mode === 'dark' ? 0.22 : 0.14),
    accentText: mode === 'dark' ? mix(accent, '#FFFFFF', 0.35) : mix(accent, '#000000', 0.2),
    onAccent: '#FFFFFF',
  };
}

export type Theme = ReturnType<typeof buildTheme>;

export const ThemeContext = createContext<Theme>(buildTheme('dark', 'purple'));
export const useTheme = () => useContext(ThemeContext);

/** Rebuilds a component's styles only when the theme changes. */
export function useThemedStyles<T>(factory: (t: Theme) => T): T {
  const t = useTheme();
  return useMemo(() => factory(t), [t, factory]);
}

export const GUTTER = 20;
