"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface XCommunity {
  id: string;
  name: string;
  description: string;
  member_count: number;
  url: string;
}

function extractCommunityId(input: string): string | null {
  // Handle: full URL, x.com/i/communities/123, or just the ID
  const urlMatch = input.match(/communities\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  const idMatch = input.trim().match(/^\d+$/);
  if (idMatch) return idMatch[0];
  return null;
}

export default function CommunitiesPage() {
  const { storeSlug, hasStore } = useConsole();
  const [communities, setCommunities] = useState<XCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/communities")
      .then((r) => r.json())
      .then((d) => setCommunities(d.communities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  const addCommunity = useCallback(async () => {
    const communityId = extractCommunityId(input);
    if (!communityId) {
      setAddError("Paste an X Community URL or ID");
      return;
    }

    if (communities.some((c) => c.id === communityId)) {
      setAddError("Already added");
      return;
    }

    const community: XCommunity = {
      id: communityId,
      name: name.trim() || `Community ${communityId}`,
      description: description.trim(),
      member_count: 0,
      url: `https://x.com/i/communities/${communityId}`,
    };

    const updated = [...communities, community];
    setCommunities(updated);
    setInput("");
    setName("");
    setDescription("");
    setAddError(null);
    await save(updated);
  }, [input, name, description, communities]);

  const removeCommunity = useCallback(async (id: string) => {
    const updated = communities.filter((c) => c.id !== id);
    setCommunities(updated);
    await save(updated);
  }, [communities]);

  async function save(list: XCommunity[]) {
    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communities: list }),
      });
      if (res.ok) {
        setSavedMessage("Saved!");
        setTimeout(() => setSavedMessage(null), 2000);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to add communities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">X Communities</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Link the X Communities you&apos;re part of. They&apos;ll show on your store page.
          </p>
        </div>
        {savedMessage && <span className="text-sm text-green-400 font-medium">{savedMessage}</span>}
        {saving && <span className="text-sm text-zinc-500">Saving...</span>}
      </div>

      {/* Add community */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6 space-y-3">
        <p className="text-sm font-medium text-zinc-300">Add a community</p>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setAddError(null); }}
          onKeyDown={(e) => e.key === "Enter" && addCommunity()}
          placeholder="Paste X Community URL or ID..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Community name"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        {addError && <p className="text-sm text-red-400">{addError}</p>}
        <button
          onClick={addCommunity}
          disabled={!input.trim()}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Add Community
        </button>
      </div>

      {/* Communities list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : communities.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="mt-3 text-zinc-500">No communities yet. Paste an X Community URL above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {communities.map((community) => (
            <div
              key={community.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={community.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white hover:text-indigo-400 transition"
                >
                  {community.name}
                </a>
                {community.description && (
                  <p className="text-xs text-zinc-500 truncate">{community.description}</p>
                )}
              </div>
              <button
                onClick={() => removeCommunity(community.id)}
                className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400 transition"
              >
                Remove
              </button>
            </div>
          ))}
          <p className="text-xs text-zinc-600 text-center pt-2">
            {communities.length} {communities.length === 1 ? "community" : "communities"}
          </p>
        </div>
      )}
    </div>
  );
}
