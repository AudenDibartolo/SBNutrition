// Every nutrient field Nutrislice reports, with display metadata and FDA Daily Values.
export type NutrientKey =
  | "calories"
  | "g_fat"
  | "g_saturated_fat"
  | "g_trans_fat"
  | "mg_cholesterol"
  | "mg_sodium"
  | "g_carbs"
  | "g_fiber"
  | "g_sugar"
  | "g_added_sugar"
  | "g_protein"
  | "mg_vitamin_c"
  | "iu_vitamin_a"
  | "re_vitamin_a"
  | "mcg_vitamin_a"
  | "mg_vitamin_d"
  | "mcg_vitamin_d"
  | "mg_calcium"
  | "mg_iron"
  | "mg_potassium";

export type Nutrition = Partial<Record<NutrientKey, number | null>>;

export interface NutrientInfo {
  key: NutrientKey;
  label: string;
  unit: string;
  /** FDA Daily Value for adults, in `unit`. */
  dv?: number;
  /** Indented under its parent on a nutrition label. */
  sub?: boolean;
  group: "macro" | "vitamin" | "mineral";
}

export const NUTRIENTS: NutrientInfo[] = [
  { key: "calories", label: "Calories", unit: "kcal", dv: 2000, group: "macro" },
  { key: "g_fat", label: "Total Fat", unit: "g", dv: 78, group: "macro" },
  { key: "g_saturated_fat", label: "Saturated Fat", unit: "g", dv: 20, sub: true, group: "macro" },
  { key: "g_trans_fat", label: "Trans Fat", unit: "g", sub: true, group: "macro" },
  { key: "mg_cholesterol", label: "Cholesterol", unit: "mg", dv: 300, group: "macro" },
  { key: "mg_sodium", label: "Sodium", unit: "mg", dv: 2300, group: "macro" },
  { key: "g_carbs", label: "Total Carbohydrates", unit: "g", dv: 275, group: "macro" },
  { key: "g_fiber", label: "Dietary Fiber", unit: "g", dv: 28, sub: true, group: "macro" },
  { key: "g_sugar", label: "Total Sugars", unit: "g", sub: true, group: "macro" },
  { key: "g_added_sugar", label: "Added Sugars", unit: "g", dv: 50, sub: true, group: "macro" },
  { key: "g_protein", label: "Protein", unit: "g", dv: 50, group: "macro" },
  { key: "mcg_vitamin_a", label: "Vitamin A", unit: "mcg RAE", dv: 900, group: "vitamin" },
  { key: "re_vitamin_a", label: "Vitamin A", unit: "RE", group: "vitamin" },
  { key: "iu_vitamin_a", label: "Vitamin A", unit: "IU", group: "vitamin" },
  { key: "mg_vitamin_c", label: "Vitamin C", unit: "mg", dv: 90, group: "vitamin" },
  { key: "mcg_vitamin_d", label: "Vitamin D", unit: "mcg", dv: 20, group: "vitamin" },
  // Nutrislice calls this field "mg" but its values (up to ~90) don't fit that unit, so no %DV is computed.
  { key: "mg_vitamin_d", label: "Vitamin D", unit: "mg", group: "vitamin" },
  { key: "mg_calcium", label: "Calcium", unit: "mg", dv: 1300, group: "mineral" },
  { key: "mg_iron", label: "Iron", unit: "mg", dv: 18, group: "mineral" },
  { key: "mg_potassium", label: "Potassium", unit: "mg", dv: 4700, group: "mineral" },
];

export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key);

/** Picks the known nutrient fields out of a raw Nutrislice object; anything non-numeric becomes null. */
export function pickNutrition(raw: Record<string, unknown> | null | undefined): Nutrition {
  const out: Nutrition = {};
  for (const key of NUTRIENT_KEYS) {
    const v = raw?.[key];
    out[key] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

/** Multiplies every reported value by `factor`; unreported (null) values stay null. */
export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  const out: Nutrition = {};
  for (const key of NUTRIENT_KEYS) {
    const v = n[key];
    out[key] = v == null ? null : v * factor;
  }
  return out;
}

/** Sums nutrition objects. A total is null only if no item reported that nutrient. */
export function sumNutrition(list: Nutrition[]): Nutrition {
  const out: Nutrition = {};
  for (const key of NUTRIENT_KEYS) {
    let total: number | null = null;
    for (const n of list) {
      const v = n[key];
      if (v != null) total = (total ?? 0) + v;
    }
    out[key] = total;
  }
  return out;
}

/** Nutrients that should be shown: those with at least one reported value. */
export function reportedNutrients(n: Nutrition): NutrientInfo[] {
  return NUTRIENTS.filter((info) => n[info.key] != null);
}

export function round(v: number): number {
  return v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
}

/** "22g", "410mg", "1.8 IU"; calories are shown as a bare number. */
export function formatAmount(v: number | null | undefined, unit?: string): string {
  if (v == null) return "—";
  const r = round(v);
  if (!unit || unit === "kcal") return String(r);
  return /^(g|mg|mcg)$/.test(unit) ? `${r}${unit}` : `${r} ${unit}`;
}

export function percentDV(info: NutrientInfo, v: number | null | undefined): number | null {
  if (v == null || !info.dv) return null;
  return Math.round((v / info.dv) * 100);
}

const ALLERGENS = new Set(["Milk", "Egg", "Fish", "Shellfish", "Peanuts", "Tree Nuts", "Wheat", "Soy", "Sesame", "Contains Gluten", "Gluten"]);

/** Splits Nutrislice food icons into allergens and other tags (Vegan, Halal, Eat Well, …). */
export function splitIcons(icons: string[]): { allergens: string[]; tags: string[] } {
  return {
    allergens: icons.filter((i) => ALLERGENS.has(i)),
    tags: icons.filter((i) => !ALLERGENS.has(i)),
  };
}
