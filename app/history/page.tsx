"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BarChart from "@/components/BarChart";
import { api } from "@/lib/client";
import { addDays, campusToday, formatShortDate } from "@/lib/dates";
import { NUTRIENTS, formatAmount, percentDV, sumNutrition, scaleNutrition, type NutrientKey, type Nutrition } from "@/lib/nutrients";

type Day = { date: string; entryCount: number; totals: Nutrition };
type Goals = { calorieGoal: number | null; proteinGoal: number | null; carbGoal: number | null; fatGoal: number | null };

const RANGES = [
  { days: 7, label: "Week" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const METRICS: { key: NutrientKey; goal?: keyof Goals }[] = [
  { key: "calories", goal: "calorieGoal" },
  { key: "g_protein", goal: "proteinGoal" },
  { key: "g_carbs", goal: "carbGoal" },
  { key: "g_fat", goal: "fatGoal" },
  { key: "g_fiber" },
  { key: "g_sugar" },
  { key: "mg_sodium" },
];

export default function HistoryPage() {
  const today = campusToday();
  const [rangeDays, setRangeDays] = useState(7);
  const [end, setEnd] = useState(today);
  const [metric, setMetric] = useState<NutrientKey>("calories");
  const [days, setDays] = useState<Day[] | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = addDays(end, -(rangeDays - 1));

  useEffect(() => {
    setDays(null);
    api<{ days: Day[] }>(`/api/history?from=${start}&to=${end}`)
      .then((d) => setDays(d.days))
      .catch((e) => setError(e.message));
  }, [start, end]);

  useEffect(() => {
    api<{ goals: Goals }>("/api/goals").then((g) => setGoals(g.goals)).catch(() => {});
  }, []);

  const logged = useMemo(() => (days ?? []).filter((d) => d.entryCount > 0), [days]);
  const totals = useMemo(() => sumNutrition(logged.map((d) => d.totals)), [logged]);
  const avg = useMemo(() => (logged.length ? scaleNutrition(totals, 1 / logged.length) : {}), [totals, logged]);

  const info = NUTRIENTS.find((n) => n.key === metric)!;
  const metricGoal = METRICS.find((m) => m.key === metric)?.goal;
  const goal = metricGoal && goals ? goals[metricGoal] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">History</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-stone-300 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`rounded-md px-3 py-1.5 text-sm ${rangeDays === r.days ? "bg-brand-500 text-white" : "hover:bg-stone-100"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="btn-secondary px-2.5" aria-label="Earlier" onClick={() => setEnd(addDays(end, -rangeDays))}>
            ‹
          </button>
          <span className="text-sm tabular-nums">
            {formatShortDate(start)} – {formatShortDate(end)}
          </span>
          <button
            className="btn-secondary px-2.5"
            aria-label="Later"
            disabled={end >= today}
            onClick={() => setEnd(addDays(end, rangeDays) > today ? today : addDays(end, rangeDays))}
          >
            ›
          </button>
        </div>
      </div>

      {error ? <p className="card p-4 text-red-700">{error}</p> : null}

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            {info.label} per day <span className="font-normal text-stone-500">({info.unit})</span>
          </h2>
          <select className="input py-1.5" value={metric} onChange={(e) => setMetric(e.target.value as NutrientKey)} aria-label="Metric">
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {NUTRIENTS.find((n) => n.key === m.key)!.label}
              </option>
            ))}
          </select>
        </div>
        {days ? (
          <BarChart bars={days.map((d) => ({ date: d.date, value: d.totals[metric] ?? null }))} goal={goal} unit={info.unit} label={info.label} />
        ) : (
          <div className="h-[220px] animate-pulse rounded-lg bg-stone-100" />
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-stone-200 bg-stone-50 px-4 py-2 font-semibold">
            Daily average <span className="font-normal text-stone-500">over {logged.length} logged day{logged.length === 1 ? "" : "s"}</span>
          </h2>
          {logged.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nutrient</th>
                  <th className="px-2 py-2 text-right font-medium">Avg / day</th>
                  <th className="px-2 py-2 text-right font-medium">% DV</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {NUTRIENTS.filter((n) => totals[n.key] != null).map((n) => {
                  const pct = percentDV(n, avg[n.key]);
                  return (
                    <tr key={n.key}>
                      <td className={`px-4 py-1.5 ${n.sub ? "pl-8 text-stone-700" : ""}`}>{n.label}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatAmount(avg[n.key], n.unit)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-stone-600">{pct != null ? `${pct}%` : ""}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-stone-600">{formatAmount(totals[n.key], n.unit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-stone-500">{days ? "Nothing logged in this period." : "Loading…"}</p>
          )}
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-stone-200 bg-stone-50 px-4 py-2 font-semibold">Days</h2>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 text-right font-medium">Cal</th>
                  <th className="px-2 py-2 text-right font-medium">Protein</th>
                  <th className="px-2 py-2 text-right font-medium">Carbs</th>
                  <th className="px-4 py-2 text-right font-medium">Fat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[...(days ?? [])].reverse().map((d) => (
                  <tr key={d.date} className={d.entryCount ? "" : "text-stone-400"}>
                    <td className="px-4 py-1.5">
                      <Link href={`/?date=${d.date}`} className="text-brand-600 hover:underline">
                        {formatShortDate(d.date)}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{d.entryCount ? formatAmount(d.totals.calories) : "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{d.entryCount ? formatAmount(d.totals.g_protein, "g") : ""}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{d.entryCount ? formatAmount(d.totals.g_carbs, "g") : ""}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums">{d.entryCount ? formatAmount(d.totals.g_fat, "g") : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
