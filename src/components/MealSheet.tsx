import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';

import { deleteMeal, insertMeal, updateMeal, type Meal } from '../db';
import { deletePhoto, photoUri, savePhoto } from '../photos';
import { useAndroidKeyboardHeight } from '../keyboard';
import { GUTTER, useTheme, useThemedStyles, type Theme } from '../theme';

type Props = {
  visible: boolean;
  /** Day a new meal is added to. */
  date: string;
  /** Meal being edited; absent when adding. */
  meal?: Meal;
  onClose: () => void;
  onChanged: () => void;
};

type Photo =
  | { kind: 'stored'; name: string }
  | { kind: 'picked'; uri: string; width: number; height: number }
  | null;

const MAX_KCAL = 5000;
const MAX_GRAMS = 500;

/** Returns the parsed number, 0 when empty, or `NaN` when invalid. */
function parseAmount(raw: string, max: number, integer: boolean): number {
  const s = raw.trim().replace(',', '.');
  if (s === '') return 0;
  if (!(integer ? /^\d+$/ : /^\d+(\.\d?)?$/).test(s)) return NaN;
  const n = Number(s);
  return n > max ? NaN : n;
}

const show = (n: number | undefined) => (n === undefined ? '' : String(n));

export function MealSheet({ visible, date, meal, onClose, onChanged }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const editing = !!meal;
  const keyboardHeight = useAndroidKeyboardHeight();

  const initial = {
    name: meal?.name ?? '',
    calories: show(meal?.calories),
    protein: show(meal?.protein),
    fat: show(meal?.fat),
    carbs: show(meal?.carbs),
  };
  const [fields, setFields] = useState(initial);
  const [photo, setPhoto] = useState<Photo>(
    meal?.photoPath ? { kind: 'stored', name: meal.photoPath } : null,
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof fields) => (value: string) => setFields((f) => ({ ...f, [key]: value }));

  const values = {
    calories: parseAmount(fields.calories, MAX_KCAL, true),
    protein: parseAmount(fields.protein, MAX_GRAMS, false),
    fat: parseAmount(fields.fat, MAX_GRAMS, false),
    carbs: parseAmount(fields.carbs, MAX_GRAMS, false),
  };
  // Empty number fields count as 0, but a meal needs at least a name, a photo
  // or one number so blank entries can't be saved by accident.
  const hasContent =
    fields.name.trim() !== '' ||
    photo !== null ||
    [fields.calories, fields.protein, fields.fat, fields.carbs].some((f) => f.trim() !== '');
  const valid = hasContent && Object.values(values).every((v) => !Number.isNaN(v));
  const dirty =
    (Object.keys(initial) as (keyof typeof initial)[]).some((k) => initial[k] !== fields[k]) ||
    (photo?.kind === 'stored' ? photo.name : photo?.kind ?? null) !== (meal?.photoPath ?? null);

  function cancel() {
    if (!dirty) return onClose();
    Alert.alert('Discard this meal?', 'Your changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  }

  async function pick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera access is off',
          'Allow camera access in Settings to take meal photos. You can still save a meal without one.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setPhoto({ kind: 'picked', uri: asset.uri, width: asset.width, height: asset.height });
    }
  }

  function choosePhoto() {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Take photo', onPress: () => pick('camera') },
      { text: 'Choose from library', onPress: () => pick('library') },
    ];
    if (photo) buttons.push({ text: 'Remove photo', style: 'destructive', onPress: () => setPhoto(null) });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Meal photo', undefined, buttons);
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      let photoPath = photo?.kind === 'stored' ? photo.name : null;
      let photoFailed = false;
      if (photo?.kind === 'picked') {
        try {
          photoPath = await savePhoto(photo.uri, photo.width, photo.height);
        } catch {
          photoFailed = true;
          photoPath = meal?.photoPath ?? null;
        }
      }
      const input = {
        name: fields.name.trim() || null,
        photoPath,
        calories: values.calories,
        protein: values.protein,
        fat: values.fat,
        carbs: values.carbs,
      };
      if (meal) await updateMeal(db, meal.id, input);
      else await insertMeal(db, date, input);
      if (meal?.photoPath && meal.photoPath !== photoPath) deletePhoto(meal.photoPath);
      onChanged();
      onClose();
      if (photoFailed) {
        Alert.alert('Photo not saved', 'The meal was saved, but the photo could not be stored. Your device may be out of space.');
      }
    } catch (e) {
      Alert.alert('Could not save meal', String(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!meal) return;
    Alert.alert('Delete this meal?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(db, meal.id);
          if (meal.photoPath) deletePhoto(meal.photoPath);
          onChanged();
          onClose();
        },
      },
    ]);
  }

  const previewUri = photo?.kind === 'stored' ? photoUri(photo.name) : photo?.kind === 'picked' ? photo.uri : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cancel}>
      <KeyboardAvoidingView
        style={[styles.sheet, { paddingBottom: keyboardHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={cancel} hitSlop={12} style={styles.headerSide}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{editing ? 'Edit meal' : 'Add meal'}</Text>
          <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
            {editing && (
              <Pressable onPress={confirmDelete} hitSlop={12}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.photo} onPress={choosePhoto}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <>
                <View style={styles.photoIcon}>
                  <Ionicons name="camera-outline" size={24} color={colors.accentText} />
                </View>
                <Text style={styles.photoTitle}>Add a photo</Text>
                <Text style={styles.photoHint}>Take a photo or choose from library</Text>
              </>
            )}
          </Pressable>

          <Field label="NAME (OPTIONAL)" value={fields.name} onChangeText={set('name')} placeholder="e.g. Chicken rice bowl" maxLength={60} />
          <Field label="CALORIES" unit="kcal" value={fields.calories} onChangeText={set('calories')} keyboardType="number-pad" invalid={Number.isNaN(values.calories)} />
          <View style={styles.macroRow}>
            <Field label="PROTEIN" dot={colors.protein} unit="g" value={fields.protein} onChangeText={set('protein')} keyboardType="decimal-pad" invalid={Number.isNaN(values.protein)} />
            <Field label="FAT" dot={colors.fat} unit="g" value={fields.fat} onChangeText={set('fat')} keyboardType="decimal-pad" invalid={Number.isNaN(values.fat)} />
            <Field label="CARBS" dot={colors.carbs} unit="g" value={fields.carbs} onChangeText={set('carbs')} keyboardType="decimal-pad" invalid={Number.isNaN(values.carbs)} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.save, (!valid || saving) && styles.saveDisabled]}
            onPress={save}
            disabled={!valid || saving}
          >
            {saving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveLabel}>Save meal</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  dot?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  invalid?: boolean;
};

