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

  // Upload
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Manual add
  const [newUrl, setNewUrl] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newType, setNewType] = useState<"image" | "video">("image");
  const [sellingId, setSellingId] = useState<string | null>(null);

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

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setSavedMessage("File too large (max 20MB)");
      return;
    }
    setUploading(true);
    setSavedMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/gallery/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setSavedMessage(data.error || "Upload failed");
        return;
      }

      const item: GalleryItem = {
        id: `upload_${Date.now()}`,
        url: data.url,
        prompt: file.name.replace(/\.[^.]+$/, ""),
        type: data.type || "image",
        created_at: new Date().toISOString(),
      };

      const updated = [item, ...gallery];
      setGallery(updated);
      await save(updated);
    } catch {
      setSavedMessage("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [gallery]);

  const removeItem = useCallback(async (id: string) => {
    const updated = gallery.filter((g) => g.id !== id);
    setGallery(updated);
    await save(updated);
  }, [gallery]);

  const sellAsDrop = useCallback(async (item: GalleryItem) => {
    setSellingId(item.id);
    try {
      const res = await fetch("/api/design-studio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: item.url,
          product_type: "digital_drop",
          title: item.prompt || "Grok AI Creation",
          description: `AI-generated ${item.type} by Grok Imagine`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedMessage("Published as Digital Drop!");
        setTimeout(() => setSavedMessage(null), 3000);
      } else {
        setSavedMessage(data.error || "Publish failed");
        setTimeout(() => setSavedMessage(null), 3000);
      }
    } catch {
      setSavedMessage("Publish failed");
      setTimeout(() => setSavedMessage(null), 3000);
    } finally {
      setSellingId(null);
    }
  }, []);

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

      {/* Upload zone */}
      <div
        className={`rounded-xl border-2 border-dashed p-6 mb-4 text-center transition-colors ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-600"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-indigo-400">Uploading to Drupal...</span>
          </div>
        ) : (
          <>
            <svg className="mx-auto h-8 w-8 text-zinc-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-zinc-400">Drag &amp; drop images or videos here</p>
            <p className="text-[10px] text-zinc-600 mb-3">JPEG, PNG, WebP, GIF, MP4, WebM — max 20MB — stored on Drupal</p>
            <label className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition">
              Choose file
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>
          </>
        )}
      </div>

      {/* Manual URL add */}
      <details className="mb-6">
        <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">Or add by URL</summary>
        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
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
              placeholder="Description (optional)"
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
      </details>

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
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition">
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                  <p className="text-xs text-white line-clamp-2">{item.prompt}</p>

                  {/* Action buttons */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => sellAsDrop(item)}
                      disabled={sellingId === item.id}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                    >
                      {sellingId === item.id ? "Publishing..." : "Sell as Drop"}
                    </button>
                    <a
                      href={`https://x.com/intent/tweet?${new URLSearchParams({
                        text: `Check out my Grok AI creation on RareImagery`,
                        url: item.url,
                      }).toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 rounded-lg bg-zinc-700 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-zinc-600 transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                      Share
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
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
