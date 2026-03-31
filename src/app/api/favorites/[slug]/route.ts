import { NextRequest, NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_my_favorites`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ favorites: [] });
  const json = await res.json();
  const raw = json.data?.[0]?.attributes?.field_my_favorites;
  if (!raw) return NextResponse.json({ favorites: [] });

  try {
    return NextResponse.json({ favorites: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ favorites: [] });
  }
}
