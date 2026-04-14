import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * GET /api/stores/grace-visitors?creator={username}
 * Returns grace period visitor list for the creator's console dashboard.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creatorUsername = req.nextUrl.searchParams.get("creator") || (token.xUsername as string) || "";
  if (!creatorUsername) return NextResponse.json({ error: "creator param required" }, { status: 400 });

  // Only allow creator to see their own visitors (or admin)
  const role = token.role as string;
  const tokenUsername = (token.xUsername as string) || "";
  if (role !== "admin" && tokenUsername.toLowerCase() !== creatorUsername.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/grace-visitors/${encodeURIComponent(creatorUsername)}`,
      { headers: drupalAuthHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ visitors: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ visitors: [] });
  }
}
