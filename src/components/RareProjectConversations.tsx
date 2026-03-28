"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type ConversationItem = {
  id: string;
  text: string;
  createdAt: string | null;
  conversationId: string;
  url: string;
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
  };
  author: {
    id: string;
    name: string;
    username: string;
    profileImageUrl: string | null;
    verifiedType: string;
  };
};

type ConversationResponse = {
  targetHandle: string;
  myHandle: string;
  source: string;
  items: ConversationItem[];
  error?: string;
};

function formatDate(value: string | null): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

function trimText(text: string): string {
  if (text.length <= 220) return text;
  return `${text.slice(0, 217)}...`;
}

export default function RareProjectConversations() {
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [data, setData] = useState<ConversationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/social/conversations", { cache: "no-store" });
        const json = (await res.json()) as ConversationResponse;

        if (cancelled) return;
        if (!res.ok) {
          setData(json);
          setState("error");
          return;
        }

        setData(json);
        setState(json.items.length ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">RareProject conversations</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Recent X posts between your signed-in account and @{data?.targetHandle || "rareproject"}.
          </p>
        </div>
        {data?.source && (
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
            {data.source === "user-token" ? "Live X session" : "App token fallback"}
          </span>
        )}
      </div>

      {state === "loading" && (
        <div className="flex items-center gap-3 py-2 text-sm text-zinc-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          Loading X conversation activity...
        </div>
      )}

      {state === "error" && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300">
          {data?.error || "Failed to load RareProject conversations."}
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No recent public conversations found between @{data?.myHandle || "you"} and @{data?.targetHandle || "rareproject"}.
        </div>
      )}

      {state === "ready" && data && (
        <div className="space-y-3">
          {data.items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-800">
                  {item.author.profileImageUrl ? (
                    <Image
                      src={item.author.profileImageUrl}
                      alt={item.author.username}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-400">
                      {item.author.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{item.author.name}</div>
                  <div className="truncate text-xs text-zinc-500">
                    @{item.author.username} · {formatDate(item.createdAt)}
                  </div>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{trimText(item.text)}</p>

              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                <span>{item.metrics.replies} replies</span>
                <span>{item.metrics.reposts} reposts</span>
                <span>{item.metrics.likes} likes</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}