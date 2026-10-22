// Caches Nutrislice data in the database and keeps it fresh.
//
// Freshness rules:
//  - The location list and any menu for yesterday onward are refetched once they are older than STALE_MS.
//  - Menus for dates before yesterday are kept as-is once fetched (they no longer change).
//  - If Nutrislice is unreachable, the last cached copy is served.
// A scheduled job (/api/cron/sync or `npm run sync`) pre-warms this week and next week, so the
// on-demand path is only a fallback.
import { prisma } from "./db";
import { addDays, campusToday } from "./dates";
import {
  fetchLocations,
  fetchWeek,
  type Location,
  type MenuItem,
  type MenuSection,
  type MenuType,
} from "./nutrislice";

export const STALE_MS = 6 * 60 * 60 * 1000;
const CONCURRENCY = 6;
const LOCATIONS_KEY = "locations";

export interface LocationMenu {
  menuType: MenuType;
  sections: MenuSection[];
}

export interface DayMenu {
  location: Location;
  date: string;
  menus: LocationMenu[];
  /** True when some menus could not be fetched and nothing was cached for them. */
  incomplete: boolean;
}

async function pool<T>(tasks: (() => Promise<T>)[], limit = CONCURRENCY): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export function isStale(fetchedAt: Date, date: string, now = new Date()): boolean {
  if (date < addDays(campusToday(now), -1)) return false;
  return now.getTime() - fetchedAt.getTime() > STALE_MS;
}

export async function getLocations(opts: { force?: boolean } = {}): Promise<Location[]> {
  const cached = await prisma.cacheEntry.findUnique({ where: { key: LOCATIONS_KEY } });
  const fresh = cached && Date.now() - cached.fetchedAt.getTime() < STALE_MS;
  if (cached && fresh && !opts.force) return JSON.parse(cached.value);
  try {
    const locations = await fetchLocations();
    const value = JSON.stringify(locations);
    await prisma.cacheEntry.upsert({
      where: { key: LOCATIONS_KEY },
      create: { key: LOCATIONS_KEY, value, fetchedAt: new Date() },
      update: { value, fetchedAt: new Date() },
    });
    return locations;
  } catch (err) {
    if (cached) {
      console.warn("Using cached locations; Nutrislice fetch failed:", err);
      return JSON.parse(cached.value);
    }
    throw err;
  }
}

export async function getLocation(slug: string): Promise<Location | null> {
  return (await getLocations()).find((l) => l.slug === slug) ?? null;
}

/** Fetches the Sun–Sat week containing `date` for one menu type and stores every day. */
async function refreshWeek(schoolId: number, menuTypeId: number, date: string) {
  const days = await fetchWeek(schoolId, menuTypeId, date);
  const fetchedAt = new Date();
  await prisma.$transaction(
    days.map((d) =>
      prisma.menuDay.upsert({
        where: { schoolId_menuTypeId_date: { schoolId, menuTypeId, date: d.date } },
        create: { schoolId, menuTypeId, date: d.date, items: JSON.stringify(d.sections), fetchedAt },
        update: { items: JSON.stringify(d.sections), fetchedAt },
      }),
    ),
  );
  return days;
}

export async function getDayMenu(location: Location, date: string): Promise<DayMenu> {
  const rows = await prisma.menuDay.findMany({ where: { schoolId: location.id, date } });
  const byType = new Map(rows.map((r) => [r.menuTypeId, r]));

  const toRefresh = location.menuTypes.filter((mt) => {
    const row = byType.get(mt.id);
    return !row || isStale(row.fetchedAt, date);
  });

  const refreshed = new Map<number, MenuSection[]>();
  const results = await pool(toRefresh.map((mt) => () => refreshWeek(location.id, mt.id, date)));
  results.forEach((r, i) => {
    const mt = toRefresh[i];
    if (r.status === "fulfilled") {
      refreshed.set(mt.id, r.value.find((d) => d.date === date)?.sections ?? []);
    } else {
      console.warn(`Menu fetch failed for ${location.slug}/${mt.slug} ${date}:`, r.reason);
    }
  });

  let incomplete = false;
  const menus: LocationMenu[] = [];
  for (const mt of location.menuTypes) {
    let sections = refreshed.get(mt.id);
    if (!sections) {
      const row = byType.get(mt.id);
      if (row) sections = JSON.parse(row.items) as MenuSection[];
      else incomplete = true;
    }
    if (sections && sections.length > 0) menus.push({ menuType: mt, sections });
  }
  return { location, date, menus, incomplete };
}

export interface FoundItem {
  location: Location;
  menuType: MenuType;
  section: string | null;
  item: MenuItem;
}

/** Looks a food up in the (cached) menu so logged nutrition always comes from Nutrislice, not the client. */
export async function findMenuItem(
  schoolSlug: string,
  menuTypeId: number,
  date: string,
  foodId: number,
): Promise<FoundItem | null> {
  const location = await getLocation(schoolSlug);
  if (!location) return null;
  const menu = await getDayMenu(location, date);
  const m = menu.menus.find((x) => x.menuType.id === menuTypeId);
  for (const section of m?.sections ?? []) {
    const item = section.items.find((i) => i.foodId === foodId);
    if (item) return { location, menuType: m!.menuType, section: section.title, item };
  }
  return null;
}

export interface SyncResult {
  locations: number;
  weeksFetched: number;
  failures: string[];
  startedAt: string;
  durationMs: number;
}

/** Refreshes the location list plus this week and next week for every menu at every location. */
export async function syncAllMenus(): Promise<SyncResult> {
  const started = Date.now();
  const locations = await getLocations({ force: true });
  const today = campusToday();
  const jobs: { label: string; run: () => Promise<unknown> }[] = [];
  for (const loc of locations) {
    for (const mt of loc.menuTypes) {
      for (const date of [today, addDays(today, 7)]) {
        jobs.push({ label: `${loc.slug}/${mt.slug}@${date}`, run: () => refreshWeek(loc.id, mt.id, date) });
      }
    }
  }
  const results = await pool(jobs.map((j) => j.run));
  const failures = results.flatMap((r, i) => (r.status === "rejected" ? [`${jobs[i].label}: ${String(r.reason)}`] : []));
  return {
    locations: locations.length,
    weeksFetched: results.length - failures.length,
    failures,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
  };
}
