import { NUTRIENTS, formatAmount, percentDV, type Nutrition } from "@/lib/nutrients";

/** Nutrition-facts style table of every nutrient that has a reported value. */
export default function NutritionLabel({ nutrition, title }: { nutrition: Nutrition; title?: string }) {
  const rows = NUTRIENTS.filter((n) => n.key !== "calories" && nutrition[n.key] != null);
  return (
    <div className="rounded-lg border-2 border-stone-900 p-3 text-sm">
      {title ? <div className="text-xs text-stone-600">{title}</div> : null}
      <div className="flex items-baseline justify-between border-b-4 border-stone-900 pb-1">
        <span className="text-lg font-extrabold">Calories</span>
        <span className="text-2xl font-extrabold">{formatAmount(nutrition.calories)}</span>
      </div>
      <div className="flex justify-end border-b border-stone-300 py-0.5 text-xs font-semibold">% Daily Value*</div>
      {rows.map((n) => {
        const pct = percentDV(n, nutrition[n.key]);
        return (
          <div
            key={n.key}
            className={`flex justify-between border-b border-stone-200 py-0.5 ${n.sub ? "pl-4" : ""} ${n.group !== "macro" ? "text-stone-700" : ""}`}
          >
            <span>
              <span className={n.sub || n.group !== "macro" ? "" : "font-semibold"}>{n.label}</span>{" "}
              {formatAmount(nutrition[n.key], n.unit)}
            </span>
            <span className="font-semibold tabular-nums">{pct != null ? `${pct}%` : ""}</span>
          </div>
        );
      })}
      {rows.length === 0 ? <p className="py-2 text-stone-500">No detailed nutrition reported.</p> : null}
      <p className="pt-1 text-[11px] leading-tight text-stone-500">*Percent Daily Values are based on a 2,000 calorie diet.</p>
    </div>
  );
}
