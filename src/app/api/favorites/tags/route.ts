import { NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

// GET — fetch all creator list tags from Drupal taxonomy
export async function GET() {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/taxonomy_term/creator_lists?sort=name&fields[taxonomy_term--creator_lists]=name`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    if (!res.ok) return NextResponse.json({ tags: [] });
    const json = await res.json();

    const tags = (json.data || []).map((t: any) => ({
      id: t.id,
      tid: t.attributes?.drupal_internal__tid,
      name: t.attributes?.name,
    }));

    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
