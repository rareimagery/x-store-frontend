"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_X_CLIENT_ID || "";

function CaptureTokenInner() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Step 2: Exchange code for token
  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch("/api/admin/exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setToken(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code, state]);

  // Step 1: Redirect to X OAuth
  const startAuth = () => {
    const redirectUri = `${window.location.origin}/admin/capture-token`;
    const oauthState = crypto.randomUUID();
    const codeChallenge = oauthState; // Simplified PKCE for one-time use
    sessionStorage.setItem("pkce_verifier", codeChallenge);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "tweet.read users.read follows.read dm.write dm.read offline.access",
      state: oauthState,
      code_challenge: codeChallenge,
      code_challenge_method: "plain",
    });

    window.location.href = `https://x.com/i/oauth2/authorize?${params}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Token Capture</h1>
          <p className="text-xs text-zinc-500 mt-1">
            One-time setup: Authorize @rareimagery for DM sending.
            Log in as @rareimagery and grant dm.write permission.
          </p>
        </div>

        {!code && !token && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-4">
              <p className="text-xs text-amber-300">
                Make sure you are logged into X as <strong>@rareimagery</strong> before clicking the button below.
                This will capture the OAuth refresh token needed for platform DM sending.
              </p>
            </div>
            <button
              onClick={startAuth}
              className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition"
            >
              Authorize @rareimagery for DM Sending
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-400">Exchanging code for token...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {token && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-700/50 bg-green-900/20 p-4">
              <p className="text-sm text-green-400 font-semibold mb-2">Token captured successfully!</p>
              <p className="text-xs text-zinc-400 mb-3">
                Copy the refresh token below and add it to <code>.env.production</code> on the VPS:
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Access Token</label>
              <textarea
                readOnly
                value={token.access_token || ""}
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-green-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Refresh Token (add to .env.production)</label>
              <textarea
                readOnly
                value={token.refresh_token || ""}
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-amber-400 font-mono"
              />
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
              <p className="text-xs text-zinc-400 font-mono">
                X_PLATFORM_REFRESH_TOKEN={token.refresh_token}
              </p>
            </div>

            <p className="text-[10px] text-zinc-600">
              Scopes: {token.scope}. Expires in: {token.expires_in}s.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CaptureTokenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-zinc-500">Loading...</p></div>}>
      <CaptureTokenInner />
    </Suspense>
  );
}
