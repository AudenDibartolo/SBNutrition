import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { dateRange, daysBetween, isValidDate } from "@/lib/dates";
import { jsonError, requireUser } from "@/lib/http";
import { toEntry, totalsOf, type LogEntry } from "@/lib/logs";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 400;

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!isValidDate(from) || !isValidDate(to) || from > to) return jsonError(400, "Invalid date range");
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return jsonError(400, `Range is limited to ${MAX_RANGE_DAYS} days`);

  const rows = await prisma.foodLog.findMany({
    where: { userId: auth.userId, date: { gte: from, lte: to } },
  });
  const byDate = new Map<string, LogEntry[]>();
  for (const row of rows) {
    const e = toEntry(row);
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }
  const days = dateRange(from, to).map((date) => {
    const entries = byDate.get(date) ?? [];
    return { date, entryCount: entries.length, totals: totalsOf(entries) };
  });
  return NextResponse.json({ from, to, days });
}
