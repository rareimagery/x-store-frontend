"use client";

import { useState } from "react";
import type { ProductDetail, ProductImage } from "@/lib/drupal";
import ProductGallery from "./ProductGallery";
import AddToCartBlock from "./AddToCartBlock";

export default function ProductDetailClient({
  product,
  baseImages,
}: {
  product: ProductDetail;
  baseImages: ProductImage[];
}) {
  const [activeVariation, setActiveVariation] = useState(0);

  // Build images array: if the selected variation has front/back URLs, use those
  const currentVar = product.variations[activeVariation] ?? product.variations[0];
  const variantImages: ProductImage[] = [];

  if (currentVar?.front_image_url) {
    variantImages.push({ url: currentVar.front_image_url, alt: `${product.title} - Front` });
  }
  if (currentVar?.back_image_url) {
    variantImages.push({ url: currentVar.back_image_url, alt: `${product.title} - Back` });
  }

  // Use variant-specific images if available, otherwise fall back to base product images
  const displayImages = variantImages.length > 0 ? variantImages : baseImages;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Left: Image Gallery — reacts to color changes */}
      <ProductGallery images={displayImages} title={product.title} />

      {/* Right: Product Info */}
      <div className="space-y-6">
        {product.variations.length > 0 && (
          <AddToCartBlock
            product={product}
            onVariationChange={setActiveVariation}
          />
        )}
      </div>
    </div>
  );
}
