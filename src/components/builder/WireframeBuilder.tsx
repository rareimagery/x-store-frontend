"use client";

import { useCallback, useEffect, useState } from "react";
import type { BlockComponentDef } from "@/app/api/blocks/route";
import { getStoreUrl } from "@/lib/store-url";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PlacedBlock {
  /** Unique instance id */
  instanceId: string;
  /** Block type from catalog */
  type: string;
  /** Column placement */
  column: "left" | "center" | "right"; // "left" is legacy — migrated to "center" on load
  /** Order within the column */
  order: number;
  /** User-editable props (heading, body text, urls, etc.) */
  props: Record<string, string | number | boolean | string[]>;
}

export interface WireframeLayout {
  left: PlacedBlock[];
  center: PlacedBlock[];
  right: PlacedBlock[];
}

interface WireframeBuilderProps {
  storeSlug: string;
  /** Initial layout to resume editing */
  initialLayout?: WireframeLayout;
  /** Called whenever layout changes */
  onChange?: (layout: WireframeLayout) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uid(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const COLUMN_LABELS: Record<string, string> = {
  center: "Main Content",
  right: "Right Sidebar",
};

const COLUMN_WIDTHS: Record<string, string> = {
  center: "w-3/4",
  right: "w-1/4",
};

/* ------------------------------------------------------------------ */
/*  Block Renderers (preview)                                          */
/* ------------------------------------------------------------------ */

function BlockPreview({ block, catalog }: { block: PlacedBlock; catalog: BlockComponentDef[] }) {
  const def = catalog.find((c) => c.type === block.type);
  const label = def?.label || block.type;
  const heading = typeof block.props.heading === "string" ? block.props.heading : "";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 text-xs">
      <div className="flex items-center gap-2 mb-1">
        {def && (
          <svg className="h-3.5 w-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={def.icon} />
          </svg>
        )}
        <span className="font-medium text-zinc-200 truncate">{label}</span>
      </div>
      {heading && <p className="text-zinc-500 truncate">{heading}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block Inspector                                                    */
/* ------------------------------------------------------------------ */

function BlockInspector({
  block,
  catalog,
  onUpdate,
  onClose,
}: {
  block: PlacedBlock;
  catalog: BlockComponentDef[];
  onUpdate: (props: PlacedBlock["props"]) => void;
  onClose: () => void;
}) {
  const def = catalog.find((c) => c.type === block.type);

  // Field definitions per block type
  const fieldDefs: Record<string, { key: string; label: string; type: "text" | "textarea" | "number" | "url" }[]> = {
    hero_banner: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subheading", label: "Subheading", type: "text" },
      { key: "background_image_url", label: "Background Image URL", type: "url" },
      { key: "cta_text", label: "Button Text", type: "text" },
      { key: "cta_url", label: "Button URL", type: "url" },
    ],
    text_block: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body_text", label: "Body", type: "textarea" },
    ],
    cta_section: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body_text", label: "Description", type: "textarea" },
      { key: "cta_text", label: "Button Text", type: "text" },
      { key: "cta_url", label: "Button URL", type: "url" },
    ],
    video_embed: [
      { key: "video_url", label: "Video URL", type: "url" },
      { key: "heading", label: "Caption", type: "text" },
    ],
    testimonial: [
      { key: "quote_text", label: "Quote", type: "textarea" },
      { key: "author_name", label: "Author Name", type: "text" },
      { key: "author_handle", label: "Author @handle", type: "text" },
    ],
    image_gallery: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "gallery_columns", label: "Columns", type: "number" },
    ],
    newsletter: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body_text", label: "Description", type: "textarea" },
      { key: "cta_text", label: "Button Text", type: "text" },
    ],
    spacer: [
      { key: "spacer_height", label: "Height (px)", type: "number" },
    ],
    product_grid: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "max_items", label: "Max Products", type: "number" },
      { key: "gallery_columns", label: "Columns", type: "number" },
    ],
    social_feed: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "max_items", label: "Max Posts", type: "number" },
    ],
    donation: [
      { key: "heading", label: "Campaign Title", type: "text" },
      { key: "body_text", label: "Description", type: "textarea" },
      { key: "goal_amount", label: "Goal Amount ($)", type: "number" },
      { key: "campaign_image_url", label: "Campaign Image URL", type: "url" },
      { key: "suggested_amounts", label: "Suggested Amounts (comma-separated)", type: "text" },
    ],
    pinned_post: [
      { key: "heading", label: "Section Heading", type: "text" },
    ],
    music_player: [
      { key: "heading", label: "Section Heading", type: "text" },
      { key: "music_url", label: "Spotify or Apple Music URL", type: "url" },
    ],
    tiktok_feed: [
      { key: "heading", label: "Section Heading", type: "text" },
    ],
    instagram_feed: [
      { key: "heading", label: "Section Heading", type: "text" },
    ],
    youtube_feed: [
      { key: "heading", label: "Section Heading", type: "text" },
    ],
    grok_gallery: [
      { key: "heading", label: "Section Heading", type: "text" },
      { key: "max_items", label: "Max to Show (up to 5)", type: "number" },
    ],
    my_favorites: [
      { key: "heading", label: "Section Heading", type: "text" },
      { key: "max_items", label: "Max to Show (up to 10)", type: "number" },
    ],
    top_followers: [
      { key: "heading", label: "Section Heading", type: "text" },
      { key: "max_items", label: "Max to Show (up to 8)", type: "number" },
    ],
  };

  const fields = fieldDefs[block.type] || [];

  return (
    <div className="border-l border-zinc-800 bg-zinc-900/95 p-4 w-72 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{def?.label || block.type}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs">
          Close
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-zinc-400 mb-1">{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                value={String(block.props[field.key] ?? "")}
                onChange={(e) => onUpdate({ ...block.props, [field.key]: e.target.value })}
                rows={3}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={String(block.props[field.key] ?? "")}
                onChange={(e) =>
                  onUpdate({
                    ...block.props,
                    [field.key]: field.type === "number" ? Number(e.target.value) || 0 : e.target.value,
                  })
                }
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <label className="block text-xs text-zinc-400 mb-1">Column</label>
        <select
          value={block.column}
          onChange={(e) => onUpdate({ ...block.props, __column: e.target.value })}
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="center">Main Content</option>
          <option value="right">Right Sidebar</option>
        </select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function WireframeBuilder({ storeSlug, initialLayout, onChange }: WireframeBuilderProps) {
  const [catalog, setCatalog] = useState<BlockComponentDef[]>([]);
  const [layout, setLayout] = useState<WireframeLayout>(() => {
    const init = initialLayout || { left: [], center: [], right: [] };
    // Migrate any legacy left-sidebar blocks into center
    if (init.left.length > 0) {
      return { left: [], center: [...init.left.map(b => ({ ...b, column: "center" as const })), ...init.center], right: init.right };
    }
    return init;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ column: string; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Touch: tap a palette item to select it, then tap a column to place it
  const [touchPendingType, setTouchPendingType] = useState<string | null>(null);
  // Color scheme + page background
  const [colorScheme, setColorScheme] = useState("midnight");
  const [pageBackground, setPageBackground] = useState("");
  const [uploadingBg, setUploadingBg] = useState(false);
  // Grok background generator
  const [bgPrompt, setBgPrompt] = useState("");
  const [bgGenerating, setBgGenerating] = useState(false);
  const [bgVariants, setBgVariants] = useState<string[]>([]);
  const [bgError, setBgError] = useState("");

  const handleGenerateBg = async () => {
    if (!bgPrompt.trim() || bgGenerating) return;
    setBgGenerating(true); setBgError(""); setBgVariants([]);
    try {
      const res = await fetch("/api/design-studio/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${bgPrompt.trim()}, wide panoramic background image, 1920x1080 aspect ratio, no text, no logos, no people, no objects in foreground, seamless wallpaper suitable for a dark website, subtle and non-distracting`,
          product_type: "digital_drop",
          variants: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBgError(data.error || "Generation failed"); return; }
      const urls: string[] = data.image_urls || [data.image_url];
      setBgVariants(urls);
      if (urls[0]) setPageBackground(urls[0]);
    } catch { setBgError("Generation failed"); } finally { setBgGenerating(false); }
  };

  // Fetch block catalog + load existing builds
  useEffect(() => {
    fetch(`/api/blocks?store=${encodeURIComponent(storeSlug)}`)
      .then((r) => r.json())
      .then((d) => setCatalog(d.catalog || []))
      .catch(() => {});

    // Load published wireframe to restore layout + color scheme
    fetch("/api/builds")
      .then((r) => r.json())
      .then((d) => {
        const builds = d.builds || [];
        const published = builds.filter((b: any) => b.published);
        const latest = published[published.length - 1] || builds[builds.length - 1];
        if (latest?.code) {
          try {
            const doc = JSON.parse(latest.code);
            if (doc.type === "wireframe" && doc.layout) {
              const loaded = doc.layout as WireframeLayout;
              // Migrate legacy left-sidebar blocks into center
              if (loaded.left?.length > 0) {
                setLayout({ left: [], center: [...loaded.left.map((b: PlacedBlock) => ({ ...b, column: "center" as const })), ...loaded.center], right: loaded.right });
              } else {
                setLayout(loaded);
              }
              if (doc.colorScheme) setColorScheme(doc.colorScheme);
              if (doc.pageBackground) setPageBackground(doc.pageBackground);
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [storeSlug]);

  // Notify parent on layout change
  useEffect(() => {
    onChange?.(layout);
  }, [layout, onChange]);

  const selectedBlock = (() => {
    if (!selectedBlockId) return null;
    for (const col of ["left", "center", "right"] as const) {
      const found = layout[col].find((b) => b.instanceId === selectedBlockId);
      if (found) return found;
    }
    return null;
  })();

  /* ---------- Drag and Drop ---------- */

  const handleDragStart = useCallback((e: React.DragEvent, blockType?: string, instanceId?: string) => {
    if (blockType) {
      e.dataTransfer.setData("application/x-wireframe-new", blockType);
    } else if (instanceId) {
      e.dataTransfer.setData("application/x-wireframe-move", instanceId);
    }
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, column: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver({ column, index });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColumn: "left" | "center" | "right", targetIndex: number) => {
      e.preventDefault();
      setDragOver(null);

      const newBlockType = e.dataTransfer.getData("application/x-wireframe-new");
      const moveInstanceId = e.dataTransfer.getData("application/x-wireframe-move");

      setLayout((prev) => {
        const next = {
          left: [...prev.left],
          center: [...prev.center],
          right: [...prev.right],
        };

        if (newBlockType) {
          // Adding a new block from catalog
          const def = catalog.find((c) => c.type === newBlockType);
          const newBlock: PlacedBlock = {
            instanceId: uid(),
            type: newBlockType,
            column: targetColumn,
            order: targetIndex,
            props: {
              heading: def?.label || "",
            },
          };
          next[targetColumn].splice(targetIndex, 0, newBlock);
        } else if (moveInstanceId) {
          // Moving an existing block
          let movedBlock: PlacedBlock | null = null;
          for (const col of ["left", "center", "right"] as const) {
            const idx = next[col].findIndex((b) => b.instanceId === moveInstanceId);
            if (idx !== -1) {
              movedBlock = { ...next[col][idx], column: targetColumn };
              next[col].splice(idx, 1);
              break;
            }
          }
          if (movedBlock) {
            next[targetColumn].splice(targetIndex, 0, movedBlock);
          }
        }

        // Reindex order
        for (const col of ["left", "center", "right"] as const) {
          next[col].forEach((b, i) => (b.order = i));
        }

        return next;
      });
    },
    [catalog]
  );

  /* ---------- Touch: tap palette → tap column to place ---------- */

  const handleTouchPaletteTap = useCallback((blockType: string) => {
    setTouchPendingType((prev) => (prev === blockType ? null : blockType));
  }, []);

  const handleTouchColumnTap = useCallback(
    (column: "left" | "center" | "right") => {
      if (!touchPendingType) return;
      const def = catalog.find((c) => c.type === touchPendingType);
      const newBlock: PlacedBlock = {
        instanceId: uid(),
        type: touchPendingType,
        column,
        order: layout[column].length,
        props: { heading: def?.label || "" },
      };
      setLayout((prev) => ({
        ...prev,
        [column]: [...prev[column], newBlock],
      }));
      setTouchPendingType(null);
      setSelectedBlockId(newBlock.instanceId);
    },
    [touchPendingType, catalog, layout]
  );

  /* ---------- Block Actions ---------- */

  const removeBlock = useCallback((instanceId: string) => {
    setLayout((prev) => ({
      left: prev.left.filter((b) => b.instanceId !== instanceId),
      center: prev.center.filter((b) => b.instanceId !== instanceId),
      right: prev.right.filter((b) => b.instanceId !== instanceId),
    }));
    setSelectedBlockId((prev) => (prev === instanceId ? null : prev));
  }, []);

  const moveBlockInColumn = useCallback((instanceId: string, direction: -1 | 1) => {
    setLayout((prev) => {
      const next = { left: [...prev.left], center: [...prev.center], right: [...prev.right] };
      for (const col of ["left", "center", "right"] as const) {
        const idx = next[col].findIndex((b) => b.instanceId === instanceId);
        if (idx === -1) continue;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= next[col].length) return prev;
        [next[col][idx], next[col][newIdx]] = [next[col][newIdx], next[col][idx]];
        return next;
      }
      return prev;
    });
  }, []);

  const moveBlockToColumn = useCallback((instanceId: string, targetColumn: "left" | "center" | "right") => {
    setLayout((prev) => {
      const next = { left: [...prev.left], center: [...prev.center], right: [...prev.right] };
      let block: PlacedBlock | undefined;
      for (const col of ["left", "center", "right"] as const) {
        const idx = next[col].findIndex((b) => b.instanceId === instanceId);
        if (idx !== -1) {
          block = next[col].splice(idx, 1)[0];
          break;
        }
      }
      if (!block) return prev;
      block.column = targetColumn;
      next[targetColumn].push(block);
      return next;
    });
  }, []);

  const updateBlockProps = useCallback(
    (instanceId: string, props: PlacedBlock["props"]) => {
      // Handle column move via __column meta prop
      const newColumn = props.__column as string | undefined;
      const cleanProps = { ...props };
      delete cleanProps.__column;

      setLayout((prev) => {
        const next = {
          left: [...prev.left],
          center: [...prev.center],
          right: [...prev.right],
        };

        if (newColumn && ["left", "center", "right"].includes(newColumn)) {
          // Move block to new column
          for (const col of ["left", "center", "right"] as const) {
            const idx = next[col].findIndex((b) => b.instanceId === instanceId);
            if (idx !== -1) {
              if (col !== newColumn) {
                const [block] = next[col].splice(idx, 1);
                block.column = newColumn as "left" | "center" | "right";
                block.props = cleanProps;
                next[newColumn as "left" | "center" | "right"].push(block);
              } else {
                next[col][idx] = { ...next[col][idx], props: cleanProps };
              }
              break;
            }
          }
        } else {
          // Just update props
          for (const col of ["left", "center", "right"] as const) {
            const idx = next[col].findIndex((b) => b.instanceId === instanceId);
            if (idx !== -1) {
              next[col][idx] = { ...next[col][idx], props: cleanProps };
              break;
            }
          }
        }

        return next;
      });
    },
    []
  );

  /* ---------- Save ---------- */

  const [saveError, setSaveError] = useState<string | null>(null);

  const saveLayout = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      // Strip data URLs from background — only save real URLs (data URLs are too large for Drupal)
      const safeBg = pageBackground && !pageBackground.startsWith("data:") ? pageBackground : "";
      const doc = {
        schemaVersion: 1,
        type: "wireframe",
        layout,
        colorScheme,
        pageBackground: safeBg,
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "Wireframe Layout",
          code: JSON.stringify(doc),
          published: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setSaveError(err.error || `Save failed (${res.status})`);
        console.error("Save failed:", err);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Network error — could not save");
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [layout, colorScheme, pageBackground]);

  /* ---------- Render ---------- */

  const totalBlocks = layout.center.length + layout.right.length;

  return (
    <>
    <div className="flex h-[calc(100vh-12rem)] bg-zinc-950 text-white">
      {/* Block Palette */}
      <div className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/80 overflow-y-auto p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Components
        </p>
        <div className="space-y-1.5">
          {catalog.map((def) => (
            <div
              key={def.id}
              draggable
              onDragStart={(e) => handleDragStart(e, def.type)}
              onClick={() => handleTouchPaletteTap(def.type)}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-grab transition active:cursor-grabbing ${
                touchPendingType === def.type
                  ? "border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50"
                  : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <svg className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={def.icon} />
              </svg>
              <div className="min-w-0">
                <p className="font-medium text-zinc-200 truncate">{def.label}</p>
                <p className="text-[10px] text-zinc-500 truncate">{def.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Column Wireframe Canvas */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">Page Layout</h2>
            <p className="text-xs text-zinc-600">
              {totalBlocks} block{totalBlocks !== 1 ? "s" : ""} placed
            </p>
          </div>
          <button
            onClick={saveLayout}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save & Publish"}
          </button>
          <a
            href={getStoreUrl(storeSlug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            See Your Site
          </a>
          {saveError && (
            <span className="text-xs text-red-400">{saveError}</span>
          )}
        </div>

        {/* Touch placement hint */}
        {touchPendingType && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-4 py-2">
            <p className="text-xs text-indigo-300">
              Tap a column below to place <strong>{catalog.find((c) => c.type === touchPendingType)?.label || touchPendingType}</strong>
            </p>
            <button
              onClick={() => setTouchPendingType(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Wireframe Grid */}
        <div className="flex gap-3 min-h-[600px]">
          {(["center", "right"] as const).map((column) => (
            <div
              key={column}
              className={`${COLUMN_WIDTHS[column]} flex flex-col`}
            >
              {/* Column Header */}
              <div className="mb-2 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  {COLUMN_LABELS[column]}
                </span>
              </div>

              {/* Drop Zone */}
              <div
                className={`flex-1 rounded-xl border-2 border-dashed p-2 transition-colors ${
                  dragOver?.column === column
                    ? "border-indigo-500/60 bg-indigo-500/5"
                    : touchPendingType
                      ? "border-indigo-400/40 bg-indigo-500/5 cursor-pointer"
                      : "border-zinc-800 bg-zinc-900/30"
                }`}
                onDragOver={(e) => handleDragOver(e, column, layout[column].length)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column, layout[column].length)}
                onClick={() => handleTouchColumnTap(column)}
              >
                {layout[column].length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-700">
                    {touchPendingType ? "Tap to place here" : "Drop blocks here"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layout[column].map((block, idx) => (
                      <div
                        key={block.instanceId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, undefined, block.instanceId)}
                        onDragOver={(e) => handleDragOver(e, column, idx)}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleDrop(e, column, idx);
                        }}
                        onClick={() => setSelectedBlockId(block.instanceId)}
                        className={`relative cursor-grab active:cursor-grabbing transition ${
                          selectedBlockId === block.instanceId
                            ? "ring-2 ring-indigo-500 rounded-lg"
                            : ""
                        }`}
                      >
                        <BlockPreview block={block} catalog={catalog} />

                        {/* Touch-friendly move controls — visible when selected */}
                        {selectedBlockId === block.instanceId && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-zinc-700 bg-zinc-900 px-1 py-0.5 shadow-lg z-10">
                            {column === "right" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); moveBlockToColumn(block.instanceId, "center"); }}
                                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                title="Move left"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlockInColumn(block.instanceId, -1); }}
                              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                              title="Move up"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlockInColumn(block.instanceId, 1); }}
                              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                              title="Move down"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {column === "center" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); moveBlockToColumn(block.instanceId, "right"); }}
                                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                title="Move right"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeBlock(block.instanceId); }}
                              className="rounded-full p-1 text-red-400 hover:bg-red-900/50 hover:text-red-300"
                              title="Remove"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        )}

                        {/* Remove button — desktop hover */}
                        {selectedBlockId !== block.instanceId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(block.instanceId);
                            }}
                            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100 [div:hover>&]:opacity-100"
                            title="Remove block"
                          >
                            x
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Block Inspector Panel */}
      {selectedBlock && (
        <BlockInspector
          block={selectedBlock}
          catalog={catalog}
          onUpdate={(props) => updateBlockProps(selectedBlock.instanceId, props)}
          onClose={() => setSelectedBlockId(null)}
        />
      )}
    </div>

    {/* Grok Background Generator — below the builder */}
    <div className="border-t border-zinc-800 bg-zinc-900/80 px-6 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
        <svg className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
        Page Background — Grok Imagine
      </p>

      {/* Prompt input */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={bgPrompt}
          onChange={(e) => setBgPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && bgPrompt.trim() && !bgGenerating && handleGenerateBg()}
          placeholder="Describe your background... e.g. 'dark purple nebula with stars'"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
        />
        <button
          onClick={handleGenerateBg}
          disabled={bgGenerating || !bgPrompt.trim()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          {bgGenerating ? (
            <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Generating...</>
          ) : (
            <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>Generate</>
          )}
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {["Dark nebula", "Abstract waves", "Geometric grid", "City night bokeh", "Deep ocean", "Smoke & ember", "Minimal gradient", "Northern lights"].map((preset) => (
          <button
            key={preset}
            onClick={() => setBgPrompt(preset.toLowerCase())}
            className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-purple-300 transition"
          >
            {preset}
          </button>
        ))}
      </div>

      {bgError && <p className="text-[10px] text-red-400 mb-2">{bgError}</p>}

      {/* Generated variants */}
      {bgVariants.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {bgVariants.map((url, i) => (
            <button
              key={i}
              onClick={() => setPageBackground(url)}
              className={`rounded-lg border overflow-hidden transition ${
                pageBackground === url
                  ? "border-purple-500 ring-1 ring-purple-500/50"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <img src={url} alt={`Background ${i + 1}`} className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Current background + actions */}
      <div className="flex items-center gap-2">
        {pageBackground && (
          <div className="flex items-center gap-2 flex-1">
            <img src={pageBackground} alt="Current" className="h-8 w-14 rounded object-cover border border-zinc-700" />
            <span className="text-[10px] text-zinc-500">Active background</span>
            <button onClick={() => setPageBackground("")} className="text-[10px] text-zinc-600 hover:text-red-400 transition">Remove</button>
          </div>
        )}
        <label className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white cursor-pointer transition flex items-center gap-1.5">
          {uploadingBg ? (
            <svg className="h-3 w-3 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
          )}
          Upload
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || file.size > 5 * 1024 * 1024) return;
              setUploadingBg(true);
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (res.ok && data.url) setPageBackground(data.url);
              } catch {} finally { setUploadingBg(false); }
            }}
          />
        </label>
      </div>
    </div>
    </>
  );
}
