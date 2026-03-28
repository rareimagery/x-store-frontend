"use client";

import Image from "next/image";
import Link from "next/link";
import SubscribeOnXButton from "@/components/SubscribeOnXButton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentPost {
  id: string;
  text: string;
  link?: string;
  image_url?: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  date: string;
}

interface SidebarProps {
  handle: string;
  recentPosts: RecentPost[];
  profilePictureUrl?: string | null;
  displayName?: string;
  productCount?: number;
  cartCount?: number;
  onNavigate?: (section: "store" | "posts" | "digital" | "subscriptions" | "cart") => void;
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

const SidebarIcons = {
  home: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M21.591 7.146L12.52 1.157a1 1 0 00-1.04 0l-9.071 5.989A1.002 1.002 0 002 8.003V21a1 1 0 001 1h7v-6h4v6h7a1 1 0 001-1V8.003a1.002 1.002 0 00-.409-.857z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1117 0 8.5 8.5 0 01-17 0z" />
      <path d="M15.44 15.44l4.81 4.81a1 1 0 001.42-1.41l-4.82-4.82-1.41 1.42z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1a5.002 5.002 0 009.8 0h4.236l-1.143-8.958zM12 20a3.001 3.001 0 01-2.829-2h5.658A3.001 3.001 0 0112 20zm-6.869-4l.874-6.854A5.998 5.998 0 0112 4a5.998 5.998 0 015.995 5.146L18.869 16H5.131z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M1.998 5.5a2.5 2.5 0 012.5-2.5h15a2.5 2.5 0 012.5 2.5v13a2.5 2.5 0 01-2.5 2.5h-15a2.5 2.5 0 01-2.5-2.5v-13zm2.5-.5a.5.5 0 00-.5.5v.511l8 5.333 8-5.333V5.5a.5.5 0 00-.5-.5h-15zm15.5 2.845l-7.614 5.076a.75.75 0 01-.772 0L3.998 7.845V18.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V7.845z" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M4 4.5A2.5 2.5 0 016.5 2h11A2.5 2.5 0 0120 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4a.5.5 0 00-.5.5v14.56l6-4.29 6 4.29V4.5a.5.5 0 00-.5-.5h-11z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4a3 3 0 100 6 3 3 0 000-6zm-5 3a5 5 0 1110 0A5 5 0 017 7z" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" className="text-blue-500">
      <path d="M3.5 5.5A1.5 1.5 0 015 4h14a1.5 1.5 0 011.5 1.5V8a3 3 0 01-1.5 2.6V20a1 1 0 01-1 1H6a1 1 0 01-1-1v-9.4A3 3 0 013.5 8V5.5zM5 8a1 1 0 001 1 1 1 0 001-1V6H5v2zm4-2v2a1 1 0 001 1 1 1 0 001-1V6H9zm4 0v2a1 1 0 001 1 1 1 0 001-1V6h-2zm4 0v2a1 1 0 001 1 1 1 0 001-1V6h-2zM7 19h10v-7.83a3.01 3.01 0 01-1-.17 3 3 0 01-2 .17 3 3 0 01-2-.17 3 3 0 01-2 .17A3.01 3.01 0 017 11.17V19z" />
    </svg>
  ),
  fileText: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" className="text-blue-500">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7l5 5v11H6V4zm2 8h8v2H8v-2zm0 4h5v2H8v-2z" />
    </svg>
  ),
  xLogo: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <circle cx="12" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Sidebar({
  handle,
  recentPosts,
  profilePictureUrl,
  displayName,
  productCount = 0,
  cartCount = 0,
  onNavigate,
}: SidebarProps) {
  const nav = (section: "store" | "posts" | "digital" | "subscriptions" | "cart") => {
    onNavigate?.(section);
  };

  return (
    <div className="w-72 h-screen fixed bg-black text-white p-4 flex flex-col border-r border-zinc-800 z-50">
      {/* X Logo */}
      <Link href="/" className="mb-8 inline-flex items-center justify-center w-12 h-12 rounded-full hover:bg-zinc-900 transition">
        {SidebarIcons.xLogo}
      </Link>

      {/* Standard X links */}
      <nav className="space-y-1 text-xl">
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full transition">
          {SidebarIcons.home} <span>Home</span>
        </a>
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full transition">
          {SidebarIcons.search} <span>Explore</span>
        </a>
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full transition">
          {SidebarIcons.bell} <span>Notifications</span>
        </a>
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full transition">
          {SidebarIcons.mail} <span>Messages</span>
        </a>
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full transition">
          {SidebarIcons.bookmark} <span>Bookmarks</span>
        </a>
        <a
          href={`https://x.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full transition"
        >
          {SidebarIcons.profile} <span>Profile</span>
        </a>

        {/* YOUR CUSTOM STORE SECTION – Replaces Communities */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={() => nav("store")}
            className="flex items-center gap-5 p-3 text-xl font-bold mb-2 w-full text-left hover:bg-zinc-900 rounded-full transition"
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="#1d9bf0">
              <path d="M3.5 5.5A1.5 1.5 0 015 4h14a1.5 1.5 0 011.5 1.5V8a3 3 0 01-1.5 2.6V20a1 1 0 01-1 1H6a1 1 0 01-1-1v-9.4A3 3 0 013.5 8V5.5zM5 8a1 1 0 001 1 1 1 0 001-1V6H5v2zm4-2v2a1 1 0 001 1 1 1 0 001-1V6H9zm4 0v2a1 1 0 001 1 1 1 0 001-1V6h-2zm4 0v2a1 1 0 001 1 1 1 0 001-1V6h-2zM7 19h10v-7.83a3.01 3.01 0 01-1-.17 3 3 0 01-2 .17 3 3 0 01-2-.17 3 3 0 01-2 .17A3.01 3.01 0 017 11.17V19z" />
            </svg>
            Store
          </button>

          {/* First 3 links = Drupal Store sections */}
          <button
            onClick={() => nav("store")}
            className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full w-full text-left transition text-base"
          >
            <span>🛍️</span> Shop All Products{productCount > 0 && ` (${productCount})`}
          </button>
          <button
            onClick={() => nav("digital")}
            className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full w-full text-left transition text-base"
          >
            <span>📥</span> Digital Downloads
          </button>
          <button
            onClick={() => nav("subscriptions")}
            className="flex items-center gap-5 hover:bg-zinc-900 p-3 rounded-full w-full text-left transition text-base"
          >
            <span>🔄</span> Subscriptions
          </button>
        </div>

        {/* Next 5 links = Recent Posts (dynamic) */}
        {recentPosts.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={() => nav("posts")}
              className="flex items-center gap-5 p-3 text-xl font-bold mb-2 w-full text-left hover:bg-zinc-900 rounded-full transition"
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#1d9bf0">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 4h7l5 5v11H6V4zm2 8h8v2H8v-2zm0 4h5v2H8v-2z" />
              </svg>
              Recent Posts
            </button>
            {recentPosts.slice(0, 5).map((post, i) => (
              <button
                key={post.id || i}
                onClick={() => nav("posts")}
                title={post.text}
                className="block hover:bg-zinc-900 p-3 rounded-full text-sm truncate w-full text-left text-zinc-400 hover:text-white transition"
              >
                {post.text.substring(0, 45)}{post.text.length > 45 ? "…" : ""}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Post button + profile at bottom */}
      <div className="mt-auto space-y-3">
        <SubscribeOnXButton creatorHandle={handle} size="sm" className="w-full justify-center" />

        <button className="w-full py-3 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold text-lg rounded-full transition">
          Post
        </button>

        <div className="flex items-center gap-3 p-3 rounded-full hover:bg-zinc-900 transition cursor-pointer">
          {profilePictureUrl ? (
            <Image
              src={profilePictureUrl}
              alt={handle}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-bold text-zinc-400">
              {handle.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{displayName || handle}</div>
            <div className="text-xs text-zinc-500">@{handle}</div>
          </div>
          {SidebarIcons.more}
        </div>
      </div>
    </div>
  );
}
