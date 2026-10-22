import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, campusToday, isValidDate } from "@/lib/dates";
import { jsonError, readJson, requireUser } from "@/lib/http";
import { MAX_MEAL_NAME, parseMealName, parseServings, toEntry, toMeal, totalsOf } from "@/lib/logs";
import { findMenuItem } from "@/lib/menus";

export const dynamic = "force-dynamic";

/** The day's meals (oldest first) with their foods, plus day totals. */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const date = req.nextUrl.searchParams.get("date") ?? campusToday();
  if (!isValidDate(date)) return jsonError(400, "Invalid date");
  const rows = await prisma.meal.findMany({
    where: { userId: auth.userId, date },
    orderBy: { createdAt: "asc" },
    include: { logs: { orderBy: { createdAt: "asc" } } },
  });
  const meals = rows.map(toMeal);
  return NextResponse.json({ date, meals, totals: totalsOf(meals.flatMap((m) => m.entries)) });
}

/**
 * Logs a food. Body: { schoolSlug, menuTypeId, foodId, date, servings } plus either
 * `mealId` (an existing meal on that date) or `newMealName` (creates the meal too).
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body");

  const { schoolSlug, menuTypeId, foodId, date, mealId, newMealName } = body;
  const servings = parseServings(body.servings);
  if (typeof schoolSlug !== "string" || !Number.isInteger(menuTypeId) || !Number.isInteger(foodId)) {
    return jsonError(400, "schoolSlug, menuTypeId and foodId are required");
  }
  if (!isValidDate(date)) return jsonError(400, "Invalid date");
  if (date > addDays(campusToday(), 7)) return jsonError(400, "Can't log food more than a week ahead");
  if (servings == null) return jsonError(400, "Servings must be between 0 and 20");

  let existingMealId: string | null = null;
  let mealName: string | null = null;
  if (typeof mealId === "string") {
    const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: auth.userId } });
    if (!meal) return jsonError(404, "Meal not found");
    if (meal.date !== date) return jsonError(400, "That meal is on a different day");
    existingMealId = meal.id;
  } else {
    mealName = parseMealName(newMealName);
    if (!mealName) return jsonError(400, `Choose a meal or name a new one (1–${MAX_MEAL_NAME} characters)`);
  }

  const found = await findMenuItem(schoolSlug, menuTypeId as number, date, foodId as number);
  if (!found) return jsonError(404, "That item isn't on this menu for the selected date");
  const { location, menuType, section, item } = found;

  const row = await prisma.$transaction(async (tx) => {
    const targetMealId =
      existingMealId ?? (await tx.meal.create({ data: { userId: auth.userId, date, name: mealName! } })).id;
    return tx.foodLog.create({
      data: {
        userId: auth.userId,
        mealId: targetMealId,
        date,
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
  });
  return NextResponse.json({ entry: toEntry(row) }, { status: 201 });
}
