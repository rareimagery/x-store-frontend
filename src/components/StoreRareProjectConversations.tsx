"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import type { ConversationItem } from "@/lib/x-api/conversations";

type StoreConversationResponse = {
  creatorHandle: string;
  targetHandle: string;
  source: string;
  items: ConversationItem[];
  error?: string;
};

function formatDate(value: string | null): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StoreRareProjectConversations({
  creator,
}: {
  creator: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [data, setData] = useState<StoreConversationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/social/conversations/${creator}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as StoreConversationResponse;

        if (cancelled) return;
        setData(json);

        if (!res.ok) {
          setState("error");
          return;
        }

        setState(json.items.length > 0 ? "ready" : "empty");
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
  }, [creator]);

  if (state === "loading") {
    return (
      <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          Loading recent RareProject conversation activity...
        </div>
      </section>
    );
  }

  if (state === "error") {
    return null;
  }

  if (state === "empty" || !data) {
    return null;
  }

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">RareProject thread highlights</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Recent public X conversation between @{data.creatorHandle} and @{data.targetHandle}.
          </p>
        </div>
        <a
          href={`https://x.com/${data.targetHandle}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          Open @{data.targetHandle}
        </a>
      </div>

      <div className="space-y-3">
        {data.items.slice(0, 6).map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-950"
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

            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{item.text}</p>

            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              <span>{item.metrics.replies} replies</span>
              <span>{item.metrics.reposts} reposts</span>
              <span>{item.metrics.likes} likes</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}