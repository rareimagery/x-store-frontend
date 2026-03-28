'use client';
/* eslint-disable @next/next/no-img-element */

import type { TemplatePreviewProps } from './types';

const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80';

export function ModernCartTemplate({ handle, avatar, banner, bio, products }: TemplatePreviewProps) {
  const heroBackground =
    banner ||
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1800&q=80';

  return (
    <div className="min-h-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-100">
      <section className="relative">
        <div className="absolute inset-0">
          <img src={heroBackground} alt="Storefront background" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/70" />
        </div>

        <div className="relative p-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={handle} className="h-12 w-12 rounded-full border border-white/40 object-cover shadow-lg" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-bold text-zinc-300">
                  @{handle.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Featured Creator</p>
                <p className="text-sm font-semibold text-white">@{handle}</p>
              </div>
            </div>
            <button className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900">Shop Now</button>
          </div>

          <h2 className="max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
            A Modern Storefront Built For Drops, Collections, and Daily Creator Commerce.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-200">
            {bio || 'Premium visuals, fast checkout flow, and product storytelling tailored for creator-led brands.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-200">
            <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1">New Collection</span>
            <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1">Creator Exclusive</span>
            <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1">Limited Inventory</span>
          </div>
        </div>
      </section>

      <section className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Featured Products</h3>
          <span className="text-xs text-zinc-400">{products.length} items</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {products.slice(0, 4).map((product) => (
            <article key={product.id} className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/80">
              <div className="relative h-40 overflow-hidden bg-zinc-800">
                <img
                  src={product.image || FALLBACK_PRODUCT_IMAGE}
                  alt={product.title}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <div className="space-y-2 p-4 text-sm">
                <p className="font-medium text-zinc-100">{product.title}</p>
                <p className="line-clamp-2 text-xs text-zinc-400">
                  {product.description || 'Crafted for creators who want premium quality and standout visual identity.'}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm font-semibold text-white">${product.price}</p>
                  <button className="rounded-md border border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 transition hover:border-zinc-400 hover:text-white">
                    View
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
