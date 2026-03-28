import { NextRequest, NextResponse } from "next/server";
import {
  getStorePrintfulKey,
  estimateOrderCosts,
  type PrintfulOrderCreate,
} from "@/lib/printful";
import { isValidUUID } from "@/lib/ownership";

/**
 * POST /api/printful/orders/estimate
 * Estimate costs without creating an order. Use during checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, recipient, items, shipping } = await req.json();

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

    const estimate = await estimateOrderCosts(apiKey, {
      recipient,
      items,
      shipping: shipping || "STANDARD",
    } as PrintfulOrderCreate);

    return NextResponse.json({
      costs: estimate.costs,
      retail_costs: estimate.retail_costs,
    });
  } catch (err: any) {
    console.error("Printful estimate error:", err.message);
    return NextResponse.json(
      { error: err.message || "Cost estimation failed" },
      { status: err.code || 500 }
    );
  }
}
