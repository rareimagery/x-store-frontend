"use client";

import { useState } from "react";

interface InviteGateProps {
  children: React.ReactNode;
}

export default function InviteGate({ children }: InviteGateProps) {
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check localStorage for previously verified code
  const [checked] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ri_invite_verified") === "true";
    }
    return false;
  });

  if (verified || checked) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/invite/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    if (res.ok) {
      setVerified(true);
      localStorage.setItem("ri_invite_verified", "true");
    } else {
      setError("Invalid invite code");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20">
            <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Invite Only</h2>
          <p className="mt-2 text-sm text-zinc-400">
            RareImagery is currently in early access. Enter your invite code to
            get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="RARE-XXXXXX"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            maxLength={11}
          />

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Enter"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600">
          Need an invite? Contact{" "}
          <a href="https://x.com/rareimagery" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
            @rareimagery
          </a>
        </p>
      </div>
    </div>
  );
}
