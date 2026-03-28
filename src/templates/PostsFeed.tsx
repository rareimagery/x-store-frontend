'use client';
/* eslint-disable @next/next/no-img-element */

import type { TemplatePreviewProps } from './types';

export function PostsFeedTemplate({ handle, avatar, bio, posts }: TemplatePreviewProps) {
  const timeline = posts.slice(0, 5);

  return (
    <div className="min-h-full overflow-hidden rounded-2xl border border-sky-400/30 bg-black text-white">
      <section className="border-b border-zinc-800 px-5 py-4">
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
              <p className="text-sm font-semibold tracking-wide">@{handle}</p>
              <p className="text-xs text-zinc-400">{bio || 'Latest X posts merged with your product catalog.'}</p>
            </div>
          </div>
          <button className="rounded-full border border-sky-400/50 px-3 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/15">
            Follow Creator
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-xs text-zinc-300">
            <p className="text-lg font-bold text-white">5.2K</p>
            Weekly Reach
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-xs text-zinc-300">
            <p className="text-lg font-bold text-white">3.8%</p>
            Click Through
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-xs text-zinc-300">
            <p className="text-lg font-bold text-white">24h</p>
            Response Window
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-5 py-5 lg:grid-cols-[1.3fr,1fr]">
        <div className="space-y-3">
          {timeline.map((post) => (
            <article key={post.id} className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm">
              <p className="leading-relaxed text-zinc-100">{post.text}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>Live now</span>
                {post.linkedProduct ? (
                  <button className="rounded-full border border-sky-400/45 px-3 py-1 text-sky-300 transition hover:bg-sky-500/10">
                    View linked product #{post.linkedProduct}
                  </button>
                ) : (
                  <span>No product tag</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Trending topics</p>
            <div className="mt-2 space-y-2 text-sm text-zinc-200">
              <p className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">Creator workflow systems</p>
              <p className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">Limited drop funnels</p>
              <p className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">Subscriber-only content</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Quick actions</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <button className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-200">Pin post</button>
              <button className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-200">Add offer</button>
              <button className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-200">Run poll</button>
              <button className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-200">Export list</button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
