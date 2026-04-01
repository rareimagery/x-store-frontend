import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getStorePrintfulKey,
  uploadFile,
  createSyncProduct,
  createMockupTask,
  getMockupTaskResult,
} from "@/lib/printful";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

export const maxDuration = 120;

// Printful catalog IDs for supported product types
const PRINTFUL_PRODUCTS: Record<string, { catalogId: number; variantIds: number[]; label: string }> = {
  t_shirt: {
    catalogId: 71,   // Bella+Canvas 3001 Unisex Jersey Tee
    variantIds: [4012, 4013, 4014, 4017, 4018], // S, M, L, XL, 2XL
    label: "T-Shirt",
  },
  hoodie: {
    catalogId: 146,  // Bella+Canvas 3719 Unisex Fleece Hoodie
    variantIds: [7853, 7854, 7855, 7856, 7857],
    label: "Hoodie",
  },
  ballcap: {
    catalogId: 439,  // Yupoong 6089M Classic Snapback
    variantIds: [10161],
    label: "Ballcap",
  },
};

type StoreJWT = { storeSlug?: string; xUsername?: string };

function resolveSlug(token: StoreJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

export async function POST(req: NextRequest) {
  const token = (await getToken({ req })) as StoreJWT | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = resolveSlug(token);
  if (!slug) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { image_url, product_type, title, price } = await req.json();

  if (!image_url || !product_type || !title) {
    return NextResponse.json({ error: "image_url, product_type, and title required" }, { status: 400 });
  }

  const productConfig = PRINTFUL_PRODUCTS[product_type];
  if (!productConfig) {
    return NextResponse.json({ error: "Unsupported product type" }, { status: 400 });
  }

  // Resolve store UUID from slug, then get Printful API key
  let apiKey: string | null = null;
  try {
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_printful_api_key`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (storeRes.ok) {
      const storeJson = await storeRes.json();
      const storeUuid = storeJson.data?.[0]?.id;
      if (storeUuid) {
        apiKey = await getStorePrintfulKey(storeUuid);
      }
    }
  } catch { /* ignore */ }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Printful not connected. Go to Print Services to connect your Printful account." },
      { status: 400 }
    );
  }

  try {
    // 1. Upload design to Printful file library
    const file = await uploadFile(apiKey, image_url, `${slug}-${product_type}-${Date.now()}.png`);

    // 2. Create sync product with variants
    const retailPrice = price || (product_type === "hoodie" ? "44.99" : product_type === "ballcap" ? "29.99" : "24.99");

    const designFileUrl = file.preview_url || image_url;

    const syncVariants = productConfig.variantIds.map((variantId) => ({
      variant_id: variantId,
      retail_price: retailPrice,
      files: [{ type: "default", url: designFileUrl }],
    }));

    const product = await createSyncProduct(apiKey, {
      sync_product: { name: title, thumbnail: designFileUrl },
      sync_variants: syncVariants,
    });

    // 3. Generate mockup (async — poll for result)
    let mockupUrl: string | null = null;
    try {
      const mockupTask = await createMockupTask(apiKey, productConfig.catalogId, [
        { placement: "front", image_url: designFileUrl },
      ]);

      if (mockupTask.task_key) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const mockupResult = await getMockupTaskResult(apiKey, mockupTask.task_key);
        mockupUrl = mockupResult.mockups?.[0]?.mockup_url || null;
      }
    } catch (err) {
      console.warn("[design-studio] Mockup generation failed (non-blocking):", err);
    }

    return NextResponse.json({
      success: true,
      product_id: product.sync_product?.id,
      title,
      product_type: productConfig.label,
      retail_price: retailPrice,
      mockup_url: mockupUrl,
      printful_url: `https://www.printful.com/dashboard/sync/products`,
    });
  } catch (err: any) {
    console.error("[design-studio] Publish to Printful failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to publish to Printful" },
      { status: 502 }
    );
  }
}
