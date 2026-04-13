"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsole } from "@/components/ConsoleContext";
import { getStoreDisplayUrl } from "@/lib/store-url";

interface TopPost {
  id: string; text: string; likes: number; retweets: number; replies: number; views: number; date: string;
}
interface TopFollower {
  username: string; display_name: string; profile_image_url?: string; follower_count: number; verified: boolean;
}
interface Metrics {
  engagement_score: number; avg_likes: number; avg_retweets: number; avg_views: number;
  top_themes: string[]; posting_frequency: string; audience_sentiment: string;
}
interface ProfileData {
  xUsername: string; followerCount: number; bio: string;
  profilePictureUrl: string | null; bannerUrl: string | null;
  metrics: Metrics | null; topPosts: TopPost[]; topFollowers: TopFollower[];
  storeTheme: string;
}
interface Product {
  id: string; title: string; image_url?: string | null; product_type?: string;
}
interface FavoriteCreator {
  username: string; display_name: string; profile_image_url?: string | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function StepIcon({ done }: { done: boolean }) {
  if (done) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 shrink-0">
      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  );
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500/10 shrink-0">
      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
    </div>
  );
}

export default function MyPage() {
  const { hasStore, storeSlug, xUsername } = useConsole();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [favorites, setFavorites] = useState<FavoriteCreator[]>([]);
  const [visitedStudio, setVisitedStudio] = useState(false);
  const [hasPublishedBuild, setHasPublishedBuild] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setVisitedStudio(localStorage.getItem("ri_visited_studio") === "1");
    Promise.all([
      fetch("/api/console/insights").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/favorites").then(r => r.ok ? r.json() : { favorites: [] }).catch(() => ({ favorites: [] })),
      fetch("/api/builds").then(r => r.ok ? r.json() : { builds: [] }).catch(() => ({ builds: [] })),
    ]).then(([profileData, favData, buildData]) => {
      if (profileData) setProfile(profileData);
      setFavorites(favData.favorites || []);
      setHasPublishedBuild((buildData.builds || []).some((b: any) => b.published));
    }).finally(() => setLoading(false));
  }, [storeSlug]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/stores/import-x-data", { method: "POST" });
      const r = await fetch("/api/console/insights");
      if (r.ok) setProfile(await r.json());
    } catch {} finally { setSyncing(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
      </div>
    );
  }

  const markStudioVisited = () => { localStorage.setItem("ri_visited_studio", "1"); setVisitedStudio(true); };

  // Completion checks
  const step1Done = !!(profile?.profilePictureUrl && profile?.bio && profile?.topPosts?.length > 0);
  const step2Done = !!storeSlug;
  const step3Done = favorites.length > 0;
  const step4Done = visitedStudio;
  const step5Done = hasPublishedBuild;
  const allDone = step1Done && step2Done && step3Done && step4Done && step5Done;
  const completedCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">
          {allDone ? "My Page" : "Set Up Your Store"}
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          {allDone
            ? `Your store is live at ${getStoreDisplayUrl(storeSlug || "")}`
            : `${completedCount} of 5 steps complete`}
        </p>
      </div>

      {/* Progress bar */}
      {!allDone && (
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
            style={{ width: `${(completedCount / 5) * 100}%` }}
          />
        </div>
      )}

      {/* All done banner */}
      {allDone && (
        <div className="rounded-xl bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/40 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-300">Your store is ready!</p>
              <p className="text-xs text-green-400/70">All setup steps are complete. Your storefront is live.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href={`https://${storeSlug}.rareimagery.net`} target="_blank" className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-500 transition">
              View Your Store
            </Link>
            <Link href="/console/page-building" className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:border-zinc-500 transition">
              Edit Page Layout
            </Link>
            <Link href="/console/design-studio" className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:border-zinc-500 transition">
              Create More Products
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: X Profile Import                                     */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <StepIcon done={step1Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Step 1: Confirm X Profile</p>
            <p className="text-[10px] text-zinc-500">{step1Done ? "Your X data has been imported" : "Review what we pulled from your X account"}</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {syncing ? "Syncing..." : "Refresh from X"}
          </button>
        </div>

        {profile && (
          <div className="p-5">
            {/* Banner */}
            <div className="h-28 rounded-lg bg-zinc-800 overflow-hidden mb-3 relative">
              {profile.bannerUrl ? (
                <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                  <span className="text-xs text-amber-400">No banner imported</span>
                </div>
              )}
            </div>

            {/* Profile row */}
            <div className="flex items-center gap-3 mb-3 -mt-8 ml-3 relative z-10">
              <div className="h-14 w-14 rounded-full border-3 border-zinc-900 bg-zinc-800 overflow-hidden shrink-0">
                {profile.profilePictureUrl ? (
                  <img src={profile.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-purple-400">
                    {(profile.xUsername || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="pt-6">
                <p className="text-sm font-semibold text-white">@{profile.xUsername}</p>
                <p className="text-[10px] text-zinc-500">{fmt(profile.followerCount)} followers</p>
              </div>
            </div>

            {/* Bio */}
            {profile.bio ? (
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 mb-3">
                <p className="text-[10px] text-zinc-500 mb-1">Bio</p>
                <p className="text-xs text-zinc-300">{profile.bio.replace(/<[^>]*>/g, "")}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 mb-3">
                <p className="text-xs text-amber-400">No bio imported. Add a bio on X and click "Refresh from X".</p>
              </div>
            )}

            {/* Imported data summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2">
                <p className="text-sm font-bold text-white">{profile.topPosts?.length || 0}</p>
                <p className="text-[9px] text-zinc-500">Posts imported</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2">
                <p className="text-sm font-bold text-white">{profile.topFollowers?.length || 0}</p>
                <p className="text-[9px] text-zinc-500">Top followers</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2">
                <p className="text-sm font-bold text-white">{profile.metrics?.top_themes?.length || 0}</p>
                <p className="text-[9px] text-zinc-500">Themes detected</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* STEP 2: Subdomain                                            */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <StepIcon done={step2Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Step 2: Claim Your Subdomain</p>
            {step2Done ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-indigo-400">{getStoreDisplayUrl(storeSlug || "")}</span>
                <span className="flex items-center gap-0.5 text-[9px] text-zinc-600">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                  Permanent
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-amber-400">You haven&apos;t claimed your subdomain yet</p>
            )}
          </div>
          {!step2Done && (
            <Link href="/onboarding" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition">
              Claim Subdomain
            </Link>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 3: Add Favorites                                        */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <StepIcon done={step3Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Step 3: Add Favorite Creators</p>
            {step3Done ? (
              <p className="text-[10px] text-zinc-500">{favorites.length} creator{favorites.length !== 1 ? "s" : ""} in your favorites</p>
            ) : (
              <p className="text-[10px] text-zinc-500">Showcase creators you love on your storefront</p>
            )}
          </div>
          <Link
            href="/console/favorite-creators"
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              step3Done
                ? "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {step3Done ? "Manage" : "Go to My Favorites"}
          </Link>
        </div>

        {step3Done && favorites.length > 0 && (
          <div className="px-5 pb-4 flex items-center gap-1.5">
            {favorites.slice(0, 8).map((f) => (
              <div key={f.username} className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700/50 overflow-hidden shrink-0" title={`@${f.username}`}>
                {f.profile_image_url ? (
                  <img src={f.profile_image_url} alt={f.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-zinc-500">{f.display_name?.[0]}</div>
                )}
              </div>
            ))}
            {favorites.length > 8 && (
              <span className="text-[10px] text-zinc-600 ml-1">+{favorites.length - 8} more</span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* STEP 4: Explore Grok Product Creator (not mandatory)         */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <StepIcon done={step4Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Step 4: Explore Grok Product Creator</p>
            {step4Done ? (
              <p className="text-[10px] text-zinc-500">You&apos;ve visited the Product Creator</p>
            ) : (
              <p className="text-[10px] text-zinc-500">See how AI designs merch and digital products for your store</p>
            )}
          </div>
          <Link
            href="/console/design-studio"
            onClick={markStudioVisited}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              step4Done
                ? "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                : "bg-purple-600 text-white hover:bg-purple-500"
            }`}
          >
            {step4Done ? "Open Studio" : "Explore Product Creator"}
          </Link>
        </div>
        {!step4Done && (
          <div className="px-5 pb-4">
            <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-3 space-y-2">
              <p className="text-[11px] text-zinc-400 leading-relaxed">The Grok Product Creator uses AI to generate print-ready designs. Products are optional — your store works great without them. When you&apos;re ready:</p>
              <ul className="text-[11px] text-zinc-500 space-y-1 ml-3">
                <li>1. Choose a product type (T-Shirt, Hoodie, Ballcap, etc.)</li>
                <li>2. Describe your design in a prompt</li>
                <li>3. Grok generates 4 variants — pick your favorite</li>
                <li>4. Set your price and publish to Printful</li>
              </ul>
              <p className="text-[10px] text-zinc-600">100 free AI generations per month.</p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* STEP 5: Build Your Page                                      */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <StepIcon done={step5Done} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Step 5: Build Your Page</p>
            {step5Done ? (
              <p className="text-[10px] text-zinc-500">Your page layout is published at {getStoreDisplayUrl(storeSlug || "")}</p>
            ) : (
              <p className="text-[10px] text-zinc-500">Design your storefront with drag-and-drop blocks and AI backgrounds</p>
            )}
          </div>
          <Link
            href="/console/page-building"
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              step5Done
                ? "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                : "bg-purple-600 text-white hover:bg-purple-500"
            }`}
          >
            {step5Done ? "Edit Layout" : "Go to Page Builder"}
          </Link>
        </div>
        {!step5Done && (
          <div className="px-5 pb-4">
            <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-3">
              <p className="text-[11px] text-zinc-400 leading-relaxed">Drag content blocks into your layout, generate an AI background with Grok Imagine, and choose a color scheme. Click <strong className="text-zinc-300">Save &amp; Publish</strong> when you&apos;re happy with it.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
