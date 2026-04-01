"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import StorePlayer, { detectProvider } from "@/components/StorePlayer";

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  provider: "spotify" | "apple_music";
  artwork_url?: string;
}

function generateId(): string {
  return `trk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function extractTrackInfo(url: string): Partial<MusicTrack> {
  const provider = detectProvider(url);
  if (provider === "unknown") return {};

  // Try to extract title from URL path
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    // e.g. /playlist/My-Playlist or /album/Album-Name
    const type = segments.find((s) => ["track", "album", "playlist"].includes(s));
    const nameSegment = segments[segments.indexOf(type || "") + 1] || "";
    const title = nameSegment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      provider: provider === "spotify" ? "spotify" : "apple_music",
      title: title || `${provider === "spotify" ? "Spotify" : "Apple Music"} ${type || "track"}`,
    };
  } catch {
    return { provider: provider === "spotify" ? "spotify" : "apple_music" };
  }
}

export default function MusicPage() {
  const { storeSlug, hasStore } = useConsole();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/music")
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  // Auto-detect when URL is pasted
  const handleUrlChange = useCallback((url: string) => {
    setNewUrl(url);
    setAddError(null);
    setPreview(null);

    if (!url.trim()) return;

    const provider = detectProvider(url);
    if (provider === "unknown") {
      setAddError("Paste a Spotify or Apple Music link");
      return;
    }

    const info = extractTrackInfo(url);
    if (info.title && !newTitle) setNewTitle(info.title);
    setPreview(url);
  }, [newTitle]);

  const addTrack = useCallback(async () => {
    const url = newUrl.trim();
    if (!url) return;

    const provider = detectProvider(url);
    if (provider === "unknown") {
      setAddError("Only Spotify and Apple Music links are supported");
      return;
    }

    if (tracks.some((t) => t.url === url)) {
      setAddError("Already in your playlist");
      return;
    }

    const track: MusicTrack = {
      id: generateId(),
      title: newTitle.trim() || "Untitled",
      artist: newArtist.trim() || "",
      url,
      provider: provider === "spotify" ? "spotify" : "apple_music",
    };

    const updated = [...tracks, track];
    setTracks(updated);
    setNewUrl("");
    setNewTitle("");
    setNewArtist("");
    setPreview(null);
    await save(updated);
  }, [newUrl, newTitle, newArtist, tracks]);

  const removeTrack = useCallback(async (id: string) => {
    const updated = tracks.filter((t) => t.id !== id);
    setTracks(updated);
    await save(updated);
  }, [tracks]);

  const moveTrack = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const updated = [...tracks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setTracks(updated);
    save(updated);
  }, [tracks]);

  async function save(list: MusicTrack[]) {
    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: list }),
      });
      if (res.ok) {
        setSavedMessage("Saved!");
        setTimeout(() => setSavedMessage(null), 2000);
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to add music.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Music</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Add tracks from Spotify or Apple Music. They&apos;ll play on your store&apos;s Music Player block.
          </p>
        </div>
        {savedMessage && <span className="text-sm text-green-400 font-medium">{savedMessage}</span>}
        {saving && <span className="text-sm text-zinc-500">Saving...</span>}
      </div>

      {/* Add track */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6 space-y-3">
        <p className="text-sm font-medium text-zinc-300">Add a track or playlist</p>

        <input
          type="url"
          value={newUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTrack()}
          placeholder="Paste a Spotify or Apple Music link..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />

        {preview && (
          <div className="rounded-lg overflow-hidden">
            <StorePlayer url={preview} theme="dark" />
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            value={newArtist}
            onChange={(e) => setNewArtist(e.target.value)}
            placeholder="Artist (optional)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {addError && <p className="text-sm text-red-400">{addError}</p>}

        <button
          onClick={addTrack}
          disabled={!newUrl.trim() || detectProvider(newUrl) === "unknown"}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Add to Playlist
        </button>
      </div>

      {/* Track list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : tracks.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="mt-3 text-zinc-500">No music yet. Paste a Spotify or Apple Music link above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 group"
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveTrack(i, -1)} disabled={i === 0}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button onClick={() => moveTrack(i, 1)} disabled={i === tracks.length - 1}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Provider icon */}
              <div className="shrink-0">
                {track.provider === "spotify" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1DB954">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#FA2D48">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 16.5c-.414 0-.75-.336-.75-.75V8.25L10.5 9.75v6c0 .414-.336.75-.75.75h-1.5a.75.75 0 01-.75-.75v-9a.75.75 0 01.563-.727l6-1.5A.75.75 0 0115 5.25v9.5a.75.75 0 01-.75.75h-1.5z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{track.title}</p>
                {track.artist && <p className="text-xs text-zinc-500 truncate">{track.artist}</p>}
              </div>

              {/* Remove */}
              <button
                onClick={() => removeTrack(track.id)}
                className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400 transition"
              >
                Remove
              </button>
            </div>
          ))}

          <p className="text-xs text-zinc-600 text-center pt-2">
            {tracks.length} track{tracks.length !== 1 ? "s" : ""} &middot; First track plays in the Music Player wireframe block
          </p>
        </div>
      )}
    </div>
  );
}
