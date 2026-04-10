"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface XArticle {
  id: string;
  title: string;
  intro: string;
  x_url: string;
  image_url: string | null;
  date: string;
  likes: number;
  retweets: number;
  views: number;
}

export default function XArticlesPage() {
  const { storeSlug, hasStore } = useConsole();
  const [articles, setArticles] = useState<XArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/articles")
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Import failed");
        return;
      }
      setArticles(data.articles ?? []);
      setMessage(`Found ${data.imported} articles, ${data.new} new`);
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage("Import failed");
    } finally {
      setImporting(false);
    }
  }, []);

  const removeArticle = useCallback(async (id: string) => {
    const updated = articles.filter((a) => a.id !== id);
    setArticles(updated);
    await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", articles: updated }),
    });
  }, [articles]);

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to import X Articles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">X Articles</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Import your X Articles (long-form posts). They&apos;ll display on your public Articles page and in the wireframe block.
          </p>
        </div>
        {message && (
          <span className="text-sm text-indigo-400 font-medium">{message}</span>
        )}
      </div>

      {/* Import button */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-300">Import X Articles</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pulls your long-form posts (&gt;280 chars) directly from X API
            </p>
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {importing ? "Importing..." : "Import Articles"}
          </button>
        </div>
      </div>

      {/* Articles list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : articles.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="mt-3 text-zinc-500">No articles yet. Click &ldquo;Import Articles&rdquo; to pull your long-form X posts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden group"
            >
              <div className="flex gap-4 p-4">
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt=""
                    className="h-20 w-28 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-sm line-clamp-1">{article.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{article.intro}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                    {article.date && (
                      <span>{new Date(article.date).toLocaleDateString()}</span>
                    )}
                    {article.likes > 0 && <span>{article.likes} likes</span>}
                    {article.views > 0 && (
                      <span>{article.views >= 1000 ? `${(article.views / 1000).toFixed(1)}K` : article.views} views</span>
                    )}
                    <a
                      href={article.x_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      Read on X
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => removeArticle(article.id)}
                  className="shrink-0 self-start rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-zinc-600 text-center pt-2">
            {articles.length} article{articles.length !== 1 ? "s" : ""} &middot; Shows in your store&apos;s X Articles wireframe block
          </p>
        </div>
      )}
    </div>
  );
}
