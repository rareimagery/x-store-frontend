"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import Link from "next/link";

interface GalleryItem {
  id: string;
  url: string;
  prompt: string;
  type: "image" | "video";
  created_at: string;
  product_type?: string;
}

export default function GrokGalleryPage() {
  const { storeSlug, hasStore } = useConsole();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Manual add
  const [newUrl, setNewUrl] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newType, setNewType] = useState<"image" | "video">("image");

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => setGallery(d.gallery ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  const addItem = useCallback(async () => {
    if (!newUrl.trim()) return;
    const item: GalleryItem = {
      id: `grok_${Date.now()}`,
      url: newUrl.trim(),
      prompt: newPrompt.trim() || "AI generated",
      type: newType,
      created_at: new Date().toISOString(),
    };
    const updated = [item, ...gallery];
    setGallery(updated);
    setNewUrl("");
    setNewPrompt("");
    await save(updated);
  }, [newUrl, newPrompt, newType, gallery]);

  const removeItem = useCallback(async (id: string) => {
    const updated = gallery.filter((g) => g.id !== id);
    setGallery(updated);
    await save(updated);
  }, [gallery]);

  async function save(list: GalleryItem[]) {
    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", gallery: list }),
      });
      if (res.ok) {
        setSavedMessage("Saved!");
        setTimeout(() => setSavedMessage(null), 2000);
      }
    } catch {} finally { setSaving(false); }
  }

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Grok Gallery</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Your AI-generated images and videos. Auto-saved from Design Studio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && <span className="text-sm text-green-400">{savedMessage}</span>}
          {saving && <span className="text-sm text-zinc-500">Saving...</span>}
          <Link
            href="/console/design-studio"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
          >
            Open Design Studio
          </Link>
        </div>
      </div>

      {/* Manual add */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6 space-y-3">
        <p className="text-sm font-medium text-zinc-300">Add an image or video manually</p>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste image or video URL..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Description / prompt (optional)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "image" | "video")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>
        <button
          onClick={addItem}
          disabled={!newUrl.trim()}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          Add to Gallery
        </button>
      </div>

      {/* Gallery grid */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : gallery.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-3 text-zinc-500">No creations yet. Generate designs in the Design Studio — they auto-save here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {gallery.map((item) => (
            <div key={item.id} className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              {item.type === "video" ? (
                <video src={item.url} className="aspect-square w-full object-cover" muted playsInline />
              ) : (
                <img src={item.url} alt={item.prompt} className="aspect-square w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-xs text-white line-clamp-2">{item.prompt}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-zinc-400">
                      {item.type === "video" ? "Video" : "Image"}
                      {item.product_type ? ` · ${item.product_type}` : ""}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-600 text-center mt-4">
        {gallery.length} {gallery.length === 1 ? "creation" : "creations"} · Shows in the Grok Gallery wireframe block
      </p>
    </div>
  );
}
