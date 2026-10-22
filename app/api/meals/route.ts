import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, campusToday, isValidDate } from "@/lib/dates";
import { jsonError, readJson, requireUser } from "@/lib/http";
import { MAX_MEAL_NAME, parseMealName } from "@/lib/logs";

export const dynamic = "force-dynamic";

/** Meals (id + name only) for a date, oldest first. */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const date = req.nextUrl.searchParams.get("date") ?? campusToday();
  if (!isValidDate(date)) return jsonError(400, "Invalid date");
  const meals = await prisma.meal.findMany({
    where: { userId: auth.userId, date },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, date: true },
  });
  return NextResponse.json({ date, meals });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body");
  const name = parseMealName(body.name);
  if (!name) return jsonError(400, `Meal name must be 1–${MAX_MEAL_NAME} characters`);
  if (!isValidDate(body.date)) return jsonError(400, "Invalid date");
  if (body.date > addDays(campusToday(), 7)) return jsonError(400, "Can't plan meals more than a week ahead");
  const meal = await prisma.meal.create({
    data: { userId: auth.userId, date: body.date, name },
    select: { id: true, name: true, date: true },
  });
  return NextResponse.json({ meal }, { status: 201 });
}
