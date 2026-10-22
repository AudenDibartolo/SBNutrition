"use client";

const QUICK = [0.5, 1, 1.5, 2, 3];
const STEP = 0.5;
const MIN = 0.25;
const MAX = 20;

export function formatServings(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export default function ServingsInput({
  value,
  onChange,
  showQuickPicks,
}: {
  value: number;
  onChange: (v: number) => void;
  showQuickPicks?: boolean;
}) {
  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary h-10 w-10 text-lg"
          aria-label="Fewer servings"
          disabled={value <= MIN}
          onClick={() => onChange(clamp(value - STEP))}
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          min={MIN}
          max={MAX}
          step={0.25}
          className="input h-10 w-20 text-center text-base font-semibold"
          value={Number.isFinite(value) ? value : ""}
          aria-label="Number of servings"
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0) onChange(Math.min(MAX, v));
          }}
          onBlur={() => onChange(clamp(value || 1))}
        />
        <button
          type="button"
          className="btn-secondary h-10 w-10 text-lg"
          aria-label="More servings"
          disabled={value >= MAX}
          onClick={() => onChange(clamp(value + STEP))}
        >
          +
        </button>
        <span className="text-sm text-stone-600">serving{value === 1 ? "" : "s"}</span>
      </div>
      {showQuickPicks ? (
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChange(q)}
              className={`chip border px-3 py-1 text-sm ${value === q ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-700"}`}
            >
              {q === 0.5 ? "½" : q === 1.5 ? "1½" : q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
