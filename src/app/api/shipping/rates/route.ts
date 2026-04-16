import { NextRequest, NextResponse } from "next/server";
import { getShippingRates, isConfigured } from "@/lib/easypost";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * POST /api/shipping/rates
 * Get shipping rate quotes for a product.
 * Body: { productId, toZip } or { fromZip, toZip, weightOz, length, width, height }
 */
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({
      error: "Shipping calculator not configured",
      message: "EasyPost API key not set. Contact platform admin.",
    }, { status: 503 });
  }

  const body = await req.json();
  const toZip = body.toZip;

  if (!toZip) {
    return NextResponse.json({ error: "toZip required" }, { status: 400 });
  }

  let fromZip = body.fromZip || "";
  let weightOz = body.weightOz || 0;
  let length = body.length || 0;
  let width = body.width || 0;
  let height = body.height || 0;

  // If productId provided, look up product details from Drupal
  if (body.productId && DRUPAL_API_URL) {
    try {
      const res = await fetch(
        `${DRUPAL_API_URL}/jsonapi/commerce_product/default/${body.productId}?fields[commerce_product--default]=field_weight_lbs,field_weight_oz,field_pkg_length,field_pkg_width,field_pkg_height&include=stores`,
        { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        const attrs = data.data?.attributes || {};
        const lbs = parseFloat(attrs.field_weight_lbs) || 0;
        const oz = parseFloat(attrs.field_weight_oz) || 0;
        weightOz = lbs * 16 + oz;
        length = parseFloat(attrs.field_pkg_length) || length;
        width = parseFloat(attrs.field_pkg_width) || width;
        height = parseFloat(attrs.field_pkg_height) || height;

        // Get store origin ZIP from included store
        const included = data.included || [];
        for (const inc of included) {
          if (inc.type?.startsWith("commerce_store")) {
            fromZip = inc.attributes?.field_ships_from_zip || fromZip;
            break;
          }
        }
      }
    } catch (err) {
      console.error("[shipping/rates] Product lookup failed:", err);
    }
  }

  // Validate we have enough info
  if (!fromZip) {
    return NextResponse.json({ error: "Origin ZIP code not set. Update your store settings." }, { status: 400 });
  }
  if (weightOz <= 0) {
    return NextResponse.json({ error: "Product weight not set" }, { status: 400 });
  }
  if (length <= 0 || width <= 0 || height <= 0) {
    // Default to small box if no dimensions
    length = length || 12;
    width = width || 8;
    height = height || 6;
  }

  try {
    const result = await getShippingRates({
      fromZip,
      toZip,
      weightOz,
      length,
      width,
      height,
    });

    // Add handling fee if applicable
    const handlingFee = parseFloat(body.handlingFee) || 0;
    const rates = result.rates.map((r) => ({
      ...r,
      rate: Math.round((r.rate + handlingFee) * 100) / 100,
      handlingFee: handlingFee > 0 ? handlingFee : undefined,
    }));

    return NextResponse.json({
      shipmentId: result.shipmentId,
      rates,
      fromZip,
      toZip,
      parcel: { weightOz, length, width, height },
    });
  } catch (err: any) {
    console.error("[shipping/rates] EasyPost error:", err);
    return NextResponse.json({ error: err.message || "Rate calculation failed" }, { status: 502 });
  }
}
