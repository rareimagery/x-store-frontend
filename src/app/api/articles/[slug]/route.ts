import { NextRequest, NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

// Public read — get articles for any store
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_x_articles`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ articles: [] });
  const json = await res.json();
  const raw = json.data?.[0]?.attributes?.field_x_articles;
  if (!raw) return NextResponse.json({ articles: [] });

  try {
    return NextResponse.json({ articles: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
