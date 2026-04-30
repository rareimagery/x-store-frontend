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
          <p className="mt-2 text-sm text-zinc-400">
            Create your store in minutes
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            3-day free trial. No credit card required.
          </p>
        </div>

        {error === "MissingXProfile" && (
          <p className="rounded-lg border border-red-700 bg-red-950/30 p-3 text-center text-xs text-red-300">
            We could not read your X profile. Please try signing in again.
          </p>
        )}

        {error === "OAuthSignin" && (
          <p className="rounded-lg border border-red-700 bg-red-950/30 p-3 text-center text-xs text-red-300">
            Sign in failed. Please try again.
          </p>
        )}

        <button
          onClick={() => signIn("twitter", { callbackUrl: "/console/setup" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1DA1F2] py-3 font-semibold text-white transition hover:bg-[#0f8bd6]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Start Free Trial with X
        </button>

        <div className="space-y-2">
          <p className="text-center text-[10px] text-zinc-600">What you get with your free trial:</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">&#10003;</span> Your own subdomain
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">&#10003;</span> AI product creator
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">&#10003;</span> Page builder
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500">&#10003;</span> Unlimited AI generations
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Already have an account?{" "}
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
