import { NextRequest, NextResponse } from "next/server";

import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!storeId || !DRUPAL_API) {
    return NextResponse.json({ products: [] });
  }

  try {
    // Fetch Printful-type products from Drupal for this store
    const params = new URLSearchParams();
    params.set("filter[stores.meta.drupal_internal__target_id]", storeId);
    params.set("include", "variations,field_images");
    params.set("page[limit]", "50");

    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/printful?${params.toString()}`,
      {
        headers: { ...drupalAuthHeaders() },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ products: [] });
    }

    const json = await res.json();
    const included = json.included || [];

    const products = (json.data || []).map((p: any) => {
      const attrs = p.attributes;

      // Get first image
      let thumbnailUrl = "";
      const imgRef = p.relationships?.field_images?.data?.[0];
      if (imgRef) {
        const file = included.find(
          (inc: any) => inc.id === imgRef.id && inc.type === "file--file"
        );
        if (file) {
          const uri = file.attributes?.uri?.url;
          thumbnailUrl = uri?.startsWith("http")
            ? uri
            : `${DRUPAL_API}${uri}`;
        }
      }

      // Get variation info
      const varRefs = p.relationships?.variations?.data || [];
      let baseCost = "0.00";
      let retailPrice = "0.00";

      for (const ref of varRefs) {
        const v = included.find(
          (inc: any) =>
            inc.id === ref.id &&
            inc.type?.startsWith("commerce_product_variation")
        );
        if (v) {
          retailPrice = v.attributes?.price?.number || "0.00";
          baseCost = v.attributes?.field_printful_base_cost || "0.00";
          break;
        }
      }

      return {
        id: p.id,
        name: attrs.title,
        thumbnail_url: thumbnailUrl,
        variants: varRefs.length,
        retail_price: retailPrice,
        base_cost: baseCost,
        technique: attrs.field_print_technique || "dtg",
        synced: true,
      };
    });

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
