import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * POST /api/stores/products/order
 * Saves the display order of products for a store.
 * Body: { storeId: string, productOrder: string[] }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, productOrder } = await req.json();

  if (!storeId || !Array.isArray(productOrder)) {
    return NextResponse.json({ error: "storeId and productOrder array required" }, { status: 400 });
  }

  try {
    // Find store UUID from slug or use storeId directly
    let storeUuid = storeId;

    // If storeId doesn't look like a UUID, look it up by slug
    if (!storeId.includes("-")) {
      const res = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeId)}`,
        { headers: { ...drupalAuthHeaders() }, cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        storeUuid = json.data?.[0]?.id;
      }
    }

    if (!storeUuid) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Save the ordered product IDs as JSON
    const writeHeaders = await drupalWriteHeaders();
    const patchRes = await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online/${storeUuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "commerce_store--online",
          id: storeUuid,
          attributes: {
            field_product_order: JSON.stringify(productOrder),
          },
        },
      }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text().catch(() => "");
      console.error("[products/order] Save failed:", err);
      return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: productOrder.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/**
 * GET /api/stores/products/order?slug=rare
 * Returns the saved product order for a store.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ order: [] });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_product_order`,
      { headers: { ...drupalAuthHeaders() }, cache: "no-store" }
    );

    if (!res.ok) return NextResponse.json({ order: [] });

    const json = await res.json();
    const orderJson = json.data?.[0]?.attributes?.field_product_order;

    if (!orderJson) return NextResponse.json({ order: [] });

    try {
      return NextResponse.json({ order: JSON.parse(orderJson) });
    } catch {
      return NextResponse.json({ order: [] });
    }
  } catch {
    return NextResponse.json({ order: [] });
  }
}
