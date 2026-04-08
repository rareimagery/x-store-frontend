"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface StoreProduct {
  id: string;
  title: string;
  price: string;
  image_url: string | null;
  description: string;
  sku: string;
}

const PRODUCT_TYPES = [
  { value: "t_shirt", label: "T-Shirt", emoji: "👕" },
  { value: "hoodie", label: "Hoodie", emoji: "🧥" },
  { value: "ballcap", label: "Ballcap", emoji: "🧢" },
  { value: "digital_drop", label: "Digital Drop", emoji: "⚡" },
];

export default function DesignStudioPage() {
  const { storeSlug, hasStore } = useConsole();
  const [prompt, setPrompt] = useState("");
  const [productType, setProductType] = useState("t_shirt");
  const [generating, setGenerating] = useState(false);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [designVariants, setDesignVariants] = useState<string[]>([]);
  const [usedPfp, setUsedPfp] = useState<{ used: boolean; username?: string }>({ used: false });
  const [usedUpload, setUsedUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference image upload
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refDataUrl, setRefDataUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{
    product_type: string;
    mockup_url: string | null;
    retail_price: string;
    design_url: string | null;
    printful_synced: boolean;
  } | null>(null);

  // Printful connection
  const [printfulKey, setPrintfulKey] = useState("");
  const [printfulConnected, setPrintfulConnected] = useState<string | null>(null);
  const [storeUuid, setStoreUuid] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // X Profile quick generate
  const [xHandle, setXHandle] = useState("");
  const [xLooking, setXLooking] = useState(false);

  // Printful import
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Enhance prompt + Import X Post
  const [enhancing, setEnhancing] = useState(false);
  const [xPostUrl, setXPostUrl] = useState("");
  const [importingPost, setImportingPost] = useState(false);

  // Store products
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Check Printful status and load products on mount
  useEffect(() => {
    if (!hasStore) return;

    // Check Printful connection
    fetch(`/api/printful/status?slug=${encodeURIComponent(storeSlug || "")}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.store_uuid) setStoreUuid(d.store_uuid);
        if (d.connected) setPrintfulConnected(d.printful_store_id ? `Store #${d.printful_store_id}` : "Connected");
      })
      .catch(() => {});

    // Load store products from Drupal
    fetch(`/api/stores/products?slug=${encodeURIComponent(storeSlug || "")}`)
      .then((r) => r.json())
      .then((d) => {
        const products = d.products ?? d ?? [];
        setStoreProducts(Array.isArray(products) ? products : []);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [hasStore, storeSlug]);

  const connectPrintful = useCallback(async () => {
    if (!printfulKey.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/printful/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: printfulKey.trim(), storeId: storeUuid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectError(data.error || "Connection failed");
        return;
      }
      setPrintfulConnected(data.printful_store || "Connected");
      setPrintfulKey("");
    } catch {
      setConnectError("Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [printfulKey]);

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to use the Design Studio.</p>
        </div>
      </div>
    );
  }

  const handleFileSelect = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      setError("Image too large (max 4MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images");
      return;
    }
    setError(null);
    setRefPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setRefDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setRefPreview(null);
    setRefDataUrl(null);
  };

  const handleXProfileGenerate = async () => {
    const handle = xHandle.trim().replace(/^@/, "");
    if (!handle) return;
    setXLooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/x-lookup?username=${encodeURIComponent(handle)}`);
      if (!res.ok) {
        setError(`@${handle} not found on X`);
        setXLooking(false);
        return;
      }
      const profile = await res.json();
      const productLabel = PRODUCT_TYPES.find((t) => t.value === productType)?.label || "T-Shirt";
      const bioSnippet = (profile.bio || "").slice(0, 100);
      const autoPrompt = `Premium ${productLabel} merch design inspired by @${handle}. Theme: ${bioSnippet}. Print-ready, centered, vibrant, high contrast for fabric.`;
      setPrompt(autoPrompt);
      setTitle(`@${handle} ${productLabel}`);
      // Use their PFP as reference
      if (profile.profile_image_url) {
        setRefPreview(profile.profile_image_url);
        setRefDataUrl(null); // PFP detection in prompt handles this via @handle pfp pattern
        setPrompt(`@${handle} pfp ${autoPrompt}`);
      }
      setXHandle("");
    } catch {
      setError("X lookup failed");
    } finally {
      setXLooking(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !refDataUrl) return;
    setGenerating(true);
    setDesignUrl(null);
    setDesignVariants([]);
    setUsedPfp({ used: false });
    setUsedUpload(false);
    setError(null);
    setPublished(null);

    try {
      const res = await fetch("/api/design-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || "create a design from this image",
          product_type: productType,
          reference_image: refDataUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      const urls: string[] = data.image_urls || [data.image_url];
      setDesignVariants(urls);
      setDesignUrl(urls[0]);
      setUsedPfp({ used: data.used_pfp || false, username: data.pfp_username });
      setUsedUpload(data.used_upload || false);
      if (!title) {
        setTitle(`${prompt.trim().slice(0, 40)} ${PRODUCT_TYPES.find((t) => t.value === productType)?.label || ""}`);
      }

      // Log generation cost ($0.02 per image)
      const imageCount = urls.length;
      fetch("/api/console/cost-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "grok_ai",
          amount: imageCount * 0.02,
          description: `Grok Imagine: ${imageCount} variants for "${prompt.trim().slice(0, 50)}"`,
        }),
      }).catch(() => {});

      // Auto-save to gallery
      fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          item: {
            id: `grok_${Date.now()}`,
            url: data.image_url,
            prompt: prompt.trim(),
            type: "image",
            created_at: new Date().toISOString(),
            product_type: productType,
          },
        }),
      }).catch(() => {});
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!designUrl || !title.trim()) return;
    setPublishing(true);
    setError(null);

    try {
      const res = await fetch("/api/design-studio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: designUrl,
          product_type: productType,
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Publish failed");
        return;
      }

      setPublished({
        product_type: data.product_type,
        mockup_url: data.mockup_url,
        retail_price: data.retail_price,
        design_url: data.design_url,
        printful_synced: !!data.printful_product_id,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setPublishing(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/design-studio/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), product_type: productType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) {
          setPrompt(data.enhanced);
          if (data.description && !description) setDescription(data.description);
        }
      }
    } catch {} finally {
      setEnhancing(false);
    }
  };

  const handleImportXPost = async () => {
    const url = xPostUrl.trim();
    if (!url) return;
    // Extract post ID from URL: https://x.com/user/status/1234567890
    const match = url.match(/(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/);
    if (!match) {
      setError("Paste a valid X post URL (e.g. https://x.com/user/status/123)");
      return;
    }
    setImportingPost(true);
    setError(null);
    try {
      const res = await fetch(`/api/design-studio/import-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_url: url }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) setPrompt(data.text);
        if (data.image_url) {
          setRefPreview(data.image_url);
          setRefDataUrl(null);
        }
        if (data.title) setTitle(data.title);
        setXPostUrl("");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to import post");
      }
    } catch {
      setError("Failed to import post");
    } finally {
      setImportingPost(false);
    }
  };

  const selectedProduct = PRODUCT_TYPES.find((t) => t.value === productType);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3 mb-1">
        <svg className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
        <h1 className="text-2xl font-bold text-white">Grok Creator Studio</h1>
      </div>
      <p className="text-sm text-zinc-400 mb-8">
        Describe your design. Grok Imagine creates 4 variants. Pick your favorite. Printful fulfills it.
      </p>

      {/* Quick generate from X profile */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4">
        <p className="text-xs font-medium text-zinc-400 mb-2">Quick: Generate merch from an X profile</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
            <input
              type="text"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleXProfileGenerate()}
              placeholder="username"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleXProfileGenerate}
            disabled={xLooking || !xHandle.trim()}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-500 disabled:opacity-50 transition"
          >
            {xLooking ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Looking up...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Generate from Profile
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5">Auto-fills prompt from their bio + uses their PFP as reference image</p>
      </div>

      {/* Import X Post */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4">
        <p className="text-xs font-medium text-zinc-400 mb-2">Import from an X post</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={xPostUrl}
            onChange={(e) => setXPostUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImportXPost()}
            placeholder="Paste X post URL (e.g. https://x.com/user/status/123)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={handleImportXPost}
            disabled={importingPost || !xPostUrl.trim()}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-purple-500 hover:text-white disabled:opacity-50 transition"
          >
            {importingPost ? "Importing..." : "Import Post"}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5">Extracts the post text as your prompt and image as reference</p>
      </div>

      {/* Reference image upload */}
      <div
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/5"
            : refPreview
              ? "border-zinc-700 bg-zinc-900/50"
              : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-600"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileSelect(file);
        }}
      >
        {refPreview ? (
          <div className="flex items-center gap-4">
            <img src={refPreview} alt="Reference" className="h-20 w-20 rounded-lg object-cover" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Reference image attached</p>
              <p className="text-xs text-zinc-500">Grok will use this as the base for your design</p>
            </div>
            <button
              onClick={clearReference}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500/50 hover:text-red-400 transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <svg className="mx-auto h-8 w-8 text-zinc-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-zinc-400">Drag &amp; drop a reference image</p>
            <p className="text-[10px] text-zinc-600 mb-3">Logo, artwork, photo, sketch — JPEG/PNG/WebP, max 4MB</p>
            <label className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition">
              Choose file
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </label>
            <p className="mt-2 text-[10px] text-zinc-600">Optional — or just type a prompt below</p>
          </>
        )}
      </div>

      {/* Prompt input */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Cyberpunk samurai cat wearing neon sunglasses..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none"
          rows={3}
        />
        <button
          onClick={handleEnhancePrompt}
          disabled={enhancing || !prompt.trim()}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-purple-500 hover:text-white disabled:opacity-50 transition flex items-center justify-center gap-1.5"
        >
          {enhancing ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Enhancing...
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              Enhance prompt with Grok AI
            </>
          )}
        </button>

        {/* Product type selector */}
        <div className="flex gap-2">
          {PRODUCT_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => setProductType(pt.value)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                productType === pt.value
                  ? "border-indigo-500 bg-indigo-950/40 text-white"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <span className="text-lg">{pt.emoji}</span>
              <span className="ml-1.5">{pt.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating 4 variants with Grok Imagine...
            </span>
          ) : (
            "Generate 4 Design Variants"
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Generated design variants */}
      {designVariants.length > 0 && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          {/* Variant selection grid */}
          {designVariants.length > 1 && (
            <div className="p-4 border-b border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-3">
                {designVariants.length} variants generated — select your favorite
              </p>
              <div className="grid grid-cols-4 gap-3">
                {designVariants.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setDesignUrl(url)}
                    className={`relative rounded-xl overflow-hidden border-2 transition ${
                      designUrl === url
                        ? "border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <img src={url} alt={`Variant ${i + 1}`} className="aspect-square w-full object-cover" />
                    {designUrl === url && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected design large preview */}
          <div className="relative bg-zinc-800">
            <img
              src={designUrl!}
              alt="Selected design"
              className="w-full max-h-[512px] object-contain mx-auto"
            />
          </div>

          {(usedPfp.used || usedUpload) && (
            <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-emerald-400">
                {usedUpload
                  ? "Used uploaded reference image"
                  : `Used @${usedPfp.username} PFP as reference`}
              </span>
            </div>
          )}

          {/* Publish to Printful */}
          {!published ? (
            <div className="p-4 border-t border-zinc-800 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product title..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional)..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handlePublish}
                  disabled={publishing || !title.trim()}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                >
                  {publishing ? "Publishing to Printful..." : `Publish ${selectedProduct?.emoji} to Printful`}
                </button>
                <button
                  onClick={() => { setDesignUrl(null); setDesignVariants([]); setTitle(""); }}
                  className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-green-400 mb-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Product Created in Your Store!</span>
              </div>
              <div className="text-sm text-zinc-400 space-y-1">
                <p>{published.product_type} &middot; ${published.retail_price}</p>
                {published.printful_synced && (
                  <p className="text-indigo-400">Synced to Printful for fulfillment</p>
                )}
                {!published.printful_synced && productType !== "digital_drop" && (
                  <p className="text-amber-400">Printful not connected &mdash; product saved to store only</p>
                )}
                {productType === "digital_drop" && (
                  <p className="text-emerald-400">Digital drop — instant delivery on purchase</p>
                )}
                {published.mockup_url && (
                  <img src={published.mockup_url} alt="Mockup" className="mt-2 rounded-lg max-h-48 object-contain" />
                )}
              </div>

              {/* Share to X */}
              <a
                href={`https://x.com/intent/tweet?${new URLSearchParams({
                  text: `Just dropped "${title}" on RareImagery! Check it out`,
                  url: `https://www.rareimagery.net/${storeSlug}/store`,
                }).toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share Drop to X
              </a>

              <button
                onClick={() => { setDesignUrl(null); setDesignVariants([]); setTitle(""); setDescription(""); setPublished(null); setPrompt(""); clearReference(); }}
                className="mt-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition w-full"
              >
                Create Another Design
              </button>
            </div>
          )}
        </div>
      )}
      {/* Printful Connection */}
      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h2 className="text-sm font-semibold text-white">Printful</h2>
          </div>
          {printfulConnected && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {printfulConnected}
            </span>
          )}
        </div>

        {printfulConnected ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Printful is connected. Designs you publish will auto-sync for print-on-demand fulfillment.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!storeUuid) return;
                  setSyncing(true);
                  setSyncResult(null);
                  try {
                    const res = await fetch("/api/printful/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ storeId: storeUuid }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setSyncResult(`Imported ${data.imported} product${data.imported !== 1 ? "s" : ""} (${data.skipped} already existed)`);
                      // Reload products
                      fetch(`/api/stores/products?slug=${encodeURIComponent(storeSlug || "")}`)
                        .then((r) => r.json())
                        .then((d) => setStoreProducts(Array.isArray(d.products ?? d) ? (d.products ?? d) : []))
                        .catch(() => {});
                    } else {
                      setSyncResult(data.error || "Import failed");
                    }
                  } catch {
                    setSyncResult("Import failed");
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-indigo-500 hover:text-white disabled:opacity-50 transition"
              >
                {syncing ? "Importing..." : "Import Products from Printful"}
              </button>
              {syncResult && <span className="text-xs text-zinc-400">{syncResult}</span>}
              <button
                onClick={() => setShowTokenHelp(true)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-400 transition"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
                Help
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              Connect your Printful account to enable print-on-demand fulfillment for your designs.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={printfulKey}
                onChange={(e) => setPrintfulKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connectPrintful()}
                placeholder="Paste your Printful Private Token..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={connectPrintful}
                disabled={connecting || !printfulKey.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {connecting ? "Connecting..." : "Connect"}
              </button>
            </div>
            {connectError && <p className="text-xs text-red-400">{connectError}</p>}
            <button
              onClick={() => setShowTokenHelp(true)}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
              How to find your token
            </button>
          </div>

        )}
      </div>

      {showTokenHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTokenHelp(false)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTokenHelp(false)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-white transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Find Your Printful Token</h3>

            <ol className="space-y-4 text-sm text-zinc-300">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</span>
                <div>
                  <p className="font-medium text-white">Go to Printful Settings</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Log in to{" "}
                    <a href="https://www.printful.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">printful.com/dashboard</a>
                    {" "}and click <strong>Settings</strong> in the left sidebar.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</span>
                <div>
                  <p className="font-medium text-white">Open the API tab</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Click <strong>API</strong> in the settings menu, or go directly to{" "}
                    <a href="https://www.printful.com/dashboard/developer/api" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Settings &rarr; API</a>.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">3</span>
                <div>
                  <p className="font-medium text-white">Create a Private Token</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Click <strong>&quot;Create token&quot;</strong>, give it a name (e.g. &quot;RareImagery&quot;), and <strong>select all scopes</strong> so we can read your products and create orders.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">4</span>
                <div>
                  <p className="font-medium text-white">Copy and paste it here</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Copy the token and paste it into the field above. Your products will be automatically imported.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-5 flex justify-end gap-2">
              <a
                href="https://www.printful.com/dashboard/developer/api"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition"
              >
                Open Printful API Settings
              </a>
              <button
                onClick={() => setShowTokenHelp(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Products */}
      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Your Store Products</h2>
        {loadingProducts ? (
          <p className="text-xs text-zinc-500">Loading products...</p>
        ) : storeProducts.length === 0 ? (
          <p className="text-xs text-zinc-500">No products yet. Generate a design above and publish it to create your first product.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {storeProducts.map((p) => (
              <a
                key={p.id}
                href={`/products/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-800/50 overflow-hidden transition hover:border-zinc-600"
              >
                {p.image_url ? (
                  <div className="aspect-square overflow-hidden">
                    <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-zinc-800">
                    <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium text-white truncate">{p.title}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
