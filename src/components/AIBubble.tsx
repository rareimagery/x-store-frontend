'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AIBubbleProps = {
  handle: string;
  drupalContext: unknown;
  onSuggestion: (css: string, components: string[]) => void;
};

const PROMPT_LIBRARY = [
  { category: 'Hero',        text: 'Create a bold hero with my X PFP, bio, latest Grok video, and big $4 X Money subscribe button' },
  { category: 'Videos',      text: 'Build a full-screen AI Video Store grid using all my Grok videos from Drupal with buy-now overlays' },
  { category: 'Subscribers', text: 'Make an exclusive subscriber membership area showing live subscriber count and $4/month X Money CTA' },
  { category: 'Products',    text: 'Add a modern product showcase with my Drupal products and X Money checkout buttons' },
  { category: 'Retro',       text: 'Turn this into Retro MySpace style with marquee latest X posts and subscriber guestbook' },
  { category: 'Feed',        text: 'Create a Latest X Posts feed that links each post to a product or $4 subscription' },
  { category: 'Proof',       text: "Add social proof section with subscriber testimonials and 'Join 247 others for $4/month'" },
  { category: 'Quick',       text: 'One-click: give me a floating $4 X Money subscribe orb that follows scroll' },
];

export function AIBubble({ handle, drupalContext, onSuggestion }: AIBubbleProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendToGrok = async () => {
    if (!prompt.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/ai-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, handle, drupalContext }),
      });

      if (!res.ok) {
        const msg = res.status === 429 ? 'Rate limit reached — try again in an hour.' : `Request failed (${res.status})`;
        throw new Error(msg);
      }

      const json = (await res.json()) as {
        tailwindCode?: string;
        componentsToAdd?: string[];
      };

      onSuggestion(json.tailwindCode ?? '', json.componentsToAdd ?? []);
      setOpen(false);
      setPrompt('');
    } catch (err) {
      console.error('AIBubble request failed:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating orb */}
      <div
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 z-50 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-[#1DA1F2] shadow-2xl transition-all hover:scale-110"
        role="button"
        aria-label="Open AI Studio"
      >
        <span className="text-3xl">🫧</span>
      </div>

      {open && (
        <div className="fixed bottom-24 right-8 z-50 w-96 overflow-hidden rounded-3xl border border-[#1DA1F2] bg-zinc-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-black p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="text-[#1DA1F2]" size={18} />
              <div>
                <div className="font-bold text-white">Grok AI Builder</div>
                <div className="text-xs text-green-400">Uses your Drupal context + layout hints</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Close AI Studio"
            >
              <X size={16} />
            </button>
          </div>

          {/* Prompt library */}
          <div className="max-h-72 overflow-auto p-4">
            <p className="mb-3 text-xs text-zinc-400">Tap any idea to load it:</p>
            {PROMPT_LIBRARY.map((p) => (
              <button
                key={p.category}
                type="button"
                onClick={() => setPrompt(p.text)}
                className="mb-2 w-full rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-zinc-800"
              >
                <span className="font-mono text-[#1DA1F2] mr-2">→</span>
                <span className="font-semibold text-zinc-200">{p.category}:</span>{' '}
                <span className="text-zinc-400">{p.text.slice(0, 55)}…</span>
              </button>
            ))}
          </div>

          {/* Input + action */}
          <div className="border-t bg-zinc-950 p-4">
            {error && (
              <p className="mb-3 rounded-lg bg-red-900/30 border border-red-700 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendToGrok(); } }}
              placeholder="Or type your own idea…"
              className="w-full rounded-2xl bg-zinc-800 p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#1DA1F2]"
            />
            <Button
              onClick={() => void sendToGrok()}
              disabled={loading || !prompt.trim()}
              className="mt-4 w-full bg-[#1DA1F2] font-bold text-black hover:bg-[#1A8CD8] disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate & Inject into Preview →'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
