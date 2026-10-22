"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatShortDate } from "@/lib/dates";
import { scaleNutrition } from "@/lib/nutrients";
import type { MenuItem, MenuType } from "@/lib/nutrislice";
import NutritionLabel from "./NutritionLabel";
import ServingsInput, { formatServings } from "./ServingsInput";
import Tags from "./Tags";

type MealOption = { id: string; name: string };
const NEW = "new";

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
  initialMealId,
  onClose,
  onAdded,
}: {
  item: MenuItem;
  menuType: MenuType;
  schoolSlug: string;
  locationName: string;
  isDiningHall: boolean;
  date: string;
  initialMealId: string | null;
  onClose: () => void;
  onAdded: (message: string, mealId: string) => void;
}) {
  const { status } = useSession();
  const [servings, setServings] = useState(1);
  const [meals, setMeals] = useState<MealOption[] | null>(null);
  const [choice, setChoice] = useState<string>(NEW);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    api<{ meals: MealOption[] }>(`/api/meals?date=${date}`)
      .then(({ meals }) => {
        if (cancelled) return;
        setMeals(meals);
        // Default to the meal the user came from, else the one they made most recently.
        const pick = meals.find((m) => m.id === initialMealId) ?? meals[meals.length - 1];
        setChoice(pick ? pick.id : NEW);
        setNewName(`Meal ${meals.length + 1}`);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [status, date, initialMealId]);

  const targetName = choice === NEW ? newName.trim() : meals?.find((m) => m.id === choice)?.name ?? "";
  const serving = servingLabel(item.servingSizeAmount, item.servingSizeUnit);

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const { entry } = await api<{ entry: { mealId: string } }>("/api/logs", {
        method: "POST",
        body: JSON.stringify({
          schoolSlug,
          menuTypeId: menuType.id,
          foodId: item.foodId,
          date,
          servings,
          ...(choice === NEW ? { newMealName: newName } : { mealId: choice }),
        }),
      });
      onAdded(`Added ${formatServings(servings)} × ${item.name} to ${targetName}`, entry.mealId);
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
          {status === "authenticated" ? (
            <div className="mt-3">
              <div className="mb-1.5 text-sm font-medium">
                Add to meal <span className="font-normal text-stone-600">on {formatShortDate(date)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(meals ?? []).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChoice(m.id)}
                    className={`chip border px-3 py-1 text-sm ${choice === m.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-700"}`}
                  >
                    {m.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setChoice(NEW)}
                  className={`chip border border-dashed px-3 py-1 text-sm ${choice === NEW ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-400 bg-white text-stone-700"}`}
                >
                  + New meal
                </button>
              </div>
              {choice === NEW ? (
                <input
                  className="input mt-2 w-full"
                  maxLength={60}
                  placeholder="Name it anything, e.g. Lunch with friends"
                  value={newName}
                  aria-label="New meal name"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewName(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}
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
            <button className="btn-primary w-full py-3 text-base" disabled={saving || !meals || !targetName} onClick={add}>
              {saving ? "Adding…" : targetName ? `Add to ${targetName}` : "Name your meal"}
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
