import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getStorePrintfulKey,
  uploadFile,
  createSyncProduct,
  createMockupTask,
  getMockupTaskResult,
} from "@/lib/printful";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

export const maxDuration = 120;

// Printful catalog IDs for supported product types
const PRINTFUL_PRODUCTS: Record<string, { catalogId: number; variantIds: number[]; label: string; variationBundle: string }> = {
  t_shirt: {
    catalogId: 71,
    variantIds: [4012, 4013, 4014, 4017, 4018],
    label: "T-Shirt",
    variationBundle: "t_shirt",
  },
  hoodie: {
    catalogId: 146,
    variantIds: [7853, 7854, 7855, 7856, 7857],
    label: "Hoodie",
    variationBundle: "hoodie",
  },
  ballcap: {
    catalogId: 439,
    variantIds: [10161],
    label: "Ballcap",
    variationBundle: "ballcap",
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

  const { image_url, product_type, title, price, description } = await req.json();

  if (!image_url || !product_type || !title) {
    return NextResponse.json({ error: "image_url, product_type, and title required" }, { status: 400 });
  }

  const productConfig = PRINTFUL_PRODUCTS[product_type];
  if (!productConfig) {
    return NextResponse.json({ error: "Unsupported product type" }, { status: 400 });
  }

  // Resolve store UUID
  let storeUuid: string | null = null;
  try {
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_printful_api_key`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (storeRes.ok) {
      const storeJson = await storeRes.json();
      storeUuid = storeJson.data?.[0]?.id ?? null;
    }
  } catch { /* ignore */ }

  if (!storeUuid) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const retailPrice = price || (product_type === "hoodie" ? "44.99" : product_type === "ballcap" ? "29.99" : "24.99");

  // --- Step 1: Sync to Printful (if connected) ---
  let printfulProductId: string | null = null;
  let mockupUrl: string | null = null;
  let designFileUrl = image_url;

  const apiKey = await getStorePrintfulKey(storeUuid);
  if (apiKey) {
    try {
      const file = await uploadFile(apiKey, image_url, `${slug}-${product_type}-${Date.now()}.png`);
      designFileUrl = file.preview_url || image_url;

      const syncVariants = productConfig.variantIds.map((variantId) => ({
        variant_id: variantId,
        retail_price: retailPrice,
        files: [{ type: "default", url: designFileUrl }],
      }));

      const product = await createSyncProduct(apiKey, {
        sync_product: { name: title, thumbnail: designFileUrl },
        sync_variants: syncVariants,
      });
      printfulProductId = String(product.sync_product?.id ?? "");

      // Generate mockup (non-blocking)
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
        console.warn("[design-studio] Mockup generation failed:", err);
      }
    } catch (err) {
      console.warn("[design-studio] Printful sync failed (continuing with Drupal-only):", err);
    }
  }

  // --- Step 2: Create product in Drupal Commerce ---
  const writeHeaders = await drupalWriteHeaders();
  const variationBundle = productConfig.variationBundle;
  const sku = `${slug}-ai-${Date.now()}`;

  try {
    // 2a. Create variation
    const variationRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_product_variation/${variationBundle}`,
      {
        method: "POST",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: `commerce_product_variation--${variationBundle}`,
            attributes: {
              sku,
              price: { number: String(retailPrice), currency_code: "USD" },
              status: true,
            },
          },
        }),
      }
    );

    if (!variationRes.ok) {
      const errText = await variationRes.text();
      console.error("[design-studio] Variation creation failed:", errText);
      return NextResponse.json({ error: "Failed to create product variation in Drupal" }, { status: 500 });
    }
    const variationId = (await variationRes.json()).data.id as string;

    // 2b. Create product linked to store
    const productAttrs: Record<string, unknown> = {
      title,
      status: true,
    };
    if (description) {
      productAttrs.body = { value: description, format: "basic_html" };
    }
    if (printfulProductId) {
      productAttrs.field_printful_product_id = printfulProductId;
    }

    const productRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing`,
      {
        method: "POST",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: "commerce_product--clothing",
            attributes: productAttrs,
            relationships: {
              stores: {
                data: [{ type: "commerce_store--online", id: storeUuid }],
              },
              variations: {
                data: [{
                  type: `commerce_product_variation--${variationBundle}`,
                  id: variationId,
                }],
              },
            },
          },
        }),
      }
    );

    if (!productRes.ok) {
      const errText = await productRes.text();
      console.error("[design-studio] Product creation failed:", errText);
      return NextResponse.json({ error: "Failed to create product in Drupal" }, { status: 500 });
    }
    const drupalProductId = (await productRes.json()).data.id as string;

    // 2c. Attach design image to product (fire-and-forget)
    (async () => {
      try {
        const imgRes = await fetch(designFileUrl);
        if (!imgRes.ok) return;
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type") ?? "image/png";
        const ext = contentType.includes("png") ? "png" : "jpg";

        await fetch(
          `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing/${drupalProductId}/field_images`,
          {
            method: "POST",
            headers: {
              ...writeHeaders,
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `filename="${sku}.${ext}"`,
            },
            body: imgBuffer,
          }
        );
      } catch (err) {
        console.warn("[design-studio] Image attachment failed:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      drupal_product_id: drupalProductId,
      printful_product_id: printfulProductId,
      title,
      product_type: productConfig.label,
      variation_type: variationBundle,
      retail_price: retailPrice,
      sku,
      mockup_url: mockupUrl,
      design_url: designFileUrl,
    });
  } catch (err: any) {
    console.error("[design-studio] Product creation failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
