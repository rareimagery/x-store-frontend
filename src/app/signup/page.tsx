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

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => signIn("google", { callbackUrl: "/console/setup" })}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>
          <button
            onClick={() => signIn("facebook", { callbackUrl: "/console/setup" })}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
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
