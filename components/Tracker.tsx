"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, MEAL_LABELS } from "@/lib/client";
import { addDays, campusToday } from "@/lib/dates";
import { MEALS, type LogEntry, type Meal } from "@/lib/logs";
import { formatAmount, scaleNutrition, type Nutrition } from "@/lib/nutrients";
import DateNav from "./DateNav";
import { servingLabel } from "./ItemSheet";
import NutritionLabel from "./NutritionLabel";
import ServingsInput, { formatServings } from "./ServingsInput";
import Tags from "./Tags";

type Goals = { calorieGoal: number | null; proteinGoal: number | null; carbGoal: number | null; fatGoal: number | null };

function Progress({ label, value, goal, unit }: { label: string; value: number; goal: number | null; unit: string }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  const over = goal != null && value > goal;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-stone-700">
          {formatAmount(value)}
          {goal ? <span className="text-stone-500"> / {goal}</span> : null} {unit}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-200">
        {goal ? (
          <div className={`h-full rounded-full ${over ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
        ) : null}
      </div>
    </div>
  );
}

function EntryRow({ entry, onChanged }: { entry: LogEntry; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [servings, setServings] = useState(entry.servings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serving = servingLabel(entry.servingSizeAmount, entry.servingSizeUnit);

  async function save(patch: { servings?: number; meal?: Meal }) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/logs/${entry.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${entry.name} from your log?`)) return;
    setBusy(true);
    try {
      await api(`/api/logs/${entry.id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <li>
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{entry.name}</div>
          <div className="text-xs text-stone-600">
            {formatServings(entry.servings)} serving{entry.servings === 1 ? "" : "s"}
            {serving ? ` × ${serving}` : ""} · {entry.locationName} · {entry.menuName}
          </div>
          <div className="text-xs text-stone-500">
            P {formatAmount(entry.total.g_protein, "g")} · C {formatAmount(entry.total.g_carbs, "g")} · F {formatAmount(entry.total.g_fat, "g")}
          </div>
        </div>
        <div className="text-right font-semibold tabular-nums">{formatAmount(entry.total.calories)}</div>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-stone-100 bg-stone-50 px-4 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="mb-1 text-xs font-medium text-stone-600">Servings</div>
              <ServingsInput value={servings} onChange={setServings} />
            </div>
            <button className="btn-primary" disabled={busy || servings === entry.servings} onClick={() => save({ servings })}>
              Save
            </button>
            <select
              className="input py-2"
              value={entry.meal}
              disabled={busy}
              aria-label="Move to meal"
              onChange={(e) => save({ meal: e.target.value as Meal })}
            >
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </select>
            <button className="btn-ghost text-red-700" disabled={busy} onClick={remove}>
              Remove
            </button>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Tags icons={entry.icons} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NutritionLabel
              nutrition={scaleNutrition(entry.nutrition, servings)}
              title={`${formatServings(servings)} serving${servings === 1 ? "" : "s"}${serving ? ` (${serving} each)` : ""}`}
            />
            <div>
              <h4 className="text-sm font-semibold">Ingredients</h4>
              <p className="mt-1 text-sm text-stone-700">{entry.ingredients || "Not listed."}</p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function Tracker({ initialDate }: { initialDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<{ entries: LogEntry[]; totals: Nutrition } | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ entries: LogEntry[]; totals: Nutrition }>(`/api/logs?date=${date}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [date]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  useEffect(() => {
    api<{ goals: Goals }>("/api/goals").then((g) => setGoals(g.goals)).catch(() => {});
  }, []);

  const changeDate = (d: string) => {
    setDate(d);
    router.replace(d === campusToday() ? "/" : `/?date=${d}`, { scroll: false });
  };

  const t = data?.totals ?? {};
  const byMeal = (m: Meal) => data?.entries.filter((e) => e.meal === m) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Daily log</h1>
        <DateNav date={date} onChange={changeDate} max={addDays(campusToday(), 7)} />
      </div>

      {error ? <p className="card p-4 text-red-700">{error}</p> : null}

      <section className="card grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="text-center sm:pr-6">
          <div className="text-4xl font-extrabold tabular-nums">{formatAmount(t.calories ?? 0)}</div>
          <div className="text-sm text-stone-600">
            calories{goals?.calorieGoal ? ` of ${goals.calorieGoal}` : ""}
          </div>
          {goals?.calorieGoal ? (
            <div className="text-xs text-stone-500">
              {(t.calories ?? 0) <= goals.calorieGoal
                ? `${Math.round(goals.calorieGoal - (t.calories ?? 0))} left`
                : `${Math.round((t.calories ?? 0) - goals.calorieGoal)} over`}
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          <Progress label="Calories" value={t.calories ?? 0} goal={goals?.calorieGoal ?? null} unit="kcal" />
          <Progress label="Protein" value={t.g_protein ?? 0} goal={goals?.proteinGoal ?? null} unit="g" />
          <Progress label="Carbs" value={t.g_carbs ?? 0} goal={goals?.carbGoal ?? null} unit="g" />
          <Progress label="Fat" value={t.g_fat ?? 0} goal={goals?.fatGoal ?? null} unit="g" />
          {goals && !goals.calorieGoal ? (
            <Link href="/settings" className="text-xs text-brand-600 underline">
              Set daily goals
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {MEALS.map((m) => {
            const entries = byMeal(m);
            const kcal = entries.reduce((s, e) => s + (e.total.calories ?? 0), 0);
            return (
              <section key={m} className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2">
                  <h2 className="font-semibold">
                    {MEAL_LABELS[m]}
                    {entries.length ? <span className="ml-2 text-sm font-normal text-stone-500">{Math.round(kcal)} cal</span> : null}
                  </h2>
                  <Link href={`/menus?date=${date}&meal=${m}`} className="btn-ghost py-1 text-brand-600">
                    + Add food
                  </Link>
                </div>
                {entries.length ? (
                  <ul className="divide-y divide-stone-100">
                    {entries.map((e) => (
                      <EntryRow key={`${e.id}-${e.servings}-${e.meal}`} entry={e} onChanged={load} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-stone-500">{data ? "Nothing logged." : "Loading…"}</p>
                )}
              </section>
            );
          })}
        </div>
        <aside className="space-y-2">
          <h2 className="font-semibold">Day totals</h2>
          <NutritionLabel nutrition={t} />
        </aside>
      </div>
    </div>
  );
}
