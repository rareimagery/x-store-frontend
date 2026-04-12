import { NextRequest, NextResponse } from "next/server";
import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * GET /api/stores/gen-count?slug=rare
 * Returns the current monthly generation count for a store.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug || !DRUPAL_API) {
    return NextResponse.json({ count: 0, month: null });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_monthly_gen_count,field_gen_count_month`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) return NextResponse.json({ count: 0, month: null });

    const json = await res.json();
    const store = json.data?.[0];
    if (!store) return NextResponse.json({ count: 0, month: null });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const storedMonth = store.attributes?.field_gen_count_month || "";

    // Reset count if month has changed
    if (storedMonth !== currentMonth) {
      return NextResponse.json({ count: 0, month: currentMonth });
    }

    return NextResponse.json({
      count: store.attributes?.field_monthly_gen_count || 0,
      month: storedMonth,
    });
  } catch {
    return NextResponse.json({ count: 0, month: null });
  }
}
