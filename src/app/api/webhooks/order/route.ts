import { NextRequest, NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalWriteHeaders } from "@/lib/drupal";

const WEBHOOK_SECRET = process.env.ORDER_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/order
 *
 * Receives payment confirmation (from Stripe webhook or internal call)
 * and syncs the order to Drupal Commerce + triggers Printful fulfillment.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Verify webhook secret if provided
  const secret = req.headers.get("x-webhook-secret") || req.headers.get("x-drupal-webhook-key");
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    order_id,
    status,
    payment_provider,
    seller_handle,
    buyer_email,
    items,
    total,
    currency,
  } = body;

  if (!order_id || !status) {
    return NextResponse.json({ error: "order_id and status required" }, { status: 400 });
  }

  try {
    // 1. Create/update order in Drupal Commerce
    const writeHeaders = await drupalWriteHeaders();

    // Check if order exists
    const checkRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_order/default?filter[field_external_order_id]=${encodeURIComponent(order_id)}`,
      { headers: { ...writeHeaders, Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    let drupalOrderId: string | null = null;

    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      drupalOrderId = checkJson.data?.[0]?.id ?? null;
    }

    if (drupalOrderId) {
      // Update existing order status
      await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_order/default/${drupalOrderId}`, {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: "commerce_order--default",
            id: drupalOrderId,
            attributes: {
              state: status === "paid" ? "completed" : status === "refunded" ? "canceled" : "draft",
            },
          },
        }),
      });
    }

    // 2. Trigger Printful fulfillment if paid and seller has Printful connected
    if (status === "paid" && seller_handle && items?.length) {
      try {
        const { getStorePrintfulKey } = await import("@/lib/printful");

        // Resolve store UUID
        const storeRes = await fetch(
          `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(seller_handle)}`,
          { headers: { ...writeHeaders, Accept: "application/vnd.api+json" }, cache: "no-store" }
        );

        if (storeRes.ok) {
          const storeJson = await storeRes.json();
          const storeUuid = storeJson.data?.[0]?.id;

          if (storeUuid) {
            const printfulKey = await getStorePrintfulKey(storeUuid);

            if (printfulKey) {
              const { createOrder } = await import("@/lib/printful");

              // Use shipping address from payload, or skip Printful if missing
              const shipping = body.shipping_address;
              if (!shipping?.address1 || !shipping?.city) {
                console.warn("[webhook] Skipping Printful — no shipping address in payload");
              } else {
                await createOrder(printfulKey, {
                  external_id: `ri_ord_${order_id}`,
                  recipient: {
                    name: shipping.name || buyer_email || "Customer",
                    email: buyer_email,
                    address1: shipping.address1,
                    address2: shipping.address2 || "",
                    city: shipping.city,
                    state_code: shipping.state_code || "",
                    country_code: shipping.country_code || "US",
                    zip: shipping.zip || "",
                  },
                  items: items.map((item: any) => ({
                    external_id: `ri_item_${item.id || item.sku}`,
                    variant_id: item.printful_variant_id,
                    quantity: item.quantity || 1,
                    retail_price: String(item.price),
                    name: item.name,
                  })),
                });
                console.log(`[webhook] Printful order created for ${seller_handle}, order ${order_id}`);
              }
            }
          }
        }
      } catch (err) {
        console.warn("[webhook] Printful fulfillment failed (non-blocking):", err);
      }
    }

    return NextResponse.json({
      ok: true,
      order_id,
      status,
      drupal_synced: !!drupalOrderId,
    });
  } catch (err: any) {
    console.error("[webhook] Order processing failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
