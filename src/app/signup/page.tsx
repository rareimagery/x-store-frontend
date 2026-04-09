"use client";

import { Suspense, useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SignupContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [inviteCode, setInviteCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const validateCode = useCallback(async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setValidating(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setValidated(true);
        // Store code in sessionStorage so we can redeem it after OAuth
        sessionStorage.setItem("rareimagery_invite_code", code);
      } else {
        setCodeError(data.error || "Invalid code");
      }
    } catch {
      setCodeError("Validation failed — try again");
    } finally {
      setValidating(false);
    }
  }, [inviteCode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
        <div className="text-center">
          <Link href="/">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
              RareImagery
            </span>
          </Link>
          <p className="mt-2 text-sm text-zinc-500">
            {validated ? "Choose how to sign up" : "Enter your invite code"}
          </p>
        </div>

        {error === "PaidSubscriptionRequired" && (
          <p className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-center text-xs text-amber-300">
            To create a RareImagery account, you need an active paid subscription to @RareImagery on X, then try signing up again.
          </p>
        )}

        {error === "MissingXProfile" && (
          <p className="rounded-lg border border-red-700 bg-red-950/30 p-3 text-center text-xs text-red-300">
            We could not read your X profile. Please try signing in again.
          </p>
        )}

        {!validated ? (
          <>
            {/* Invite code entry */}
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 text-center">
                RareImagery is invite-only. Subscribe to{" "}
                <a href="https://x.com/RareImagery" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  @RareImagery on X
                </a>{" "}
                to receive your invite code.
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setCodeError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && validateCode()}
                  placeholder="RARE-XXXXXXXX"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  maxLength={14}
                />
                {codeError && (
                  <p className="text-center text-xs text-red-400">{codeError}</p>
                )}
                <button
                  onClick={validateCode}
                  disabled={validating || !inviteCode.trim()}
                  className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {validating ? "Checking..." : "Verify Invite Code"}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-zinc-600">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            {/* Code validated — show signup options */}
            <div className="rounded-lg border border-green-800 bg-green-950/30 p-3 text-center">
              <p className="text-xs text-green-400 font-medium">Invite code verified</p>
              <p className="text-[10px] text-green-600 mt-0.5">Choose a sign-up method below to create your account.</p>
            </div>

            <button
              onClick={() => signIn("twitter", { callbackUrl: "/console/setup" })}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Sign up with X
            </button>

            <p className="text-center text-xs text-zinc-600">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
