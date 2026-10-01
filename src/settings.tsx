import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import * as SystemUI from 'expo-system-ui';

import { ACCENTS, buildTheme, ThemeContext, type AccentKey, type Mode } from './theme';

export const DEFAULT_GOAL = 2000;
export const MIN_GOAL = 500;
export const MAX_GOAL = 10000;

type Settings = {
  calorieGoal: number;
  mode: Mode;
  accent: AccentKey;
};

type SettingsApi = Settings & {
  setCalorieGoal: (kcal: number) => void;
  setMode: (mode: Mode) => void;
  setAccent: (accent: AccentKey) => void;
};

const SettingsContext = createContext<SettingsApi | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

function parse(rows: { key: string; value: string }[]): Settings {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const goal = Number(map.calorieGoal);
  return {
    calorieGoal: Number.isInteger(goal) && goal >= MIN_GOAL && goal <= MAX_GOAL ? goal : DEFAULT_GOAL,
    mode: map.mode === 'light' ? 'light' : 'dark',
    accent: ACCENTS.some((a) => a.key === map.accent) ? (map.accent as AccentKey) : 'purple',
  };
}

/** Loads settings synchronously so the first frame already has the right theme. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings>(() =>
    parse(db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings')),
  );

  const theme = useMemo(() => buildTheme(settings.mode, settings.accent), [settings.mode, settings.accent]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.bg);
  }, [theme.bg]);

  const api = useMemo<SettingsApi>(() => {
    const save = <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }));
      db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, String(value));
    };
    return {
      ...settings,
      setCalorieGoal: (kcal) => save('calorieGoal', kcal),
      setMode: (mode) => save('mode', mode),
      setAccent: (accent) => save('accent', accent),
    };
  }, [db, settings]);

  return (
    <SettingsContext.Provider value={api}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </SettingsContext.Provider>
  );
}
