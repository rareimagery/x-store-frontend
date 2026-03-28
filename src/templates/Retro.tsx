'use client';

/* eslint-disable @next/next/no-img-element */

import type { TemplatePreviewProps } from './types';

export function RetroTemplate({ handle, avatar, bio, products }: TemplatePreviewProps) {
  const featured = products.slice(0, 6);

  return (
    <div className="min-h-full overflow-hidden rounded-2xl border border-pink-300/40 bg-[linear-gradient(135deg,#1d1240,#5f0f69_45%,#0c4a6e)] text-white">
      <div className="border-b border-white/20 bg-black/35 px-5 py-2 text-xs uppercase tracking-[0.2em] text-pink-100">
        Rareimagery creator template - Retro launch edition
      </div>

      <section className="px-5 pb-6 pt-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/25 bg-black/30 p-4">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt={handle} className="h-14 w-14 rounded-full border border-white/40 object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/40 text-base font-bold">
                @{handle.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-black uppercase tracking-wide">@{handle}</p>
              <p className="text-xs text-pink-100">{bio || 'Retro profile vibes, vivid drops, and creator-first merch.'}</p>
            </div>
          </div>
          <button className="rounded-full border border-pink-200/70 bg-pink-300/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-pink-300/35">
            Subscribe
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr,1fr]">
          <div className="rounded-2xl border border-white/25 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-pink-100">Drop this week</p>
            <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight sm:text-3xl">
              Creator capsule collection with limited inventory and collector bundles.
            </h2>
            <p className="mt-2 text-sm text-pink-100/90">
              Launch physical and digital drops together. Feature one hero product and funnel visitors into curated sets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1">Limited Run</span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1">Digital Bundle</span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1">Collector Tier</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/25 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-pink-100">Collection menu</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Streetwear essentials</div>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Prints and posters</div>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Creator toolkits</div>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Subscribers only</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/15 bg-black/25 px-5 py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-pink-100">Featured products</h3>
          <span className="text-xs text-pink-100/80">{featured.length} items</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-xl border border-white/25 bg-black/35">
              <div className="h-32 bg-black/40">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-pink-100/70">No Image</div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm font-semibold leading-tight">{product.title}</p>
                <p className="line-clamp-2 text-xs text-pink-100/85">
                  {product.description || 'Premium creator drop with collectible styling and fast checkout.'}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">${product.price.toFixed(2)}</p>
                  <button className="rounded-full border border-pink-200/70 px-3 py-1 text-xs font-semibold transition hover:bg-pink-300/25">
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/15 bg-black/35 px-5 py-4 text-xs text-pink-100/85">
        <p className="font-semibold uppercase tracking-[0.16em]">Fan quotes</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">&quot;Best creator merch UI I have seen this month.&quot;</p>
          <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">&quot;Easy to browse, clear tiers, and fast checkout flow.&quot;</p>
        </div>
      </section>
    </div>
  );
}
