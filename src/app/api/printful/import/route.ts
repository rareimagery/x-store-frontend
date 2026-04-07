import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { getStorePrintfulKey } from "@/lib/printful";

/**
 * POST /api/printful/import
 * Import existing Printful products into Drupal Commerce as clothing products.
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
    // Fetch all products from Printful
    const pfRes = await fetch("https://api.printful.com/store/products", {
      headers: { Authorization: `Bearer ${printfulKey}` },
    });
    if (!pfRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Printful products" }, { status: 502 });
    }

    const pfData = await pfRes.json();
    const pfProducts = pfData.result || [];

    let imported = 0;
    let skipped = 0;

    for (const pf of pfProducts) {
      // Check if already imported (by printful ID in product title or sku)
      const checkRes = await fetch(
        `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing?filter[title]=${encodeURIComponent(pf.name)}&filter[stores.id]=${storeId}&page[limit]=1`,
        { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
      );
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.data?.length > 0) {
          skipped++;
          continue;
        }
      }

      // Fetch product details + variants from Printful
      const detailRes = await fetch(
        `https://api.printful.com/store/products/${pf.id}`,
        { headers: { Authorization: `Bearer ${printfulKey}` } }
      );
      if (!detailRes.ok) continue;

      const detail = await detailRes.json();
      const syncProduct = detail.result?.sync_product;
      const syncVariants = detail.result?.sync_variants || [];
      if (!syncProduct) continue;

      // Determine variation bundle from Printful product info
      const productName = (syncProduct.name || "").toLowerCase();
      let variationBundle = "t_shirt";
      if (productName.includes("hoodie") || productName.includes("sweatshirt")) {
        variationBundle = "hoodie";
      } else if (productName.includes("cap") || productName.includes("hat") || productName.includes("beanie")) {
        variationBundle = "ballcap";
      }

      // Create variations in Drupal
      const variationIds: string[] = [];
      const writeHeaders = await drupalWriteHeaders();

      for (const sv of syncVariants) {
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
                    price: {
                      number: sv.retail_price || "29.99",
                      currency_code: sv.currency || "USD",
                    },
                    field_printful_variant_id: String(sv.id),
                  },
                },
              }),
            }
          );
          if (varRes.ok) {
            const varData = await varRes.json();
            variationIds.push(varData.data.id);
          }
        } catch {
          // Skip failed variations
        }
      }

      if (variationIds.length === 0) {
        // Create at least one default variation
        try {
          const defVarRes = await fetch(
            `${DRUPAL_API_URL}/jsonapi/commerce_product_variation/${variationBundle}`,
            {
              method: "POST",
              headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
              body: JSON.stringify({
                data: {
                  type: `commerce_product_variation--${variationBundle}`,
                  attributes: {
                    sku: `pf-${syncProduct.id}-default`,
                    price: { number: "29.99", currency_code: "USD" },
                  },
                },
              }),
            }
          );
          if (defVarRes.ok) {
            const defData = await defVarRes.json();
            variationIds.push(defData.data.id);
          }
        } catch {}
      }

      // Create the product
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
                  status: true,
                  field_printful_product_id: String(syncProduct.id),
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

          // Upload thumbnail if available
          const thumbUrl = pf.thumbnail_url || syncProduct.thumbnail_url;
          if (thumbUrl) {
            try {
              const prodData = await prodRes.json();
              const imgRes = await fetch(thumbUrl);
              if (imgRes.ok) {
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                await fetch(
                  `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing/${prodData.data.id}/field_images`,
                  {
                    method: "POST",
                    headers: {
                      ...writeHeaders,
                      "Content-Type": "application/octet-stream",
                      "Content-Disposition": `file; filename="printful-${syncProduct.id}.jpg"`,
                    },
                    body: buffer,
                  }
                );
              }
            } catch {}
          }
        }
      } catch {}
    }

    return NextResponse.json({ imported, skipped, total: pfProducts.length });
  } catch (err: any) {
    console.error("[printful-import]", err);
    return NextResponse.json({ error: err.message || "Import failed" }, { status: 500 });
  }
}
