"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CartItem {
  id: string;
  productId: string;
  variationId: string;
  printfulVariantId?: string;
  title: string;
  price: string;
  imageUrl: string | null;
  quantity: number;
  size?: string;
  color?: string;
  storeSlug: string;
  sellerUsername?: string;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateQuantity = async (itemId: string, quantity: number) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", itemId, quantity }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  };

  const removeItem = async (itemId: string) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", itemId }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);
    setError("");

    // Group items by store slug (each store needs separate checkout)
    const storeSlug = items[0]?.storeSlug;

    try {
      const res = await fetch("/api/checkout/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, storeSlug }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        // Clear cart before redirect
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear" }),
        });
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
  const platformFee = Math.round(subtotal * 0.029 * 100) / 100 + 0.30;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Cart</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition">
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="mt-3 text-sm text-zinc-400">Your cart is empty</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition">
              Browse Stores
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  {/* Image */}
                  <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {item.size && <span className="text-[11px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">{item.size}</span>}
                      {item.color && <span className="text-[11px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">{item.color}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center rounded-lg border border-zinc-700">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 text-xs text-white min-w-[24px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 10}
                          className="px-2 py-1 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] text-zinc-500 hover:text-red-400 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-indigo-400">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-zinc-500">${parseFloat(item.price).toFixed(2)} each</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 mb-4">
              <h2 className="text-sm font-semibold mb-3">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""})</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-xs">
                  <span>Processing fee</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-xs">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between font-semibold text-white">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={checkingOut || items.length === 0}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {checkingOut ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Checkout — ${subtotal.toFixed(2)}
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-zinc-600">
              Secure checkout powered by Stripe. Your payment goes directly to the creator.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
