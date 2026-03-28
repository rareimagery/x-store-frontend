import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { verifyStoreOwnership, isValidUUID, isSafeImageUrl } from "@/lib/ownership";
import {
  getStorePrintfulKey,
  listSyncProducts,
  getSyncProduct,
  printfulFetch,
} from "@/lib/printful";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/** Download an image and upload it as a Drupal file entity on a product */
async function uploadProductImage(
  imageUrl: string,
  productUuid: string,
  filename: string
): Promise<void> {
  if (!isSafeImageUrl(imageUrl)) return;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";

    const writeHeaders = await drupalWriteHeaders();
    await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/printful/${productUuid}/field_images`,
      {
        method: "POST",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `file; filename="${filename}.${ext}"`,
        },
        body: buffer,
      }
    );
  } catch {
    // Non-critical — product still syncs without image
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeId, storeDrupalId } = await req.json();

    if (!storeId || !isValidUUID(storeId)) {
      return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
    }

    if (!(await verifyStoreOwnership(token, storeId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the per-store Printful API key from Drupal
    const printfulApiKey = await getStorePrintfulKey(storeId);
    if (!printfulApiKey) {
      return NextResponse.json(
        { error: "Printful not connected. Enter your API key first." },
        { status: 400 }
      );
    }

    // Fetch products from Printful
    const printfulRes = await fetch(
      "https://api.printful.com/store/products",
      {
        headers: { Authorization: `Bearer ${printfulApiKey}` },
      }
    );

    if (!printfulRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch products from Printful" },
        { status: 502 }
      );
    }

    const printfulData = await printfulRes.json();
    const printfulProducts = printfulData.result || [];

    let synced = 0;
    let skipped = 0;

    for (const pfProduct of printfulProducts) {
      // Check if product already exists in Drupal
      const existingParams = new URLSearchParams();
      existingParams.set(
        "filter[field_printful_product_id]",
        String(pfProduct.id)
      );
      existingParams.set(
        "filter[stores.meta.drupal_internal__target_id]",
        storeDrupalId
      );

      const existingRes = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_product/printful?${existingParams.toString()}`,
        { headers: { ...drupalAuthHeaders() } }
      );

      if (existingRes.ok) {
        const existingData = await existingRes.json();
        if (existingData.data && existingData.data.length > 0) {
          skipped++;
          continue;
        }
      }

      // Fetch product details from Printful
      const detailRes = await fetch(
        `https://api.printful.com/store/products/${pfProduct.id}`,
        { headers: { Authorization: `Bearer ${printfulApiKey}` } }
      );

      if (!detailRes.ok) continue;
      const detail = await detailRes.json();
      const syncProduct = detail.result?.sync_product;
      const syncVariants = detail.result?.sync_variants || [];

      if (!syncProduct) continue;

      // Create variations in Drupal first
      const variationIds: string[] = [];

      for (const sv of syncVariants) {
        const varBody = {
          data: {
            type: "commerce_product_variation--printful",
            attributes: {
              sku: `pf-${sv.id}`,
              price: {
                number: sv.retail_price || "0.00",
                currency_code: sv.currency || "USD",
              },
              field_printful_variant_id: String(sv.id),
              field_printful_base_cost: String(
                sv.product?.retail_price || "0.00"
              ),
            },
          },
        };

        const writeHeaders = await drupalWriteHeaders();
        const varRes = await fetch(
          `${DRUPAL_API}/jsonapi/commerce_product_variation/printful`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/vnd.api+json",
              ...writeHeaders,
            },
            body: JSON.stringify(varBody),
          }
        );

        if (varRes.ok) {
          const varData = await varRes.json();
          variationIds.push(varData.data.id);
        }
      }

      // Create the product in Drupal
      const productBody = {
        data: {
          type: "commerce_product--printful",
          attributes: {
            title: syncProduct.name,
            field_printful_product_id: String(syncProduct.id),
            status: true,
          },
          relationships: {
            stores: {
              data: [
                {
                  type: "commerce_store--online",
                  id: storeId,
                },
              ],
            },
            variations: {
              data: variationIds.map((vid) => ({
                type: "commerce_product_variation--printful",
                id: vid,
              })),
            },
          },
        },
      };

      const prodWriteHeaders = await drupalWriteHeaders();
      const prodRes = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_product/printful`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/vnd.api+json",
            ...prodWriteHeaders,
          },
          body: JSON.stringify(productBody),
        }
      );

      if (prodRes.ok) {
        synced++;

        // Upload thumbnail image (fire-and-forget)
        const thumbnailUrl =
          pfProduct.thumbnail_url || syncProduct.thumbnail_url;
        if (thumbnailUrl) {
          const prodData = await prodRes.json();
          uploadProductImage(
            thumbnailUrl,
            prodData.data.id,
            `printful-${syncProduct.id}`
          ).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: printfulProducts.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}
