"use client";

import { useEffect, useState } from "react";
import type { XImportData } from "@/lib/x-import";
import type { GrokEnhancements } from "@/lib/grok";
import StoreBuilderWizard from "./StoreBuilderWizard";

type Phase = "importing" | "enhancing" | "ready" | "error";

export default function BuildPageClient({
  xUsername,
  skipXImport,
}: {
  xUsername: string;
  skipXImport?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(skipXImport ? "ready" : "importing");
  const [xData, setXData] = useState<XImportData | null>(null);
  const [grokEnhancements, setGrokEnhancements] =
    useState<GrokEnhancements | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (skipXImport) return;
    let cancelled = false;

    async function loadProfile() {
      setPhase("importing");

      try {
        const res = await fetch("/api/stores/enhance-profile", {
          method: "POST",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const data = await res.json();
        if (cancelled) return;

        setXData(data.xData);
        setPhase("enhancing");

        // Brief delay to show the "enhancing" state, then reveal
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;

        setGrokEnhancements(data.grokEnhancements);
        setPhase("ready");
      } catch (err: any) {
        if (cancelled) return;
        console.error("Profile load failed:", err);
        setErrorMsg(err.message);
        setPhase("error");
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [skipXImport]);

  if (phase === "importing" || phase === "enhancing") {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/20">
          <svg
            className="h-10 w-10 animate-spin text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <h2 className="mb-3 text-2xl font-bold text-white">
          {phase === "importing"
            ? "Fetching your X profile..."
            : "Grok AI is analyzing your content..."}
        </h2>
        <p className="text-zinc-400">
          {phase === "importing"
            ? "Pulling your profile picture, bio, posts, and followers from X"
            : "Generating your store bio, product ideas, and theme recommendation"}
        </p>

        {/* Progress dots */}
        <div className="mt-8 flex justify-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              phase === "importing" ? "bg-indigo-500 animate-pulse" : "bg-green-500"
            }`}
          />
          <div
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              phase === "enhancing" ? "bg-indigo-500 animate-pulse" : "bg-zinc-700"
            }`}
          />
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        </div>
        <div className="mt-2 flex justify-center gap-6 text-xs text-zinc-500">
          <span className={phase === "importing" ? "text-indigo-400" : "text-green-400"}>
            X Profile
          </span>
          <span className={phase === "enhancing" ? "text-indigo-400" : "text-zinc-600"}>
            Grok AI
          </span>
          <span className="text-zinc-600">Ready</span>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
          <svg
            className="h-8 w-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h2 className="mb-3 text-xl font-bold text-white">
          Couldn&apos;t auto-import your profile
        </h2>
        <p className="mb-6 text-sm text-zinc-400">
          {errorMsg || "Something went wrong fetching your X data."}
        </p>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              setPhase("ready");
              setXData(null);
              setGrokEnhancements(null);
            }}
            className="rounded-lg border border-zinc-700 px-6 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Continue Manually
          </button>
        </div>
      </div>
    );
  }

  // Ready — render the wizard with pre-populated data
  return (
    <StoreBuilderWizard
      xUsername={xUsername}
      xImportData={xData ?? undefined}
      grokEnhancements={grokEnhancements ?? undefined}
    />
  );
}
