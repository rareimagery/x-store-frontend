"use client";

import { useConsole } from "@/components/ConsoleContext";
import ProductManager from "@/components/ProductManager";

export default function ProductsPage() {
  const { hasStore, storeId, storeDrupalId } = useConsole();

  if (!hasStore || !storeId || !storeDrupalId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to manage products.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products</h1>
      <ProductManager storeId={storeId} storeDrupalId={storeDrupalId} />
    </div>
  );
}
