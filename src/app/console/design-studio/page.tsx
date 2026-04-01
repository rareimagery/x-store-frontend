"use client";

import { useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

const PRODUCT_TYPES = [
  { value: "t_shirt", label: "T-Shirt", emoji: "👕", price: "$24.99" },
  { value: "hoodie", label: "Hoodie", emoji: "🧥", price: "$44.99" },
  { value: "ballcap", label: "Ballcap", emoji: "🧢", price: "$29.99" },
];

export default function DesignStudioPage() {
  const { storeSlug, hasStore } = useConsole();
  const [prompt, setPrompt] = useState("");
  const [productType, setProductType] = useState("t_shirt");
  const [generating, setGenerating] = useState(false);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
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

  const handleGenerate = async () => {
    if (!prompt.trim() && !refDataUrl) return;
    setGenerating(true);
    setDesignUrl(null);
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

      setDesignUrl(data.image_url);
      setUsedPfp({ used: data.used_pfp || false, username: data.pfp_username });
      setUsedUpload(data.used_upload || false);
      if (!title) {
        setTitle(`${prompt.trim().slice(0, 40)} ${PRODUCT_TYPES.find((t) => t.value === productType)?.label || ""}`);
      }

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

  const selectedProduct = PRODUCT_TYPES.find((t) => t.value === productType);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Design Studio</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Describe your design, Grok Imagine creates it, publish to Printful in one click.
      </p>

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
              <span className="ml-1 text-xs text-zinc-500">{pt.price}</span>
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
              Generating with Grok Imagine...
            </span>
          ) : (
            "Generate Design"
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Generated design preview */}
      {designUrl && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="relative bg-zinc-800">
            <img
              src={designUrl}
              alt="Generated design"
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
                  onClick={() => { setDesignUrl(null); setTitle(""); }}
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
                {!published.printful_synced && (
                  <p className="text-amber-400">Printful not connected &mdash; product saved to store only</p>
                )}
                {published.mockup_url && (
                  <img src={published.mockup_url} alt="Mockup" className="mt-2 rounded-lg max-h-48 object-contain" />
                )}
              </div>
              <button
                onClick={() => { setDesignUrl(null); setTitle(""); setDescription(""); setPublished(null); setPrompt(""); clearReference(); }}
                className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
              >
                Create Another Design
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
