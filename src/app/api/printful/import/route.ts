import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { getStorePrintfulKey } from "@/lib/printful";

export const maxDuration = 300;

/**
 * POST /api/printful/import
 * Import existing Printful products into Drupal Commerce with proper
 * color/size attributes, pricing, descriptions, and images.
 * Body: { storeId: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId } = await req.json();
  if (!storeId) {
    return NextResponse.json({ error: "storeId required" }, { status: 400 });
  }

  const printfulKey = await getStorePrintfulKey(storeId);
  if (!printfulKey) {
    return NextResponse.json({ error: "Printful not connected" }, { status: 400 });
  }

  try {
    // 1. Load Drupal color + size attribute values for mapping
    const colorMap = await loadAttributeMap("color");
    const sizeMap = await loadAttributeMap("size");

    // Get fresh write headers (refresh every batch to avoid session expiry)
    async function freshWriteHeaders() {
      return drupalWriteHeaders();
    }
    let writeHeaders = await freshWriteHeaders();

    // 2. Fetch all products from Printful
    const pfRes = await fetch("https://api.printful.com/store/products", {
      headers: { Authorization: `Bearer ${printfulKey}` },
    });
    if (!pfRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Printful products" }, { status: 502 });
    }

    const pfProducts = (await pfRes.json()).result || [];
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const pf of pfProducts) {
      // Check if already imported — update title if changed
      try {
        const checkRes = await fetch(
          `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing?filter[field_printful_product_id]=${pf.id}&page[limit]=1`,
          { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const existing = checkData.data?.[0];
          if (existing) {
            // Update title if it changed on Printful
            if (existing.attributes?.title !== pf.name) {
              const updateHeaders = await freshWriteHeaders();
              await fetch(
                `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing/${existing.id}`,
                {
                  method: "PATCH",
                  headers: { ...updateHeaders, "Content-Type": "application/vnd.api+json" },
                  body: JSON.stringify({
                    data: {
                      type: "commerce_product--clothing",
                      id: existing.id,
                      attributes: { title: pf.name },
                    },
                  }),
                }
              );
            }
            skipped++;
            continue;
          }
        }
      } catch {}

      // Fetch full product detail from Printful
      const detailRes = await fetch(
        `https://api.printful.com/store/products/${pf.id}`,
        { headers: { Authorization: `Bearer ${printfulKey}` } }
      );
      if (!detailRes.ok) continue;

      const detail = await detailRes.json();
      const syncProduct = detail.result?.sync_product;
      const syncVariants: any[] = detail.result?.sync_variants || [];
      if (!syncProduct || syncVariants.length === 0) continue;

      // Determine variation bundle
      const nameLower = (syncProduct.name || "").toLowerCase();
      let variationBundle = "t_shirt";
      if (nameLower.includes("hoodie") || nameLower.includes("sweatshirt") || nameLower.includes("crewneck")) {
        variationBundle = "hoodie";
      } else if (nameLower.includes("cap") || nameLower.includes("hat") || nameLower.includes("beanie")) {
        variationBundle = "ballcap";
      }

      // Refresh write headers for each product (session may expire with many variants)
      writeHeaders = await freshWriteHeaders();

      // 3. Create variations with color/size attributes
      const variationIds: string[] = [];

      for (const sv of syncVariants) {
        if (sv.is_ignored) continue;

        // Resolve color + size attribute value UUIDs
        const colorName = sv.color || "";
        const sizeName = sv.size || "";

        const colorUuid = colorName ? await resolveOrCreateAttribute("color", colorName, colorMap, writeHeaders) : null;
        const sizeUuid = sizeName ? await resolveOrCreateAttribute("size", sizeName, sizeMap, writeHeaders) : null;

        const relationships: Record<string, any> = {};
        if (colorUuid) {
          relationships.attribute_color = { data: { type: "commerce_product_attribute_value--color", id: colorUuid } };
        }
        if (sizeUuid) {
          relationships.attribute_size = { data: { type: "commerce_product_attribute_value--size", id: sizeUuid } };
        }

        try {
          const varRes = await fetch(
            `${DRUPAL_API_URL}/jsonapi/commerce_product_variation/${variationBundle}`,
            {
              method: "POST",
              headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
              body: JSON.stringify({
                data: {
                  type: `commerce_product_variation--${variationBundle}`,
                  attributes: {
                    sku: `pf-${sv.id}`,
                    title: sv.name || syncProduct.name,
                    price: {
                      number: sv.retail_price || "29.99",
                      currency_code: sv.currency || "USD",
                    },
                    field_printful_variant_id: String(sv.id),
                    status: true,
                  },
                  relationships,
                },
              }),
            }
          );
          if (varRes.ok) {
            const varData = await varRes.json();
            variationIds.push(varData.data.id);
          } else {
            const errText = await varRes.text().catch(() => "");
            console.error(`[printful-import] Variation create failed for ${sv.name}:`, varRes.status, errText.slice(0, 200));
          }
        } catch (err: any) {
          console.error(`[printful-import] Variation error:`, err.message);
        }
      }

      if (variationIds.length === 0) {
        errors.push(`${syncProduct.name}: no variations created`);
        continue;
      }

      // 4. Create the product with description
      try {
        const prodRes = await fetch(
          `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing`,
          {
            method: "POST",
            headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
            body: JSON.stringify({
              data: {
                type: "commerce_product--clothing",
                attributes: {
                  title: syncProduct.name,
                  body: {
                    value: `${syncProduct.name} — Premium print-on-demand product fulfilled by Printful. Available in ${new Set(syncVariants.map((v: any) => v.color).filter(Boolean)).size} colors and ${new Set(syncVariants.map((v: any) => v.size).filter(Boolean)).size} sizes.`,
                    format: "basic_html",
                  },
                  field_printful_product_id: String(syncProduct.id),
                  field_product_image_url: pf.thumbnail_url || "",
                  status: true,
                },
                relationships: {
                  stores: { data: [{ type: "commerce_store--online", id: storeId }] },
                  variations: {
                    data: variationIds.map((vid) => ({
                      type: `commerce_product_variation--${variationBundle}`,
                      id: vid,
                    })),
                  },
                },
              },
            }),
          }
        );

        if (prodRes.ok) {
          imported++;
          const prodData = await prodRes.json();

          // 5. Upload product images (thumbnail + preview mockup)
          const imagesToUpload: { url: string; name: string }[] = [];
          const thumbUrl = pf.thumbnail_url || syncProduct.thumbnail_url;
          if (thumbUrl) imagesToUpload.push({ url: thumbUrl, name: `printful-${syncProduct.id}-thumb` });

          // Get preview mockup from first variant's files
          const previewFile = syncVariants[0]?.files?.find((f: any) => f.type === "preview");
          if (previewFile?.preview_url) {
            imagesToUpload.push({ url: previewFile.preview_url, name: `printful-${syncProduct.id}-preview` });
          }

          for (const img of imagesToUpload) {
            try {
              const imgRes = await fetch(img.url);
              if (imgRes.ok) {
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                const ct = imgRes.headers.get("content-type") || "image/png";
                const ext = ct.includes("png") ? "png" : "jpg";
                await fetch(
                  `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing/${prodData.data.id}/field_images`,
                  {
                    method: "POST",
                    headers: {
                      ...writeHeaders,
                      "Content-Type": "application/octet-stream",
                      "Content-Disposition": `file; filename="${img.name}.${ext}"`,
                    },
                    body: buffer,
                  }
                );
              }
            } catch {}
          }
        } else {
          const errText = await prodRes.text().catch(() => "");
          errors.push(`${syncProduct.name}: product create failed (${prodRes.status})`);
          console.error(`[printful-import] Product create failed:`, errText.slice(0, 300));
        }
      } catch (err: any) {
        errors.push(`${syncProduct.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: pfProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[printful-import]", err);
    return NextResponse.json({ error: err.message || "Import failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Attribute helpers
// ---------------------------------------------------------------------------

/** Load all values for a Commerce attribute into a name→UUID map */
async function loadAttributeMap(attribute: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_product_attribute_value/${attribute}?page[limit]=100`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      for (const item of data.data || []) {
        const name = item.attributes?.name;
        if (name) map.set(name.toLowerCase(), item.id);
      }
    }
  } catch {}
  return map;
}

/** Resolve an attribute value UUID by name, creating it if needed */
async function resolveOrCreateAttribute(
  attribute: string,
  name: string,
  map: Map<string, string>,
  writeHeaders: Record<string, string>
): Promise<string | null> {
  const existing = map.get(name.toLowerCase());
  if (existing) return existing;

  // Create the attribute value
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_product_attribute_value/${attribute}`,
      {
        method: "POST",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: `commerce_product_attribute_value--${attribute}`,
            attributes: { name },
          },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const uuid = data.data?.id;
      if (uuid) {
        map.set(name.toLowerCase(), uuid);
        return uuid;
      }
    }
  } catch {}

  return null;
}
