"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import { getStorePageUrl } from "@/lib/store-url";

interface StoreProduct { id: string; title: string; price: string; image_url: string | null; description: string; sku: string; }

const PRODUCT_TYPES = [
  { value: "t_shirt", label: "T-Shirt", emoji: "👕" },
  { value: "hoodie", label: "Hoodie", emoji: "🧥" },
  { value: "ballcap", label: "Ballcap", emoji: "🧢" },
  { value: "digital_drop", label: "Digital Drop", emoji: "⚡" },
];

type Engine = "grok" | "composite";

export default function DesignStudioPage() {
  const { storeSlug, hasStore } = useConsole();

  const [prompt, setPrompt] = useState("");
  const [productType, setProductType] = useState("t_shirt");
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refDataUrl, setRefDataUrl] = useState<string | null>(null);
  const [engine, setEngine] = useState<Engine>("grok");
  const [generating, setGenerating] = useState(false);
  const [designVariants, setDesignVariants] = useState<string[]>([]);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ product_type: string; mockup_url: string | null; retail_price: string; printful_synced: boolean } | null>(null);

  const [printfulKey, setPrintfulKey] = useState("");
  const [printfulConnected, setPrintfulConnected] = useState<string | null>(null);
  const [storeUuid, setStoreUuid] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);

  const [xLooking, setXLooking] = useState(false);
  const [xHandle, setXHandle] = useState("");
  const [importingPost, setImportingPost] = useState(false);
  const [xPostUrl, setXPostUrl] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [showXProfile, setShowXProfile] = useState(false);
  const [showXPost, setShowXPost] = useState(false);

  useEffect(() => {
    if (!hasStore) return;
    fetch(`/api/printful/status?slug=${encodeURIComponent(storeSlug || "")}`)
      .then(r => r.json()).then(d => { if (d.store_uuid) setStoreUuid(d.store_uuid); if (d.connected) setPrintfulConnected(d.printful_store_id ? `Store #${d.printful_store_id}` : "Connected"); }).catch(() => {});
    fetch(`/api/stores/products?slug=${encodeURIComponent(storeSlug || "")}`)
      .then(r => r.json()).then(d => { const p = d.products ?? d ?? []; setStoreProducts(Array.isArray(p) ? p : []); }).catch(() => {});
  }, [hasStore, storeSlug]);

  const handleFileSelect = (file: File) => {
    if (file.size > 4 * 1024 * 1024) { setError("Max 4MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("JPEG, PNG, or WebP only"); return; }
    setError(null);
    setRefPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setRefDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setStatus("Image attached — Exact+Text preserves it perfectly, Grok AI edits around it.");
  };

  const handleXProfile = async () => {
    const handle = xHandle.trim().replace(/^@/, "");
    if (!handle) return;
    setXLooking(true); setStatus(`Looking up @${handle}...`);
    try {
      const res = await fetch(`/api/x-lookup?username=${encodeURIComponent(handle)}`);
      if (!res.ok) { setStatus(`@${handle} not found`); return; }
      const profile = await res.json();
      const pl = PRODUCT_TYPES.find(t => t.value === productType)?.label || "T-Shirt";
      const bio = (profile.bio || "").slice(0, 100);
      setPrompt(`Premium ${pl} design inspired by @${handle}. Theme: ${bio}. Print-ready, centered, vibrant, high contrast.`);
      setTitle(`@${handle} ${pl}`);
      if (profile.profile_image_url) { setRefPreview(profile.profile_image_url); setRefDataUrl(null); }
      setStatus(`Loaded @${handle}`); setShowXProfile(false); setXHandle("");
    } catch { setStatus("X lookup failed"); } finally { setXLooking(false); }
  };

  const handleImportPost = async () => {
    const url = xPostUrl.trim();
    if (!url.match(/(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/)) { setError("Paste a valid X post URL"); return; }
    setImportingPost(true); setStatus("Importing post...");
    try {
      const res = await fetch("/api/design-studio/import-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_url: url }) });
      if (res.ok) {
        const data = await res.json();
        if (data.text) setPrompt(data.text);
        if (data.image_url) { setRefPreview(data.image_url); setRefDataUrl(null); }
        if (data.title) setTitle(data.title);
        setStatus("Post imported"); setShowXPost(false); setXPostUrl("");
      } else { setStatus("Failed to import"); }
    } catch { setStatus("Import failed"); } finally { setImportingPost(false); }
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true); setStatus("Enhancing...");
    try {
      const res = await fetch("/api/design-studio/enhance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), product_type: productType }) });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) { setPrompt(data.enhanced); setStatus("Prompt enhanced"); }
        if (data.description && !description) setDescription(data.description);
      }
    } catch {} finally { setEnhancing(false); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !refDataUrl && !refPreview) return;
    setGenerating(true); setDesignUrl(null); setDesignVariants([]); setError(null); setPublished(null);
    const pl = PRODUCT_TYPES.find(t => t.value === productType)?.label;

    // Composite mode
    if (engine === "composite" && (refDataUrl || refPreview)) {
      setStatus(`Creating 4 style variants...`);
      try {
        let topText = "", bottomText = "";
        const p = prompt.trim();
        const topMatch = p.match(/['""']([^'""']+)['""']?\s*(?:on top|above|at the top)/i);
        const bottomMatch = p.match(/['""']([^'""']+)['""']?\s*(?:below|at the bottom|underneath)/i);
        if (topMatch) topText = topMatch[1];
        if (bottomMatch) bottomText = bottomMatch[1];
        if (!topText && !bottomText) {
          const parts = p.split(/\s+and\s+/i);
          if (parts.length >= 2) { topText = parts[0].replace(/^add\s+/i, "").replace(/['"]/g, ""); bottomText = parts[1].replace(/['"]/g, ""); }
          else if (p) { bottomText = p.replace(/^(?:use|add|put)\s+.*?(?:image|photo|picture).*?(?:and|,|to)\s*/i, "").replace(/['"]/g, "") || p; }
        }
        const styles = ["bold", "neon", "streetwear", "vintage"];
        const results = await Promise.all(styles.map(style =>
          fetch("/api/design-studio/composite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: refDataUrl || refPreview, top_text: topText || undefined, bottom_text: bottomText || undefined, style, product_type: productType }) }).then(r => r.json()).catch(() => null)
        ));
        const urls = results.filter(r => r?.success).map(r => r.image_url);
        if (urls.length === 0) { setError("Composite failed"); return; }
        setDesignVariants(urls); setDesignUrl(urls[0]);
        if (!title) setTitle(`${(topText || bottomText || p).slice(0, 30)} ${pl || ""}`);
        setStatus(`4 styles: Bold, Neon, Streetwear, Vintage`);
        const now = new Date();
        for (let vi = 0; vi < urls.length; vi++) {
          fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: { id: `comp_${Date.now()}_${vi}`, url: urls[vi], prompt: p, name: `${(topText || bottomText || p).slice(0, 20)} ${styles[vi]} — ${now.getMonth() + 1}/${now.getDate()}`, type: "image", created_at: now.toISOString(), product_type: productType, folder: pl || "Unsorted", saved: false } }) }).catch(() => {});
        }
      } catch (err: any) { setError(err.message || "Failed"); } finally { setGenerating(false); }
      return;
    }

    // Grok AI
    const hasImage = !!(refDataUrl || refPreview);
    setStatus(hasImage ? `Grok is editing your image for ${pl}...` : `Grok is generating ${pl} designs...`);
    try {
      const res = await fetch("/api/design-studio/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || "create a design from this image", product_type: productType, reference_image: refDataUrl || refPreview || undefined, reference_mode: "exact", variants: 4 }),
      });
      let data; try { data = await res.json(); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) { setError(data.error || "Generation failed"); return; }
      const urls: string[] = data.image_urls || [data.image_url];
      setDesignVariants(urls); setDesignUrl(urls[0]);
      if (!title) setTitle(`${prompt.trim().slice(0, 40)} ${pl || ""}`);
      setStatus(`${urls.length} variants ready${data.used_edits ? " (edited your image)" : ""}`);
      const now = new Date();
      const short = prompt.trim().slice(0, 30).replace(/\s+/g, " ").trim();
      for (let vi = 0; vi < urls.length; vi++) {
        fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: { id: `gen_${Date.now()}_${vi}`, url: urls[vi], prompt: prompt.trim(), name: `${short}${urls.length > 1 ? ` v${vi + 1}` : ""} — ${now.getMonth() + 1}/${now.getDate()}`, type: "image", created_at: now.toISOString(), product_type: productType, folder: pl || "Unsorted", saved: false } }) }).catch(() => {});
      }
    } catch (err: any) { setError(err.message || "Something went wrong"); } finally { setGenerating(false); }
  };

  const handlePublish = async () => {
    if (!designUrl || !title.trim()) return;
    setPublishing(true); setError(null);
    try {
      const res = await fetch("/api/design-studio/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: designUrl, product_type: productType, title: title.trim(), description: description.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Publish failed"); return; }
      setPublished({ product_type: data.product_type, mockup_url: data.mockup_url, retail_price: data.retail_price, printful_synced: !!data.printful_product_id });
      setStatus(`"${title}" published!`);
    } catch (err: any) { setError(err.message || "Publish failed"); } finally { setPublishing(false); }
  };

  const connectPrintful = useCallback(async () => {
    if (!printfulKey.trim()) return;
    setConnecting(true); setConnectError(null);
    try {
      const res = await fetch("/api/printful/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: printfulKey.trim(), storeId: storeUuid }) });
      const data = await res.json();
      if (!res.ok) { setConnectError(data.error || "Failed"); return; }
      setPrintfulConnected(data.printful_store || "Connected"); setPrintfulKey("");
    } catch { setConnectError("Failed"); } finally { setConnecting(false); }
  }, [printfulKey, storeUuid]);

  const resetDesign = () => { setDesignUrl(null); setDesignVariants([]); setTitle(""); setDescription(""); setPublished(null); setPrompt(""); setRefPreview(null); setRefDataUrl(null); setStatus(null); };

  if (!hasStore || !storeSlug) {
    return <div className="flex items-center justify-center py-20"><div className="text-center"><h2 className="text-xl font-bold text-white mb-2">No Store Found</h2><p className="text-sm text-zinc-500">Create a store first.</p></div></div>;
  }

  const selectedProduct = PRODUCT_TYPES.find(t => t.value === productType);
  const hasImage = !!(refPreview || refDataUrl);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-0.5">Grok Creator Studio</h1>
      <p className="text-xs text-zinc-500 mb-4">Design merch. Generate. Publish.</p>

      {/* PROMPT */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-3">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your design... e.g. 'Bold streetwear hoodie with graffiti text RARE'" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none" rows={3} />

        <div className="flex items-center gap-3 mt-2">
          {refPreview && (
            <div className="flex items-center gap-2">
              <img src={refPreview} alt="ref" className="h-10 w-10 rounded-lg object-cover border border-zinc-700" />
              <button onClick={() => { setRefPreview(null); setRefDataUrl(null); setStatus(null); }} className="text-[10px] text-zinc-500 hover:text-red-400">Remove</button>
            </div>
          )}
          {status && <p className="text-[10px] text-zinc-500 flex-1">{status}</p>}
          <button onClick={handleEnhance} disabled={enhancing || !prompt.trim()} className="ml-auto rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-purple-500 hover:text-white disabled:opacity-50 transition flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            {enhancing ? "Enhancing..." : "Enhance with AI"}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => { setShowXProfile(!showXProfile); setShowXPost(false); }} className={`rounded-lg border px-3 py-1.5 text-xs transition flex items-center gap-1.5 ${showXProfile ? "border-purple-500 text-purple-400" : "border-zinc-700 text-zinc-400 hover:border-purple-500 hover:text-white"}`}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            From @profile
          </button>
          <button onClick={() => { setShowXPost(!showXPost); setShowXProfile(false); }} className={`rounded-lg border px-3 py-1.5 text-xs transition flex items-center gap-1.5 ${showXPost ? "border-purple-500 text-purple-400" : "border-zinc-700 text-zinc-400 hover:border-purple-500 hover:text-white"}`}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.686-3.748a4.5 4.5 0 00-6.364-6.364L4.5 6.75" /></svg>
            From X post
          </button>
          <label className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-purple-500 hover:text-white transition flex items-center gap-1.5 cursor-pointer">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Upload image
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          </label>
        </div>

        {showXProfile && (
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span><input type="text" value={xHandle} onChange={e => setXHandle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleXProfile()} placeholder="username" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none" /></div>
            <button onClick={handleXProfile} disabled={xLooking || !xHandle.trim()} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition">{xLooking ? "Loading..." : "Load"}</button>
          </div>
        )}
        {showXPost && (
          <div className="flex gap-2 mt-2">
            <input type="text" value={xPostUrl} onChange={e => setXPostUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleImportPost()} placeholder="https://x.com/user/status/123456789" className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none" />
            <button onClick={handleImportPost} disabled={importingPost || !xPostUrl.trim()} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition">{importingPost ? "Importing..." : "Import"}</button>
          </div>
        )}
      </div>

      {/* PRODUCT + ENGINE */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-3 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Product</p>
          <div className="grid grid-cols-4 gap-2">
            {PRODUCT_TYPES.map(pt => (
              <button key={pt.value} onClick={() => setProductType(pt.value)} className={`rounded-lg border px-3 py-2 text-center transition ${productType === pt.value ? "border-purple-500 bg-purple-500/15 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                <span className="text-lg block">{pt.emoji}</span>
                <span className="text-[11px] font-medium">{pt.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Engine</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEngine("grok")} className={`rounded-lg border px-3 py-3 text-center transition ${engine === "grok" ? "border-purple-500 bg-purple-500/10" : "border-zinc-700 hover:border-zinc-600"}`}>
              <span className={`text-sm font-semibold block ${engine === "grok" ? "text-purple-400" : "text-zinc-400"}`}>Grok AI</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">{hasImage ? "Edits your uploaded image" : "AI-generated designs"}</span>
            </button>
            <button onClick={() => setEngine("composite")} disabled={!hasImage} className={`rounded-lg border px-3 py-3 text-center transition ${engine === "composite" ? "border-blue-500 bg-blue-500/10" : !hasImage ? "border-zinc-800 opacity-40" : "border-zinc-700 hover:border-zinc-600"}`}>
              <span className={`text-sm font-semibold block ${engine === "composite" ? "text-blue-400" : "text-zinc-400"}`}>Exact + Text</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">{hasImage ? "Your exact image + text overlay" : "Upload an image first"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GENERATE */}
      <button onClick={handleGenerate} disabled={generating || (!prompt.trim() && !refDataUrl && !refPreview)} className={`w-full rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed mb-3 ${engine === "composite" ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700" : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700"}`}>
        {generating ? (
          <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{status || "Generating..."}</span>
        ) : engine === "composite" ? `Composite ${selectedProduct?.emoji} Image + Text` : `Generate ${selectedProduct?.emoji} ${selectedProduct?.label}`}
      </button>

      {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400">{error}</div>}

      {/* RESULTS */}
      {designVariants.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-3">
          {designVariants.length > 1 && (
            <div className="p-3 border-b border-zinc-800">
              <div className="grid grid-cols-4 gap-2">
                {designVariants.map((url, i) => (
                  <button key={i} onClick={() => setDesignUrl(url)} className={`relative rounded-lg overflow-hidden border-2 transition ${designUrl === url ? "border-purple-500 ring-1 ring-purple-500/30" : "border-zinc-700 hover:border-zinc-500"}`}>
                    <img src={url} alt={`v${i + 1}`} className="aspect-square w-full object-cover" />
                    {designUrl === url && <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center"><svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-zinc-800"><img src={designUrl!} alt="Design" className="w-full max-h-[350px] object-contain mx-auto" /></div>
          {!published ? (
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Product title..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={handlePublish} disabled={publishing || !title.trim()} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition">{publishing ? "Publishing..." : `Publish ${selectedProduct?.emoji} to Printful`}</button>
                <button onClick={resetDesign} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition">Discard</button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-green-400 mb-2"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="font-semibold text-sm">Published!</span></div>
              <a href={`https://x.com/intent/tweet?${new URLSearchParams({ text: `Just dropped "${title}" on RareImagery!`, url: getStorePageUrl(storeSlug || "", "store") }).toString()}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>Share to X
              </a>
              <button onClick={resetDesign} className="mt-2 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition">Create Another</button>
            </div>
          )}
        </div>
      )}

      {/* PRINTFUL */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 mb-3">
        <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-white">Printful</span>{printfulConnected && <span className="text-[10px] text-emerald-400">Connected</span>}</div>
        {printfulConnected ? (
          <div className="flex items-center gap-2">
            <button onClick={async () => { if (!storeUuid) return; setSyncing(true); setSyncResult(null); try { const r = await fetch("/api/printful/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: storeUuid }) }); const d = await r.json(); setSyncResult(r.ok ? `Imported ${d.imported}` : d.error); if (r.ok) fetch(`/api/stores/products?slug=${encodeURIComponent(storeSlug || "")}`).then(r => r.json()).then(d => setStoreProducts(Array.isArray(d.products ?? d) ? (d.products ?? d) : [])).catch(() => {}); } catch { setSyncResult("Failed"); } finally { setSyncing(false); } }} disabled={syncing} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-indigo-500 disabled:opacity-50 transition">{syncing ? "Importing..." : "Import Products"}</button>
            {syncResult && <span className="text-[10px] text-zinc-400">{syncResult}</span>}
            <button onClick={() => setShowTokenHelp(true)} className="text-[10px] text-zinc-500 hover:text-indigo-400 ml-auto">Help</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="text" value={printfulKey} onChange={e => setPrintfulKey(e.target.value)} onKeyDown={e => e.key === "Enter" && connectPrintful()} placeholder="Printful Private Token..." className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
              <button onClick={connectPrintful} disabled={connecting || !printfulKey.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-500 disabled:opacity-50 transition">{connecting ? "..." : "Connect"}</button>
            </div>
            {connectError && <p className="text-[10px] text-red-400">{connectError}</p>}
            <button onClick={() => setShowTokenHelp(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300">How to find your token</button>
          </div>
        )}
      </div>

      {showTokenHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTokenHelp(false)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowTokenHelp(false)} className="absolute top-3 right-3 text-zinc-500 hover:text-white"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            <h3 className="text-lg font-bold text-white mb-4">Find Your Printful Token</h3>
            <ol className="space-y-3 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</span><div><p className="font-medium text-white">Printful Settings</p><p className="text-xs text-zinc-500"><a href="https://www.printful.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">printful.com/dashboard</a> → Settings</p></div></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</span><div><p className="font-medium text-white">API tab</p><p className="text-xs text-zinc-500"><a href="https://www.printful.com/dashboard/developer/api" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Settings → API</a></p></div></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">3</span><div><p className="font-medium text-white">Create Private Token</p><p className="text-xs text-zinc-500">All scopes, name it &quot;RareImagery&quot;</p></div></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">4</span><div><p className="font-medium text-white">Paste above</p></div></li>
            </ol>
            <div className="mt-4 flex justify-end gap-2">
              <a href="https://www.printful.com/dashboard/developer/api" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-500">Open Printful API</a>
              <button onClick={() => setShowTokenHelp(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Got it</button>
            </div>
          </div>
        </div>
      )}

      {storeProducts.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <h2 className="text-xs font-semibold text-white mb-2">Your Products</h2>
          <div className="grid grid-cols-3 gap-2">
            {storeProducts.map(p => (
              <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-800/50 overflow-hidden">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-zinc-800 flex items-center justify-center"><svg className="h-6 w-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>}
                <p className="p-1.5 text-[10px] text-white truncate">{p.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
