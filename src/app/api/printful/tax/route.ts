import { NextRequest, NextResponse } from "next/server";
import {
  getStorePrintfulKey,
  getTaxRates,
  getTaxCountries,
} from "@/lib/printful";
import { isValidUUID } from "@/lib/ownership";

/**
 * POST /api/printful/tax — Calculate tax rates for a recipient address
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId, recipient } = await req.json();

    if (!storeId || !isValidUUID(storeId)) {
      return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
    }
    if (!recipient?.country_code) {
      return NextResponse.json(
        { error: "recipient with country_code required" },
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

    const tax = await getTaxRates(apiKey, recipient);

    return NextResponse.json({ tax });
  } catch (err: any) {
    console.error("Printful tax error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to calculate tax" },
      { status: err.code || 500 }
    );
  }
}

/**
 * GET /api/printful/tax?storeId=... — List countries where tax applies
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
  }

  try {
    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json({ countries: [] });
    }

    const countries = await getTaxCountries(apiKey);
    return NextResponse.json({ countries });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch tax countries" },
      { status: err.code || 500 }
    );
  }
}
