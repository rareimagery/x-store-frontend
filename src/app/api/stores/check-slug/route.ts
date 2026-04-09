import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { isValidSlug } from "@/lib/slugs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug param required" }, { status: 400 });
  }

  if (!isValidSlug(slug)) {
    return NextResponse.json({
      available: false,
      reason: "Must be 3-30 lowercase letters, numbers, or hyphens",
    });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=name`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ available: true });
    }
    const json = await res.json();
    const taken = (json.data || []).length > 0;
    return NextResponse.json({
      available: !taken,
      reason: taken ? "This subdomain is already taken" : undefined,
    });
  } catch {
    return NextResponse.json({ available: true });
  }
}
