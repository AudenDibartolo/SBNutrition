"use client";

import { useEffect, useRef, useState } from "react";
import { formatShortDate } from "@/lib/dates";

export interface Bar {
  date: string;
  value: number | null;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

/** Single-series daily bar chart with an optional dashed goal line and per-bar hover tooltip. */
export default function BarChart({ bars, goal, unit, label }: { bars: Bar[]; goal: number | null; unit: string; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 220;
  const pad = { top: 12, right: 8, bottom: 24, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(goal ?? 0, ...bars.map((b) => b.value ?? 0)) * 1.05);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const slot = innerW / bars.length;
  const gap = 2;
  const barW = Math.max(1, Math.min(28, slot - gap));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const labelEvery = Math.ceil(bars.length / Math.max(1, Math.floor(innerW / 56)));
  const r = Math.min(4, barW / 2);

  const h = hover != null ? bars[hover] : null;

  return (
    <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={`${label} per day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-500 text-[10px] tabular-nums">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const x = cx - barW / 2;
          const v = b.value ?? 0;
          const top = y(v);
          const bh = pad.top + innerH - top;
          return (
            <g key={b.date}>
              {v > 0 ? (
                <path
                  d={`M${x},${top + bh} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + bh} Z`}
                  fill={hover === i || hover == null ? "var(--chart-bar)" : "var(--chart-bar-muted)"}
                />
              ) : null}
              {i % labelEvery === 0 ? (
                <text x={cx} y={height - 6} textAnchor="middle" className="fill-stone-500 text-[10px]">
                  {formatShortDate(b.date).replace(/^\w+, /, "")}
                </text>
              ) : null}
              <rect
                x={pad.left + slot * i}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
        {goal ? (
          <g pointerEvents="none">
            <line x1={pad.left} x2={width - pad.right} y1={y(goal)} y2={y(goal)} stroke="var(--chart-goal)" strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={width - pad.right} y={y(goal) - 4} textAnchor="end" className="fill-stone-600 text-[10px]">
              Goal {goal}
            </text>
          </g>
        ) : null}
      </svg>
      {h && hover != null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-stone-200 bg-white px-2 py-1 text-xs shadow"
          style={{ left: Math.min(width - 60, Math.max(60, pad.left + slot * hover + slot / 2)) }}
        >
          <div className="font-medium">{formatShortDate(h.date)}</div>
          <div className="tabular-nums text-stone-700">{h.value != null && h.value > 0 ? `${Math.round(h.value)} ${unit}` : "Nothing logged"}</div>
        </div>
      ) : null}
    </div>
  );
}
