"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import TrialGate from "@/components/TrialGate";
import PlatformAiGate from "@/components/PlatformAiGate";
import { getStorePageUrl } from "@/lib/store-url";

const PRODUCT_TYPES = [
  { value: "t_shirt", label: "T-Shirt", emoji: "👕" },
  { value: "hoodie", label: "Hoodie", emoji: "🧥" },
  { value: "ballcap", label: "Ballcap", emoji: "🧢" },
  { value: "pet_bandana", label: "Pet Bandana", emoji: "🐕" },
  { value: "pet_hoodie", label: "Pet Hoodie", emoji: "🐾" },
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
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState<"front" | "back" | "both">("front");
  const [backDesignUrl, setBackDesignUrl] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ product_type: string; mockup_url: string | null; retail_price: string; printful_synced: boolean; publish_count?: number; publish_fee?: string } | null>(null);
  const [genCount, setGenCount] = useState<number | null>(null);
  const [genRemaining, setGenRemaining] = useState<number | null>(null);

  const [printfulKey, setPrintfulKey] = useState("");
  const [printfulConnected, setPrintfulConnected] = useState<string | null>(null);
  const [storeUuid, setStoreUuid] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);


  // Refinement state
  const [refining, setRefining] = useState(false);
  const [refineMode, setRefineMode] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");

  // Session history
  const [sessionHistory, setSessionHistory] = useState<Array<{ prompt: string; variants: string[]; timestamp: number }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Mockup preview state
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [mockupLoading, setMockupLoading] = useState(false);

  // Design chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [xLooking, setXLooking] = useState(false);
  const [xHandle, setXHandle] = useState("");
  const [importingPost, setImportingPost] = useState(false);
  const [xPostUrl, setXPostUrl] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [showXProfile, setShowXProfile] = useState(false);
  const [showXPost, setShowXPost] = useState(false);
  const [importedPost, setImportedPost] = useState<{
    text: string; username: string; image_url: string | null; image_urls: string[];
    likes: number; retweets: number; replies: number; views: number; created_at: string | null;
  } | null>(null);

  // Pre-load from URL params (e.g. from Grok Library "Use in Studio")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refUrl = params.get("ref");
    const prePrompt = params.get("prompt");
    const preProduct = params.get("product");
    if (refUrl) {
      setRefPreview(refUrl);
      setRefDataUrl(refUrl.startsWith("data:") ? refUrl : null);
      setStatus("Image loaded from Library — ready to generate.");
    }
    if (prePrompt) setPrompt(prePrompt);
    if (preProduct && ["t_shirt", "hoodie", "ballcap", "digital_drop"].includes(preProduct)) setProductType(preProduct);
  }, []);

  useEffect(() => {
    if (!hasStore) return;
    fetch(`/api/printful/status?slug=${encodeURIComponent(storeSlug || "")}`)
      .then(r => r.json()).then(d => { if (d.store_uuid) setStoreUuid(d.store_uuid); if (d.connected) setPrintfulConnected(d.printful_store_id ? `Store #${d.printful_store_id}` : "Connected"); }).catch(() => {});
    // Fetch current generation count from Drupal
    fetch(`/api/stores/gen-count?slug=${encodeURIComponent(storeSlug || "")}`)
      .then(r => r.json()).then(d => { if (d.count != null) { setGenCount(d.count); setGenRemaining(Math.max(100 - d.count, 0)); } }).catch(() => {});
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
      if (!res.ok) { setStatus("Failed to import"); return; }
      const data = await res.json();
      // Save post data for preview card
      setImportedPost({
        text: data.text || "", username: data.username || "", image_url: data.image_url || null,
        image_urls: data.image_urls || [], likes: data.likes || 0, retweets: data.retweets || 0,
        replies: data.replies || 0, views: data.views || 0, created_at: data.created_at || null,
      });
      if (data.text) setPrompt(data.text);
      if (data.image_url) { setRefPreview(data.image_url); setRefDataUrl(null); }
      if (data.title) setTitle(data.title);
      setShowXPost(false); setXPostUrl("");
      setStatus("Post imported — enhancing prompt...");
      // Auto-enhance the imported text into a merch-ready prompt
      if (data.text) {
        try {
          const enhRes = await fetch("/api/design-studio/enhance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: data.text, product_type: productType }) });
          if (enhRes.ok) {
            const enhData = await enhRes.json();
            if (enhData.enhanced) { setPrompt(enhData.enhanced); setStatus("Post imported + prompt enhanced"); }
            if (enhData.description && !description) setDescription(enhData.description);
          } else { setStatus("Post imported"); }
        } catch { setStatus("Post imported"); }
      } else { setStatus("Post imported"); }
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
        const styles = ["bold", "neon", "streetwear", "vintage", "clean", "fire", "ice", "purple"];
        const results = await Promise.all(styles.map(style =>
          fetch("/api/design-studio/composite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: refDataUrl || refPreview, top_text: topText || undefined, bottom_text: bottomText || undefined, style, product_type: productType }) }).then(r => r.json()).catch(() => null)
        ));
        const urls = results.filter(r => r?.success).map(r => r.image_url);
        if (urls.length === 0) { setError("Composite failed"); return; }
        setDesignVariants(urls); setDesignUrl(urls[0]);
        if (!title) setTitle(`${(topText || bottomText || p).slice(0, 30)} ${pl || ""}`);
        setStatus(`${urls.length} styles generated`);
        setRefineMode(false);
        setSessionHistory(prev => [...prev, { prompt: prompt.trim(), variants: urls, timestamp: Date.now() }]);
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
        body: JSON.stringify({ prompt: prompt.trim() || "create a design from this image", product_type: productType, reference_image: refDataUrl || refPreview || undefined, variants: 4 }),
      });
      let data; try { data = await res.json(); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) { setError(data.error || "Generation failed"); return; }
      const urls: string[] = data.image_urls || [data.image_url];
      setDesignVariants(urls); setDesignUrl(urls[0]);
      if (!title) setTitle(`${prompt.trim().slice(0, 40)} ${pl || ""}`);
      if (data.generation_count != null) { setGenCount(data.generation_count); setGenRemaining(data.generations_remaining ?? null); }
      setStatus(`${urls.length} variants ready${data.used_edits ? " (edited your image)" : ""}`);
      setRefineMode(false);
      setSessionHistory(prev => [...prev, { prompt: prompt.trim(), variants: urls, timestamp: Date.now() }]);
      const now = new Date();
      const short = prompt.trim().slice(0, 30).replace(/\s+/g, " ").trim();
      for (let vi = 0; vi < urls.length; vi++) {
        fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: { id: `gen_${Date.now()}_${vi}`, url: urls[vi], prompt: prompt.trim(), name: `${short}${urls.length > 1 ? ` v${vi + 1}` : ""} — ${now.getMonth() + 1}/${now.getDate()}`, type: "image", created_at: now.toISOString(), product_type: productType, folder: pl || "Unsorted", saved: false } }) }).catch(() => {});
      }
    } catch (err: any) { setError(err.message || "Something went wrong"); } finally { setGenerating(false); }
  };

  const handleRefine = async () => {
    if (!designUrl || !refinePrompt.trim()) return;
    setRefining(true); setError(null);
    const pl = PRODUCT_TYPES.find(t => t.value === productType)?.label;
    setStatus(`Refining ${pl} design...`);
    try {
      const res = await fetch("/api/design-studio/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: refinePrompt.trim(), product_type: productType, reference_image: designUrl, variants: 1 }),
      });
      let data; try { data = await res.json(); } catch { data = { error: `Server error (${res.status})` }; }
      if (!res.ok) { setError(data.error || "Refinement failed"); return; }
      const newUrl: string = data.image_urls?.[0] || data.image_url;
      if (!newUrl) { setError("No image returned"); return; }
      // Add refined variant to the grid
      setDesignVariants(prev => [...prev, newUrl]);
      setDesignUrl(newUrl);
      if (data.generation_count != null) { setGenCount(data.generation_count); setGenRemaining(data.generations_remaining ?? null); }
      setStatus("Refinement ready — compare with original");
      setRefinePrompt("");
      // Save to gallery
      const now = new Date();
      fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: { id: `ref_${Date.now()}`, url: newUrl, prompt: refinePrompt.trim(), name: `Refined ${prompt.trim().slice(0, 20)} — ${now.getMonth() + 1}/${now.getDate()}`, type: "image", created_at: now.toISOString(), product_type: productType, folder: pl || "Unsorted", saved: false } }) }).catch(() => {});
    } catch (err: any) { setError(err.message || "Refinement failed"); } finally { setRefining(false); }
  };

  const handlePublish = async () => {
    if (!designUrl || !title.trim()) return;
    const isDigital = productType === "digital_drop";
    if (!isDigital && !price.trim()) { setError("Set a price before publishing"); return; }
    setPublishing(true); setError(null);
    try {
      const res = await fetch("/api/design-studio/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: designUrl, back_image_url: placement === "both" ? backDesignUrl : placement === "back" ? designUrl : undefined, product_type: productType, placement, title: title.trim(), price: price.trim() || undefined, description: description.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Publish failed"); return; }
      setPublished({ product_type: data.product_type, mockup_url: data.mockup_url, retail_price: data.retail_price, printful_synced: !!data.printful_product_id, publish_count: data.publish_count, publish_fee: data.publish_fee });
      setStatus(`"${title}" published!`);
    } catch (err: any) { setError(err.message || "Publish failed"); } finally { setPublishing(false); }
  };

  const handleMockupPreview = async () => {
    if (!designUrl || mockupLoading) return;
    setMockupLoading(true); setMockupUrl(null);
    try {
      const res = await fetch("/api/design-studio/preview-mockup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: designUrl, product_type: productType, placement }),
      });
      const data = await res.json();
      if (res.ok && data.mockup_url) {
        setMockupUrl(data.mockup_url);
      } else {
        setError(data.error || "Mockup preview failed");
      }
    } catch { setError("Mockup preview failed"); } finally { setMockupLoading(false); }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/design-studio/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, context: { product_type: productType, prompt, engine, has_image: !!refPreview } }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply || data.message || "No response" }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't respond. Try again." }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Connection error. Try again." }]);
    } finally { setChatLoading(false); }
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

  const resetDesign = () => { setDesignUrl(null); setDesignVariants([]); setTitle(""); setDescription(""); setPublished(null); setPrompt(""); setRefPreview(null); setRefDataUrl(null); setStatus(null); setMockupUrl(null); setRefineMode(false); setRefinePrompt(""); };

  if (!hasStore || !storeSlug) {
    return <div className="flex items-center justify-center py-20"><div className="text-center"><h2 className="text-xl font-bold text-white mb-2">No Store Found</h2><p className="text-sm text-zinc-500">Create a store first.</p></div></div>;
  }

  const selectedProduct = PRODUCT_TYPES.find(t => t.value === productType);
  const hasImage = !!(refPreview || refDataUrl);

  return (
    <TrialGate feature="generate designs">
    <PlatformAiGate>
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-0.5">Grok Product Creator</h1>
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

        {/* Imported post preview card */}
        {importedPost && (
          <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-950/10 p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white">@{importedPost.username}</span>
                  {importedPost.created_at && (
                    <span className="text-[10px] text-zinc-600">{new Date(importedPost.created_at).toLocaleDateString()}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{importedPost.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  {importedPost.views > 0 && <span className="text-[10px] text-zinc-500">{importedPost.views >= 1000 ? `${(importedPost.views / 1000).toFixed(1)}K` : importedPost.views} views</span>}
                  <span className="text-[10px] text-zinc-500">{importedPost.likes} likes</span>
                  <span className="text-[10px] text-zinc-500">{importedPost.retweets} RTs</span>
                  <span className="text-[10px] text-zinc-500">{importedPost.replies} replies</span>
                </div>
              </div>
              {importedPost.image_url && (
                <img src={importedPost.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
              )}
              <button onClick={() => setImportedPost(null)} className="shrink-0 text-zinc-600 hover:text-zinc-400 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
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

      {/* Usage + GENERATE */}
      {genCount != null && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min((genCount / 100) * 100, 100)}%` }} />
            </div>
            <span className={`text-[10px] ${genRemaining != null && genRemaining <= 10 ? "text-amber-400" : "text-zinc-600"}`}>
              {genCount} / 100 generations
            </span>
          </div>
          <span className="text-[10px] text-zinc-600">$1 per publish · $0.25 after 100 gens</span>
        </div>
      )}
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
              <div className={`grid gap-2 ${designVariants.length <= 4 ? "grid-cols-4" : "grid-cols-5"}`}>
                {designVariants.map((url, i) => (
                  <button key={`${url}-${i}`} onClick={() => setDesignUrl(url)} className={`group/card relative rounded-lg overflow-hidden border-2 transition ${designUrl === url ? "border-purple-500 ring-1 ring-purple-500/30" : "border-zinc-700 hover:border-zinc-500"}`}>
                    <img src={url} alt={`v${i + 1}`} className="aspect-square w-full object-cover" />
                    {designUrl === url && <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center"><svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
                    <div onClick={e => { e.stopPropagation(); setDesignUrl(url); setRefineMode(true); }} className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-[10px] font-medium py-1.5 text-center opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                      Refine
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-zinc-800"><img src={designUrl!} alt="Design" className="w-full max-h-[350px] object-contain mx-auto" /></div>

          {/* Refine Panel */}
          {refineMode && !published && (
            <div className="p-4 border-t border-purple-500/30 bg-purple-950/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  Refine this design
                </h3>
                <button onClick={() => setRefineMode(false)} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
              </div>
              <textarea value={refinePrompt} onChange={e => setRefinePrompt(e.target.value)} placeholder="What would you change? e.g. 'Make the colors warmer and add more detail'" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none resize-none" rows={2} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["Warmer colors", "More detail", "Bolder contrast", "Simpler/cleaner", "Darker mood", "Add texture"].map(chip => (
                  <button key={chip} onClick={() => setRefinePrompt(chip)} className={`rounded-full border px-3 py-1 text-[11px] transition ${refinePrompt === chip ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-purple-500 hover:text-purple-300 hover:bg-purple-500/10"}`}>
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleRefine} disabled={refining || !refinePrompt.trim()} className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {refining ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Refining...</> : "Refine (1 generation)"}
                </button>
                <button onClick={() => setRefineMode(false)} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition">Back</button>
              </div>
            </div>
          )}
          {!published ? (
            <div className="p-3 border-t border-zinc-800 space-y-2">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Product title..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
              </div>
              {/* Placement selector — only for clothing (not ballcap/pet/digital) */}
              {!["ballcap", "pet_bandana", "pet_hoodie", "digital_drop"].includes(productType) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">Design Placement</p>
                  <div className="flex gap-2">
                    {(["front", "back", "both"] as const).map((p) => (
                      <button key={p} onClick={() => setPlacement(p)} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${placement === p ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                        {p === "both" ? "Front + Back" : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                  {placement === "both" && (
                    <div className="mt-2">
                      {backPreview ? (
                        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2">
                          <img src={backPreview} alt="Back design" className="h-12 w-12 rounded object-cover" />
                          <span className="text-xs text-zinc-400 flex-1">Back design attached</span>
                          <button onClick={() => { setBackPreview(null); setBackDesignUrl(null); }} className="text-xs text-zinc-500 hover:text-red-400">Remove</button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-xs text-zinc-500 hover:border-purple-500 hover:text-purple-400 cursor-pointer transition">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                          Upload back design
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setBackPreview(URL.createObjectURL(file));
                            const reader = new FileReader();
                            reader.onload = () => setBackDesignUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Mockup preview */}
              {mockupUrl && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-1.5">Preview on Product</p>
                  <img src={mockupUrl} alt="Product mockup" className="w-full max-h-[300px] object-contain rounded-lg" />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setRefineMode(true)} className="rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-2.5 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  Refine
                </button>
                {productType !== "digital_drop" && printfulConnected && (
                  <button onClick={handleMockupPreview} disabled={mockupLoading || !designUrl} className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition flex items-center gap-1.5">
                    {mockupLoading ? <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading...</> : <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Preview</>}
                  </button>
                )}
                <button onClick={handlePublish} disabled={publishing || !title.trim() || (productType !== "digital_drop" && !price.trim())} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition">{publishing ? "Publishing..." : `Publish ${selectedProduct?.emoji} to Printful`}</button>
                <button onClick={resetDesign} className="rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-zinc-400 hover:text-white transition">Discard</button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-green-400 mb-2"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="font-semibold text-sm">Published!</span></div>
              {published.publish_fee && (
                <div className="mb-2 rounded-lg px-3 py-2 text-xs bg-zinc-800 text-zinc-400">
                  Publish fee: {published.publish_fee} per product
                  {published.publish_count != null && <span className="text-zinc-600 ml-2">({published.publish_count} published this month)</span>}
                </div>
              )}
              <a href="/console/products" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                View in Products
              </a>
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
            <button onClick={async () => { if (!storeUuid) return; setSyncing(true); setSyncResult(null); try { const r = await fetch("/api/printful/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: storeUuid }) }); const d = await r.json(); setSyncResult(r.ok ? `Imported ${d.imported}` : d.error); } catch { setSyncResult("Failed"); } finally { setSyncing(false); } }} disabled={syncing} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-indigo-500 disabled:opacity-50 transition">{syncing ? "Importing..." : "Import Products"}</button>
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

      {/* SESSION HISTORY */}
      {sessionHistory.length > 0 && (
        <details className="rounded-xl border border-zinc-800 bg-zinc-900/50 mb-3" open={showHistory} onToggle={e => setShowHistory((e.target as HTMLDetailsElement).open)}>
          <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none hover:bg-zinc-800/50 transition">
            <span className="text-xs font-semibold text-zinc-400">This Session ({sessionHistory.length} generation{sessionHistory.length !== 1 ? "s" : ""})</span>
            <svg className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${showHistory ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="px-3 pb-3 space-y-3">
            {sessionHistory.map((gen, gi) => (
              <div key={gen.timestamp} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-2">
                <p className="text-[10px] text-zinc-500 mb-1.5 truncate">#{gi + 1}: &quot;{gen.prompt.slice(0, 50)}{gen.prompt.length > 50 ? "..." : ""}&quot;</p>
                <div className="grid grid-cols-4 gap-1">
                  {gen.variants.map((url, vi) => (
                    <button key={vi} onClick={() => { if (!designVariants.includes(url)) setDesignVariants(prev => [...prev, url]); setDesignUrl(url); }} className="rounded overflow-hidden border border-zinc-700 hover:border-purple-500 transition">
                      <img src={url} alt={`Gen ${gi + 1} v${vi + 1}`} className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Link to Products page */}
      <a href="/console/products" className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400 hover:border-indigo-500 hover:text-white transition mb-3">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        View Your Products
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
      </a>

      {/* DESIGN CHAT — Floating button + drawer */}
      <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-500 hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-end" onClick={() => setChatOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full sm:w-96 sm:mr-6 sm:mb-0 bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[600px]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                Design Assistant
              </h3>
              <button onClick={() => setChatOpen(false)} className="text-zinc-500 hover:text-white"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-500 mb-3">Ask me anything about designing merch.</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {["What makes a good hoodie design?", "Suggest a prompt for streetwear", "Help me improve my design"].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }} className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] text-zinc-400 hover:border-purple-500 hover:text-purple-300 transition">{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${msg.role === "user" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
                    {msg.content.split(/\*\*(.+?)\*\*/g).map((part, pi) =>
                      pi % 2 === 1 ? (
                        <span key={pi}>
                          <strong className="text-purple-300">{part}</strong>
                          <button onClick={() => { setPrompt(part); setChatOpen(false); setStatus("Prompt loaded from Design Assistant"); }} className="ml-1.5 text-[10px] text-purple-400 hover:text-purple-200 underline">Use</button>
                        </span>
                      ) : <span key={pi}>{part}</span>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start"><div className="bg-zinc-800 rounded-2xl px-4 py-2 text-sm text-zinc-500 flex items-center gap-2"><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Thinking...</div></div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChatSend()} placeholder="Ask about design, prompts, products..." className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none" />
                <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} className="rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-500 disabled:opacity-50 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PlatformAiGate>
    </TrialGate>
  );
}
