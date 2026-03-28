import { NextRequest, NextResponse } from "next/server";
import { getCatalogCategories, getCatalogProducts } from "@/lib/printful";

/**
 * GET /api/printful/catalog?categoryId=123
 * Browse Printful's public product catalog. No auth required.
 * Returns categories when no categoryId is given, or products for a category.
 */
export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId");

  try {
    if (categoryId) {
      const products = await getCatalogProducts(Number(categoryId));
      return NextResponse.json({ products });
    }

    // Return both categories and all products for initial catalog view
    const [categories, products] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts(),
    ]);

    return NextResponse.json({ categories, products });
  } catch (err: any) {
    console.error("Catalog fetch error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to fetch catalog" },
      { status: err.code || 500 }
    );
  }
}
