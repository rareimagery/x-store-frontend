"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, { title: string; description: string; action: string }> = {
  OAuthCallback: {
    title: "X Login Failed",
    description:
      "The connection to X was interrupted. This usually means the login session expired or there was a temporary issue with X's servers.",
    action: "Try signing in again. If this keeps happening, try clearing your browser cookies first.",
  },
  OAuthCreateAccount: {
    title: "Account Creation Failed",
    description: "We couldn't read your profile from X. This can happen if your X account has restricted API access.",
    action: "Try again, or contact @RareImagery on X for help.",
  },
  OAuthSignin: {
    title: "Sign-in Error",
    description: "There was a problem starting the X login process.",
    action: "Try again in a few seconds. If the problem persists, try a different browser.",
  },
  Callback: {
    title: "Authentication Error",
    description: "Something went wrong while verifying your account.",
    action: "Try signing in again. If this keeps happening, contact @RareImagery on X.",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You don't have permission to sign in.",
    action: "Make sure you have an active subscription to @RareImagery on X.",
  },
  Default: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred during sign-in.",
    action: "Try again. If this keeps happening, contact @RareImagery on X for support.",
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") || "Default";
  const info = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
        <div className="text-center">
          <Link href="/">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
              RareImagery
            </span>
          </Link>
        </div>

        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h2 className="text-sm font-semibold text-red-300">{info.title}</h2>
          </div>
          <p className="text-xs text-red-400/80 mb-2">{info.description}</p>
          <p className="text-xs text-zinc-400">{info.action}</p>
        </div>

        {errorCode === "OAuthCallback" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[10px] text-zinc-500 mb-1 font-medium">Troubleshooting tips:</p>
            <ul className="text-[10px] text-zinc-600 space-y-1 list-disc list-inside">
              <li>Clear cookies for rareimagery.net and try again</li>
              <li>Make sure pop-ups aren't blocked for this site</li>
              <li>Try using a private/incognito browser window</li>
              <li>If using a VPN, try disabling it temporarily</li>
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white"
          >
            Back to Home
          </Link>
        </div>

        <p className="text-center text-[10px] text-zinc-600">
          Error code: {errorCode}
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
