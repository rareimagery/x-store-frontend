"use client";

import { useCallback, useEffect, useState } from "react";

interface InviteCode {
  id: number;
  code: string;
  x_username: string | null;
  email: string | null;
  used: boolean;
  used_by: string | null;
  created: string;
  used_at: string | null;
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [xUsername, setXUsername] = useState("");
  const [email, setEmail] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/invite/admin");
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const generateCode = useCallback(async () => {
    setGenerating(true);
    setLastGenerated(null);
    try {
      const res = await fetch("/api/invite/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_username: xUsername.trim().replace(/^@/, "") || undefined,
          email: email.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastGenerated(data.code);
        setXUsername("");
        setEmail("");
        loadCodes();
      }
    } catch {} finally {
      setGenerating(false);
    }
  }, [xUsername, email, loadCodes]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const unused = codes.filter((c) => !c.used);
  const used = codes.filter((c) => c.used);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Invite Codes</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Generate invite codes for X subscribers. Each code is single-use.
        </p>
      </div>

      {/* Generate */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Generate new code</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={xUsername}
            onChange={(e) => setXUsername(e.target.value)}
            placeholder="@username (optional)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email (optional)"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={generateCode}
            disabled={generating}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition shrink-0"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>

        {lastGenerated && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-800 bg-green-950/30 p-3">
            <code className="text-lg font-mono font-bold text-green-400 tracking-wider">{lastGenerated}</code>
            <button
              onClick={() => copyCode(lastGenerated)}
              className="rounded bg-green-800/50 px-2 py-1 text-xs text-green-300 hover:bg-green-700/50 transition"
            >
              {copied === lastGenerated ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{codes.length}</p>
          <p className="text-xs text-zinc-500">Total codes</p>
        </div>
        <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{unused.length}</p>
          <p className="text-xs text-zinc-500">Available</p>
        </div>
        <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-zinc-400">{used.length}</p>
          <p className="text-xs text-zinc-500">Used</p>
        </div>
      </div>

      {/* Code list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : codes.length === 0 ? (
        <p className="text-center text-zinc-500 py-8">No invite codes yet. Generate one above.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                c.used
                  ? "border-zinc-800/50 bg-zinc-900/30 opacity-60"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }`}
            >
              <code className={`font-mono text-sm font-semibold tracking-wider ${c.used ? "text-zinc-600" : "text-indigo-400"}`}>
                {c.code}
              </code>

              {c.x_username && (
                <span className="text-xs text-zinc-500">@{c.x_username}</span>
              )}

              <div className="flex-1" />

              {c.used ? (
                <span className="text-[10px] text-zinc-600">
                  Used{c.used_by ? ` by @${c.used_by}` : ""}{c.used_at ? ` on ${c.used_at}` : ""}
                </span>
              ) : (
                <>
                  <span className="text-[10px] text-zinc-600">{c.created}</span>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
                  >
                    {copied === c.code ? "Copied!" : "Copy"}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
