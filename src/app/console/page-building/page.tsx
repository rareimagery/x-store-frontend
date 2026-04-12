"use client";

import { useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import WireframeBuilder from "@/components/builder/WireframeBuilder";
import { getStoreUrl } from "@/lib/store-url";

interface StoreOption {
  id: string;
  slug: string;
  name: string;
}

interface AutoGenerateResult {
  profile: {
    username: string;
    displayName: string;
    bio: string;
    pfpUrl: string | null;
    bannerUrl: string | null;
    followerCount: number;
  };
  grokEnhancements: {
    storeBio: string;
    suggestedProducts: Array<{ name: string; description: string; category: string }>;
    recommendedTheme: string;
    topThemes: string[];
    audienceSentiment: string;
  } | null;
  backgroundVariants: string[];
  brandVibe: {
    bio: string;
    topThemes: string[];
    recentPostsSummary: string;
  };
}

export default function ConsolePageBuildingPage() {
  const { storeSlug, hasStore, role } = useConsole();
  const isAdmin = role === "admin";

  const [allStores, setAllStores] = useState<StoreOption[]>([]);
  const [activeSlug, setActiveSlug] = useState(storeSlug || "");
  const [switching, setSwitching] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenPhase, setAutoGenPhase] = useState("");
  const [autoGenResult, setAutoGenResult] = useState<AutoGenerateResult | null>(null);
  const [autoGenError, setAutoGenError] = useState("");

  // Admins: load all stores
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/console/stores")
      .then((r) => r.json())
      .then((d) => {
        const stores: StoreOption[] = (d.stores || []).map((s: any) => ({
          id: s.id,
          slug: s.slug || s.storeSlug,
          name: s.name || s.storeName || s.slug,
        }));
        setAllStores(stores);
      })
      .catch(() => {});
  }, [isAdmin]);

  // Sync active slug with console context
  useEffect(() => {
    if (storeSlug) setActiveSlug(storeSlug);
  }, [storeSlug]);

  const handleStoreSwitch = async (slug: string) => {
    if (slug === activeSlug) return;
    setSwitching(true);
    try {
      await fetch("/api/console/active-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug }),
      });
      setActiveSlug(slug);
    } catch {} finally {
      setSwitching(false);
    }
  };

  if (!hasStore && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to start building pages.</p>
        </div>
      </div>
    );
  }

  const currentSlug = activeSlug || storeSlug || "";

  return (
    <div>
      {/* Admin store picker */}
      {isAdmin && allStores.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Editing store:
          </label>
          <select
            value={currentSlug}
            onChange={(e) => handleStoreSwitch(e.target.value)}
            disabled={switching}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {allStores.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} ({s.slug})
              </option>
            ))}
          </select>
          {switching && <span className="text-xs text-zinc-500">Switching...</span>}
          <a
            href={getStoreUrl(currentSlug)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-indigo-400 hover:text-indigo-300"
          >
            View live &rarr;
          </a>
        </div>
      )}

      {currentSlug ? (
        <>
          {/* Auto-Generate Store button */}
          {!autoGenResult && (
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setAutoGenerating(true);
                    setAutoGenError("");
                    setAutoGenPhase("Analyzing your X profile...");
                    try {
                      setTimeout(() => setAutoGenPhase("Generating your brand vibe..."), 3000);
                      setTimeout(() => setAutoGenPhase("Creating backgrounds from your aesthetic..."), 6000);
                      const res = await fetch("/api/stores/auto-generate", { method: "POST" });
                      const data = await res.json();
                      if (!res.ok) { setAutoGenError(data.error || "Auto-generation failed"); return; }
                      setAutoGenResult(data);
                      setAutoGenPhase("");
                    } catch {
                      setAutoGenError("Auto-generation failed");
                    } finally {
                      setAutoGenerating(false);
                    }
                  }}
                  disabled={autoGenerating}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {autoGenerating ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {autoGenPhase}
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Auto-Generate My Store
                    </>
                  )}
                </button>
                <span className="text-[10px] text-zinc-600">Uses your X profile, bio, and posts to generate a personalized store</span>
                {autoGenError && <span className="text-[10px] text-red-400">{autoGenError}</span>}
              </div>
            </div>
          )}

          {/* Auto-generate results panel */}
          {autoGenResult && (
            <div className="px-4 py-4 border-b border-zinc-800 bg-gradient-to-r from-purple-950/30 to-indigo-950/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Store concept for @{autoGenResult.profile.username}
                </h3>
                <button
                  onClick={() => setAutoGenResult(null)}
                  className="text-[10px] text-zinc-500 hover:text-white"
                >
                  Dismiss
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Brand vibe */}
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Brand Vibe</p>
                  {autoGenResult.grokEnhancements?.storeBio && (
                    <p className="text-xs text-zinc-300 mb-2">{autoGenResult.grokEnhancements.storeBio}</p>
                  )}
                  {autoGenResult.brandVibe.topThemes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {autoGenResult.brandVibe.topThemes.slice(0, 5).map((t) => (
                        <span key={t} className="rounded-full bg-purple-900/40 border border-purple-700/40 px-2 py-0.5 text-[9px] text-purple-300">{t}</span>
                      ))}
                    </div>
                  )}
                  {autoGenResult.grokEnhancements?.recommendedTheme && (
                    <p className="text-[10px] text-zinc-500 mt-2">Recommended theme: <span className="text-indigo-400">{autoGenResult.grokEnhancements.recommendedTheme}</span></p>
                  )}
                </div>

                {/* Product suggestions */}
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Suggested Products</p>
                  <div className="space-y-1.5">
                    {(autoGenResult.grokEnhancements?.suggestedProducts || []).slice(0, 4).map((p, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-zinc-200 font-medium">{p.name}</span>
                        <span className="text-zinc-500 ml-1.5">{p.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background variants */}
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Generated Backgrounds</p>
                  {autoGenResult.backgroundVariants.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {autoGenResult.backgroundVariants.map((url, i) => (
                        <img key={i} src={url} alt={`Background ${i + 1}`} className="rounded h-12 w-full object-cover border border-zinc-700" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-600">No backgrounds generated</p>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-zinc-600 mt-3">Use the builder below to apply these suggestions. Backgrounds are available in the Background Generator.</p>
            </div>
          )}

          <WireframeBuilder key={currentSlug} storeSlug={currentSlug} />
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-zinc-500">Select a store above to edit.</p>
        </div>
      )}
    </div>
  );
}
