import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * POST /api/invite — Validate an invite code (public)
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ valid: false, error: "Code required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${DRUPAL_API_URL}/api/invite/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      return NextResponse.json({ valid: false, error: "Invalid code" });
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 502 });
  }
}

/**
 * PUT /api/invite — Redeem an invite code (called after signup)
 * Body: { code: string, used_by: string }
 */
export async function PUT(req: NextRequest) {
  const { code, used_by } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${DRUPAL_API_URL}/api/invite/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, used_by }),
    });

    return NextResponse.json(await res.json(), { status: res.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Redeem failed" }, { status: 502 });
  }
}
