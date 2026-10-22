"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { addDays, campusToday } from "@/lib/dates";
import type { LogEntry, MealWithEntries } from "@/lib/logs";
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

type MealOption = { id: string; name: string };

function EntryRow({ entry, meals, onChanged }: { entry: LogEntry; meals: MealOption[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [servings, setServings] = useState(entry.servings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serving = servingLabel(entry.servingSizeAmount, entry.servingSizeUnit);

  async function save(patch: { servings?: number; mealId?: string }) {
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
            {meals.length > 1 ? (
              <select
                className="input py-2"
                value={entry.mealId}
                disabled={busy}
                aria-label="Move to meal"
                onChange={(e) => save({ mealId: e.target.value })}
              >
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === entry.mealId ? `In ${m.name}` : `Move to ${m.name}`}
                  </option>
                ))}
              </select>
            ) : null}
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

function MealCard({
  meal,
  meals,
  date,
  onChanged,
}: {
  meal: MealWithEntries;
  meals: MealOption[];
  date: string;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(meal.name);
  const [error, setError] = useState<string | null>(null);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/meals/${meal.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setRenaming(false);
      setError(null);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove() {
    const what = meal.entries.length ? ` and the ${meal.entries.length} food${meal.entries.length === 1 ? "" : "s"} in it` : "";
    if (!confirm(`Delete "${meal.name}"${what}?`)) return;
    try {
      await api(`/api/meals/${meal.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-4 py-2">
        {renaming ? (
          <form onSubmit={rename} className="flex min-w-0 flex-1 gap-2">
            <input
              autoFocus
              className="input min-w-0 flex-1 py-1.5"
              maxLength={60}
              value={name}
              aria-label="Meal name"
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn-primary py-1.5" type="submit" disabled={!name.trim()}>
              Save
            </button>
            <button
              className="btn-ghost py-1.5"
              type="button"
              onClick={() => {
                setRenaming(false);
                setName(meal.name);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h2 className="min-w-0 font-semibold">
              {meal.name}
              {meal.entries.length ? (
                <span className="ml-2 text-sm font-normal text-stone-500">{Math.round(meal.totals.calories ?? 0)} cal</span>
              ) : null}
            </h2>
            <div className="flex items-center">
              <button className="btn-ghost py-1 text-xs" onClick={() => setRenaming(true)}>
                Rename
              </button>
              <button className="btn-ghost py-1 text-xs text-red-700" onClick={remove}>
                Delete
              </button>
              <Link href={`/menus?date=${date}&meal=${meal.id}`} className="btn-ghost py-1 text-brand-600">
                + Add food
              </Link>
            </div>
          </>
        )}
      </div>
      {error ? <p className="px-4 pt-2 text-sm text-red-700">{error}</p> : null}
      {meal.entries.length ? (
        <ul className="divide-y divide-stone-100">
          {meal.entries.map((e) => (
            <EntryRow key={`${e.id}-${e.servings}-${e.mealId}`} entry={e} meals={meals} onChanged={onChanged} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-stone-500">Nothing added yet.</p>
      )}
    </section>
  );
}

function NewMealForm({ date, count, onCreated }: { date: string; count: number; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/meals", { method: "POST", body: JSON.stringify({ date, name }) });
      setName("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="card flex flex-wrap items-center gap-2 border-dashed p-3">
      <input
        className="input min-w-0 flex-1"
        maxLength={60}
        placeholder={count ? "Name a new meal" : "Meal name, e.g. Lunch"}
        value={name}
        aria-label="New meal name"
        onChange={(e) => setName(e.target.value)}
      />
      <button className="btn-primary" type="submit" disabled={busy || !name.trim()}>
        + Create meal
      </button>
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

export default function Tracker({ initialDate }: { initialDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<{ meals: MealWithEntries[]; totals: Nutrition } | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ meals: MealWithEntries[]; totals: Nutrition }>(`/api/logs?date=${date}`)
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
  const meals = data?.meals ?? [];
  const mealOptions = meals.map((m) => ({ id: m.id, name: m.name }));

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
          {!data ? <p className="card p-4 text-sm text-stone-500">Loading…</p> : null}
          {data && meals.length === 0 ? (
            <p className="text-sm text-stone-600">
              No meals yet for this day. Create one below, call it whatever you like, then add food to it.
            </p>
          ) : null}
          {meals.map((m) => (
            <MealCard key={`${m.id}-${m.name}`} meal={m} meals={mealOptions} date={date} onChanged={load} />
          ))}
          {data ? <NewMealForm date={date} count={meals.length} onCreated={load} /> : null}
        </div>
        {meals.some((m) => m.entries.length) ? (
          <aside className="space-y-2">
            <h2 className="font-semibold">Day totals</h2>
            <NutritionLabel nutrition={t} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
