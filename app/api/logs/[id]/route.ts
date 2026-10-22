import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, requireUser } from "@/lib/http";
import { isMeal, parseServings, toEntry } from "@/lib/logs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body");

  const data: { servings?: number; meal?: string } = {};
  if (body.servings !== undefined) {
    const servings = parseServings(body.servings);
    if (servings == null) return jsonError(400, "Servings must be between 0 and 20");
    data.servings = servings;
  }
  if (body.meal !== undefined) {
    if (!isMeal(body.meal)) return jsonError(400, "Invalid meal");
    data.meal = body.meal;
  }

  const existing = await prisma.foodLog.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return jsonError(404, "Entry not found");
  const row = await prisma.foodLog.update({ where: { id }, data });
  return NextResponse.json({ entry: toEntry(row) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const { count } = await prisma.foodLog.deleteMany({ where: { id, userId: auth.userId } });
  if (count === 0) return jsonError(404, "Entry not found");
  return new NextResponse(null, { status: 204 });
}
