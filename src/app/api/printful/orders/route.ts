import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyStoreOwnership, isValidUUID } from "@/lib/ownership";
import {
  getStorePrintfulKey,
  createOrder,
  listOrders,
  orderExternalId,
  type PrintfulOrderCreate,
} from "@/lib/printful";

/**
 * POST /api/printful/orders — Create a Printful order for fulfillment
 * Called after customer payment succeeds.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      storeId,
      drupalOrderId,
      recipient,
      items,
      shipping,
      retailCosts,
      confirm: autoConfirm,
    } = await req.json();

    if (!storeId || !isValidUUID(storeId)) {
      return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
    }
    if (!recipient || !items?.length) {
      return NextResponse.json({ error: "recipient and items required" }, { status: 400 });
    }

    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Printful not connected for this store" },
        { status: 400 }
      );
    }

    const orderPayload: PrintfulOrderCreate = {
      external_id: drupalOrderId ? orderExternalId(drupalOrderId) : undefined,
      shipping: shipping || "STANDARD",
      recipient,
      items,
      retail_costs: retailCosts,
      confirm: autoConfirm ?? true,
    };

    const order = await createOrder(apiKey, orderPayload);

    return NextResponse.json({
      success: true,
      printful_order_id: order.id,
      external_id: order.external_id,
      status: order.status,
      costs: order.costs,
      dashboard_url: order.dashboard_url,
    });
  } catch (err: any) {
    console.error("Printful order creation error:", err.message);
    return NextResponse.json(
      { error: err.message || "Order creation failed" },
      { status: err.code || 500 }
    );
  }
}

/**
 * GET /api/printful/orders?storeId=...&offset=0&limit=20
 * List Printful orders for a store.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  if (!storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json({ orders: [], total: 0 });
    }

    const res = await listOrders(apiKey, offset, limit);

    return NextResponse.json({
      orders: res.result,
      total: res.paging?.total || 0,
      offset,
      limit,
    });
  } catch (err: any) {
    console.error("Printful orders list error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to list orders" },
      { status: err.code || 500 }
    );
  }
}
