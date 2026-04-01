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
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setDesignUrl(null);
    setRevisedPrompt(null);
    setError(null);
    setPublished(null);

    try {
      const res = await fetch("/api/design-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), product_type: productType }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setDesignUrl(data.image_url);
      setRevisedPrompt(data.revised_prompt || null);
      if (!title) {
        setTitle(`${prompt.trim().slice(0, 40)} ${PRODUCT_TYPES.find((t) => t.value === productType)?.label || ""}`);
      }
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

          {revisedPrompt && (
            <p className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800">
              Grok interpreted: {revisedPrompt}
            </p>
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
                onClick={() => { setDesignUrl(null); setTitle(""); setDescription(""); setPublished(null); setPrompt(""); }}
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
