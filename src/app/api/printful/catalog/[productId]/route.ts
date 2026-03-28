import { NextRequest, NextResponse } from "next/server";
import { getCatalogProduct, getProductSizes } from "@/lib/printful";

/**
 * GET /api/printful/catalog/[productId]?sizes=true
 * Get product details + variants from Printful catalog. No auth required.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const includeSizes = req.nextUrl.searchParams.get("sizes") === "true";

  try {
    const { product, variants } = await getCatalogProduct(Number(productId));

    // Filter to in-stock variants only
    const availableVariants = variants.filter((v) => v.in_stock);

    const result: Record<string, any> = {
      product,
      variants: availableVariants,
      totalVariants: variants.length,
      availableVariants: availableVariants.length,
    };

    if (includeSizes) {
      result.sizes = await getProductSizes(Number(productId));
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Catalog product fetch error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to fetch product" },
      { status: err.code || 500 }
    );
  }
}
