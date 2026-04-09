"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import { getStorePageUrl } from "@/lib/store-url";

interface StoreProduct { id: string; title: string; price: string; image_url: string | null; description: string; sku: string; }

const PRODUCT_TYPES = [
  { value: "t_shirt", label: "T-Shirt", emoji: "👕" },
  { value: "hoodie", label: "Hoodie", emoji: "🧥" },
  { value: "ballcap", label: "Ballcap", emoji: "🧢" },
  { value: "digital_drop", label: "Digital Drop", emoji: "⚡" },
];

type ChatMsg = { role: "user" | "assistant" | "system"; content: string; images?: string[] };

export default function DesignStudioPage() {
  const { storeSlug, hasStore } = useConsole();

  // Core
  const [prompt, setPrompt] = useState("");
  const [productType, setProductType] = useState("t_shirt");
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refDataUrl, setRefDataUrl] = useState<string | null>(null);
  const [referenceMode, setReferenceMode] = useState<"exact" | "creative" | "composite">("exact");
  const [aiProvider, setAiProvider] = useState<"auto" | "ideogram" | "flux" | "grok">("auto");
  const [generating, setGenerating] = useState(false);
  const [designVariants, setDesignVariants] = useState<string[]>([]);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Publish
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ product_type: string; mockup_url: string | null; retail_price: string; printful_synced: boolean } | null>(null);

  // Printful
  const [printfulKey, setPrintfulKey] = useState("");
  const [printfulConnected, setPrintfulConnected] = useState<string | null>(null);
  const [storeUuid, setStoreUuid] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Products
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Action states
  const [xLooking, setXLooking] = useState(false);
  const [importingPost, setImportingPost] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatSending]);

  useEffect(() => {
    if (!hasStore) return;
    fetch(`/api/printful/status?slug=${encodeURIComponent(storeSlug || "")}`)
      .then(r => r.json()).then(d => { if (d.store_uuid) setStoreUuid(d.store_uuid); if (d.connected) setPrintfulConnected(d.printful_store_id ? `Store #${d.printful_store_id}` : "Connected"); }).catch(() => {});
    fetch(`/api/stores/products?slug=${encodeURIComponent(storeSlug || "")}`)
      .then(r => r.json()).then(d => { const p = d.products ?? d ?? []; setStoreProducts(Array.isArray(p) ? p : []); }).catch(() => {}).finally(() => setLoadingProducts(false));
  }, [hasStore, storeSlug]);

  const buildContext = () => {
    const parts: string[] = [];
    parts.push(`Product: ${PRODUCT_TYPES.find(t => t.value === productType)?.label || "T-Shirt"}`);
    parts.push(`Reference mode: ${referenceMode}`);
    if (prompt) parts.push(`Current prompt: "${prompt}"`);
    if (refPreview) parts.push("Reference image attached");
    if (designVariants.length > 0) parts.push(`${designVariants.length} variants generated`);
    if (designUrl) parts.push("User has selected a variant");
    if (published) parts.push("Design published to store");
    return parts.join(". ");
  };

  const addSystemMsg = (text: string, images?: string[]) => {
    setMessages(prev => [...prev, { role: "system", content: text, images }]);
  };

  // --- Chat ---
  const handleChatSend = async (overrideMsg?: string) => {
    const msg = (overrideMsg || chatInput).trim();
    if (!msg || chatSending) return;
    if (!overrideMsg) setChatInput("");

    // Check for natural language commands
    const lowerMsg = msg.toLowerCase();
    if ((lowerMsg.includes("generate") || lowerMsg.includes("create") || lowerMsg.includes("make")) && (lowerMsg.includes("variant") || lowerMsg.includes("design") || prompt)) {
      if (!prompt && !refDataUrl && !refPreview) {
        setPrompt(msg);
      }
      addSystemMsg(`${msg}`, undefined);
      handleGenerate();
      return;
    }
    if (lowerMsg.includes("more vibrant") || lowerMsg.includes("more bold") || lowerMsg.includes("more colorful") || lowerMsg.includes("try again") || lowerMsg.includes("iterate") || lowerMsg.includes("refine")) {
      // Iteration: append to prompt and re-generate with selected variant as reference
      const iterationPrompt = `${prompt}. ${msg}`;
      setPrompt(iterationPrompt);
      if (designUrl) { setRefPreview(designUrl); setRefDataUrl(null); setReferenceMode("creative"); }
      addSystemMsg(`Iterating: "${msg}"...`);
      setTimeout(() => handleGenerate(), 100);
      return;
    }

    const userMsg: ChatMsg = { role: "user", content: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatSending(true);
    try {
      const res = await fetch("/api/design-studio/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
          productType,
          context: buildContext(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {} finally { setChatSending(false); }
  };

  const applySuggestion = (text: string) => {
    const match = text.match(/\*\*(.+?)\*\*/);
    if (match) setPrompt(match[1]);
  };

  // --- Actions (always visible, not tied to chat input) ---
  const handleFileSelect = (file: File) => {
    if (file.size > 4 * 1024 * 1024) { setError("Max 4MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("JPEG, PNG, or WebP only"); return; }
    setError(null);
    setRefPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setRefDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    addSystemMsg("Reference image uploaded");
  };

  const handleXProfile = async () => {
    const handle = (chatInput || prompt).trim().replace(/^@/, "");
    if (!handle) { setError("Type a @username first"); return; }
    setChatInput("");
    setXLooking(true);
    addSystemMsg(`Looking up @${handle}...`);
    try {
      const res = await fetch(`/api/x-lookup?username=${encodeURIComponent(handle)}`);
      if (!res.ok) { addSystemMsg(`@${handle} not found`); return; }
      const profile = await res.json();
      const pl = PRODUCT_TYPES.find(t => t.value === productType)?.label || "T-Shirt";
      const bio = (profile.bio || "").slice(0, 100);
      setPrompt(`Premium ${pl} design inspired by @${handle}. Theme: ${bio}. Print-ready, centered, vibrant, high contrast.`);
      setTitle(`@${handle} ${pl}`);
      if (profile.profile_image_url) { setRefPreview(profile.profile_image_url); setRefDataUrl(null); }
      addSystemMsg(`Loaded @${handle} — prompt + PFP ready. Hit Generate or refine the prompt.`);
    } catch { addSystemMsg("X lookup failed"); } finally { setXLooking(false); }
  };

  const handleImportPost = async () => {
    const url = (chatInput || "").trim();
    const match = url.match(/(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/);
    if (!match) { setError("Paste an X post URL"); return; }
    setChatInput("");
    setImportingPost(true);
    addSystemMsg("Importing post...");
    try {
      const res = await fetch("/api/design-studio/import-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_url: url }) });
      if (res.ok) {
        const data = await res.json();
        if (data.text) setPrompt(data.text);
        if (data.image_url) { setRefPreview(data.image_url); setRefDataUrl(null); }
        if (data.title) setTitle(data.title);
        addSystemMsg("Post imported — text + image loaded.");
      } else { addSystemMsg("Failed to import post"); }
    } catch { addSystemMsg("Import failed"); } finally { setImportingPost(false); }
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    addSystemMsg("Enhancing prompt...");
    try {
      const res = await fetch("/api/design-studio/enhance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), product_type: productType }) });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) { setPrompt(data.enhanced); addSystemMsg("Prompt enhanced."); }
        if (data.description && !description) setDescription(data.description);
      }
    } catch {} finally { setEnhancing(false); }
  };

  // --- Generate ---
  const handleGenerate = async () => {
    if (!prompt.trim() && !refDataUrl && !refPreview) return;
    setGenerating(true);
    setDesignUrl(null);
    setDesignVariants([]);
    setError(null);
    setPublished(null);
    const pl = PRODUCT_TYPES.find(t => t.value === productType)?.label;

    // Composite mode: generate 4 style variants using exact image + text
    if (referenceMode === "composite" && (refDataUrl || refPreview)) {
      addSystemMsg(`Creating 4 style variants of your image with text (${pl})...`);
      try {
        // Parse top/bottom text from prompt
        let topText = "";
        let bottomText = "";
        const p = prompt.trim();
        const topMatch = p.match(/['""']([^'""']+)['""']?\s*(?:on top|above|at the top)/i);
        const bottomMatch = p.match(/['""']([^'""']+)['""']?\s*(?:below|at the bottom|underneath)/i);
        if (topMatch) topText = topMatch[1];
        if (bottomMatch) bottomText = bottomMatch[1];
        if (!topText && !bottomText) {
          const parts = p.split(/\s+and\s+/i);
          if (parts.length >= 2) { topText = parts[0].replace(/^add\s+/i, "").replace(/['"]/g, ""); bottomText = parts[1].replace(/['"]/g, ""); }
          else { bottomText = p.replace(/^add\s+/i, "").replace(/use.*image.*?(?:and|,)\s*/i, "").replace(/['"]/g, ""); }
        }

        // Generate 4 different style variants in parallel
        const styleVariants = ["bold", "neon", "streetwear", "vintage"];
        const results = await Promise.all(
          styleVariants.map(style =>
            fetch("/api/design-studio/composite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: refDataUrl || refPreview,
                top_text: topText || undefined,
                bottom_text: bottomText || undefined,
                style,
                product_type: productType,
              }),
            }).then(r => r.json()).catch(() => null)
          )
        );

        const urls = results.filter(r => r?.success).map(r => r.image_url);
        if (urls.length === 0) { setError("Composite failed"); addSystemMsg("All variants failed"); return; }
        setDesignVariants(urls);
        setDesignUrl(urls[0]);
        if (!title) setTitle(`${(topText || bottomText).slice(0, 30)} ${pl || ""}`);
        addSystemMsg(`${urls.length} style variants ready! Bold, Neon, Streetwear, Vintage.`, urls);
        const now = new Date();
        for (let vi = 0; vi < urls.length; vi++) {
          fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: { id: `comp_${Date.now()}_${vi}`, url: urls[vi], prompt: p, name: `${(topText || bottomText).slice(0, 20)} ${styleVariants[vi]} — ${now.getMonth() + 1}/${now.getDate()}`, type: "image", created_at: now.toISOString(), product_type: productType, folder: pl || "Unsorted", saved: false } }) }).catch(() => {});
        }
      } catch (err: any) { setError(err.message || "Composite failed"); } finally { setGenerating(false); }
      return;
    }

    // AI generation mode (exact or creative)
    addSystemMsg(`Generating ${pl} variants (${referenceMode} mode)...`);
    try {
      const res = await fetch("/api/design-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || "create a design from this image", product_type: productType, reference_image: refDataUrl || refPreview || undefined, reference_mode: referenceMode, provider: aiProvider, variants: 4 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Generation failed"); addSystemMsg(data.error || "Generation failed"); return; }
      const urls: string[] = data.image_urls || [data.image_url];
      setDesignVariants(urls);
      setDesignUrl(urls[0]);
      if (!title) setTitle(`${prompt.trim().slice(0, 40)} ${pl || ""}`);
      addSystemMsg(`${urls.length} variants ready! Pick a favorite. Say "make it more vibrant" to iterate.`, urls);
      const now = new Date();
      const dateTag = `${now.getMonth() + 1}/${now.getDate()}`;
      const short = prompt.trim().slice(0, 30).replace(/\s+/g, " ").trim();
      for (let vi = 0; vi < urls.length; vi++) {
        fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", item: { id: `grok_${Date.now()}_${vi}`, url: urls[vi], prompt: prompt.trim(), name: `${short}${urls.length > 1 ? ` v${vi + 1}` : ""} — ${dateTag}`, type: "image", created_at: now.toISOString(), product_type: productType, folder: pl || "Unsorted", saved: false } }) }).catch(() => {});
      }
    } catch (err: any) { setError(err.message || "Something went wrong"); } finally { setGenerating(false); }
  };

  // --- Publish ---
  const handlePublish = async () => {
    if (!designUrl || !title.trim()) return;
    setPublishing(true); setError(null);
    try {
      const res = await fetch("/api/design-studio/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: designUrl, product_type: productType, title: title.trim(), description: description.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Publish failed"); return; }
      setPublished({ product_type: data.product_type, mockup_url: data.mockup_url, retail_price: data.retail_price, printful_synced: !!data.printful_product_id });
      addSystemMsg(`"${title}" published!${data.printful_product_id ? " Synced to Printful." : ""}`);
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

  const resetDesign = () => { setDesignUrl(null); setDesignVariants([]); setTitle(""); setDescription(""); setPublished(null); setPrompt(""); setRefPreview(null); setRefDataUrl(null); setReferenceMode("exact"); };

  if (!hasStore || !storeSlug) {
    return <div className="flex items-center justify-center py-20"><div className="text-center"><h2 className="text-xl font-bold text-white mb-2">No Store Found</h2><p className="text-sm text-zinc-500">Create a store first.</p></div></div>;
  }

  const selectedProduct = PRODUCT_TYPES.find(t => t.value === productType);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Grok Creator Studio</h1>
      <p className="text-sm text-zinc-400 mb-4">Chat with Grok to design merch. Generate. Iterate. Publish.</p>

      {/* === CHAT === */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-4">
        <div className="h-80 overflow-y-auto px-4 py-3 space-y-2.5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="h-8 w-8 text-purple-500/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              <p className="text-xs text-zinc-500 mb-3">Describe what you want, or use the tools below</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {["Design a hoodie with my brand logo", "Create merch from my X profile", "Suggest trending designs"].map(q => (
                  <button key={q} onClick={() => handleChatSend(q)} className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white transition">{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user" ? "bg-indigo-600/30 text-indigo-100"
                : msg.role === "system" ? "bg-zinc-800/50 text-zinc-500 italic"
                : "bg-zinc-800 text-zinc-300"
              }`}>
                {msg.role === "assistant" ? (
                  <div>
                    <p className="whitespace-pre-wrap">{msg.content.replace(/\*\*(.+?)\*\*/g, "\u2192 $1")}</p>
                    {msg.content.includes("**") && (
                      <button onClick={() => applySuggestion(msg.content)} className="mt-1.5 flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300 hover:bg-purple-500/20 transition">Use this prompt</button>
                    )}
                  </div>
                ) : <p>{msg.content}</p>}
                {/* Inline generated images in chat */}
                {msg.images && msg.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {msg.images.map((url, j) => (
                      <button key={j} onClick={() => { setDesignUrl(url); setDesignVariants(msg.images!); }} className={`rounded-lg overflow-hidden border-2 transition ${designUrl === url ? "border-purple-500" : "border-zinc-700 hover:border-zinc-500"}`}>
                        <img src={url} alt={`v${j + 1}`} className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatSending && (
            <div className="flex justify-start"><div className="rounded-xl bg-zinc-800 px-3 py-2"><div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" /><div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} /><div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} /></div></div></div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* State bar */}
        {(prompt || refPreview) && (
          <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-3 bg-zinc-900/80">
            {refPreview && <img src={refPreview} alt="ref" className="h-8 w-8 rounded object-cover" />}
            {prompt && <p className="text-[10px] text-zinc-500 flex-1 line-clamp-1">{prompt}</p>}
            <button onClick={() => { setPrompt(""); setRefPreview(null); setRefDataUrl(null); }} className="text-[10px] text-zinc-600 hover:text-red-400">Clear</button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-zinc-800 px-3 py-2.5">
          <div className="flex gap-2 mb-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }} placeholder="Describe your design or give feedback..." className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none" />
            <button onClick={() => handleChatSend()} disabled={chatSending || !chatInput.trim()} className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          </div>

          {/* Tools row — always visible */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={handleXProfile} disabled={xLooking} className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white disabled:opacity-50 transition flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              {xLooking ? "Loading..." : "From @profile"}
            </button>
            <button onClick={handleImportPost} disabled={importingPost} className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white disabled:opacity-50 transition flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.686-3.748a4.5 4.5 0 00-6.364-6.364L4.5 6.75" /></svg>
              {importingPost ? "Importing..." : "From X post"}
            </button>
            <label className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white transition flex items-center gap-1 cursor-pointer">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              Upload
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </label>
            <button onClick={handleEnhance} disabled={enhancing || !prompt.trim()} className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] text-zinc-400 hover:border-purple-500 hover:text-white disabled:opacity-50 transition flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              {enhancing ? "..." : "Enhance"}
            </button>

            {/* Product type + reference mode — right side */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1">
                {PRODUCT_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => setProductType(pt.value)} className={`rounded-full px-2 py-0.5 text-[10px] transition ${productType === pt.value ? "bg-purple-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`} title={pt.label}>{pt.emoji}</button>
                ))}
              </div>
              <button onClick={() => setReferenceMode("composite")} className={`rounded-full px-2 py-0.5 text-[10px] border transition ${referenceMode === "composite" ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : "border-zinc-700 text-zinc-600"}`} title="Your exact image + text overlay (no AI)">
                Exact+Text
              </button>
              {(["auto", "ideogram", "flux", "grok"] as const).map(p => (
                <button key={p} onClick={() => { setAiProvider(p); if (referenceMode === "composite") setReferenceMode("exact"); }} className={`rounded-full px-2 py-0.5 text-[10px] border transition ${
                  referenceMode !== "composite" && aiProvider === p
                    ? p === "ideogram" ? "border-purple-500/50 text-purple-400 bg-purple-500/10"
                      : p === "flux" ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                      : p === "grok" ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                      : "border-white/30 text-white bg-white/10"
                    : "border-zinc-700 text-zinc-600"
                }`} title={
                  p === "auto" ? "Auto-pick best engine" :
                  p === "ideogram" ? "Ideogram v3: best text rendering" :
                  p === "flux" ? "Flux 2 Pro: photorealistic + artistic" :
                  "Grok Imagine: creative generation"
                }>
                  {p === "auto" ? "Auto" : p === "ideogram" ? "Ideogram" : p === "flux" ? "Flux" : "Grok"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate */}
      <button onClick={handleGenerate} disabled={generating || (!prompt.trim() && !refDataUrl && !refPreview)} className={`w-full rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed mb-4 ${referenceMode === "composite" ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700" : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700"}`}>
        {generating ? (
          <span className="flex items-center justify-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{referenceMode === "composite" ? "Compositing..." : "Generating..."}</span>
        ) : referenceMode === "composite" ? `Composite ${selectedProduct?.emoji} Image + Text` : `Generate ${selectedProduct?.emoji} ${selectedProduct?.label} via ${aiProvider === "ideogram" ? "Ideogram" : aiProvider === "flux" ? "Flux" : aiProvider === "grok" ? "Grok" : "AI"}`}
      </button>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400">{error}</div>}

      {/* === RESULTS (only if not shown inline in chat) === */}
      {designVariants.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-4">
          <div className="bg-zinc-800"><img src={designUrl!} alt="Design" className="w-full max-h-[400px] object-contain mx-auto" /></div>
          {!published ? (
            <div className="p-4 border-t border-zinc-800 space-y-2">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Product title..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={handlePublish} disabled={publishing || !title.trim()} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition">{publishing ? "Publishing..." : `Publish ${selectedProduct?.emoji} to Printful`}</button>
                <button onClick={resetDesign} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-white transition">Discard</button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-green-400 mb-2"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="font-semibold text-sm">Published!</span></div>
              <a href={`https://x.com/intent/tweet?${new URLSearchParams({ text: `Just dropped "${title}" on RareImagery!`, url: getStorePageUrl(storeSlug || "", "store") }).toString()}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>Share to X
              </a>
              <button onClick={resetDesign} className="mt-2 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition">Create Another</button>
            </div>
          )}
        </div>
      )}

      {/* === PRINTFUL === */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white">Printful</span>
          {printfulConnected && <span className="text-[10px] text-emerald-400">Connected</span>}
        </div>
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
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</span><div><p className="font-medium text-white">Printful Settings</p><p className="text-xs text-zinc-500"><a href="https://www.printful.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">printful.com/dashboard</a> &rarr; Settings</p></div></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</span><div><p className="font-medium text-white">API tab</p><p className="text-xs text-zinc-500"><a href="https://www.printful.com/dashboard/developer/api" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Settings &rarr; API</a></p></div></li>
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
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-xs font-semibold text-white mb-3">Your Products</h2>
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
