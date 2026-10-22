import { NextResponse, type NextRequest } from "next/server";
import { campusToday, isValidDate } from "@/lib/dates";
import { jsonError } from "@/lib/http";
import { getDayMenu, getLocation } from "@/lib/menus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const date = req.nextUrl.searchParams.get("date") ?? campusToday();
  if (!isValidDate(date)) return jsonError(400, "Invalid date");
  try {
    const location = await getLocation(slug);
    if (!location) return jsonError(404, "Unknown location");
    return NextResponse.json(await getDayMenu(location, date));
  } catch (err) {
    console.error(err);
    return jsonError(502, "Could not load this menu from Nutrislice");
  }
}
