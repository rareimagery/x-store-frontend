"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";

function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export default function NewStorePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    storeName: "",
    slug: "",
    xUsername: "",
    ownerEmail: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [result, setResult] = useState<{ url: string; slug: string } | null>(
    null
  );
  const [error, setError] = useState("");
  const [limitMeta, setLimitMeta] = useState<{
    existingStoreCount?: number;
    maxAllowedStores?: number;
  } | null>(null);

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      storeName: name,
      slug: slugEdited ? f.slug : autoSlug(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugEdited(true);
    setForm((f) => ({ ...f, slug: slug.toLowerCase() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setLimitMeta(null);

    const res = await fetch("/api/stores/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      if (data.storeLimitReached) {
        setLimitMeta({
          existingStoreCount: data.existingStoreCount,
          maxAllowedStores: data.maxAllowedStores,
        });
      }
      setError(data.error || "Something went wrong");
      return;
    }

    setResult(data);
    setStatus("success");
  };

  if (status === "success" && result) {
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
        <h1 className="text-2xl font-bold text-green-400">Store Created</h1>
        <p className="text-zinc-300">
          <span className="font-semibold text-white">
            {result.slug}.{BASE_DOMAIN}
          </span>{" "}
          is live.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Open Store
          </a>
          <button
            onClick={() => router.push("/console/stores")}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              setStatus("idle");
              setResult(null);
              setForm({
                storeName: "",
                slug: "",
                xUsername: "",
                ownerEmail: "",
              });
              setSlugEdited(false);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-2xl font-bold">Create New Creator Store</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Store Name</label>
          <input
            value={form.storeName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Rare Imagery"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Subdomain</label>
          <div className="flex items-center gap-2">
            <input
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="rareimagery"
              required
              className="w-48 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-zinc-500">.{BASE_DOMAIN}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            3-30 chars, lowercase letters, numbers, hyphens only
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">X Username</label>
          <input
            value={form.xUsername}
            onChange={(e) =>
              setForm((f) => ({ ...f, xUsername: e.target.value }))
            }
            placeholder="@rareimagery"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Owner Email
          </label>
          <input
            type="email"
            value={form.ownerEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, ownerEmail: e.target.value }))
            }
            placeholder="owner@example.com"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="space-y-2 rounded-lg border border-amber-700 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-300">{error}</p>
            {limitMeta && (
              <p className="text-xs text-amber-400">
                Current stores: {limitMeta.existingStoreCount ?? "?"} / Allowed: {limitMeta.maxAllowedStores ?? "?"}. Additional stores can be enabled for testing now and later monetized as a per-store add-on.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "loading" || !form.storeName || !form.slug}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {status === "loading" ? "Creating store..." : "Create Store"}
        </button>
      </form>
    </div>
  );
}
