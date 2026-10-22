// Client + parser for Stony Brook's public Nutrislice API (the data behind stonybrook.nutrislice.com).
import { pickNutrition, type Nutrition } from "./nutrients";

export const NUTRISLICE_BASE = "https://stonybrook.api.nutrislice.com/menu/api";

/** Self-serve buffets where students pick how many servings they took. */
export const DINING_HALL_SLUGS = new Set(["east-side-dining", "west-side-dining"]);

export interface MenuType {
  id: number;
  slug: string;
  name: string;
}

export interface DayHours {
  enabled: boolean;
  start: string; // HH:MM:SS
  end: string;
  is24h: boolean;
}

export interface Location {
  id: number;
  slug: string;
  name: string;
  address: string;
  logo: string | null;
  isDiningHall: boolean;
  menuTypes: MenuType[];
  /** Indexed by day of week, 0 = Sunday. */
  hours: DayHours[];
  operatingStartDate: string | null;
  operatingEndDate: string | null;
}

export interface MenuItem {
  foodId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number | null;
  servingSizeAmount: string | null;
  servingSizeUnit: string | null;
  hasNutrition: boolean;
  nutrition: Nutrition;
  ingredients: string;
  icons: string[];
}

export interface MenuSection {
  title: string | null;
  items: MenuItem[];
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(NUTRISLICE_BASE + path, {
    headers: { Accept: "application/json", "User-Agent": "SBNutrition (student nutrition tracker)" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Nutrislice ${path} -> HTTP ${res.status}`);
  return res.json();
}

type Raw = Record<string, any>;

export function parseLocations(raw: unknown): Location[] {
  if (!Array.isArray(raw)) throw new Error("Unexpected Nutrislice schools payload");
  return raw.map((s: Raw) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    address: s.address ?? "",
    logo: s.logo || null,
    isDiningHall: DINING_HALL_SLUGS.has(s.slug),
    menuTypes: (s.active_menu_types ?? []).map((m: Raw) => ({ id: m.id, slug: m.slug, name: m.name })),
    hours: DAYS.map((d) => ({
      enabled: Boolean(s[`${d}_enabled`]),
      start: s[`${d}_start`] ?? "00:00:00",
      end: s[`${d}_end`] ?? "00:00:00",
      is24h: Boolean(s[`${d}_is_24_hours`]),
    })),
    operatingStartDate: s.operating_start_date ?? null,
    operatingEndDate: s.operating_end_date ?? null,
  }));
}

export function parseFood(food: Raw): MenuItem {
  const amount = food.serving_size_info?.serving_size_amount;
  const price = typeof food.price === "number" ? food.price : food.price ? Number(food.price) : null;
  return {
    foodId: food.id,
    name: String(food.name ?? "").trim(),
    description: food.description ?? "",
    imageUrl: food.image_url || null,
    price: price != null && Number.isFinite(price) ? price : null,
    servingSizeAmount: amount != null && amount !== "" ? String(amount) : null,
    servingSizeUnit: food.serving_size_info?.serving_size_unit || null,
    hasNutrition: Boolean(food.has_nutrition_info),
    nutrition: pickNutrition(food.rounded_nutrition_info),
    ingredients: (food.ingredients || food.synced_ingredients || "").trim(),
    icons: (food.icons?.food_icons ?? []).filter((i: Raw) => i.enabled !== false).map((i: Raw) => i.name as string),
  };
}

/** Groups one day's flat menu_items list into sections, using section-title rows as headers. */
export function parseDayItems(menuItems: Raw[]): MenuSection[] {
  const sections: MenuSection[] = [];
  let current: MenuSection | null = null;
  for (const row of menuItems) {
    if (row.is_section_title || row.is_station_header) {
      current = { title: (row.text || "").trim() || null, items: [] };
      sections.push(current);
    } else if (row.food) {
      if (!current) {
        current = { title: null, items: [] };
        sections.push(current);
      }
      current.items.push(parseFood(row.food));
    }
  }
  return sections.filter((s) => s.items.length > 0);
}

/** Returns sections for every day of the Sun–Sat week containing `date`. A day with no items means no menu (closed). */
export function parseWeek(raw: unknown): { date: string; sections: MenuSection[] }[] {
  const days = (raw as Raw)?.days;
  if (!Array.isArray(days)) throw new Error("Unexpected Nutrislice week payload");
  return days.map((d: Raw) => ({ date: d.date, sections: parseDayItems(d.menu_items ?? []) }));
}

export async function fetchLocations(): Promise<Location[]> {
  return parseLocations(await getJson("/schools/"));
}

export async function fetchWeek(schoolId: number, menuTypeId: number, date: string) {
  const [y, m, d] = date.split("-");
  return parseWeek(await getJson(`/weeks/school/${schoolId}/menu-type/${menuTypeId}/${y}/${m}/${d}/`));
}
