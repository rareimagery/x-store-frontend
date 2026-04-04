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
            Create your account
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

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">or sign up with</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => signIn("facebook", { callbackUrl: "/console/setup" })}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>
          <button
            onClick={() => signIn("tiktok", { callbackUrl: "/console/setup" })}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
            TikTok
          </button>
          <button
            onClick={() => signIn("instagram", { callbackUrl: "/console/setup" })}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Instagram
          </button>
        </div>

        <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-center text-xs text-zinc-400">
          X is recommended for the full creator experience. Social login provides basic store access.
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
