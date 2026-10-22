import { NextResponse } from "next/server";
import { getSessionUserId } from "./auth";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Returns the signed-in user's id, or a 401 response to return directly. */
export async function requireUser(): Promise<{ userId: string } | { response: NextResponse }> {
  const userId = await getSessionUserId();
  return userId ? { userId } : { response: jsonError(401, "Sign in required") };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
