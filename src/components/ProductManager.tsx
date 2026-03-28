"use client";

import { useState, useEffect } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

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
}

interface ProductManagerProps {
  storeId: string;
  storeDrupalId: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  { value: "default", label: "General", icon: "📦" },
  { value: "digital_download", label: "Digital", icon: "💾" },
  { value: "physical_custom", label: "Physical", icon: "🛠️" },
] as const;

const TYPE_ICONS: Record<string, string> = {
  default: "📦",
  digital_download: "💾",
  crafts: "🛠️",
  physical_custom: "🛠️",
};

const TIERS = [
  { value: "rare_supporter", label: "Rare Supporter" },
  { value: "inner_circle", label: "Inner Circle" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  productType: "default" as string,
  imageUrl: "",
  subscriberOnly: false,
  minTier: "",
};

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
  deleting,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  deleting: boolean;
}) {
  return (
    <div
      className="group relative flex cursor-pointer gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 transition hover:border-zinc-600"
      onClick={() => onEdit(product)}
    >
      {/* Thumbnail */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 text-2xl">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          TYPE_ICONS[product.product_type] ?? "📦"
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-white">{product.title}</p>
          <span className="shrink-0 text-sm font-semibold text-indigo-400">
            ${parseFloat(product.price).toFixed(2)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
            {TYPE_ICONS[product.product_type]}{" "}
            {PRODUCT_TYPES.find((t) => t.value === product.product_type || (product.product_type === "crafts" && t.value === "physical_custom"))?.label ?? product.product_type}
          </span>
          {product.subscriber_only && (
            <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-[10px] text-amber-400">
              ⭐ Subscriber only
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-1 truncate text-xs text-zinc-500">
            {product.description}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(product);
        }}
        disabled={deleting}
        className="absolute right-2 top-2 hidden rounded p-1 text-zinc-600 transition hover:text-red-400 group-hover:block disabled:opacity-40"
      >
        {deleting ? "…" : "✕"}
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProductManager({ storeId, storeDrupalId }: ProductManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Quick-add
  const [quickAdd, setQuickAdd] = useState(false);
  const [qaType, setQaType] = useState("default");
  const [qaTitle, setQaTitle] = useState("");
  const [qaPrice, setQaPrice] = useState("");
  const [qaAdding, setQaAdding] = useState(false);

  // Confirm delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/products?storeId=${storeDrupalId}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, [storeDrupalId]);

  // ── Open form for new product ──
  const openNewForm = () => {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreviewUrl(null);
    setShowForm(true);
    setError("");
  };

  // ── Open form to edit a product ──
  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      price: product.price,
      productType:
        product.product_type === "crafts"
          ? "physical_custom"
          : product.product_type,
      imageUrl: product.image_url ?? "",
      subscriberOnly: product.subscriber_only,
      minTier: product.min_tier ?? "",
    });
    setImageFile(null);
    setImagePreviewUrl(product.image_url ?? null);
    setShowForm(true);
    setError("");
  };

  // ── Submit (create or update) ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingProduct) {
        // PATCH
        const fd = new FormData();
        fd.append("productId", editingProduct.id);
        fd.append("storeId", storeId);
        fd.append(
          "productType",
          editingProduct.product_type === "crafts"
            ? "physical_custom"
            : editingProduct.product_type
        );
        if (editingProduct.variation_id) {
          fd.append("variationId", editingProduct.variation_id);
        }
        fd.append("title", form.title);
        fd.append("description", form.description);
        fd.append("price", form.price);
        fd.append("subscriberOnly", String(form.subscriberOnly));
        fd.append("minTier", form.minTier || "");
        fd.append("imageUrl", form.imageUrl || "");
        if (imageFile) {
          fd.append("imageFile", imageFile);
        }

        const res = await fetch("/api/stores/products", {
          method: "PATCH",
          body: fd,
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Update failed");
        }
      } else {
        // POST
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("description", form.description);
        fd.append("price", form.price);
        fd.append("storeId", storeId);
        fd.append("productType", form.productType);
        fd.append("subscriberOnly", String(form.subscriberOnly));
        fd.append("minTier", form.minTier || "");
        fd.append("imageUrl", form.imageUrl || "");
        if (imageFile) {
          fd.append("imageFile", imageFile);
        }

        const res = await fetch("/api/stores/products", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Create failed");
        }
      }

      setShowForm(false);
      setEditingProduct(null);
      setForm({ ...EMPTY_FORM });
      setImageFile(null);
      setImagePreviewUrl(null);
      await fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  // ── Quick add ──
  async function handleQuickAdd() {
    if (!qaTitle.trim() || !qaPrice) return;
    setQaAdding(true);
    try {
      const res = await fetch("/api/stores/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: qaTitle.trim(),
          price: qaPrice,
          storeId,
          productType: qaType,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      setQaTitle("");
      setQaPrice("");
      await fetchProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Quick add failed");
    } finally {
      setQaAdding(false);
    }
  }

  // ── Delete ──
  async function handleDelete(product: Product) {
    setDeletingId(product.id);
    setConfirmDelete(null);
    try {
      await fetch("/api/stores/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productType:
            product.product_type === "crafts"
              ? "physical_custom"
              : product.product_type,
        }),
      });
      await fetchProducts();
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-300">
          Products ({products.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setQuickAdd((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              quickAdd
                ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
            }`}
          >
            ⚡ Quick Add
          </button>
          <button
            onClick={openNewForm}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      {quickAdd && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-800/50 bg-indigo-950/20 p-3">
          {/* Type pills */}
          <div className="flex gap-1">
            {PRODUCT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setQaType(t.value)}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                  qaType === t.value
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={qaTitle}
            onChange={(e) => setQaTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            placeholder="Product name"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <div className="relative w-24">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
            <input
              type="number"
              value={qaPrice}
              onChange={(e) => setQaPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 pl-6 pr-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleQuickAdd}
            disabled={qaAdding || !qaTitle.trim() || !qaPrice}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {qaAdding ? "…" : "+"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Full form →
          </button>
        </div>
      )}

      {/* Full Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {editingProduct ? "Edit Product" : "New Product"}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingProduct(null); }}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>

          {/* Product type */}
          {!editingProduct && (
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Type</label>
              <div className="flex gap-2">
                {PRODUCT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, productType: t.value })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      form.productType === t.value
                        ? "bg-indigo-600 text-white"
                        : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title + Price side by side */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Digital Art Pack"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Price (USD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="19.99"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Description <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What makes this product special?"
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              Image URL <span className="text-zinc-600">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => {
                  setForm({ ...form, imageUrl: e.target.value });
                  if (e.target.value) {
                    setImageFile(null);
                    setImagePreviewUrl(e.target.value);
                  }
                }}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              {(imagePreviewUrl || form.imageUrl) && (
                <img
                  src={imagePreviewUrl || form.imageUrl}
                  alt="preview"
                  className="h-9 w-9 rounded object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) {
                    setForm({ ...form, imageUrl: "" });
                    setImagePreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-500"
              />
              {(imageFile || imagePreviewUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreviewUrl(null);
                    setForm({ ...form, imageUrl: "" });
                  }}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">Upload an image file or paste an image URL.</p>
          </div>

          {/* Subscriber-only gating */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.subscriberOnly}
                onChange={(e) =>
                  setForm({ ...form, subscriberOnly: e.target.checked, minTier: e.target.checked ? form.minTier : "" })
                }
                className="rounded accent-indigo-500"
              />
              <span className="text-sm text-zinc-300">⭐ Subscriber only</span>
            </label>
            {form.subscriberOnly && (
              <div className="mt-2">
                <label className="mb-1 block text-xs text-zinc-400">
                  Minimum tier
                </label>
                <select
                  value={form.minTier}
                  onChange={(e) => setForm({ ...form, minTier: e.target.value })}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
                >
                  <option value="">Any subscriber</option>
                  {TIERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingProduct
                ? "Save Changes"
                : "Create Product"}
            </button>
          </div>
        </form>
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3">
          <p className="text-sm text-zinc-300">
            Delete <span className="font-medium text-white">&quot;{confirmDelete.title}&quot;</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(confirmDelete)}
              className="rounded-lg bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 py-10 text-center">
          <p className="text-2xl">📦</p>
          <p className="mt-2 text-sm text-zinc-500">No products yet.</p>
          <p className="text-xs text-zinc-600">Use Quick Add or + Add Product to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEditForm}
              onDelete={(p) => setConfirmDelete(p)}
              deleting={deletingId === product.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
