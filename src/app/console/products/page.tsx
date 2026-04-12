"use client";

import { useState, useEffect, useCallback } from "react";
import { useConsole } from "@/components/ConsoleContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Product {
  id: string;
  drupal_id?: number;
  title: string;
  description: string;
  price: string;
  sku: string;
  image_url: string | null;
  product_type: string;
  variation_id: string | null;
  subscriber_only: boolean;
  min_tier: string | null;
  status: boolean;
  source?: "printful" | "custom";
  variants?: number;
  base_cost?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  clothing: { label: "Printful", color: "text-emerald-400 bg-emerald-900/40" },
  printful: { label: "Printful", color: "text-emerald-400 bg-emerald-900/40" },
  default: { label: "General", color: "text-zinc-400 bg-zinc-800" },
  digital_download: { label: "Digital", color: "text-blue-400 bg-blue-900/40" },
  crafts: { label: "Physical", color: "text-amber-400 bg-amber-900/40" },
  physical_custom: { label: "Physical", color: "text-amber-400 bg-amber-900/40" },
};

function SortableProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const typeInfo = TYPE_LABELS[product.product_type] || TYPE_LABELS.default;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition hover:border-zinc-600"
    >
      {/* Drag handle + image area */}
      <div className="relative" {...attributes} {...listeners}>
        {product.image_url ? (
          <div className="aspect-square overflow-hidden bg-zinc-800 cursor-grab active:cursor-grabbing">
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center bg-zinc-800 cursor-grab active:cursor-grabbing">
            <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        {/* Drag indicator */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-md bg-black/60 p-1">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </div>
        </div>
        {/* Type badge */}
        <div className="absolute top-2 right-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
        </div>
        {product.subscriber_only && (
          <div className="absolute bottom-2 right-2">
            <span className="rounded-full bg-amber-900/80 px-2 py-0.5 text-[10px] text-amber-400">
              Subscribers
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="truncate text-sm font-medium text-white">{product.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-indigo-400">
            ${parseFloat(product.price || "0").toFixed(2)}
          </span>
          {product.variants && product.variants > 1 && (
            <span className="text-[10px] text-zinc-500">
              {product.variants} variants
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-1 truncate text-[11px] text-zinc-500">{product.description}</p>
        )}
        {/* Actions */}
        <div className="mt-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 rounded-lg border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:border-indigo-500 hover:text-white transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(product)}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:border-red-500 hover:text-red-400 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCardOverlay({ product }: { product: Product }) {
  return (
    <div className="w-48 rounded-xl border border-purple-500 bg-zinc-900 overflow-hidden shadow-2xl shadow-purple-500/20 rotate-2">
      {product.image_url ? (
        <div className="aspect-square overflow-hidden bg-zinc-800">
          <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-zinc-800">
          <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      )}
      <div className="p-2">
        <p className="truncate text-xs font-medium text-white">{product.title}</p>
        <p className="text-xs text-indigo-400">${parseFloat(product.price || "0").toFixed(2)}</p>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { hasStore, storeId, storeDrupalId } = useConsole();
  const [tab, setTab] = useState<"all" | "printful" | "custom">("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const fetchProducts = useCallback(async () => {
    if (!storeDrupalId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/products?storeId=${storeDrupalId}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }, [storeDrupalId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDragStart = (event: DragStartEvent) => {
    const p = filteredProducts.find((x) => x.id === event.active.id);
    setActiveProduct(p || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveProduct(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProducts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setOrderChanged(true);
  };

  const saveOrder = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const orderedIds = products.map((p) => p.id);
      await fetch("/api/stores/products/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, productOrder: orderedIds }),
      });
      setOrderChanged(false);
    } catch {
      setError("Failed to save order");
    }
    setSaving(false);
  };

  const handleDelete = async (product: Product) => {
    setDeleting(true);
    setConfirmDelete(null);
    try {
      await fetch("/api/stores/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productType: product.product_type === "crafts" ? "physical_custom" : product.product_type,
        }),
      });
      await fetchProducts();
    } catch {
      setError("Delete failed");
    }
    setDeleting(false);
  };

  const filteredProducts = tab === "all"
    ? products
    : tab === "printful"
    ? products.filter((p) => p.product_type === "clothing" || p.product_type === "printful")
    : products.filter((p) => p.product_type !== "clothing" && p.product_type !== "printful");

  if (!hasStore || !storeId || !storeDrupalId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to manage products.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          {orderChanged && (
            <button
              onClick={saveOrder}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Order"}
            </button>
          )}
          <a
            href="/console/design-studio"
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Product
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {([
          { key: "all" as const, label: `All (${products.length})` },
          { key: "printful" as const, label: "Printful" },
          { key: "custom" as const, label: "My Uploads" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-300 text-xs">Dismiss</button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-zinc-300">
            Delete <span className="font-medium text-white">&quot;{confirmDelete.title}&quot;</span>?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-white">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="rounded-lg bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50">{deleting ? "..." : "Delete"}</button>
          </div>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="mt-3 text-sm text-zinc-400">
            {tab === "printful" ? "No Printful products yet." : tab === "custom" ? "No uploaded products yet." : "No products yet."}
          </p>
          <a href="/console/design-studio" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition">
            Create in Design Studio
          </a>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredProducts.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <SortableProductCard
                  key={product.id}
                  product={product}
                  onEdit={setEditingProduct}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeProduct && <ProductCardOverlay product={activeProduct} />}
          </DragOverlay>
        </DndContext>
      )}

      {orderChanged && (
        <p className="text-center text-[11px] text-zinc-500">
          Drag products to reorder. Click &quot;Save Order&quot; to apply changes to your storefront.
        </p>
      )}

      {/* Edit modal placeholder — uses inline editing for now */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          storeId={storeId}
          onClose={() => setEditingProduct(null)}
          onSaved={() => { setEditingProduct(null); fetchProducts(); }}
        />
      )}
    </div>
  );
}

function EditProductModal({
  product,
  storeId,
  onClose,
  onSaved,
}: {
  product: Product;
  storeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price);
  const [description, setDescription] = useState(product.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("productId", product.id);
      fd.append("storeId", storeId);
      fd.append("productType", product.product_type === "crafts" ? "physical_custom" : product.product_type);
      if (product.variation_id) fd.append("variationId", product.variation_id);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("price", price);
      fd.append("subscriberOnly", String(product.subscriber_only));
      fd.append("minTier", product.min_tier || "");

      const res = await fetch("/api/stores/products", { method: "PATCH", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Update failed");
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h3 className="text-lg font-bold text-white mb-4">Edit Product</h3>

        {product.image_url && (
          <img src={product.image_url} alt={product.title} className="w-full h-40 object-contain rounded-lg bg-zinc-800 mb-4" />
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <input type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}
