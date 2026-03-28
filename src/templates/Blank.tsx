'use client';
/* eslint-disable @next/next/no-img-element */

import type { TemplatePreviewProps } from './types';

export function BlankTemplate({ handle, avatar, bio }: TemplatePreviewProps) {
  return (
    <div className="min-h-full overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-900 text-zinc-100">
      <section className="border-b border-zinc-700 bg-zinc-950/70 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt={handle} className="h-12 w-12 rounded-full border border-zinc-700 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-bold text-zinc-300">
                @{handle.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">@{handle}</p>
              <p className="text-xs text-zinc-400">{bio || 'Starter framework ready for your custom creator site.'}</p>
            </div>
          </div>
          <button className="rounded-full border border-zinc-600 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white">
            Publish Draft
          </button>
        </div>
      </section>

      <section className="grid gap-4 px-5 py-5 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Hero section</p>
            <p className="mt-2 text-sm text-zinc-300">Add headline, CTA buttons, and your most important launch message.</p>
          </div>
          <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Product grid</p>
            <p className="mt-2 text-sm text-zinc-300">Drop in featured products, pricing, and buy actions.</p>
          </div>
          <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Content stream</p>
            <p className="mt-2 text-sm text-zinc-300">Embed latest posts, updates, and launch notes for your audience.</p>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">About card</p>
            <p className="mt-2 text-sm text-zinc-300">Introduce your creator brand and what subscribers get.</p>
          </div>
          <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Newsletter</p>
            <p className="mt-2 text-sm text-zinc-300">Collect emails for launch alerts and premium drop announcements.</p>
          </div>
          <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Social proof</p>
            <p className="mt-2 text-sm text-zinc-300">Add testimonials, follower stats, and highlight milestones.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
