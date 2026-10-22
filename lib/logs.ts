import type { FoodLog } from "@prisma/client";
import { scaleNutrition, sumNutrition, type Nutrition } from "./nutrients";

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Meal = (typeof MEALS)[number];

export const MAX_SERVINGS = 20;

export function isMeal(v: unknown): v is Meal {
  return typeof v === "string" && (MEALS as readonly string[]).includes(v);
}

/** Servings must be > 0 and ≤ MAX_SERVINGS; stored rounded to 2 decimals. */
export function parseServings(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > MAX_SERVINGS) return null;
  return Math.round(n * 100) / 100;
}

export interface LogEntry {
  id: string;
  date: string;
  meal: Meal;
  servings: number;
  createdAt: string;
  foodId: number;
  name: string;
  schoolSlug: string;
  locationName: string;
  menuName: string;
  section: string | null;
  servingSizeAmount: string | null;
  servingSizeUnit: string | null;
  /** Per single serving. */
  nutrition: Nutrition;
  /** nutrition × servings */
  total: Nutrition;
  ingredients: string | null;
  icons: string[];
}

export function toEntry(row: FoodLog): LogEntry {
  const nutrition = JSON.parse(row.nutrition) as Nutrition;
  return {
    id: row.id,
    date: row.date,
    meal: isMeal(row.meal) ? row.meal : "snack",
    servings: row.servings,
    createdAt: row.createdAt.toISOString(),
    foodId: row.foodId,
    name: row.name,
    schoolSlug: row.schoolSlug,
    locationName: row.locationName,
    menuName: row.menuName,
    section: row.section,
    servingSizeAmount: row.servingSizeAmount,
    servingSizeUnit: row.servingSizeUnit,
    nutrition,
    total: scaleNutrition(nutrition, row.servings),
    ingredients: row.ingredients,
    icons: JSON.parse(row.icons) as string[],
  };
}

export function totalsOf(entries: LogEntry[]): Nutrition {
  return sumNutrition(entries.map((e) => e.total));
}
