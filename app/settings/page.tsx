"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

const FIELDS = [
  { key: "calorieGoal", label: "Calories", unit: "kcal", placeholder: "2000" },
  { key: "proteinGoal", label: "Protein", unit: "g", placeholder: "120" },
  { key: "carbGoal", label: "Carbohydrates", unit: "g", placeholder: "250" },
  { key: "fatGoal", label: "Fat", unit: "g", placeholder: "70" },
] as const;

type Goals = Record<(typeof FIELDS)[number]["key"], number | null>;

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ goals: Goals }>("/api/goals")
      .then(({ goals }) => {
        setValues(Object.fromEntries(FIELDS.map((f) => [f.key, goals[f.key]?.toString() ?? ""])));
        setLoaded(true);
      })
      .catch((e) => setStatus(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const body = Object.fromEntries(FIELDS.map((f) => [f.key, values[f.key] ? Math.round(Number(values[f.key])) : null]));
    try {
      await api("/api/goals", { method: "PUT", body: JSON.stringify(body) });
      setStatus("Saved");
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Daily goals</h1>
      <p className="text-sm text-stone-600">Optional. Goals show as progress bars on your daily log and a target line in history.</p>
      <div className="card space-y-3 p-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3">
            <span className="font-medium">{f.label}</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="input w-28 text-right"
                placeholder={f.placeholder}
                disabled={!loaded}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
              <span className="w-8 text-sm text-stone-500">{f.unit}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" type="submit" disabled={!loaded}>
          Save goals
        </button>
        {status ? <span className="text-sm text-stone-600">{status}</span> : null}
      </div>
    </form>
  );
}
