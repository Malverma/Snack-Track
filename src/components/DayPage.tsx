import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';

import { getMealsForDay, sumTotals, type Meal } from '../db';
import { timeLabel } from '../date';
import { thumbUri } from '../photos';
import { useSettings } from '../settings';
import { GUTTER, useTheme, useThemedStyles, type Theme } from '../theme';

type Props = {
  date: string;
  isToday: boolean;
  width: number;
  /** Bumped by the parent whenever meals change, to trigger a reload. */
  version: number;
  bottomInset: number;
  onAdd: () => void;
  onOpenMeal: (meal: Meal) => void;
};

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

export function DayPage({ date, isToday, width, version, bottomInset, onAdd, onOpenMeal }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { calorieGoal } = useSettings();
  const [meals, setMeals] = useState<Meal[] | null>(null);

  useEffect(() => {
    let live = true;
    getMealsForDay(db, date).then((rows) => live && setMeals(rows));
    return () => {
      live = false;
    };
  }, [db, date, version]);

  const totals = sumTotals(meals ?? []);
  const over = totals.calories > calorieGoal;
  const remaining = Math.abs(calorieGoal - totals.calories);

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 110 }]}
    >
      <View style={styles.totals}>
        <Text style={styles.totalsLabel}>{isToday ? 'Calories today' : 'Calories'}</Text>
        <View style={styles.kcalRow}>
          <Text style={styles.kcal}>{totals.calories.toLocaleString()}</Text>
          <Text style={styles.kcalGoal}> / {calorieGoal.toLocaleString()} kcal</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, (totals.calories / calorieGoal) * 100)}%`,
                backgroundColor: theme.accent,
              },
            ]}
          />
        </View>
        <Text style={styles.remaining}>
          {remaining.toLocaleString()} kcal {over ? 'over' : 'left'}
        </Text>
        <View style={styles.macros}>
          <Macro label="Protein" value={totals.protein} color={theme.protein} />
          <Macro label="Fat" value={totals.fat} color={theme.fat} />
          <Macro label="Carbs" value={totals.carbs} color={theme.carbs} />
        </View>
      </View>

      {meals && meals.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="restaurant-outline" size={24} color={theme.quiet} />
          </View>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptyBody}>Meals you add for this day show up here.</Text>
          <Pressable style={styles.emptyButton} onPress={onAdd}>
            <Text style={styles.emptyButtonLabel}>+ Add meal</Text>
          </Pressable>
        </View>
      )}

      {meals && meals.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Meals</Text>
            <Text style={styles.sectionCount}>
              {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
            </Text>
          </View>
          {meals.map((m) => (
            <MealCard key={m.id} meal={m} onPress={() => onOpenMeal(m)} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.macro}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <Text style={styles.macroValue}>{fmt(value)} g</Text>
    </View>
  );
}

function MealCard({ meal, onPress }: { meal: Meal; onPress: () => void }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
      {meal.photoPath ? (
        <Image source={{ uri: thumbUri(meal.photoPath) }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Ionicons name="restaurant-outline" size={22} color={c.quiet} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.name || 'Meal'}
        </Text>
        <Text style={styles.mealMacros}>
          P {fmt(meal.protein)}g · F {fmt(meal.fat)}g · C {fmt(meal.carbs)}g
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.mealKcal}>{meal.calories.toLocaleString()}</Text>
        <Text style={styles.mealTime}>{timeLabel(meal.loggedAt)}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    content: { paddingHorizontal: GUTTER, paddingTop: 8 },
    totals: {
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.line,
      padding: 20,
    },
    totalsLabel: { fontSize: 13, fontWeight: '500', color: c.quiet },
    kcalRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
    kcal: { fontSize: 40, fontWeight: '700', color: c.ink },
    kcalGoal: { fontSize: 17, fontWeight: '600', color: c.quiet },
    track: { height: 8, borderRadius: 4, backgroundColor: c.thumb, marginTop: 12, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4 },
    remaining: { fontSize: 12, fontWeight: '500', color: c.quiet, marginTop: 6 },
    macros: { flexDirection: 'row', marginTop: 16 },
    macro: { flex: 1 },
    macroLabelRow: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    macroLabel: { fontSize: 12, fontWeight: '500', color: c.quiet },
    macroValue: { fontSize: 17, fontWeight: '600', color: c.ink, marginTop: 2 },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: 24,
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.ink },
    sectionCount: { fontSize: 13, fontWeight: '500', color: c.quiet },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      padding: 10,
      paddingRight: 14,
      marginBottom: 12,
      gap: 12,
    },
    thumb: { width: 56, height: 56, borderRadius: 12 },
    thumbEmpty: { backgroundColor: c.thumb, alignItems: 'center', justifyContent: 'center' },
    mealName: { fontSize: 16, fontWeight: '600', color: c.ink },
    mealMacros: { fontSize: 13, fontWeight: '500', color: c.quiet, marginTop: 6 },
    mealKcal: { fontSize: 18, fontWeight: '700', color: c.ink },
    mealTime: { fontSize: 12, fontWeight: '500', color: c.quiet, marginTop: 6 },
    empty: {
      marginTop: 24,
      borderRadius: 20,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.line,
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 20,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.thumb,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.ink, marginTop: 16 },
    emptyBody: { fontSize: 13, fontWeight: '500', color: c.quiet, marginTop: 6 },
    emptyButton: {
      backgroundColor: c.accent,
      borderRadius: 20,
      paddingHorizontal: 22,
      paddingVertical: 11,
      marginTop: 18,
    },
    emptyButtonLabel: { color: c.onAccent, fontSize: 14, fontWeight: '600' },
  });
