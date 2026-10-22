import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, readJson, requireUser } from "@/lib/http";

const FIELDS = ["calorieGoal", "proteinGoal", "carbGoal", "fatGoal"] as const;
type Goals = Record<(typeof FIELDS)[number], number | null>;

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return jsonError(404, "User not found");
  const goals = Object.fromEntries(FIELDS.map((f) => [f, user[f]])) as Goals;
  return NextResponse.json({ goals });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body");
  const data: Partial<Goals> = {};
  for (const f of FIELDS) {
    const v = body[f];
    if (v === undefined) continue;
    if (v === null || v === "") data[f] = null;
    else if (Number.isInteger(v) && (v as number) > 0 && (v as number) < 20000) data[f] = v as number;
    else return jsonError(400, `${f} must be a positive whole number`);
  }
  const user = await prisma.user.update({ where: { id: auth.userId }, data });
  const goals = Object.fromEntries(FIELDS.map((f) => [f, user[f]])) as Goals;
  return NextResponse.json({ goals });
}
