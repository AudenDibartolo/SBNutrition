"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api, MEAL_LABELS } from "@/lib/client";
import { formatShortDate } from "@/lib/dates";
import { scaleNutrition } from "@/lib/nutrients";
import type { MenuItem, MenuType } from "@/lib/nutrislice";
import NutritionLabel from "./NutritionLabel";
import ServingsInput, { formatServings } from "./ServingsInput";
import Tags from "./Tags";

type Meal = keyof typeof MEAL_LABELS;

export function servingLabel(amount: string | null, unit: string | null): string | null {
  if (!amount && !unit) return null;
  return [amount, unit].filter(Boolean).join(" ");
}

export default function ItemSheet({
  item,
  menuType,
  schoolSlug,
  locationName,
  isDiningHall,
  date,
  initialMeal,
  onClose,
  onAdded,
}: {
  item: MenuItem;
  menuType: MenuType;
  schoolSlug: string;
  locationName: string;
  isDiningHall: boolean;
  date: string;
  initialMeal: Meal;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const { status } = useSession();
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const serving = servingLabel(item.servingSizeAmount, item.servingSizeUnit);

  async function add() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/logs", {
        method: "POST",
        body: JSON.stringify({ schoolSlug, menuTypeId: menuType.id, foodId: item.foodId, date, meal, servings }),
      });
      onAdded(`Added ${formatServings(servings)} × ${item.name} to ${MEAL_LABELS[meal].toLowerCase()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold leading-tight">{item.name}</h2>
            <p className="text-sm text-stone-600">
              {locationName} · {menuType.name}
            </p>
          </div>
          <button className="btn-ghost -mr-2 -mt-1 text-xl" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {item.description ? <p className="mt-2 text-sm text-stone-700">{item.description}</p> : null}
        <div className="mt-2">
          <Tags icons={item.icons} />
        </div>

        <div className="mt-4 rounded-xl bg-stone-50 p-3">
          <div className="mb-2 text-sm font-medium">
            How much did you have?
            {serving ? <span className="font-normal text-stone-600"> · 1 serving = {serving}</span> : null}
          </div>
          <ServingsInput value={servings} onChange={setServings} showQuickPicks={isDiningHall} />
          {isDiningHall ? (
            <p className="mt-2 text-xs text-stone-500">
              Self-serve buffet: count how many portions you took, e.g. two scoops of a 4 oz portion = 2 servings.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="meal">
              Meal
            </label>
            <select id="meal" className="input py-1.5" value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
              {(Object.keys(MEAL_LABELS) as Meal[]).map((m) => (
                <option key={m} value={m}>
                  {MEAL_LABELS[m]}
                </option>
              ))}
            </select>
            <span className="text-sm text-stone-600">on {formatShortDate(date)}</span>
          </div>
        </div>

        <div className="mt-4">
          {item.hasNutrition ? (
            <NutritionLabel
              nutrition={scaleNutrition(item.nutrition, servings)}
              title={`For ${formatServings(servings)} serving${servings === 1 ? "" : "s"}${serving ? ` (${serving} each)` : ""}`}
            />
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Nutrislice has no nutrition information for this item. You can still log it, but it will count as 0.
            </p>
          )}
        </div>

        {item.ingredients ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Ingredients</h3>
            <p className="mt-1 text-sm text-stone-700">{item.ingredients}</p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 border-t border-stone-200 bg-white p-4">
          {status === "authenticated" ? (
            <button className="btn-primary w-full py-3 text-base" disabled={saving} onClick={add}>
              {saving ? "Adding…" : `Add to ${MEAL_LABELS[meal]}`}
            </button>
          ) : (
            <button className="btn-primary w-full py-3 text-base" onClick={() => signIn("google")}>
              Sign in to track this
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
