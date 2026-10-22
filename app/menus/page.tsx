import Link from "next/link";
import { campusToday, isValidDate } from "@/lib/dates";
import { hoursFor } from "@/lib/hours";
import { getLocations } from "@/lib/menus";
import type { Location } from "@/lib/nutrislice";

export const dynamic = "force-dynamic";

export default async function MenusPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const date = isValidDate(sp.date) ? sp.date : campusToday();
  const query = new URLSearchParams({ date, ...(sp.meal ? { meal: sp.meal } : {}) }).toString();

  let locations: Location[] = [];
  let error = false;
  try {
    locations = await getLocations();
  } catch {
    error = true;
  }
  const halls = locations.filter((l) => l.isDiningHall);
  const others = locations.filter((l) => !l.isDiningHall).sort((a, b) => a.name.localeCompare(b.name));

  const card = (l: Location) => {
    const hours = hoursFor(l, date);
    return (
      <Link key={l.slug} href={`/menus/${l.slug}?${query}`} className="card flex items-center gap-3 p-4 hover:border-brand-500">
        {l.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.logo} alt="" className="h-12 w-12 rounded-lg object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-stone-100" />
        )}
        <div className="min-w-0">
          <div className="font-semibold">{l.name}</div>
          <div className="text-sm text-stone-600">{hours ?? "Not open this day"}</div>
          <div className="truncate text-xs text-stone-500">
            {l.menuTypes.length} menu{l.menuTypes.length === 1 ? "" : "s"}
            {l.isDiningHall ? " · self-serve buffet" : ""}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campus menus</h1>
        <p className="text-sm text-stone-600">
          Pick where you ate. Menus come straight from Stony Brook Dining and are refreshed every day.
        </p>
      </div>
      {error ? <p className="card p-4 text-red-700">Couldn&apos;t reach Nutrislice right now. Try again in a minute.</p> : null}
      {halls.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Dining halls</h2>
          <div className="grid gap-3 sm:grid-cols-2">{halls.map(card)}</div>
        </section>
      ) : null}
      {others.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Retail &amp; cafés</h2>
          <div className="grid gap-3 sm:grid-cols-2">{others.map(card)}</div>
        </section>
      ) : null}
    </div>
  );
}
