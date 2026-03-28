"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SignupContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

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
            Create your account with X
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

        <button
          onClick={() => signIn("twitter", { callbackUrl: "/console/setup" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign up with X
        </button>

        <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-center text-xs text-zinc-400">
          Email/password registration is disabled. X authentication is required for account and store creation.
        </p>

        <p className="text-center text-xs text-zinc-600">
          Already have access for testing?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
