import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStorePrintfulKey, createMockupTask, getMockupTaskResult } from "@/lib/printful";
import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

const CATALOG_IDS: Record<string, number> = {
  t_shirt: 71,
  hoodie: 146,
  ballcap: 439,
  pet_bandana: 902,
  pet_hoodie: 921,
};

/**
 * POST /api/design-studio/preview-mockup
 * Generates a Printful mockup preview WITHOUT publishing the product.
 * Returns a mockup image URL showing the design on the actual product.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.storeSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { image_url, product_type, placement } = body;

  if (!image_url) {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  const catalogId = CATALOG_IDS[product_type];
  if (!catalogId) {
    return NextResponse.json({ error: "Unsupported product type for mockup" }, { status: 400 });
  }

  // Get store UUID from slug
  let storeUuid: string | null = null;
  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(token.storeSlug as string)}&fields[commerce_store--online]=field_printful_api_key`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    if (res.ok) {
      const json = await res.json();
      storeUuid = json.data?.[0]?.id || null;
    }
  } catch {}

  if (!storeUuid) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Get Printful API key
  let apiKey: string | null = null;
  try {
    apiKey = await getStorePrintfulKey(storeUuid);
  } catch {}

  if (!apiKey) {
    return NextResponse.json({ error: "Printful not connected" }, { status: 400 });
  }

  try {
    const files = [{ placement: placement === "back" ? "back" : "front", image_url }];

    const task = await createMockupTask(apiKey, catalogId, files);

    // Poll for result (max 30 seconds)
    let result = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      result = await getMockupTaskResult(apiKey, task.task_key);
      if (result.status === "completed") break;
      if (result.status === "failed") {
        return NextResponse.json({ error: "Mockup generation failed" }, { status: 500 });
      }
    }

    if (!result || result.status !== "completed") {
      return NextResponse.json({ error: "Mockup timed out — try again" }, { status: 504 });
    }

    const mockupUrls = result.mockups?.map((m: any) => m.mockup_url || m.url).filter(Boolean) || [];

    return NextResponse.json({
      mockup_url: mockupUrls[0] || null,
      mockup_urls: mockupUrls,
      product_type,
    });
  } catch (err: any) {
    console.error("[preview-mockup]", err);
    return NextResponse.json({ error: err.message || "Mockup failed" }, { status: 500 });
  }
}
