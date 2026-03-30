"use client";

import { usePathname } from "next/navigation";
import {
  createEmptyPreviewData,
  type BuilderBlock,
  type BuilderDocument,
  type BuilderPreviewData,
} from "@/lib/builderDocument";

function sanitizeEmbedHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on[a-z]+\s*=\s*(['"]).*?\1/gi, "");
}

function normalizeEmbedUrl(url: string): string {
  if (!url) return "";

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  return url;
}

function initials(handle: string): string {
  const clean = handle.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return clean.slice(0, 2) || "RI";
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function renderBlock(
  block: BuilderBlock,
  data: BuilderPreviewData,
  theme: BuilderDocument["theme"],
  showMediaDebug: boolean
) {
  switch (block.type) {
    case "profile-header":
      return (
        <section className="overflow-hidden rounded-[28px] border" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <div
            className="h-48 sm:h-56"
            style={{
              background: data.banner && block.showBanner
                ? `linear-gradient(180deg, rgba(0, 0, 0, 0.10), rgba(0, 0, 0, 0.35)), url(${data.banner}) center/cover`
                : `linear-gradient(135deg, ${theme.menuBg}, ${theme.surfaceMuted})`,
            }}
          />

          <div className="px-5 pb-5 sm:px-6 sm:pb-6" style={{ backgroundColor: theme.surface }}>
            <div className="-mt-16 flex items-start justify-between gap-3 sm:-mt-20">
              {block.showAvatar ? (
                data.avatar ? (
                  <img
                    key={data.avatar}
                    src={data.avatar}
                    alt="Creator avatar"
                    className="h-28 w-28 rounded-full border-4 object-cover shadow-sm sm:h-36 sm:w-36"
                    style={{ borderColor: theme.surface }}
                  />
                ) : (
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-full border-4 text-2xl font-bold shadow-sm sm:h-36 sm:w-36 sm:text-3xl"
                    style={{ borderColor: theme.surface, backgroundColor: theme.sidebarBg, color: theme.textPrimary }}
                  >
                    {initials(data.handle)}
                  </div>
                )
              ) : (
                <div />
              )}

              <button
                type="button"
                className="mt-20 rounded-full border px-4 py-1.5 text-sm font-semibold sm:mt-24"
                style={{ borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }}
              >
                {block.ctaLabel || "Edit profile"}
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <h1 className="truncate text-2xl font-extrabold" style={{ color: theme.textPrimary }}>
                {block.title}
              </h1>
              <p className="text-base" style={{ color: theme.textSecondary }}>
                @{data.handle}
              </p>
              <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>
                {data.bio || block.subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm" style={{ color: theme.textSecondary }}>
                <span>
                  <strong style={{ color: theme.textPrimary }}>{formatCount(data.posts.length)}</strong> Posts
                </span>
                <span>
                  <strong style={{ color: theme.textPrimary }}>{formatCount(data.followerCount)}</strong> Followers
                </span>
                <span>
                  <strong style={{ color: theme.textPrimary }}>{formatCount(data.friends.length)}</strong> Friends
                </span>
              </div>

              {showMediaDebug && (data.avatar || data.banner) ? (
                <div
                  className="mt-3 space-y-1 rounded-xl border px-3 py-2 text-xs"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceMuted, color: theme.textSecondary }}
                >
                  <p className="font-semibold" style={{ color: theme.textPrimary }}>Rendered media URLs</p>
                  <p className="truncate" title={data.avatar || "none"}>avatar: {data.avatar || "none"}</p>
                  <p className="truncate" title={data.banner || "none"}>banner: {data.banner || "none"}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      );
    case "top-menu":
      return (
        <nav className="rounded-[24px] border px-4 py-3" style={{ backgroundColor: theme.menuBg, borderColor: theme.border }}>
          <div className="flex flex-wrap items-center gap-2">
            {block.items.map((item) => (
              <span key={item} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }}>
                {item}
              </span>
            ))}
          </div>
        </nav>
      );
    case "sidebar":
      return (
        <aside className="rounded-[24px] border p-5" style={{ backgroundColor: theme.sidebarBg, borderColor: theme.border }}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textSecondary }}>
            Sidebar
          </p>
          <h2 className="mt-3 text-xl font-semibold" style={{ color: theme.textPrimary }}>
            {block.heading}
          </h2>
          <p className="mt-3 text-sm leading-6" style={{ color: theme.textSecondary }}>
            {block.description}
          </p>
          <p className="mt-4 text-sm" style={{ color: theme.textPrimary }}>
            {data.bio}
          </p>
          <button type="button" className="mt-5 rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: theme.accent, color: theme.menuBg }}>
            {block.ctaLabel}
          </button>
        </aside>
      );
    case "friends-list":
      return (
        <section className="rounded-[24px] border p-5" style={{ backgroundColor: theme.sidebarBg, borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{block.title}</h2>
            <span className="text-xs" style={{ color: theme.textSecondary }}>{Math.min(block.maxItems, data.friends.length)} shown</span>
          </div>
          <div className="mt-4 space-y-3">
            {(data.friends.length ? data.friends : [{ id: "placeholder", username: "creator", displayName: "Creator" }])
              .slice(0, block.maxItems)
              .map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 rounded-2xl border px-3 py-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  {friend.avatar ? (
                    <img src={friend.avatar} alt={friend.displayName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.menuBg }}>
                      {initials(friend.username)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: theme.textPrimary }}>{friend.displayName}</p>
                    <p className="truncate text-xs" style={{ color: theme.textSecondary }}>@{friend.username}</p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      );
    case "post-feed":
      return (
        <section className="rounded-[24px] border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>{block.title}</h2>
          <div className="mt-4 space-y-3">
            {(data.posts.length ? data.posts : [{ id: "placeholder", text: "Recent X posts will appear here after sync." }])
              .slice(0, block.maxItems)
              .map((post) => (
                <article key={post.id} className="rounded-2xl border p-4" style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.border }}>
                  <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>{post.text}</p>
                  {post.image ? <img src={post.image} alt="Post media" className="mt-3 h-44 w-full rounded-xl object-cover" /> : null}
                </article>
              ))}
          </div>
        </section>
      );
    case "product-grid":
      return (
        <section className="rounded-[24px] border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>{block.title}</h2>
          <div className={`mt-4 grid gap-4 ${block.columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {(data.products.length ? data.products : [{ id: "placeholder", title: "Product preview", price: 0 }])
              .slice(0, block.maxItems)
              .map((product) => (
                <article key={product.id} className="rounded-2xl border p-3" style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.border }}>
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="h-40 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl text-xs" style={{ backgroundColor: theme.sidebarBg, color: theme.textSecondary }}>
                      Product image
                    </div>
                  )}
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>{product.title}</p>
                      {product.description ? <p className="mt-1 text-xs" style={{ color: theme.textSecondary }}>{product.description}</p> : null}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: theme.accent }}>${product.price.toFixed(2)}</span>
                  </div>
                </article>
              ))}
          </div>
        </section>
      );
    case "media-widget": {
      const embedUrl = normalizeEmbedUrl(block.embedUrl);
      const canEmbed = embedUrl.includes("youtube.com/embed") || embedUrl.includes("spotify.com") || embedUrl.includes("open.spotify.com");
      return (
        <section className="rounded-[24px] border p-5" style={{ backgroundColor: theme.sidebarBg, borderColor: theme.border }}>
          <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{block.title}</h2>
          <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>{block.caption}</p>
          {canEmbed ? (
            <iframe src={embedUrl} className="mt-4 h-52 w-full rounded-2xl border-0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" loading="lazy" />
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: theme.border, color: theme.textSecondary }}>
              {block.embedUrl ? `Media link: ${block.embedUrl}` : "Add a media URL in the inspector."}
            </div>
          )}
        </section>
      );
    }
    case "custom-embed":
      return (
        <section className="rounded-[24px] border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{block.title}</h2>
          <div
            className="mt-4 overflow-hidden rounded-2xl border"
            style={{ borderColor: theme.border, color: theme.textPrimary }}
            dangerouslySetInnerHTML={{ __html: sanitizeEmbedHtml(block.html) }}
          />
        </section>
      );
  }
}

export default function BuilderDocumentRenderer({
  document,
  data,
}: {
  document: BuilderDocument;
  data?: BuilderPreviewData;
}) {
  const pathname = usePathname();
  const resolvedData = data || createEmptyPreviewData(document.meta.handle || "creator");
  const showMediaDebug =
    typeof pathname === "string" && (pathname.startsWith("/console/builder") || pathname.startsWith("/builder"));
  const sortedBlocks = [...document.blocks].sort((left, right) => {
    if (left.gridRow !== right.gridRow) return left.gridRow - right.gridRow;
    if (left.gridColumn !== right.gridColumn) return left.gridColumn - right.gridColumn;
    return left.id.localeCompare(right.id);
  });

  return (
    <div className="rounded-[32px] border p-4 sm:p-5" style={{ backgroundColor: document.theme.pageBg, borderColor: document.theme.border }}>
      <div className="space-y-4 lg:hidden">
        {sortedBlocks.map((block) => (
          <div key={`mobile-${block.id}`}>
            {renderBlock(block, resolvedData, document.theme, showMediaDebug)}
          </div>
        ))}
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:auto-rows-min">
        {sortedBlocks.map((block) => {
          return (
            <div
              key={block.id}
              style={{
                gridColumn: `${block.gridColumn} / span ${block.gridSpan}`,
                gridRow: block.gridRow,
              }}
            >
              {renderBlock(block, resolvedData, document.theme, showMediaDebug)}
            </div>
          );
        })}
        </div>
    </div>
  );
}