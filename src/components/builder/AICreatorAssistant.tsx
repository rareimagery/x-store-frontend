"use client";

import { useState } from "react";

interface AICreatorAssistantProps {
  theme: string;
  contextPrompt: string;
  onApplySuggestion: (suggestion: string) => void;
  mode?: "floating" | "sidebar";
}

export default function AICreatorAssistant({
  theme,
  contextPrompt,
  onApplySuggestion,
  mode = "floating",
}: AICreatorAssistantProps) {
  const [open, setOpen] = useState(mode === "sidebar");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const askAssistant = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    const prompt = [
      "You are a concise storefront UI coach for creators using RareImagery.",
      `Current theme: ${theme}.`,
      "Give practical, specific recommendations in plain text.",
      "If useful, include one improved prompt the creator can paste into the builder.",
      `Current builder prompt context: ${contextPrompt || "none"}`,
      `Creator question: ${question}`,
    ].join("\n\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, theme }),
      });

      if (!res.ok || !res.body) {
        setAnswer("I could not generate guidance right now. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAnswer(accumulated);
      }
    } catch {
      setAnswer("I could not generate guidance right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "floating" && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 rounded-full border border-indigo-500/50 bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-indigo-500 lg:bottom-6 lg:right-6"
      >
        AI Builder Help
      </button>
    );
  }

  return (
    <div
      className={
        mode === "sidebar"
          ? "h-full w-full rounded-xl border border-zinc-800 bg-zinc-900/90 p-4"
          : "fixed bottom-20 right-4 z-30 w-[min(92vw,360px)] rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 shadow-2xl lg:bottom-6 lg:right-6"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-100">AI Creator Assistant</p>
        {mode === "floating" ? (
          <button
            onClick={() => setOpen(false)}
            className="rounded px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            Close
          </button>
        ) : null}
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask for layout, copy, sections, conversion ideas..."
        className="h-24 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
      />

      <div className="mt-2 flex gap-2">
        <button
          onClick={askAssistant}
          disabled={loading || !question.trim()}
          className="min-h-9 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Get AI Help"}
        </button>
        {answer && (
          <button
            onClick={() => onApplySuggestion(answer)}
            className="min-h-9 rounded-md border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-400"
          >
            Use As Prompt
          </button>
        )}
      </div>

      {answer && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-300 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  );
}
