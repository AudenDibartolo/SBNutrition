"use client";

import { addDays, campusToday, formatLongDate } from "@/lib/dates";

export default function DateNav({ date, onChange, max }: { date: string; onChange: (d: string) => void; max?: string }) {
  const today = campusToday();
  const label = date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : date === addDays(today, 1) ? "Tomorrow" : null;
  const nextDisabled = max != null && addDays(date, 1) > max;
  return (
    <div className="flex items-center gap-2">
      <button className="btn-secondary px-2.5" aria-label="Previous day" onClick={() => onChange(addDays(date, -1))}>
        ‹
      </button>
      <div className="min-w-0 text-center">
        <div className="font-semibold leading-tight">{label ?? formatLongDate(date)}</div>
        {label ? <div className="text-xs text-stone-500">{formatLongDate(date)}</div> : null}
      </div>
      <button
        className="btn-secondary px-2.5"
        aria-label="Next day"
        disabled={nextDisabled}
        onClick={() => onChange(addDays(date, 1))}
      >
        ›
      </button>
      <input
        type="date"
        className="input ml-1 w-auto py-1.5"
        value={date}
        max={max}
        aria-label="Pick a date"
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      {date !== today ? (
        <button className="btn-ghost" onClick={() => onChange(today)}>
          Today
        </button>
      ) : null}
    </div>
  );
}
