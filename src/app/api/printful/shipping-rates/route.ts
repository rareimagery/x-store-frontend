import { NextRequest, NextResponse } from "next/server";
import { getStorePrintfulKey, getShippingRates } from "@/lib/printful";
import { isValidUUID } from "@/lib/ownership";

/**
 * POST /api/printful/shipping-rates
 * Calculate shipping rates for given items + recipient. Use during checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, recipient, items } = await req.json();

    if (!storeId || !isValidUUID(storeId)) {
      return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
    }
    if (!recipient || !items?.length) {
      return NextResponse.json(
        { error: "recipient and items required" },
        { status: 400 }
      );
    }

    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Printful not connected for this store" },
        { status: 400 }
      );
    }

    const rates = await getShippingRates(apiKey, recipient, items);

    return NextResponse.json({ rates });
  } catch (err: any) {
    console.error("Printful shipping rates error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to get shipping rates" },
      { status: err.code || 500 }
    );
  }
}
