import { dayOfWeek } from "./dates";
import type { Location } from "./nutrislice";

function fmt(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Posted hours for a location on a date, e.g. "7 AM – 9 PM", "Open 24 hours" or null if not open that weekday. */
export function hoursFor(location: Location, date: string): string | null {
  if (location.operatingStartDate && date < location.operatingStartDate) return null;
  if (location.operatingEndDate && date > location.operatingEndDate) return null;
  const h = location.hours[dayOfWeek(date)];
  if (!h?.enabled) return null;
  if (h.is24h) return "Open 24 hours";
  return `${fmt(h.start)} – ${fmt(h.end)}`;
}
