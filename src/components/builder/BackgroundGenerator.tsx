"use client";

import { useEffect, useState } from "react";
import GenerationCounter from "@/components/GenerationCounter";

const QUICK_PRESETS = [
  { name: "Dark Gradient", prompt: "smooth dark gradient from deep purple to black with subtle glow" },
  { name: "Nebula", prompt: "dark cosmic nebula with purple and blue gas clouds, stars scattered" },
  { name: "Abstract Waves", prompt: "dark abstract flowing waves with indigo and violet highlights" },
  { name: "Geometric", prompt: "dark minimal geometric pattern with thin glowing grid lines" },
  { name: "City Night", prompt: "blurred city skyline at night with bokeh lights, very dark" },
  { name: "Nature Dark", prompt: "dark forest canopy with moonlight filtering through, moody atmosphere" },
];

interface BackgroundGeneratorProps {
  currentBackground: string;
  onBackgroundChange: (url: string) => void;
}

export default function BackgroundGenerator({ currentBackground, onBackgroundChange }: BackgroundGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiGateLocked, setAiGateLocked] = useState(false);
  const [refineMode, setRefineMode] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [useCreatorContext, setUseCreatorContext] = useState(true);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Fetch creator's banner URL on mount for the "Use my X banner" feature
  useEffect(() => {
    fetch("/api/stores/enhance-profile", { method: "POST" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.xData?.bannerUrl) setBannerUrl(d.xData.bannerUrl);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setVariants([]);
    setSelectedIndex(null);
    try {
      const res = await fetch("/api/design-studio/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), n: 4, use_creator_context: useCreatorContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ai_gate_locked") { setAiGateLocked(true); setError(""); return; }
        setError(data.error || "Generation failed"); return;
      }
      const urls: string[] = data.image_urls || [];
      setVariants(urls);
      if (urls[0]) {
        setSelectedIndex(0);
        onBackgroundChange(urls[0]);
      }
    } catch {
      setError("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const refine = async () => {
    if (selectedIndex === null || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/design-studio/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: refinePrompt.trim() || "Make it darker and more subtle",
          refineUrl: variants[selectedIndex],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ai_gate_locked") { setAiGateLocked(true); setError(""); return; }
        setError(data.error || "Refinement failed"); return;
      }
      const newUrl = data.image_urls?.[0];
      if (newUrl) {
        const updated = [...variants, newUrl];
        setVariants(updated);
        setSelectedIndex(updated.length - 1);
        onBackgroundChange(newUrl);
      }
    } catch {
      setError("Refinement failed");
    } finally {
      setLoading(false);
      setRefineMode(false);
      setRefinePrompt("");
    }
  };

  const selectVariant = (i: number) => {
    setSelectedIndex(i);
    onBackgroundChange(variants[i]);
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80 px-6 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
        <svg className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Page Background — Grok Imagine
      </p>

      {/* Generation usage */}
      <div className="mb-3">
        <GenerationCounter />
      </div>

      {/* Prompt input */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && prompt.trim() && !loading && generate()}
          placeholder="Describe your background... e.g. 'dark purple nebula with stars'"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
        />
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate
            </>
          )}
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => setPrompt(preset.prompt)}
            className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-purple-300 transition"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Creator context toggle + banner preview */}
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useCreatorContext}
            onChange={(e) => setUseCreatorContext(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 h-3.5 w-3.5"
          />
          <span className="text-[10px] text-zinc-400">Match my X vibe</span>
        </label>
        {bannerUrl && useCreatorContext && (
          <div className="flex items-center gap-1.5">
            <img src={bannerUrl} alt="X banner" className="h-5 w-10 rounded object-cover border border-zinc-700" />
            <span className="text-[10px] text-zinc-600">Using your X banner as reference</span>
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
      {aiGateLocked && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-4 mb-2 text-center">
          <p className="text-xs font-semibold text-white mb-1">Free designs used up</p>
          <p className="text-[10px] text-zinc-400 mb-2">Subscribe to @rareimagery on X to unlock unlimited AI backgrounds.</p>
          <div className="flex gap-2 justify-center">
            <a href="https://x.com/rareimagery/subscribe" target="_blank" rel="noopener noreferrer" className="rounded-md bg-white px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-zinc-200 transition">Subscribe on X</a>
          </div>
        </div>
      )}

      {/* Generated variants */}
      {variants.length > 0 && (
        <>
          <p className="text-[10px] text-zinc-500 mb-1.5">Choose a background</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {variants.map((url, i) => (
              <button
                key={i}
                onClick={() => selectVariant(i)}
                className={`rounded-lg border overflow-hidden transition relative ${
                  selectedIndex === i
                    ? "border-purple-500 ring-1 ring-purple-500/50 scale-105"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <img src={url} alt={`Background ${i + 1}`} className="h-16 w-full object-cover" />
                {selectedIndex === i && (
                  <span className="absolute top-0.5 right-0.5 bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Refine + Apply buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setRefineMode(true)}
              disabled={selectedIndex === null || loading}
              className="flex-1 rounded-lg border border-purple-500/60 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-950/40 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Refine selected
            </button>
          </div>
        </>
      )}

      {/* Refine panel */}
      {refineMode && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 mb-3">
          <p className="text-[10px] text-purple-300 mb-2">Describe how to refine this background (uses 1 generation)</p>
          <textarea
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="Make it darker with more purple tones..."
            rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={refine}
              disabled={loading}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition"
            >
              {loading ? "Refining..." : "Refine"}
            </button>
            <button
              onClick={() => { setRefineMode(false); setRefinePrompt(""); }}
              className="rounded-lg border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current background + actions */}
      <div className="flex items-center gap-2">
        {currentBackground && (
          <div className="flex items-center gap-2 flex-1">
            <img src={currentBackground} alt="Current" className="h-8 w-14 rounded object-cover border border-zinc-700" />
            <span className="text-[10px] text-zinc-500">Active background</span>
            <button onClick={() => onBackgroundChange("")} className="text-[10px] text-zinc-600 hover:text-red-400 transition">
              Remove
            </button>
          </div>
        )}
        <label className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white cursor-pointer transition flex items-center gap-1.5">
          {uploadingBg ? (
            <svg className="h-3 w-3 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
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
                if (res.ok && data.url) onBackgroundChange(data.url);
              } catch {} finally { setUploadingBg(false); }
            }}
          />
        </label>
      </div>
    </div>
  );
}
