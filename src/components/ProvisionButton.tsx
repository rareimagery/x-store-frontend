"use client";
import { useState } from "react";

export default function ProvisionButton() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "subscribe"
  >("idle");
  const [message, setMessage] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const provision = async () => {
    if (!agreedToTerms) {
      setStatus("error");
      setMessage("You must agree to the Terms of Service, EULA, and Privacy Policy.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/stores/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreedToTerms: true }),
      });

      const data = await res.json();

      if (res.ok) {
        // Auto-import X data (best-effort — don't block success)
        if (!data.alreadyExisted) {
          try {
            await fetch("/api/stores/import-x-data", { method: "POST" });
          } catch {
            // Non-critical — page will show without X data until next import
          }
        }

        setStatus("success");
        setPageUrl(data.url);
        setMessage(
          data.alreadyExisted
            ? "Your page is already live!"
            : "Your page is live!"
        );
      } else if (data.requiresSubscription) {
        setStatus("subscribe");
        setMessage(data.error);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-green-400">{message}</p>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
        >
          View Your Page
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    );
  }

  if (status === "subscribe") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-amber-400">{message}</p>
        <a
          href="https://x.com/rareimagery"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Follow @rareimagery on X
        </a>
        <button
          onClick={provision}
          className="ml-3 text-sm text-zinc-500 underline hover:text-zinc-300"
        >
          I already follow — check again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer group max-w-xl">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <span className="text-sm text-zinc-400 group-hover:text-zinc-300">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
            Terms of Service
          </a>
          ,{" "}
          <a href="/eula" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
            End User License Agreement
          </a>
          , and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      <button
        onClick={provision}
        disabled={status === "loading" || !agreedToTerms}
        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
      >
        {status === "loading" ? "Setting up..." : "Get My Free Page"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-400">{message}</p>
      )}
    </div>
  );
}
