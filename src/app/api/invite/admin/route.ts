import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * GET /api/invite/admin — List all invite codes (admin only)
 * POST /api/invite/admin — Generate a new invite code (admin only)
 */

export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as any;
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const res = await fetch(`${DRUPAL_API_URL}/api/invite/list`, {
      headers: drupalAuthHeaders(),
    });
    if (!res.ok) return NextResponse.json({ codes: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ codes: [] });
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as any;
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { x_username, email } = await req.json();

  try {
    const res = await fetch(`${DRUPAL_API_URL}/api/invite/generate`, {
      method: "POST",
      headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ x_username, email }),
    });

    if (!res.ok) return NextResponse.json({ error: "Generate failed" }, { status: 500 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Generate failed" }, { status: 502 });
  }
}
