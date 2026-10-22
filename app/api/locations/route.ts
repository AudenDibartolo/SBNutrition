import { NextResponse } from "next/server";
import { getLocations } from "@/lib/menus";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ locations: await getLocations() });
  } catch (err) {
    console.error(err);
    return jsonError(502, "Could not load dining locations from Nutrislice");
  }
}
