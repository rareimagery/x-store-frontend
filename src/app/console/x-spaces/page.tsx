"use client";

import { useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import { getStoreUrl } from "@/lib/store-url";

interface XSpace {
  id: string;
  title: string;
  state: "scheduled" | "live";
  scheduled_start: string | null;
  started_at: string | null;
  participant_count: number;
  is_ticketed: boolean;
  url: string;
}

export default function XSpacesPage() {
  const { hasStore, storeSlug } = useConsole();
  const [spaces, setSpaces] = useState<XSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/x-spaces")
      .then((r) => r.json())
      .then((d) => {
        setSpaces(d.spaces || []);
        if (d.note) setNote(d.note);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const liveSpaces = spaces.filter((s) => s.state === "live");
  const scheduledSpaces = spaces.filter((s) => s.state === "scheduled");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">X Spaces</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Your scheduled and live audio rooms on X. Promote your store during Spaces.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
              <div className="h-4 w-20 bg-zinc-800 rounded mb-3" />
              <div className="h-5 w-48 bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-32 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          {note ? (
            <>
              <p className="text-sm text-zinc-400 mb-2">{note}</p>
              <p className="text-xs text-zinc-600">X Spaces API requires Basic or Pro tier access.</p>
            </>
          ) : (
            <>
              <svg className="mx-auto h-10 w-10 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm text-zinc-400 mb-2">No upcoming or live Spaces</p>
              <p className="text-xs text-zinc-600">When you schedule or start a Space on X, it will appear here automatically.</p>
            </>
          )}
          <a
            href="https://x.com/i/spaces/start"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Start a Space on X
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Live spaces first */}
          {liveSpaces.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Live Now</p>
              {liveSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} storeSlug={storeSlug} />
              ))}
            </div>
          )}

          {/* Scheduled */}
          {scheduledSpaces.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Upcoming</p>
              <div className="space-y-3">
                {scheduledSpaces.map((space) => (
                  <SpaceCard key={space.id} space={space} storeSlug={storeSlug} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ space, storeSlug }: { space: XSpace; storeSlug: string | null }) {
  const isLive = space.state === "live";

  return (
    <div className={`rounded-xl border bg-zinc-900/50 p-5 transition ${isLive ? "border-emerald-500/50" : "border-zinc-800 hover:border-zinc-700"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              isLive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
            }`}>
              {isLive ? (
                <><svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg> LIVE</>
              ) : (
                <><svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> SCHEDULED</>
              )}
            </span>
            {space.is_ticketed && (
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">Ticketed</span>
            )}
          </div>

          <h3 className="text-base font-semibold text-white mb-1">{space.title}</h3>

          {space.scheduled_start && !isLive && (
            <p className="text-xs text-zinc-500">
              {new Date(space.scheduled_start).toLocaleString("en-US", {
                weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </p>
          )}

          {isLive && space.participant_count > 0 && (
            <p className="text-xs text-zinc-500">{space.participant_count} listening</p>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <a
            href={space.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg px-4 py-2 text-xs font-medium text-white transition ${
              isLive ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {isLive ? "Join Space" : "View"}
          </a>
          {storeSlug && (
            <a
              href={`https://x.com/intent/tweet?${new URLSearchParams({
                text: `Join my Space and check out my store!`,
                url: getStoreUrl(storeSlug || ""),
              }).toString()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:border-indigo-500 hover:text-white transition text-center"
            >
              Promote Store
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
