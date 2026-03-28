import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStorePrintfulKey, getMockupTaskResult } from "@/lib/printful";
import { isValidUUID } from "@/lib/ownership";

/**
 * GET /api/printful/mockups/[taskKey]?storeId=...
 * Poll mockup generation task status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskKey: string }> }
) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskKey } = await params;
  const storeId = req.nextUrl.searchParams.get("storeId");

  if (!storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
  }

  try {
    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Printful not connected" },
        { status: 400 }
      );
    }

    const result = await getMockupTaskResult(apiKey, taskKey);

    return NextResponse.json({
      status: result.status,
      mockups: result.mockups || [],
      error: result.error || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to check mockup status" },
      { status: err.code || 500 }
    );
  }
}
