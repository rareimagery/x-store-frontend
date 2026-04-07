"use client";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
      <div className="text-center">
        <Link href="/">
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
            RareImagery
          </span>
        </Link>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in to manage your store
        </p>
      </div>

      {oauthError === "OAuthCallback" && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm">
          <p className="font-semibold text-red-300 mb-2">
            X Login Error — action required
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-red-400">
            <li>
              Open{" "}
              <a
                href="https://developer.x.com/en/portal/projects-and-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-300"
              >
                X Developer Portal
              </a>
              {" "}→ your app → <strong>Keys and tokens</strong>
            </li>
            <li>
              Under <strong>OAuth 2.0 Client ID and Client Secret</strong>, click{" "}
              <strong>Regenerate</strong> to get a fresh Client Secret
            </li>
            <li>
              Set callback URL to exactly:{" "}
              <code className="bg-red-950/50 px-1 rounded">
                https://www.rareimagery.net/api/auth/callback/twitter
              </code>
            </li>
            <li>
              Update{" "}
              <code className="bg-red-950/50 px-1 rounded">X_CLIENT_ID</code>{" "}
              and{" "}
              <code className="bg-red-950/50 px-1 rounded">X_CLIENT_SECRET</code>{" "}
              in Vercel with the new values, then redeploy
            </li>
          </ol>
          <p className="mt-2 text-xs text-red-500">
            Note: <code className="bg-red-950/50 px-1 rounded">X_CLIENT_SECRET</code>{" "}
            must be a <strong>different</strong> value from{" "}
            <code className="bg-red-950/50 px-1 rounded">X_CLIENT_ID</code>.
          </p>
        </div>
      )}

      {oauthError && oauthError !== "OAuthCallback" && (
        <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-3 text-sm text-amber-300">
          <p className="font-semibold">Sign-in error: {oauthError}</p>
        </div>
      )}

      <button
        onClick={() => signIn("twitter", { callbackUrl: "/console" })}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Sign in with X
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600">or continue with</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => signIn("google", { callbackUrl: "/console" })}
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
          onClick={() => signIn("facebook", { callbackUrl: "/console" })}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
          Sign up
        </Link>
      </p>

      <p className="text-center text-xs text-zinc-600">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300">
          &larr; Back to marketplace
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Suspense fallback={<div className="text-zinc-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
