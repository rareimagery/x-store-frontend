"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface GalleryItem {
  id: string;
  url: string;
  prompt: string;
  type: "image" | "video";
  created_at: string;
  product_type?: string;
}

export default function GrokLibraryPage() {
  const { hasStore } = useConsole();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => setGallery(d.gallery || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  const saveGallery = useCallback(async (updated: GalleryItem[]) => {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", gallery: updated }),
      });
      if (res.ok) {
        setSavedMsg("Saved!");
        setTimeout(() => setSavedMsg(null), 2000);
      }
    } catch {} finally { setSaving(false); }
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (validFiles.length === 0) return;

    setUploading(true);
    const newItems: GalleryItem[] = [];

    for (const file of validFiles) {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/gallery/upload", { method: "POST", body: form });
        if (res.ok) {
          const data = await res.json();
          const url = data.url || data.uri || "";
          if (url) {
            newItems.push({
              id: `grok_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              url,
              prompt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
              type: file.type.startsWith("video/") ? "video" : "image",
              created_at: new Date().toISOString(),
            });
          }
        }
      } catch {}
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...gallery];
      setGallery(updated);
      await saveGallery(updated);
    }
    setUploading(false);
  }, [gallery, saveGallery]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const removeItem = useCallback(async (id: string) => {
    const updated = gallery.filter((g) => g.id !== id);
    setGallery(updated);
    await saveGallery(updated);
  }, [gallery, saveGallery]);

  const updatePrompt = useCallback(async (id: string, newPrompt: string) => {
    const updated = gallery.map((g) => g.id === id ? { ...g, prompt: newPrompt } : g);
    setGallery(updated);
    setEditingId(null);
    await saveGallery(updated);
  }, [gallery, saveGallery]);

  if (!hasStore) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to build your Grok Library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Grok Library</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Upload your Grok Imagine creations. Images and videos show on your public gallery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-sm text-green-400 font-medium">{savedMsg}</span>}
          {saving && <span className="text-sm text-zinc-500">Saving...</span>}
          <span className="text-xs text-zinc-600">{gallery.length} items</span>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`mt-4 mb-6 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
          dragOver
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-500"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-sm text-indigo-400 animate-pulse">Uploading...</p>
        ) : (
          <>
            <svg className="h-8 w-8 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-zinc-400">Drag & drop images or videos here</p>
            <p className="text-xs text-zinc-600 mt-1">or click to browse — PNG, JPG, MP4, WebP (max 20MB)</p>
          </>
        )}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : gallery.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">No creations yet. Upload your Grok Imagine images and videos above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition hover:border-zinc-600"
            >
              {/* Media */}
              {item.type === "video" ? (
                <div className="relative aspect-square">
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                    onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                  />
                  <div className="absolute top-2 left-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white font-medium">
                    Video
                  </div>
                </div>
              ) : (
                <div className="aspect-square">
                  <img src={item.url} alt={item.prompt} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}

              {/* Info */}
              <div className="p-2">
                {editingId === item.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={2}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white focus:border-indigo-500 focus:outline-none resize-none"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => updatePrompt(item.id, editPrompt)}
                        className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] text-white hover:bg-indigo-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[10px] text-zinc-500 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{item.prompt || "No description"}</p>
                    <p className="text-[9px] text-zinc-700 mt-1">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                    </p>
                  </>
                )}
              </div>

              {/* Hover actions */}
              {editingId !== item.id && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => { setEditingId(item.id); setEditPrompt(item.prompt); }}
                    className="rounded-full bg-black/70 p-1.5 text-zinc-300 hover:text-white transition"
                    title="Edit description"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="rounded-full bg-black/70 p-1.5 text-red-400 hover:text-red-300 transition"
                    title="Remove"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
