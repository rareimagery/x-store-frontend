"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Shoutout {
  id: string;
  text: string;
  fromStoreId: string;
  fromXUsername: string;
  fromProfilePic: string | null;
  createdAt: string;
}

interface ShoutoutWallProps {
  storeId: string;
  storeName?: string;
  isOwner?: boolean;
  className?: string;
}

export default function ShoutoutWall({
  storeId,
  storeName,
  isOwner = false,
  className = "",
}: ShoutoutWallProps) {
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchShoutouts();
  }, [storeId]);

  async function fetchShoutouts() {
    try {
      const res = await fetch(`/api/social/shoutouts?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setShoutouts(data.shoutouts ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!text.trim()) return;
    setPosting(true);
    setError("");

    try {
      const res = await fetch("/api/social/shoutouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStoreId: storeId, text: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to post");
        return;
      }

      setText("");
      setShowForm(false);
      fetchShoutouts();
    } catch {
      setError("Failed to post shoutout");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(shoutoutId: string) {
    try {
      await fetch("/api/social/shoutouts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shoutoutId }),
      });
      setShoutouts((prev) => prev.filter((s) => s.id !== shoutoutId));
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return null; // Don't show section while loading
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-2">
          Shoutouts
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Shoutout list */}
      <div className="space-y-2">
        {shoutouts.length === 0 && !showForm && (
          <p className="text-center text-sm text-zinc-600 py-3">
            No shoutouts yet. Be the first!
          </p>
        )}

        {shoutouts.map((shoutout) => (
          <div
            key={shoutout.id}
            className="flex items-start gap-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50 p-3 group"
          >
            <Link
              href={`/stores/${shoutout.fromXUsername}`}
              className="flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                {shoutout.fromProfilePic ? (
                  <Image
                    src={shoutout.fromProfilePic}
                    alt={shoutout.fromXUsername}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-bold">
                    {shoutout.fromXUsername.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                href={`/stores/${shoutout.fromXUsername}`}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                @{shoutout.fromXUsername}
              </Link>
              <p className="text-sm text-zinc-200 mt-0.5 break-words">
                &ldquo;{shoutout.text}&rdquo;
              </p>
            </div>

            {isOwner && (
              <button
                onClick={() => handleDelete(shoutout.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
                title="Remove shoutout"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Post shoutout form */}
      {showForm ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 120))}
            placeholder={`Say something about ${storeName || "this creator"}...`}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-600 resize-none outline-none"
            rows={2}
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <span
              className={`text-xs ${
                text.length > 100 ? "text-amber-400" : "text-zinc-600"
              }`}
            >
              {text.length}/120
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setText("");
                  setError("");
                }}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={!text.trim() || posting}
                className="px-3 py-1 text-xs bg-white text-zinc-900 rounded-full font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
        >
          + Leave a Shoutout
        </button>
      )}
    </div>
  );
}
