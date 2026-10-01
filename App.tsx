import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DayPage } from './src/components/DayPage';
import { MealSheet } from './src/components/MealSheet';
import { GoalSheet, SettingsMenu, ThemeSheet } from './src/components/Settings';
import { addDays, dayTitle, daySubtitle, daysBetween, todayKey } from './src/date';
import { DB_NAME, migrate, type Meal } from './src/db';
import { SettingsProvider } from './src/settings';
import { GUTTER, useTheme, useThemedStyles, type Theme } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DB_NAME} onInit={migrate}>
        <SettingsProvider>
          <ThemedStatusBar />
          <DayPager />
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

const DAYS_CHUNK = 365;
const TOP_BAR = 44;

/** Keeps `todayKey()` fresh across midnight while the app is open or resumed. */
function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return today;
}

/**
 * Page index 0 is today, index 1 is yesterday, and so on. With a plain
 * horizontal list that means swiping left goes back a day and swiping right
 * goes forward, stopping at today.
 */
function DayPager() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const listRef = useRef<FlatList<number>>(null);
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [index, setIndex] = useState(0);
  const [dayCount, setDayCount] = useState(DAYS_CHUNK);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<{ key: number; date: string; meal?: Meal } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<'goal' | 'theme' | null>(null);

  const date = addDays(today, -index);
  const pages = useMemo(() => Array.from({ length: dayCount }, (_, i) => i), [dayCount]);

  // When the date rolls over, today's page becomes a fresh empty day. If the
  // user was browsing an older day, shift the index so they stay on it.
  const prevToday = useRef(today);
  useEffect(() => {
    const shift = daysBetween(prevToday.current, today);
    prevToday.current = today;
    if (shift > 0 && index > 0) {
      const next = index + shift;
      setIndex(next);
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: next, animated: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0) return;
      if (i >= dayCount) setDayCount(i + DAYS_CHUNK);
      setIndex(i);
      listRef.current?.scrollToIndex({ index: i, animated: Math.abs(i - index) <= 1 });
    },
    [dayCount, index],
  );

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const openSheet = (meal?: Meal) => setSheet({ key: Date.now(), date, meal });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>SnackTrack</Text>
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          style={({ pressed }) => [styles.gear, pressed && { backgroundColor: colors.thumb }]}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.header}>
        <Pressable onPress={() => goTo(index + 1)} hitSlop={16} style={styles.arrow} accessibilityLabel="Previous day">
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{dayTitle(date, today)}</Text>
          <Text style={styles.subtitle}>{daySubtitle(date)}</Text>
        </View>
        <Pressable
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          hitSlop={16}
          style={[styles.arrow, { alignItems: 'flex-end' }]}
          accessibilityLabel="Next day"
        >
          <Text style={[styles.arrowText, index === 0 && { opacity: 0.25 }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        {index > 0 && (
          <Pressable style={styles.chip} onPress={() => goTo(0)}>
            <Text style={styles.chipLabel}>Today ›</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces
        overScrollMode="always"
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={onScrollEnd}
        onEndReached={() => setDayCount((n) => n + DAYS_CHUNK)}
        onEndReachedThreshold={0.5}
        renderItem={({ item: i }) => {
          const d = addDays(today, -i);
          return (
            <DayPage
              date={d}
              isToday={i === 0}
              width={width}
              version={version}
              bottomInset={insets.bottom}
              onAdd={() => setSheet({ key: Date.now(), date: d })}
              onOpenMeal={(meal) => setSheet({ key: Date.now(), date: d, meal })}
            />
          );
        }}
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => openSheet()}
        accessibilityLabel="Add meal"
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      <SettingsMenu
        visible={menuOpen}
        top={insets.top + TOP_BAR}
        onClose={() => setMenuOpen(false)}
        onPick={(item) => {
          setMenuOpen(false);
          setSettingsPage(item);
        }}
      />
      {settingsPage === 'goal' && <GoalSheet visible onClose={() => setSettingsPage(null)} />}
      {settingsPage === 'theme' && <ThemeSheet visible onClose={() => setSettingsPage(null)} />}

      {sheet && (
        <MealSheet
          key={sheet.key}
          visible
          date={sheet.date}
          meal={sheet.meal}
          onClose={() => setSheet(null)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      height: TOP_BAR,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: GUTTER,
      paddingRight: GUTTER - 8,
    },
    brand: { fontSize: 13, fontWeight: '700', color: colors.quiet, letterSpacing: 0.5 },
    gear: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER },
    arrow: { width: 44 },
    arrowText: { fontSize: 34, color: colors.ink, lineHeight: 38 },
    headerCenter: { flex: 1, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '700', color: colors.ink },
    subtitle: { fontSize: 13, fontWeight: '500', color: colors.quiet, marginTop: 2 },
    chipRow: { height: 46, alignItems: 'center', justifyContent: 'center' },
    chip: { backgroundColor: colors.accentSoft, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 6 },
    chipLabel: { fontSize: 13, fontWeight: '600', color: colors.accentText },
    fab: {
      position: 'absolute',
      right: GUTTER,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    fabPlus: { color: colors.onAccent, fontSize: 36, lineHeight: 40, fontWeight: '400' },
  });
