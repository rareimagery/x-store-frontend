"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/console");
    }
  };

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
                https://rareimagery.net/api/auth/callback/twitter
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
        <span className="text-xs text-zinc-600">or sign in with email</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rare@rareimagery.net"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-400">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

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
