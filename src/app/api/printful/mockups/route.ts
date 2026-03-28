import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyStoreOwnership, isValidUUID } from "@/lib/ownership";
import {
  getStorePrintfulKey,
  createMockupTask,
  getPrintfileInfo,
  getMockupTemplates,
} from "@/lib/printful";

/**
 * POST /api/printful/mockups — Start mockup generation (async)
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeId, productId, files, variantIds, format } = await req.json();

    if (!storeId || !isValidUUID(storeId)) {
      return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
    }
    if (!productId || !files?.length) {
      return NextResponse.json(
        { error: "productId and files required" },
        { status: 400 }
      );
    }

    if (!(await verifyStoreOwnership(token, storeId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Printful not connected for this store" },
        { status: 400 }
      );
    }

    const task = await createMockupTask(
      apiKey,
      Number(productId),
      files,
      variantIds,
      format
    );

    return NextResponse.json({
      success: true,
      task_key: task.task_key,
    });
  } catch (err: any) {
    console.error("Mockup generation error:", err.message);
    return NextResponse.json(
      { error: err.message || "Mockup generation failed" },
      { status: err.code || 500 }
    );
  }
}

/**
 * GET /api/printful/mockups?storeId=...&productId=...&info=printfiles|templates
 * Get printfile dimensions or available templates for a product.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  const productId = req.nextUrl.searchParams.get("productId");
  const info = req.nextUrl.searchParams.get("info") || "printfiles";

  if (!storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "Valid storeId required" }, { status: 400 });
  }
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  try {
    const apiKey = await getStorePrintfulKey(storeId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "Printful not connected" },
        { status: 400 }
      );
    }

    if (info === "templates") {
      const templates = await getMockupTemplates(apiKey, Number(productId));
      return NextResponse.json({ templates });
    }

    const printfiles = await getPrintfileInfo(apiKey, Number(productId));
    return NextResponse.json({ printfiles });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch mockup info" },
      { status: err.code || 500 }
    );
  }
}
