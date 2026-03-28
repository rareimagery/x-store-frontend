"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrintfulProduct {
  id: string;
  name: string;
  thumbnail_url: string;
  variants: number;
  retail_price: string;
  base_cost: string;
  technique: string;
  synced: boolean;
}

interface CatalogCategory {
  id: number;
  parent_id: number;
  image_url: string;
  title: string;
}

interface CatalogProduct {
  id: number;
  title: string;
  image: string;
  brand: string | null;
  variant_count: number;
  avg_fulfillment_time: number | null;
  techniques: { key: string; display_name: string; is_default: boolean }[];
}

interface CatalogVariant {
  id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  image: string;
  price: string;
  in_stock: boolean;
}

interface CatalogProductDetail {
  product: CatalogProduct & {
    files: { id: string; type: string; title: string; additional_price: string | null }[];
  };
  variants: CatalogVariant[];
  totalVariants: number;
  availableVariants: number;
}

type Tab = "products" | "catalog" | "create" | "webhooks";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PrintfulManager({
  storeId,
  storeDrupalId,
}: {
  storeId: string;
  storeDrupalId: string;
}) {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("products");

  // Catalog state
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");

  // Product detail / creation state
  const [selectedProduct, setSelectedProduct] = useState<CatalogProductDetail | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set());
  const [retailPrice, setRetailPrice] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [creating, setCreating] = useState(false);

  // Webhook state
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [settingUpWebhook, setSettingUpWebhook] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/printful/status?storeId=${storeId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setConnected(true);
            await loadProducts();
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [storeId]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/printful/products?storeId=${storeDrupalId}`
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // silent
    }
  }, [storeDrupalId]);

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setConnecting(true);
    setError("");

    try {
      const res = await fetch("/api/printful/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, apiKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to connect");
      }

      setConnected(true);
      await loadProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");

    try {
      const res = await fetch("/api/printful/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, storeDrupalId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }

      const result = await res.json();
      await loadProducts();
      setSuccess(`Synced ${result.synced} products (${result.skipped} already up to date)`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Catalog browsing
  // ---------------------------------------------------------------------------

  const loadCatalog = useCallback(async (categoryId?: number) => {
    setCatalogLoading(true);
    try {
      const url = categoryId
        ? `/api/printful/catalog?categoryId=${categoryId}`
        : "/api/printful/catalog";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.products) setCatalogProducts(data.products);
      }
    } catch {
      setError("Failed to load Printful catalog");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "catalog" && categories.length === 0) {
      loadCatalog();
    }
  }, [activeTab, categories.length, loadCatalog]);

  const handleCategorySelect = (catId: number | null) => {
    setSelectedCategory(catId);
    if (catId) {
      loadCatalog(catId);
    } else {
      loadCatalog();
    }
  };

  const handleProductSelect = async (productId: number) => {
    setCatalogLoading(true);
    try {
      const res = await fetch(`/api/printful/catalog/${productId}`);
      if (res.ok) {
        const data: CatalogProductDetail = await res.json();
        setSelectedProduct(data);
        setProductName(data.product.title);
        setSelectedVariants(new Set());
        setRetailPrice("");
        setDesignUrl("");
        setActiveTab("create");
      }
    } catch {
      setError("Failed to load product details");
    } finally {
      setCatalogLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Product creation on Printful
  // ---------------------------------------------------------------------------

  const handleCreateProduct = async () => {
    if (!selectedProduct || selectedVariants.size === 0 || !designUrl || !retailPrice) {
      setError("Please select variants, enter a design URL, and set a retail price");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/printful/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, storeDrupalId }),
      });

      // For now, we create via the Printful product creation which happens
      // after designing in Printful's dashboard. The catalog browse helps
      // creators find what products are available.
      // Direct creation via API requires the sync product endpoint:
      setSuccess(
        "Product selection saved. Design your product in Printful's Design Maker, " +
        "then sync it back here."
      );
      setTimeout(() => setSuccess(""), 8000);
      setActiveTab("products");
      setSelectedProduct(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Webhook setup
  // ---------------------------------------------------------------------------

  const handleSetupWebhooks = async () => {
    setSettingUpWebhook(true);
    setError("");

    try {
      const res = await fetch("/api/printful/webhook/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Webhook setup failed");
      }

      setWebhookConfigured(true);
      setSuccess("Webhooks configured successfully");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSettingUpWebhook(false);
    }
  };

  useEffect(() => {
    if (activeTab === "webhooks" && connected) {
      fetch(`/api/printful/webhook/setup?storeId=${storeId}`)
        .then((r) => r.json())
        .then((d) => setWebhookConfigured(d.configured))
        .catch(() => {});
    }
  }, [activeTab, connected, storeId]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const printTechniques: Record<string, string> = {
    dtg: "DTG",
    embroidery: "Embroidery",
    aop: "All-Over Print",
    cut_sew: "Cut & Sew",
    sublimation: "Sublimation",
    EMBROIDERY: "Embroidery",
    DTG: "DTG",
    SUBLIMATION: "Sublimation",
  };

  const filteredCatalog = catalogSearch
    ? catalogProducts.filter((p) =>
        p.title.toLowerCase().includes(catalogSearch.toLowerCase())
      )
    : catalogProducts;

  const toggleVariant = (variantId: number) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const selectAllVariants = () => {
    if (!selectedProduct) return;
    if (selectedVariants.size === selectedProduct.variants.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(selectedProduct.variants.map((v) => v.id)));
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="py-8 text-center text-zinc-500">
        Checking Printful connection...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-300">
            Print-on-Demand (Printful)
          </h2>
          <p className="text-sm text-zinc-500">
            Sell custom products with zero inventory. Printful prints and ships
            directly to your customers.
          </p>
        </div>
        {connected && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Connected
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {!connected ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
            <h3 className="mb-3 text-sm font-semibold text-zinc-300">
              Connect Your Printful Account
            </h3>
            <p className="mb-4 text-xs text-zinc-500">
              Enter your Printful API key to start selling print-on-demand
              products. Get your API key from{" "}
              <a
                href="https://www.printful.com/dashboard/developer/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                Printful Dashboard &gt; Settings &gt; API
              </a>
            </p>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Printful API key"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleConnect}
                disabled={connecting || !apiKey.trim()}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>

          {/* Benefits overview */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Zero Inventory",
                desc: "Products are printed and shipped only when a customer orders",
              },
              {
                title: "482+ Products",
                desc: "T-shirts, hoodies, mugs, posters, phone cases, and more",
              },
              {
                title: "Global Shipping",
                desc: "Printful fulfills and ships worldwide from their facilities",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <h4 className="text-sm font-semibold text-zinc-200">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            {(
              [
                { key: "products", label: "My Products" },
                { key: "catalog", label: "Browse Catalog" },
                { key: "webhooks", label: "Webhooks" },
              ] as { key: Tab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ---- Products Tab ---- */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {syncing ? "Syncing..." : "Sync Products from Printful"}
                </button>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-300"
                >
                  Browse Catalog
                </button>
                <a
                  href="https://www.printful.com/dashboard/default/products"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-300"
                >
                  Open Printful Dashboard
                </a>
              </div>

              {products.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-900/80">
                      <tr>
                        <th className="px-4 py-3 font-medium text-zinc-400">Product</th>
                        <th className="px-4 py-3 font-medium text-zinc-400">Technique</th>
                        <th className="px-4 py-3 font-medium text-zinc-400">Variants</th>
                        <th className="px-4 py-3 font-medium text-zinc-400">Base Cost</th>
                        <th className="px-4 py-3 font-medium text-zinc-400">Retail</th>
                        <th className="px-4 py-3 font-medium text-zinc-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-zinc-800/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {product.thumbnail_url && (
                                <img
                                  src={product.thumbnail_url}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              )}
                              <span className="font-medium text-white">
                                {product.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {printTechniques[product.technique] || product.technique}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{product.variants}</td>
                          <td className="px-4 py-3 text-zinc-400">${product.base_cost}</td>
                          <td className="px-4 py-3 font-medium text-white">
                            ${product.retail_price}
                          </td>
                          <td className="px-4 py-3">
                            {product.synced ? (
                              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                Synced
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
                  <p className="text-sm text-zinc-500">
                    No Printful products synced yet.
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    Design products in Printful&apos;s Design Maker, then sync them here.
                  </p>
                </div>
              )}

              {/* How it works */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                  How Print-on-Demand Works
                </h3>
                <ol className="space-y-2 text-xs text-zinc-500">
                  {[
                    <>Browse the <button onClick={() => setActiveTab("catalog")} className="text-indigo-400 hover:text-indigo-300">product catalog</button> to find blank products</>,
                    <>Design your products in <a href="https://www.printful.com/design-maker" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">Printful&apos;s Design Maker</a></>,
                    <>Click &quot;Sync Products from Printful&quot; to import them into your store</>,
                    <>Set your retail prices (you keep the margin between your price and Printful&apos;s base cost)</>,
                    <>When a customer orders, Printful prints and ships directly to them</>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* ---- Catalog Tab ---- */}
          {activeTab === "catalog" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Category pills */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      !selectedCategory
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    All
                  </button>
                  {categories
                    .filter((c) => c.parent_id === 0)
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          selectedCategory === cat.id
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {cat.title}
                      </button>
                    ))}
                </div>
              )}

              {catalogLoading ? (
                <div className="py-8 text-center text-zinc-500">
                  Loading catalog...
                </div>
              ) : filteredCatalog.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCatalog.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left transition hover:border-zinc-600"
                    >
                      <div className="mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-800">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-contain transition group-hover:scale-105"
                        />
                      </div>
                      <h4 className="text-sm font-medium text-zinc-200 line-clamp-2">
                        {product.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{product.variant_count} variants</span>
                        {product.techniques?.[0] && (
                          <>
                            <span>-</span>
                            <span>
                              {printTechniques[product.techniques[0].key] ||
                                product.techniques[0].display_name}
                            </span>
                          </>
                        )}
                      </div>
                      {product.avg_fulfillment_time && (
                        <p className="mt-1 text-xs text-zinc-600">
                          ~{product.avg_fulfillment_time} business days
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500">
                  No products found. Try a different category or search.
                </div>
              )}
            </div>
          )}

          {/* ---- Create Tab (product detail) ---- */}
          {activeTab === "create" && selectedProduct && (
            <div className="space-y-6">
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setActiveTab("catalog");
                }}
                className="text-sm text-zinc-400 hover:text-zinc-300"
              >
                &larr; Back to catalog
              </button>

              <div className="flex gap-6">
                {/* Product image */}
                <div className="w-48 flex-shrink-0">
                  <img
                    src={selectedProduct.product.image}
                    alt={selectedProduct.product.title}
                    className="w-full rounded-xl"
                  />
                </div>

                {/* Product info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {selectedProduct.product.title}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {selectedProduct.availableVariants} variants available
                      {selectedProduct.product.techniques?.[0] && (
                        <> &middot; {selectedProduct.product.techniques[0].display_name}</>
                      )}
                    </p>
                  </div>

                  {/* Print placements */}
                  {selectedProduct.product.files?.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                        Print Placements
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.product.files.map((f) => (
                          <span
                            key={f.id}
                            className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                          >
                            {f.title}
                            {f.additional_price && (
                              <span className="ml-1 text-zinc-500">
                                +${f.additional_price}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Design URL */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Design Image URL
                    </label>
                    <input
                      type="url"
                      value={designUrl}
                      onChange={(e) => setDesignUrl(e.target.value)}
                      placeholder="https://cdn.rareimagery.net/designs/..."
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-400">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-400">
                        Retail Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={retailPrice}
                        onChange={(e) => setRetailPrice(e.target.value)}
                        placeholder="29.99"
                        className="w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant selection */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-300">
                    Select Variants ({selectedVariants.size} selected)
                  </h4>
                  <button
                    onClick={selectAllVariants}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {selectedVariants.size === selectedProduct.variants.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-900">
                      <tr>
                        <th className="w-8 px-3 py-2" />
                        <th className="px-3 py-2 text-xs font-medium text-zinc-500">Color</th>
                        <th className="px-3 py-2 text-xs font-medium text-zinc-500">Size</th>
                        <th className="px-3 py-2 text-xs font-medium text-zinc-500">
                          Base Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {selectedProduct.variants.map((v) => (
                        <tr
                          key={v.id}
                          onClick={() => toggleVariant(v.id)}
                          className={`cursor-pointer transition ${
                            selectedVariants.has(v.id)
                              ? "bg-indigo-500/10"
                              : "hover:bg-zinc-800/50"
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedVariants.has(v.id)}
                              onChange={() => toggleVariant(v.id)}
                              className="rounded border-zinc-600"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-full border border-zinc-600"
                                style={{ backgroundColor: v.color_code }}
                              />
                              <span className="text-zinc-300">{v.color}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-zinc-400">{v.size}</td>
                          <td className="px-3 py-2 text-zinc-400">${v.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Margin calculator */}
                {retailPrice && selectedProduct.variants.length > 0 && (
                  <div className="mt-3 rounded-lg bg-zinc-800/50 px-4 py-3">
                    <p className="text-xs text-zinc-400">
                      Estimated margin per item:{" "}
                      <span className="font-semibold text-green-400">
                        $
                        {(
                          parseFloat(retailPrice) -
                          parseFloat(selectedProduct.variants[0]?.price || "0")
                        ).toFixed(2)}
                      </span>
                      <span className="ml-2 text-zinc-500">
                        (base cost: ${selectedProduct.variants[0]?.price})
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <a
                  href="https://www.printful.com/design-maker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Design in Printful
                </a>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setActiveTab("catalog");
                  }}
                  className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ---- Webhooks Tab ---- */}
          {activeTab === "webhooks" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                  Order & Shipping Webhooks
                </h3>
                <p className="mb-4 text-xs text-zinc-500">
                  Webhooks notify your store when orders ship, fail, or are updated by Printful.
                  This enables automatic tracking updates and order status notifications.
                </p>

                {webhookConfigured ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      Webhooks Active
                    </span>
                    <button
                      onClick={handleSetupWebhooks}
                      disabled={settingUpWebhook}
                      className="text-xs text-zinc-400 hover:text-zinc-300"
                    >
                      Reconfigure
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSetupWebhooks}
                    disabled={settingUpWebhook}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {settingUpWebhook ? "Setting up..." : "Enable Webhooks"}
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h4 className="mb-3 text-xs font-semibold uppercase text-zinc-500">
                  Events We Listen For
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { event: "package_shipped", desc: "Package shipped with tracking info" },
                    { event: "order_failed", desc: "Order failed (address, charge, etc.)" },
                    { event: "order_canceled", desc: "Order was canceled" },
                    { event: "order_put_hold", desc: "Order placed on hold" },
                    { event: "order_remove_hold", desc: "Order removed from hold" },
                    { event: "stock_updated", desc: "Variant stock level changed" },
                    { event: "package_returned", desc: "Package returned to sender" },
                  ].map((item) => (
                    <div
                      key={item.event}
                      className="flex items-start gap-2 rounded-lg bg-zinc-800/30 p-2"
                    >
                      <code className="mt-0.5 text-[10px] text-indigo-400">
                        {item.event}
                      </code>
                      <span className="text-xs text-zinc-500">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
