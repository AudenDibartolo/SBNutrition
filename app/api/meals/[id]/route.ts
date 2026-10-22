import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, requireUser } from "@/lib/http";
import { MAX_MEAL_NAME, parseMealName } from "@/lib/logs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson(req);
  const name = parseMealName(body?.name);
  if (!name) return jsonError(400, `Meal name must be 1–${MAX_MEAL_NAME} characters`);
  const { count } = await prisma.meal.updateMany({ where: { id, userId: auth.userId }, data: { name } });
  if (count === 0) return jsonError(404, "Meal not found");
  return NextResponse.json({ meal: { id, name } });
}

/** Deletes the meal and every food logged in it. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const { count } = await prisma.meal.deleteMany({ where: { id, userId: auth.userId } });
  if (count === 0) return jsonError(404, "Meal not found");
  return new NextResponse(null, { status: 204 });
}
