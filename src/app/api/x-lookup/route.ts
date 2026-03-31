import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const res = await fetch(
    `${DRUPAL_API_URL}/api/x-profile-sync/lookup?username=${encodeURIComponent(username)}`,
    { headers: drupalAuthHeaders(), cache: "no-store" }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Not found" }));
    return NextResponse.json(err, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
