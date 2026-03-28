"use client";

import { useConsole } from "@/components/ConsoleContext";
import PrintfulManager from "@/components/PrintfulManager";

export default function PrintfulPage() {
  const { hasStore, storeId, storeDrupalId } = useConsole();

  if (!hasStore || !storeId || !storeDrupalId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to connect Printful.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Print on Demand</h1>
      <PrintfulManager storeId={storeId} storeDrupalId={storeDrupalId} />
    </div>
  );
}
