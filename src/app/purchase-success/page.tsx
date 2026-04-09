"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getStoreUrl } from "@/lib/store-url";

function SuccessContent() {
  const params = useSearchParams();
  const seller = params.get("seller") || "";
  const orderId = params.get("order_id") || params.get("session_id") || "";
  const productName = params.get("product") || "merch";

  const shareText = seller
    ? `Just bought ${productName} from @${seller} on RareImagery! Check out their store`
    : `Just made a purchase on RareImagery!`;
  const shareUrl = seller
    ? getStoreUrl(seller)
    : "https://www.rareimagery.net";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-2">Purchase Confirmed!</h1>
        <p className="text-zinc-400 mb-2">Thank you for your order.</p>
        {orderId && (
          <p className="text-xs text-zinc-600 mb-8">Order: {orderId.slice(0, 20)}</p>
        )}

        {/* Share to X — the main CTA */}
        <a
          href={`https://x.com/intent/tweet?${new URLSearchParams({
            text: shareText,
            url: shareUrl,
          }).toString()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-black transition hover:bg-zinc-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share to X
        </a>

        <p className="mt-3 text-xs text-zinc-600">Let your followers know about your purchase</p>

        {/* Navigation links */}
        <div className="mt-10 flex flex-col gap-3">
          {seller && (
            <Link
              href={`/${seller}/store`}
              className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Back to {seller}&apos;s Store
            </Link>
          )}
          <Link
            href="/console/orders"
            className="rounded-xl border border-zinc-800 px-6 py-3 text-sm font-medium text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
          >
            View My Orders
          </Link>
        </div>

        <div className="mt-12">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
            Powered by RareImagery
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
