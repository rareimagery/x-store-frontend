"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/drupal";

export default function AddToCartBlock({
  product,
  onVariationChange,
}: {
  product: ProductDetail;
  onVariationChange?: (variationIndex: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const updateVariation = (idx: number) => {
    setSelectedVariation(idx);
    onVariationChange?.(idx);
  };
  const [customNote, setCustomNote] = useState("");
  const [addedToCart, setAddedToCart] = useState(false);

  const isDigital = product.product_type === "digital_download";
  const variations = product.variations;
  const currentVariation = variations[selectedVariation] ?? variations[0];

  // Group variant attributes
  const attrGroups: Record<string, string[]> = {};
  for (const v of variations) {
    for (const [key, val] of Object.entries(v.attributes)) {
      if (!attrGroups[key]) attrGroups[key] = [];
      if (!attrGroups[key].includes(val)) attrGroups[key].push(val);
    }
  }

  const [adding, setAdding] = useState(false);

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          item: {
            productId: product.id,
            variationId: currentVariation?.id || product.id,
            printfulVariantId: (currentVariation as any)?.printful_variant_id || null,
            title: product.title,
            price: currentVariation?.price || product.price,
            imageUrl: product.images?.[0] || null,
            quantity,
            size: currentVariation?.attributes?.size || null,
            color: currentVariation?.attributes?.color || null,
            storeSlug: product.store_slug || "",
            sellerUsername: product.store_slug || "",
          },
        }),
      });
      if (res.ok) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      }
    } catch {} finally {
      setAdding(false);
    }
  };

  const attrLabels: Record<string, string> = {
    size: "Size",
    color: "Color",
    license_tier: "License",
    color_finish: "Color / Finish",
    size_option: "Size",
    material_option: "Material",
  };

  return (
    <div className="space-y-4">
      {/* Variant selectors */}
      {Object.entries(attrGroups).map(([attrKey, values]) => {
        if (values.length <= 1 && !values[0]) return null;

        return (
          <div key={attrKey}>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              {attrLabels[attrKey] || attrKey.replace(/_/g, " ")}
            </label>

            {attrKey === "license_tier" ? (
              // Radio cards for license tiers
              <div className="space-y-2">
                {values.filter(Boolean).map((val) => {
                  const matchingVar = variations.findIndex((v) =>
                    v.attributes[attrKey] === val
                  );
                  const varData = variations[matchingVar];

                  return (
                    <button
                      key={val}
                      onClick={() =>
                        matchingVar >= 0 && updateVariation(matchingVar)
                      }
                      className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                        selectedVariation === matchingVar
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{val}</span>
                        {varData && (
                          <span className="font-bold">
                            ${parseFloat(varData.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Button grid for sizes, colors, etc.
              <div className="flex flex-wrap gap-2">
                {values.filter(Boolean).map((val) => {
                  const matchingVar = variations.findIndex(
                    (v) => v.attributes[attrKey] === val
                  );
                  const varData = variations[matchingVar];
                  const outOfStock =
                    varData?.stock !== null && varData?.stock === 0;

                  return (
                    <button
                      key={val}
                      onClick={() =>
                        !outOfStock &&
                        matchingVar >= 0 &&
                        updateVariation(matchingVar)
                      }
                      disabled={outOfStock}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                        outOfStock
                          ? "cursor-not-allowed border-zinc-100 text-zinc-300 line-through"
                          : selectedVariation === matchingVar
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Customization field for crafts */}
      {product.customizable && (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Personalization Note
          </label>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add your personalization details..."
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}

      {/* Quantity + Add to Cart */}
      <div className="flex items-center gap-3">
        {/* Quantity selector (hidden for digital) */}
        {!isDigital && (
          <div className="flex items-center rounded-lg border border-zinc-300">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-zinc-500 transition hover:text-zinc-900"
              aria-label="Decrease quantity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              min={1}
              max={currentVariation?.stock ?? 99}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(
                      currentVariation?.stock ?? 99,
                      parseInt(e.target.value) || 1
                    )
                  )
                )
              }
              className="w-12 border-x border-zinc-300 py-2 text-center text-sm text-zinc-900 focus:outline-none"
            />
            <button
              onClick={() =>
                setQuantity(
                  Math.min(currentVariation?.stock ?? 99, quantity + 1)
                )
              }
              className="px-3 py-2 text-zinc-500 transition hover:text-zinc-900"
              aria-label="Increase quantity"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          className={`flex-1 rounded-full py-3 text-sm font-semibold text-white transition ${
            addedToCart
              ? "bg-green-600"
              : "bg-zinc-900 hover:bg-zinc-700"
          }`}
        >
          {addedToCart
            ? "Added to Cart!"
            : isDigital
            ? `Buy Now - $${parseFloat(currentVariation?.price ?? product.price).toFixed(2)}`
            : `Add to Cart - $${parseFloat(currentVariation?.price ?? product.price).toFixed(2)}`}
        </button>
      </div>

      {/* Secondary actions */}
      <div className="flex gap-3">
        {!isDigital && (
          <button
            onClick={async () => {
              await handleAddToCart();
              window.location.href = "/cart";
            }}
            className="flex-1 rounded-full border-2 border-zinc-900 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-900 hover:text-white"
          >
            Buy Now
          </button>
        )}
        <button
          className="flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2.5 text-zinc-500 transition hover:border-zinc-400 hover:text-red-500"
          aria-label="Save to wishlist"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        <button
          className="flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2.5 text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
          aria-label="Share"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: product.title,
                url: window.location.href,
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* Stock status */}
      {currentVariation?.stock !== null && currentVariation?.stock !== undefined && (
        <p className="text-xs text-zinc-500">
          {currentVariation.stock === 0 ? (
            <span className="font-semibold text-red-600">Sold Out</span>
          ) : currentVariation.stock <= 5 ? (
            <span className="font-semibold text-amber-600">
              Low Stock - Only {currentVariation.stock} left!
            </span>
          ) : (
            <span className="text-green-600">In Stock</span>
          )}
        </p>
      )}
    </div>
  );
}
