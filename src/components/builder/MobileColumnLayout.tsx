"use client";

import { useState } from "react";
import type { PlacedBlock, WireframeLayout } from "./WireframeBuilder";
import type { CreatorProfile, Product } from "@/lib/drupal";
import type { FavoriteCreator, XArticle, MusicTrack, XCommunity, GrokGalleryItem, SocialFeedAccount } from "./WireframeRenderer";

// We need to import RenderBlock — but it's in WireframeRenderer which is a server file.
// Instead, we'll render blocks inline here using a simplified approach.
// Actually, the cleanest way: render all 3 columns in the DOM, use CSS to show/hide on mobile.

interface Props {
  layout: WireframeLayout;
  hasLeft: boolean;
  hasRight: boolean;
  profile: CreatorProfile;
  products: Product[];
  favorites: FavoriteCreator[];
  articles: XArticle[];
  musicTracks: MusicTrack[];
  communities: XCommunity[];
  grokGallery: GrokGalleryItem[];
  socialFeeds: SocialFeedAccount[];
  colors: { border: string; surface: string; accent: string; textMuted: string };
  children?: React.ReactNode;
}

export default function MobileColumnLayout({ hasLeft, hasRight, colors, children }: Props & { children?: React.ReactNode }) {
  const [mobileView, setMobileView] = useState<"left" | "center" | "right">("center");
  const [menuOpen, setMenuOpen] = useState(false);
  const hasSidebars = hasLeft || hasRight;

  return (
    <>
      {/* Mobile hamburger — only shows on small screens when sidebars exist */}
      {hasSidebars && (
        <div className="lg:hidden mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition"
              style={{ borderColor: colors.border, color: colors.textMuted }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {mobileView === "left" ? "Left Sidebar" : mobileView === "right" ? "Right Sidebar" : "Main Content"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile column picker dropdown */}
      {hasSidebars && menuOpen && (
        <div
          className="lg:hidden mt-2 rounded-xl border p-2 space-y-1"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {hasLeft && (
            <button
              onClick={() => { setMobileView("left"); setMenuOpen(false); }}
              className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
                mobileView === "left" ? "text-white" : ""
              }`}
              style={mobileView === "left" ? { backgroundColor: colors.accent } : { color: colors.textMuted }}
            >
              Left Sidebar
            </button>
          )}
          <button
            onClick={() => { setMobileView("center"); setMenuOpen(false); }}
            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
              mobileView === "center" ? "text-white" : ""
            }`}
            style={mobileView === "center" ? { backgroundColor: colors.accent } : { color: colors.textMuted }}
          >
            Main Content
          </button>
          {hasRight && (
            <button
              onClick={() => { setMobileView("right"); setMenuOpen(false); }}
              className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
                mobileView === "right" ? "text-white" : ""
              }`}
              style={mobileView === "right" ? { backgroundColor: colors.accent } : { color: colors.textMuted }}
            >
              Right Sidebar
            </button>
          )}
        </div>
      )}

      {/* Columns — desktop: all visible, mobile: selected only */}
      {children}

      <style>{`
        @media (max-width: 1023px) {
          .wf-col-left { display: ${mobileView === "left" ? "block" : "none"} !important; width: 100% !important; }
          .wf-col-center { display: ${mobileView === "center" ? "block" : "none"} !important; width: 100% !important; }
          .wf-col-right { display: ${mobileView === "right" ? "block" : "none"} !important; width: 100% !important; }
          .wf-columns { flex-direction: column !important; }
        }
      `}</style>
    </>
  );
}
