"use client";

import { Suspense } from "react";
import { useConsole } from "@/components/ConsoleContext";
import BuilderStudio from "@/components/builder/BuilderStudio";

export default function ConsoleBuilderPage() {
  const { hasStore, storeSlug, xUsername } = useConsole();

  if (!hasStore) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Builder</h1>
        <p className="text-zinc-400">Create your store first to use the Page Builder.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">Loading custom builder...</div>}>
      <BuilderStudio defaultHandle={xUsername} defaultStoreSlug={storeSlug} />
    </Suspense>
  );
}
