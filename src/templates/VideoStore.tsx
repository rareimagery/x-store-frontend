'use client';
/* eslint-disable @next/next/no-img-element */

import type { TemplatePreviewProps } from './types';

export function VideoStoreTemplate({ handle, avatar, bio, videos }: TemplatePreviewProps) {
  const clips = videos.slice(0, 6);

  return (
    <div className="min-h-full overflow-hidden rounded-2xl border border-emerald-400/30 bg-[linear-gradient(180deg,#05070f,#102329)] text-white">
      <section className="border-b border-emerald-300/20 bg-black/25 px-5 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt={handle} className="h-12 w-12 rounded-full border border-emerald-300/30 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/30 bg-black/30 text-sm font-bold">
                @{handle.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold tracking-wide">@{handle}</p>
              <p className="text-xs text-emerald-200">{bio || 'Video-first commerce with cinematic product storytelling.'}</p>
            </div>
          </div>
          <button className="rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/20">
            Join Channel
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-300/30 bg-black/35 p-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="relative h-52 overflow-hidden rounded-xl border border-emerald-300/25 bg-black/40">
              {clips[0]?.thumbnail ? (
                <img src={clips[0].thumbnail} alt="Featured clip" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-900/30 to-cyan-900/25" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
              <button className="absolute left-4 top-4 rounded-full border border-white/40 bg-black/50 px-3 py-1 text-xs font-semibold">
                Play Featured
              </button>
              <p className="absolute bottom-3 left-4 text-sm font-semibold">Behind the Drop: Creator Process</p>
            </div>

            <div className="space-y-2 text-sm text-emerald-100">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Broadcast schedule</p>
              <div className="rounded-lg border border-emerald-300/25 bg-black/35 px-3 py-2">Mon - Product reveal</div>
              <div className="rounded-lg border border-emerald-300/25 bg-black/35 px-3 py-2">Wed - Behind the scenes</div>
              <div className="rounded-lg border border-emerald-300/25 bg-black/35 px-3 py-2">Fri - Live drop launch</div>
              <div className="rounded-lg border border-emerald-300/25 bg-black/35 px-3 py-2">Sun - Community recap</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-100">Video clips</h3>
          <span className="text-xs text-emerald-200/80">{clips.length} clips</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {clips.map((video) => (
            <div key={video.id} className="overflow-hidden rounded-lg border border-emerald-300/30 bg-white/5 p-2 text-xs">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.id} className="h-20 w-full rounded object-cover" />
              ) : (
                <div className="h-20 w-full rounded bg-black/30" />
              )}
              <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-200/90">
                <span>Clip {video.id}</span>
                <span>00:45</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-emerald-300/20 bg-black/20 px-5 py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-100">Shoppable bundles</h3>
          <span className="text-xs text-emerald-200/80">Ready to buy from video</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-300/30 bg-black/35 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Starter pack</p>
            <p className="mt-1 text-sm text-emerald-50">Top clip assets + creator bonus content + quick-start guide</p>
            <button className="mt-3 rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-semibold transition hover:bg-emerald-400/20">
              Add bundle
            </button>
          </div>
          <div className="rounded-xl border border-emerald-300/30 bg-black/35 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Pro drop bundle</p>
            <p className="mt-1 text-sm text-emerald-50">Extended cut videos + licensed assets + subscriber-only download</p>
            <button className="mt-3 rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-semibold transition hover:bg-emerald-400/20">
              Unlock bundle
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
