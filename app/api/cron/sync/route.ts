import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { syncAllMenus } from "@/lib/menus";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Called by Vercel Cron (see vercel.json) or any scheduler with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError(401, "Unauthorized");
  }
  const result = await syncAllMenus();
  return NextResponse.json(result, { status: result.failures.length ? 207 : 200 });
}
