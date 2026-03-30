"use client";

import { useConsole } from "@/components/ConsoleContext";
import WireframeBuilder from "@/components/builder/WireframeBuilder";

export default function ConsolePageBuildingPage() {
  const { storeSlug, hasStore } = useConsole();

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to start building pages.</p>
        </div>
      </div>
    );
  }

  return <WireframeBuilder storeSlug={storeSlug} />;
}
