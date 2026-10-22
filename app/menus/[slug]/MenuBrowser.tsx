"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DateNav from "@/components/DateNav";
import ItemSheet, { servingLabel } from "@/components/ItemSheet";
import Tags from "@/components/Tags";
import { api, defaultMeal } from "@/lib/client";
import { addDays, campusToday } from "@/lib/dates";
import { hoursFor } from "@/lib/hours";
import { formatAmount } from "@/lib/nutrients";
import type { MenuItem, MenuType } from "@/lib/nutrislice";
import type { DayMenu } from "@/lib/menus";
import type { Meal } from "@/lib/logs";

type Selected = { item: MenuItem; menuType: MenuType };

export default function MenuBrowser({ slug, initialDate, meal }: { slug: string; initialDate: string; meal: Meal | null }) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [menu, setMenu] = useState<DayMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [station, setStation] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<DayMenu>(`/api/menus/${slug}?date=${date}`)
      .then((m) => !cancelled && setMenu(m))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug, date]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const changeDate = useCallback(
    (d: string) => {
      setDate(d);
      const params = new URLSearchParams({ date: d, ...(meal ? { meal } : {}) });
      router.replace(`/menus/${slug}?${params}`, { scroll: false });
    },
    [router, slug, meal],
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!menu) return [];
    return menu.menus
      .filter((m) => station === "all" || m.menuType.id === station)
      .map((m) => ({
        ...m,
        sections: m.sections
          .map((s) => ({
            ...s,
            items: q ? s.items.filter((i) => i.name.toLowerCase().includes(q) || i.ingredients.toLowerCase().includes(q)) : s.items,
          }))
          .filter((s) => s.items.length > 0),
      }))
      .filter((m) => m.sections.length > 0);
  }, [menu, station, q]);

  const location = menu?.location;
  const hours = location ? hoursFor(location, date) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/menus?date=${date}`} className="text-sm text-brand-600 hover:underline">
            ← All locations
          </Link>
          <h1 className="text-2xl font-bold">{location?.name ?? "Menu"}</h1>
          {location ? (
            <p className="text-sm text-stone-600">
              {hours ?? "Not open this day"}
              {location.isDiningHall ? " · Self-serve buffet: choose how many servings you took" : ""}
            </p>
          ) : null}
        </div>
        <DateNav date={date} onChange={changeDate} max={addDays(campusToday(), 14)} />
      </div>

      {menu && menu.menus.length > 1 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: "all" as const, name: "All stations" }, ...menu.menus.map((m) => m.menuType)].map((mt) => (
            <button
              key={mt.id}
              onClick={() => setStation(mt.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${
                station === mt.id ? "border-brand-500 bg-brand-500 text-white" : "border-stone-300 bg-white hover:bg-stone-100"
              }`}
            >
              {mt.name}
            </button>
          ))}
        </div>
      ) : null}

      {menu && menu.menus.length > 0 ? (
        <input
          type="search"
          className="input w-full"
          placeholder="Search this menu (e.g. chicken, oat milk)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      ) : null}

      {loading ? <p className="card p-6 text-center text-stone-500">Loading menu…</p> : null}
      {error ? <p className="card p-4 text-red-700">{error}</p> : null}
      {!loading && menu?.incomplete ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Some stations couldn&apos;t be loaded from Nutrislice right now, so this menu may be incomplete.
        </p>
      ) : null}
      {!loading && menu && menu.menus.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">No menu posted for this day</p>
          <p className="text-sm text-stone-600">This location may be closed. Try another day or location.</p>
        </div>
      ) : null}
      {!loading && menu && menu.menus.length > 0 && visible.length === 0 ? (
        <p className="card p-6 text-center text-stone-500">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : null}

      {!loading &&
        visible.map((m) => (
          <section key={m.menuType.id} className="card overflow-hidden">
            <h2 className="border-b border-stone-200 bg-stone-50 px-4 py-2 font-semibold">{m.menuType.name}</h2>
            {m.sections.map((s, si) => (
              <div key={si}>
                {s.title && s.title !== m.menuType.name ? (
                  <h3 className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-500">{s.title}</h3>
                ) : null}
                <ul className="divide-y divide-stone-100">
                  {s.items.map((item, ii) => (
                    <li key={`${item.foodId}-${ii}`}>
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                        onClick={() => setSelected({ item, menuType: m.menuType })}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-stone-600">
                            {item.hasNutrition ? (
                              <>
                                P {formatAmount(item.nutrition.g_protein, "g")} · C {formatAmount(item.nutrition.g_carbs, "g")} · F{" "}
                                {formatAmount(item.nutrition.g_fat, "g")}
                              </>
                            ) : (
                              "No nutrition info"
                            )}
                            {servingLabel(item.servingSizeAmount, item.servingSizeUnit)
                              ? ` · per ${servingLabel(item.servingSizeAmount, item.servingSizeUnit)}`
                              : ""}
                          </div>
                          {item.icons.length ? (
                            <div className="mt-1">
                              <Tags icons={item.icons} showAllergens={false} />
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold tabular-nums">{formatAmount(item.nutrition.calories)}</div>
                          <div className="text-xs text-stone-500">cal</div>
                        </div>
                        <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-lg text-brand-600">
                          +
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

      {selected && location ? (
        <ItemSheet
          item={selected.item}
          menuType={selected.menuType}
          schoolSlug={location.slug}
          locationName={location.name}
          isDiningHall={location.isDiningHall}
          date={date}
          initialMeal={meal ?? (date === campusToday() ? defaultMeal() : "lunch")}
          onClose={() => setSelected(null)}
          onAdded={(msg) => {
            setSelected(null);
            setToast(msg);
          }}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-16 z-50 sm:bottom-4 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
            <Link href={`/?date=${date}`} className="font-semibold text-brand-100 underline">
              View log
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
