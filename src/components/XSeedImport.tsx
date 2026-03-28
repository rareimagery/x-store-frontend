"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

interface MatchedCreator {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl: string | null;
  followerCount: number;
}

interface XSeedImportProps {
  onComplete?: () => void;
  className?: string;
}

export default function XSeedImport({
  onComplete,
  className = "",
}: XSeedImportProps) {
  const [state, setState] = useState<
    "loading" | "ready" | "confirming" | "importing" | "done" | "empty" | "error"
  >("loading");
  const [matched, setMatched] = useState<MatchedCreator[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/social/seed-from-x");
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setMatched(data.matched ?? []);
      setMessage(data.message ?? "");

      if (data.matched?.length > 0) {
        // Pre-select all
        setSelected(new Set(data.matched.map((m: MatchedCreator) => m.storeId)));
        setState("ready");
      } else {
        setState("empty");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMatches();
  }, [fetchMatches]);

  function toggleCreator(storeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === matched.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(matched.map((m) => m.storeId)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setState("importing");

    try {
      const res = await fetch("/api/social/seed-from-x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeIds: Array.from(selected) }),
      });

      const data = await res.json();
      setResultMessage(data.message ?? `Followed ${data.followed} creators`);
      setState("done");
      onComplete?.();
    } catch {
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full" />
          <p className="text-zinc-300 text-sm">Checking your X connections...</p>
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-6 ${className}`}>
        <p className="text-zinc-400 text-sm">{message || "None of your X follows are on RareImagery yet."}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={`rounded-xl border border-red-900/50 bg-red-950/20 p-6 ${className}`}>
        <p className="text-red-400 text-sm">Failed to load X connections. Try again later.</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className={`rounded-xl border border-green-900/50 bg-green-950/20 p-6 ${className}`}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <p className="text-green-300 text-sm font-medium">{resultMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-blue-900/50 bg-blue-950/10 p-6 ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <XIcon />
        </div>
        <div>
          <h3 className="text-white font-semibold">
            {matched.length} creator{matched.length !== 1 ? "s" : ""} you follow on X {matched.length !== 1 ? "are" : "is"} on RareImagery!
          </h3>
          <p className="text-zinc-400 text-sm mt-0.5">
            Follow them here to stay connected.
          </p>
        </div>
      </div>

      {/* Select all toggle */}
      <button
        onClick={toggleAll}
        className="text-xs text-blue-400 hover:text-blue-300 mb-3 transition-colors"
      >
        {selected.size === matched.length ? "Deselect all" : "Select all"}
      </button>

      {/* Creator list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {matched.map((creator) => (
          <label
            key={creator.storeId}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(creator.storeId)}
              onChange={() => toggleCreator(creator.storeId)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />

            <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
              {creator.profilePictureUrl ? (
                <Image
                  src={creator.profilePictureUrl}
                  alt={creator.xUsername}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-bold">
                  {creator.xUsername.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {creator.storeName}
              </p>
              <p className="text-zinc-500 text-xs">@{creator.xUsername}</p>
            </div>

            <span className="text-zinc-500 text-xs">
              {creator.followerCount} followers
            </span>
          </label>
        ))}
      </div>

      {/* Action */}
      <button
        onClick={handleImport}
        disabled={selected.size === 0 || state === "importing"}
        className="mt-4 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === "importing"
          ? "Following..."
          : `Follow ${selected.size} creator${selected.size !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
