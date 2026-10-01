import type { SQLiteDatabase } from 'expo-sqlite';

export type Meal = {
  id: string;
  date: string; // YYYY-MM-DD, local
  loggedAt: string; // ISO timestamp
  name: string | null;
  photoPath: string | null; // file name in the photos directory, see photos.ts
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt: string;
  updatedAt: string;
};

export type MealInput = Pick<Meal, 'name' | 'photoPath' | 'calories' | 'protein' | 'fat' | 'carbs'>;

export type Totals = Pick<Meal, 'calories' | 'protein' | 'fat' | 'carbs'>;

export const DB_NAME = 'snacktrack.db';

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      loggedAt TEXT NOT NULL,
      name TEXT,
      photoPath TEXT,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      fat REAL NOT NULL,
      carbs REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals (date);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

export function newId(): string {
  // RFC 4122 v4 shape; good enough for local-only ids.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getMealsForDay(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<Meal>('SELECT * FROM meals WHERE date = ? ORDER BY loggedAt DESC', date);
}

export async function insertMeal(db: SQLiteDatabase, date: string, input: MealInput, id = newId()) {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO meals (id, date, loggedAt, name, photoPath, calories, protein, fat, carbs, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, date, now, input.name, input.photoPath,
    input.calories, input.protein, input.fat, input.carbs, now, now,
  );
}

export async function updateMeal(db: SQLiteDatabase, id: string, input: MealInput) {
  await db.runAsync(
    `UPDATE meals SET name = ?, photoPath = ?, calories = ?, protein = ?, fat = ?, carbs = ?, updatedAt = ?
     WHERE id = ?`,
    input.name, input.photoPath, input.calories, input.protein, input.fat, input.carbs,
    new Date().toISOString(), id,
  );
}

export async function deleteMeal(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM meals WHERE id = ?', id);
}

export function sumTotals(meals: Meal[]): Totals {
  return meals.reduce(
    (t, m) => ({
      calories: t.calories + m.calories,
      protein: t.protein + m.protein,
      fat: t.fat + m.fat,
      carbs: t.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}