function Field({ label, value, onChangeText, unit, dot, placeholder, keyboardType, maxLength, invalid }: FieldProps) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      </View>
      <View style={[styles.input, invalid && { borderColor: colors.danger }]}>
        <TextInput
          style={styles.inputText}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {invalid && <Text style={styles.error}>That looks too high</Text>}
    </View>
  );
}

const makeStyles = (colors: Theme) => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: Platform.OS === 'ios' ? 20 : 48,
    paddingBottom: 12,
  },
  headerSide: { flex: 1 },
  cancel: { fontSize: 15, fontWeight: '500', color: colors.quiet },
  delete: { fontSize: 15, fontWeight: '600', color: colors.danger },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { paddingHorizontal: GUTTER, paddingBottom: 24 },
  photo: {
    height: 196,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
  },
  photoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginTop: 14 },
  photoHint: { fontSize: 13, fontWeight: '500', color: colors.quiet, marginTop: 4 },
  field: { flex: 1, marginTop: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.quiet, letterSpacing: 0.3 },
  dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 6 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 14,
  },
  inputText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink, paddingVertical: 0 },
  unit: { fontSize: 14, fontWeight: '500', color: colors.quiet, marginLeft: 6 },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
  macroRow: { flexDirection: 'row', gap: 12 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 36 },
  save: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.4 },
  saveLabel: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
});
