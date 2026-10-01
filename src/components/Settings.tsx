import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DEFAULT_GOAL, MAX_GOAL, MIN_GOAL, useSettings } from '../settings';
import { useAndroidKeyboardHeight } from '../keyboard';
import { ACCENTS, GUTTER, useTheme, useThemedStyles, type Theme } from '../theme';

/** Dropdown under the settings icon in the top-right corner. */
export function SettingsMenu({
  visible,
  top,
  onClose,
  onPick,
}: {
  visible: boolean;
  top: number;
  onClose: () => void;
  onPick: (item: 'goal' | 'theme') => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { calorieGoal, mode, accent } = useSettings();
  const accentName = ACCENTS.find((a) => a.key === accent)?.name;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.menu, { top }]}>
          <MenuItem
            icon="flame-outline"
            label="Set calorie goal"
            detail={`${calorieGoal.toLocaleString()} kcal per day`}
            onPress={() => onPick('goal')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="color-palette-outline"
            label="Themes"
            detail={`${mode === 'dark' ? 'Dark' : 'Light'} · ${accentName}`}
            onPress={() => onPick('theme')}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

function MenuItem(props: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; onPress: () => void }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: c.thumb }]} onPress={props.onPress}>
      <Ionicons name={props.icon} size={20} color={c.accentText} />
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{props.label}</Text>
        <Text style={styles.menuDetail}>{props.detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.quiet} />
    </Pressable>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <View style={styles.headerSide} />
      <Text style={styles.title}>{title}</Text>
      <Pressable style={[styles.headerSide, { alignItems: 'flex-end' }]} onPress={onClose} hitSlop={12}>
        <Text style={styles.done}>Done</Text>
      </Pressable>
    </View>
  );
}

const PRESETS = [1500, 1800, 2000, 2500, 3000];

