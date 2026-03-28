import { NextRequest, NextResponse } from "next/server";
import { drupalWriteHeaders } from "@/lib/drupal";
import type { PrintfulWebhookPayload } from "@/lib/printful";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * POST /api/printful/webhook
 * Receives webhook events from Printful. No auth header — Printful
 * just POSTs to this URL. We process the event and update Drupal accordingly.
 */
export async function POST(req: NextRequest) {
  try {
    const payload: PrintfulWebhookPayload = await req.json();
    const { type, data } = payload;

    console.log(`[printful-webhook] Received event: ${type}`, {
      store: payload.store,
      retries: payload.retries,
    });

    switch (type) {
      case "package_shipped":
        await handlePackageShipped(data);
        break;

      case "order_failed":
        await handleOrderFailed(data);
        break;

      case "order_canceled":
        await handleOrderCanceled(data);
        break;

      case "order_put_hold":
      case "order_put_hold_approval":
        await handleOrderHold(data, type);
        break;

      case "order_remove_hold":
        await handleOrderRemoveHold(data);
        break;

      case "order_updated":
        await handleOrderUpdated(data);
        break;

      case "stock_updated":
        await handleStockUpdated(data);
        break;

      case "package_returned":
        await handlePackageReturned(data);
        break;

      default:
        console.log(`[printful-webhook] Unhandled event type: ${type}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[printful-webhook] Processing error:", err);
    // Still return 200 to prevent Printful from retrying
    return NextResponse.json({ received: true, error: "processing_failed" });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handlePackageShipped(data: PrintfulWebhookPayload["data"]) {
  const order = data.order;
  const shipment = data.shipment;
  if (!order?.external_id || !shipment) return;

  // Extract our Drupal order ID from external_id (ri_ord_123 → 123)
  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  if (!drupalOrderId) return;

  console.log(
    `[printful-webhook] Package shipped for order ${drupalOrderId}`,
    { tracking: shipment.tracking_number, carrier: shipment.carrier }
  );

  // Update the Drupal commerce order state
  await updateDrupalOrderState(drupalOrderId, "fulfillment", {
    field_tracking_number: shipment.tracking_number,
    field_tracking_url: shipment.tracking_url,
    field_carrier: shipment.carrier,
    field_printful_status: "shipped",
  });
}

async function handleOrderFailed(data: PrintfulWebhookPayload["data"]) {
  const order = data.order;
  if (!order?.external_id) return;

  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  console.warn(
    `[printful-webhook] Order failed: ${drupalOrderId}`,
    { reason: data.reason }
  );

  await updateDrupalOrderState(drupalOrderId, "draft", {
    field_printful_status: "failed",
    field_printful_error: data.reason || "Order failed at Printful",
  });
}

async function handleOrderCanceled(data: PrintfulWebhookPayload["data"]) {
  const order = data.order;
  if (!order?.external_id) return;

  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  console.log(`[printful-webhook] Order canceled: ${drupalOrderId}`);

  await updateDrupalOrderState(drupalOrderId, "canceled", {
    field_printful_status: "canceled",
  });
}

async function handleOrderHold(
  data: PrintfulWebhookPayload["data"],
  eventType: string
) {
  const order = data.order;
  if (!order?.external_id) return;

  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  console.log(`[printful-webhook] Order on hold: ${drupalOrderId} (${eventType})`);

  await updateDrupalOrderState(drupalOrderId, undefined, {
    field_printful_status: "on_hold",
  });
}

async function handleOrderRemoveHold(data: PrintfulWebhookPayload["data"]) {
  const order = data.order;
  if (!order?.external_id) return;

  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  console.log(`[printful-webhook] Order hold removed: ${drupalOrderId}`);

  await updateDrupalOrderState(drupalOrderId, undefined, {
    field_printful_status: order.status || "pending",
  });
}

async function handleOrderUpdated(data: PrintfulWebhookPayload["data"]) {
  const order = data.order;
  if (!order?.external_id) return;

  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  console.log(`[printful-webhook] Order updated: ${drupalOrderId}`, {
    status: order.status,
  });

  await updateDrupalOrderState(drupalOrderId, undefined, {
    field_printful_status: order.status,
  });
}

async function handleStockUpdated(data: PrintfulWebhookPayload["data"]) {
  // Stock updates contain sync product info — update variant availability in Drupal
  const syncProduct = data.sync_product;
  if (!syncProduct) return;

  console.log(
    `[printful-webhook] Stock updated for product ${syncProduct.id} (${syncProduct.name})`
  );

  // Find the Drupal product by Printful product ID and update availability
  if (!DRUPAL_API) return;

  try {
    const params = new URLSearchParams({
      "filter[field_printful_product_id]": String(syncProduct.id),
    });

    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/printful?${params}`,
      { headers: { ...(await getWriteHeaders()) } }
    );

    if (res.ok) {
      const json = await res.json();
      if (json.data?.length > 0) {
        console.log(
          `[printful-webhook] Found Drupal product for stock update: ${json.data[0].id}`
        );
        // Stock level updates would require fetching variant-level data from Printful
        // and updating each Drupal variation's field_stock — handled in a future iteration
      }
    }
  } catch (err) {
    console.error("[printful-webhook] Stock update processing error:", err);
  }
}

async function handlePackageReturned(data: PrintfulWebhookPayload["data"]) {
  const order = data.order;
  if (!order?.external_id) return;

  const drupalOrderId = order.external_id.replace("ri_ord_", "");
  console.log(`[printful-webhook] Package returned for order: ${drupalOrderId}`);

  await updateDrupalOrderState(drupalOrderId, undefined, {
    field_printful_status: "returned",
  });
}

// ---------------------------------------------------------------------------
// Drupal update helpers
// ---------------------------------------------------------------------------

async function getWriteHeaders(): Promise<Record<string, string>> {
  return drupalWriteHeaders();
}

async function updateDrupalOrderState(
  drupalOrderId: string,
  state: string | undefined,
  extraFields: Record<string, string>
): Promise<void> {
  if (!DRUPAL_API) return;

  try {
    // Find the order by drupal_internal__order_id
    const findRes = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_order/default?filter[drupal_internal__order_id]=${drupalOrderId}`,
      { headers: { ...(await getWriteHeaders()) } }
    );

    if (!findRes.ok) return;
    const findJson = await findRes.json();
    const orderEntity = findJson.data?.[0];
    if (!orderEntity) return;

    const attributes: Record<string, any> = { ...extraFields };
    if (state) attributes.state = state;

    const writeHeaders = await getWriteHeaders();
    await fetch(
      `${DRUPAL_API}/jsonapi/commerce_order/default/${orderEntity.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/vnd.api+json",
          ...writeHeaders,
        },
        body: JSON.stringify({
          data: {
            type: "commerce_order--default",
            id: orderEntity.id,
            attributes,
          },
        }),
      }
    );
  } catch (err) {
    console.error(
      `[printful-webhook] Failed to update Drupal order ${drupalOrderId}:`,
      err
    );
  }
}
