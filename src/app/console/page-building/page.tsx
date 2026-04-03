"use client";

import { useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import WireframeBuilder from "@/components/builder/WireframeBuilder";

interface StoreOption {
  id: string;
  slug: string;
  name: string;
}

export default function ConsolePageBuildingPage() {
  const { storeSlug, hasStore, role } = useConsole();
  const isAdmin = role === "admin";

  const [allStores, setAllStores] = useState<StoreOption[]>([]);
  const [activeSlug, setActiveSlug] = useState(storeSlug || "");
  const [switching, setSwitching] = useState(false);

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
            href={`https://www.rareimagery.net/${currentSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-indigo-400 hover:text-indigo-300"
          >
            View live &rarr;
          </a>
        </div>
      )}

      {currentSlug ? (
        <WireframeBuilder key={currentSlug} storeSlug={currentSlug} />
      ) : (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-zinc-500">Select a store above to edit.</p>
        </div>
      )}
    </div>
  );
}
