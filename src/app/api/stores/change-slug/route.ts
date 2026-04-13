import { NextResponse } from "next/server";

/**
 * POST /api/stores/change-slug
 * Subdomain is permanent — set once during store creation, cannot be changed.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Your subdomain is permanent and cannot be changed after store creation." },
    { status: 403 }
  );
}
