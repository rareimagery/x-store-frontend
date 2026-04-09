"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface GalleryItem {
  id: string;
  url: string;
  prompt: string;
  name: string;
  type: "image" | "video";
  created_at: string;
  product_type?: string;
  folder?: string;
  saved?: boolean;
}

const DEFAULT_FOLDER = "Unsorted";

export default function GrokLibraryPage() {
  const { hasStore } = useConsole();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => {
        const items: GalleryItem[] = (d.gallery || []).map((g: GalleryItem) => ({
          ...g,
          name: g.name || g.prompt?.slice(0, 30) || "Untitled",
          folder: g.folder || DEFAULT_FOLDER,
          saved: g.saved !== false,
        }));
        setGallery(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  // Derived: unique folders sorted with Unsorted last
  const folders = useMemo(() => {
    const set = new Set(gallery.map((g) => g.folder || DEFAULT_FOLDER));
    const arr = Array.from(set).sort((a, b) => {
      if (a === DEFAULT_FOLDER) return 1;
      if (b === DEFAULT_FOLDER) return -1;
      return a.localeCompare(b);
    });
    return arr;
  }, [gallery]);

  // Unsaved count
  const unsavedCount = useMemo(() => gallery.filter((g) => !g.saved).length, [gallery]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!activeFolder) return gallery;
    return gallery.filter((g) => (g.folder || DEFAULT_FOLDER) === activeFolder);
  }, [gallery, activeFolder]);

  const persistGallery = useCallback(async (updated: GalleryItem[]) => {
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

  const confirmSave = useCallback(async (id: string) => {
    const updated = gallery.map((g) => g.id === id ? { ...g, saved: true } : g);
    setGallery(updated);
    await persistGallery(updated);
  }, [gallery, persistGallery]);

  const removeItem = useCallback(async (id: string) => {
    const updated = gallery.filter((g) => g.id !== id);
    setGallery(updated);
    await persistGallery(updated);
  }, [gallery, persistGallery]);

  const updateItem = useCallback(async (id: string, changes: Partial<GalleryItem>) => {
    const updated = gallery.map((g) => g.id === id ? { ...g, ...changes } : g);
    setGallery(updated);
    setEditingId(null);
    setMovingId(null);
    await persistGallery(updated);
  }, [gallery, persistGallery]);

  const createFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (!name || folders.includes(name)) { setShowNewFolder(false); return; }
    setActiveFolder(name);
    setNewFolderName("");
    setShowNewFolder(false);
  }, [newFolderName, folders]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (validFiles.length === 0) return;

    setUploading(true);
    const newItems: GalleryItem[] = [];
    const now = new Date();
    const dateTag = `${now.getMonth() + 1}/${now.getDate()}`;

    for (const file of validFiles) {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/gallery/upload", { method: "POST", body: form });
        if (res.ok) {
          const data = await res.json();
          const url = data.url || data.uri || "";
          if (url) {
            const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").slice(0, 30);
            newItems.push({
              id: `grok_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              url,
              prompt: cleanName,
              name: `${cleanName} — ${dateTag}`,
              type: file.type.startsWith("video/") ? "video" : "image",
              created_at: now.toISOString(),
              folder: activeFolder || DEFAULT_FOLDER,
              saved: true,
            });
          }
        }
      } catch {}
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...gallery];
      setGallery(updated);
      await persistGallery(updated);
    }
    setUploading(false);
  }, [gallery, persistGallery, activeFolder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Grok Library</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Your AI-generated designs. Organized by folder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-xs text-green-400 font-medium">{savedMsg}</span>}
          {saving && <span className="text-xs text-zinc-500">Saving...</span>}
          {unsavedCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              {unsavedCount} unsaved
            </span>
          )}
          <span className="text-xs text-zinc-600">{gallery.length} items</span>
        </div>
      </div>

      {/* Folder bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFolder(null)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            activeFolder === null
              ? "bg-purple-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          All ({gallery.length})
        </button>
        {folders.map((folder) => {
          const count = gallery.filter((g) => (g.folder || DEFAULT_FOLDER) === folder).length;
          return (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeFolder === folder
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {folder} ({count})
            </button>
          );
        })}

        {/* New folder */}
        {showNewFolder ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              placeholder="Folder name..."
              className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <button onClick={createFolder} className="rounded-lg bg-purple-600 px-2 py-1.5 text-xs text-white hover:bg-purple-500">
              Add
            </button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="text-xs text-zinc-500 hover:text-white">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="shrink-0 flex items-center gap-1 rounded-lg border border-dashed border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-500 hover:border-purple-500 hover:text-purple-400 transition"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Folder
          </button>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`mb-6 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
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
            <svg className="h-7 w-7 text-zinc-600 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-zinc-400">Drag & drop images or videos</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {activeFolder && activeFolder !== DEFAULT_FOLDER ? `Saves to "${activeFolder}" folder` : "PNG, JPG, MP4, WebP (max 20MB)"}
            </p>
          </>
        )}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <svg className="h-10 w-10 text-zinc-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p className="text-zinc-500 text-sm">
            {activeFolder ? `No items in "${activeFolder}" yet` : "No creations yet"}
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            Generate designs in the Creator Studio or upload images above
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-xl border bg-zinc-900/50 overflow-hidden transition ${
                !item.saved
                  ? "border-amber-500/40 ring-1 ring-amber-500/20"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
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
                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}

              {/* Unsaved badge + save checkmark */}
              {!item.saved && (
                <button
                  onClick={() => confirmSave(item.id)}
                  className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-600 transition-colors shadow-lg"
                  title="Save to library"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save
                </button>
              )}

              {/* Saved checkmark */}
              {item.saved && (
                <div className="absolute top-2 left-2 rounded-full bg-green-600/80 p-1 opacity-0 group-hover:opacity-100 transition">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="p-2">
                {editingId === item.id ? (
                  <div className="space-y-1.5">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="Name..."
                    />
                    <select
                      value={editFolder}
                      onChange={(e) => setEditFolder(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-white focus:outline-none"
                    >
                      {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateItem(item.id, { name: editName.trim() || item.name, folder: editFolder })}
                        className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] text-white hover:bg-indigo-500"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-[10px] text-zinc-500 hover:text-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : movingId === item.id ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-500">Move to folder:</p>
                    <div className="flex flex-wrap gap-1">
                      {folders.map((f) => (
                        <button
                          key={f}
                          onClick={() => updateItem(item.id, { folder: f })}
                          className={`rounded px-2 py-0.5 text-[10px] transition ${
                            (item.folder || DEFAULT_FOLDER) === f
                              ? "bg-purple-600 text-white"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setMovingId(null)} className="text-[10px] text-zinc-500 hover:text-white">Cancel</button>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-white font-medium line-clamp-1">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">
                        {item.folder || DEFAULT_FOLDER}
                      </span>
                      <span className="text-[9px] text-zinc-700">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Hover actions */}
              {editingId !== item.id && movingId !== item.id && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => { setEditingId(item.id); setEditName(item.name); setEditFolder(item.folder || DEFAULT_FOLDER); }}
                    className="rounded-full bg-black/70 p-1.5 text-zinc-300 hover:text-white transition"
                    title="Edit name"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
                  </button>
                  <button
                    onClick={() => setMovingId(item.id)}
                    className="rounded-full bg-black/70 p-1.5 text-zinc-300 hover:text-white transition"
                    title="Move to folder"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
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