export function GoalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { calorieGoal, setCalorieGoal } = useSettings();
  const keyboardHeight = useAndroidKeyboardHeight();
  const [text, setText] = useState(String(calorieGoal));

  const n = Number(text);
  const valid = /^\d+$/.test(text) && n >= MIN_GOAL && n <= MAX_GOAL;

  const save = () => {
    if (!valid) return;
    setCalorieGoal(n);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheet, { paddingBottom: keyboardHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerSide} onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Calorie goal</Text>
          <View style={styles.headerSide} />
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>DAILY GOAL</Text>
          <View style={[styles.goalInput, !valid && text !== '' && { borderColor: c.danger }]}>
            <TextInput
              style={styles.goalText}
              value={text}
              onChangeText={setText}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_GOAL)}
              placeholderTextColor={c.placeholder}
              maxLength={5}
              autoFocus
              onSubmitEditing={save}
            />
            <Text style={styles.goalUnit}>kcal</Text>
          </View>
          <Text style={[styles.hint, !valid && text !== '' && { color: c.danger }]}>
            Between {MIN_GOAL.toLocaleString()} and {MAX_GOAL.toLocaleString()} kcal. Shown on every day as eaten / goal.
          </Text>
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const on = text === String(p);
              return (
                <Pressable key={p} style={[styles.preset, on && styles.presetOn]} onPress={() => setText(String(p))}>
                  <Text style={[styles.presetLabel, on && { color: c.accentText }]}>{p.toLocaleString()}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={[styles.save, !valid && { opacity: 0.4 }]} onPress={save} disabled={!valid}>
            <Text style={styles.saveLabel}>Save goal</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { mode, accent, calorieGoal, setMode, setAccent } = useSettings();
  const sample = Math.round(calorieGoal * 0.62);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <SheetHeader title="Themes" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.sectionLabel}>MODE</Text>
          <View style={styles.segment}>
            {(['dark', 'light'] as const).map((m) => {
              const on = mode === m;
              return (
                <Pressable key={m} style={[styles.segmentItem, on && styles.segmentOn]} onPress={() => setMode(m)}>
                  <Ionicons name={m === 'dark' ? 'moon' : 'sunny'} size={18} color={on ? c.onAccent : c.quiet} />
                  <Text style={[styles.segmentLabel, on && { color: c.onAccent }]}>
                    {m === 'dark' ? 'Dark mode' : 'Light mode'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>PRIMARY COLOR</Text>
          <View style={styles.swatches}>
            {ACCENTS.map((a) => {
              const on = accent === a.key;
              return (
                <Pressable
                  key={a.key}
                  style={[styles.swatchCard, on && { borderColor: a.color }]}
                  onPress={() => setAccent(a.key)}
                  accessibilityLabel={`${a.name}${on ? ', selected' : ''}`}
                >
                  <View style={[styles.swatch, { backgroundColor: a.color }]}>
                    {on && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.swatchLabel}>{a.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>PREVIEW</Text>
          <View style={styles.preview}>
            <Text style={styles.previewKcal}>
              {sample.toLocaleString()}
              <Text style={styles.previewGoal}> / {calorieGoal.toLocaleString()} kcal</Text>
            </Text>
            <View style={styles.previewTrack}>
              <View style={[styles.previewFill, { backgroundColor: c.accent }]} />
            </View>
            <View style={styles.previewButton}>
              <Text style={styles.saveLabel}>Save meal</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    menu: {
      position: 'absolute',
      right: GUTTER - 4,
      width: 260,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      paddingVertical: 6,
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    menuLabel: { fontSize: 15, fontWeight: '600', color: c.ink },
    menuDetail: { fontSize: 12, fontWeight: '500', color: c.quiet, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: c.line, marginHorizontal: 16 },
    sheet: { flex: 1, backgroundColor: c.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: GUTTER,
      paddingTop: Platform.OS === 'ios' ? 20 : 48,
      paddingBottom: 12,
    },
    headerSide: { flex: 1 },
    title: { fontSize: 17, fontWeight: '700', color: c.ink },
    cancel: { fontSize: 15, fontWeight: '500', color: c.quiet },
    done: { fontSize: 15, fontWeight: '700', color: c.accentText },
    body: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: c.quiet, letterSpacing: 0.3, marginBottom: 10 },
    goalInput: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 64,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.line,
      paddingHorizontal: 18,
    },
    goalText: { flex: 1, fontSize: 28, fontWeight: '700', color: c.ink, paddingVertical: 0 },
    goalUnit: { fontSize: 16, fontWeight: '500', color: c.quiet },
    hint: { fontSize: 13, color: c.quiet, marginTop: 8, lineHeight: 18 },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
    preset: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, borderWidth: 1.5, borderColor: c.line },
    presetOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    presetLabel: { fontSize: 14, fontWeight: '600', color: c.ink },
    footer: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 36 },
    save: { height: 56, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    saveLabel: { color: c.onAccent, fontSize: 17, fontWeight: '700' },
    segment: { flexDirection: 'row', backgroundColor: c.bg, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.line },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 44,
      borderRadius: 10,
    },
    segmentOn: { backgroundColor: c.accent },
    segmentLabel: { fontSize: 15, fontWeight: '600', color: c.quiet },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatchCard: {
      width: '31%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.line,
      backgroundColor: c.bg,
    },
    swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    swatchLabel: { fontSize: 13, fontWeight: '600', color: c.ink, marginTop: 8 },
    preview: { backgroundColor: c.bg, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 16 },
    previewKcal: { fontSize: 28, fontWeight: '700', color: c.ink },
    previewGoal: { fontSize: 15, fontWeight: '600', color: c.quiet },
    previewTrack: { height: 8, borderRadius: 4, backgroundColor: c.thumb, marginTop: 10, overflow: 'hidden' },
    previewFill: { width: '62%', height: 8, borderRadius: 4 },
    previewButton: {
      height: 48,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
  });
