"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ChatInput from "@/components/chatbot/ChatInput";
import ChatMessage, { type ChatMsg } from "@/components/chatbot/ChatMessage";
import { useConsole } from "@/components/ConsoleContext";
import { getStoreUrl } from "@/lib/store-url";

// -------------------------------------------------------------------
// Subculture presets (Sprint 2)
// -------------------------------------------------------------------
const PRESETS = [
  { label: "Emo", prompt: "Build me an emo / dark alt storefront with my products featured above the fold" },
  { label: "Y2K", prompt: "Build me a Y2K / scene-core nostalgic storefront featuring my top products" },
  { label: "Cottagecore", prompt: "Build me a soft cottagecore storefront with warm tones and my products" },
  { label: "Neon", prompt: "Build me a neon cyberpunk storefront with glowing accents and my products" },
  { label: "Hip-Hop", prompt: "Build me a clean hip-hop / streetwear storefront showcasing my products" },
  { label: "Minimal", prompt: "Build me a minimal whitespace-forward storefront that spotlights my products" },
];

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function extractCode(raw: string): { text: string; code?: string } {
  // Strips fenced code blocks (```jsx or ```tsx) and returns explanation + code
  const match = raw.match(/```(?:jsx?|tsx?|javascript|typescript)?\n([\s\S]*?)```/);
  if (match) {
    const code = match[1].trim();
    const text = raw.replace(/```(?:jsx?|tsx?|javascript|typescript)?\n[\s\S]*?```/, "").trim();
    return { text, code };
  }
  // Heuristic: if the raw contains a function/export keyword assume it's all code
  if (raw.includes("export default") || raw.startsWith("function ")) {
    return { text: "", code: raw.trim() };
  }
  return { text: raw };
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
export default function SellerChatbot() {
  const { xUsername, currentTheme, storeSlug } = useConsole();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [appliedToast, setAppliedToast] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, open]);

  // Escape key closes window (Sprint 3)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Cmd/Ctrl+S saves current generation (Sprint 3)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && currentCode) {
        e.preventDefault();
        void handleApply();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentCode]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (streaming) return;
      setRateLimitMsg(null);

      const userMsg: ChatMsg = { id: uid(), role: "user", text: userText };
      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);
      setStreamingText("");
      setCurrentCode(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: userText,
            theme: currentTheme ?? "xai3",
            creatorContext: xUsername
              ? {
                  username: xUsername,
                  storeSlug: storeSlug ?? xUsername,
                }
              : undefined,
          }),
        });

        if (res.status === 429) {
          setRateLimitMsg("Rate limit reached — try again in an hour.");
          setStreaming(false);
          return;
        }

        if (!res.ok || !res.body) {
          throw new Error(`API error ${res.status}`);
        }

        // Stream the response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setStreamingText(accumulated);
        }

        // Parse code vs text
        const { text, code } = extractCode(accumulated);
        const assistantMsg: ChatMsg = {
          id: uid(),
          role: "assistant",
          text,
          code,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setCurrentCode(code ?? null);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        console.error("[SellerChatbot] stream error:", err);
        const errMsg: ChatMsg = {
          id: uid(),
          role: "assistant",
          text: "Something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setStreaming(false);
        setStreamingText("");
        abortRef.current = null;
      }
    },
    [streaming, currentTheme, xUsername, storeSlug]
  );

  // Sprint 2 — Apply to storefront
  const handleApply = useCallback(async () => {
    if (!currentCode) return;
    const label =
      messages.find((m) => m.role === "user")?.text.slice(0, 50) ?? "Chatbot build";
    try {
      await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: storeSlug ?? xUsername ?? "store",
          label: `Chatbot: ${label}`,
          code: currentCode,
          published: true,
        }),
      });
      setAppliedToast(true);
      setTimeout(() => setAppliedToast(false), 3000);
    } catch (err) {
      console.error("[SellerChatbot] apply error:", err);
    }
  }, [currentCode, messages, storeSlug, xUsername]);

  // Sprint 2 — Post to X
  const handlePostToX = useCallback(() => {
    const url = getStoreUrl(storeSlug ?? xUsername ?? "");
    const text = `Check out my new storefront! ${url}`;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  }, [storeSlug, xUsername]);

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setMessages((prev) => prev.slice(0, -1)); // remove last assistant error
      void sendMessage(lastUser.text);
    }
  }, [messages, sendMessage]);

  // ----------------------------------------------------------------
  // Floating bubble (collapsed)
  // ----------------------------------------------------------------
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition lg:bottom-6 lg:right-6"
        aria-label="Open AI storefront builder"
        title="AI Storefront Builder"
      >
        {/* Chat bubble icon */}
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  // ----------------------------------------------------------------
  // Last message error check
  // ----------------------------------------------------------------
  const lastMsg = messages[messages.length - 1];
  const lastWasError =
    lastMsg?.role === "assistant" &&
    lastMsg.text === "Something went wrong. Please try again.";

  // ----------------------------------------------------------------
  // Expanded chat window
  // Sprint 3: full-screen on mobile (<640px), fixed panel on desktop
  // ----------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-zinc-950 sm:inset-auto sm:bottom-20 sm:right-4 sm:h-[600px] sm:w-[400px] sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl lg:bottom-6 lg:right-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900 sm:rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-sm font-semibold text-zinc-100">AI Storefront Builder</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-400 hover:text-zinc-100 transition"
          aria-label="Close chatbot"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="rounded-full bg-indigo-500/10 p-4">
              <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">What should your storefront say?</p>
              <p className="text-xs text-zinc-500 mt-1">Describe a section and I&rsquo;ll generate it live.</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {/* Streaming typing indicator */}
        {streaming && (
          <div className="flex flex-col gap-2">
            {streamingText ? (
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 whitespace-pre-wrap break-words opacity-80">
                {streamingText}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-4 py-3 max-w-[90%] rounded-2xl rounded-bl-sm bg-zinc-800">
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>
        )}

        {/* Rate limit message */}
        {rateLimitMsg && (
          <div className="rounded-xl bg-amber-900/30 border border-amber-700 px-4 py-3 text-sm text-amber-300">
            {rateLimitMsg}
          </div>
        )}

        {/* Retry button on error */}
        {lastWasError && !streaming && (
          <button
            onClick={handleRetry}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition underline"
          >
            Try again
          </button>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Action buttons when generation is ready (Sprint 2) */}
      {currentCode && !streaming && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800 bg-zinc-900">
          <button
            onClick={handleApply}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition"
          >
            {appliedToast ? "✓ Applied!" : "Apply to Storefront"}
          </button>
          <button
            onClick={handlePostToX}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.734-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post
          </button>
        </div>
      )}

      {/* Subculture presets (Sprint 2) */}
      <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => sendMessage(p.prompt)}
            disabled={streaming}
            className="shrink-0 rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:border-indigo-500 hover:text-indigo-300 disabled:opacity-40 transition whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input (Sprint 3 keyboard shortcuts in ChatInput) */}
      <ChatInput
        onSend={sendMessage}
        disabled={streaming}
        placeholder={`Describe a ${currentTheme ?? "xai3"} storefront section…`}
      />
    </div>
  );
}
