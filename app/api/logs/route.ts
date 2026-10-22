import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, campusToday, isValidDate } from "@/lib/dates";
import { jsonError, readJson, requireUser } from "@/lib/http";
import { isMeal, parseServings, toEntry, totalsOf } from "@/lib/logs";
import { findMenuItem } from "@/lib/menus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const date = req.nextUrl.searchParams.get("date") ?? campusToday();
  if (!isValidDate(date)) return jsonError(400, "Invalid date");
  const rows = await prisma.foodLog.findMany({
    where: { userId: auth.userId, date },
    orderBy: { createdAt: "asc" },
  });
  const entries = rows.map(toEntry);
  return NextResponse.json({ date, entries, totals: totalsOf(entries) });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body");

  const { schoolSlug, menuTypeId, foodId, date, meal } = body;
  const servings = parseServings(body.servings);
  if (typeof schoolSlug !== "string" || !Number.isInteger(menuTypeId) || !Number.isInteger(foodId)) {
    return jsonError(400, "schoolSlug, menuTypeId and foodId are required");
  }
  if (!isValidDate(date)) return jsonError(400, "Invalid date");
  if (date > addDays(campusToday(), 7)) return jsonError(400, "Can't log food more than a week ahead");
  if (!isMeal(meal)) return jsonError(400, "Invalid meal");
  if (servings == null) return jsonError(400, "Servings must be between 0 and 20");

  const found = await findMenuItem(schoolSlug, menuTypeId as number, date, foodId as number);
  if (!found) return jsonError(404, "That item isn't on this menu for the selected date");

  const { location, menuType, section, item } = found;
  const row = await prisma.foodLog.create({
    data: {
      userId: auth.userId,
      date,
      meal,
      servings,
      foodId: item.foodId,
      name: item.name,
      schoolSlug: location.slug,
      locationName: location.name,
      menuName: menuType.name,
      section,
      servingSizeAmount: item.servingSizeAmount,
      servingSizeUnit: item.servingSizeUnit,
      nutrition: JSON.stringify(item.nutrition),
      ingredients: item.ingredients || null,
      icons: JSON.stringify(item.icons),
    },
  });
  return NextResponse.json({ entry: toEntry(row) }, { status: 201 });
}
