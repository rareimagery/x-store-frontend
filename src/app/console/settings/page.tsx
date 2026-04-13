"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import NotificationPreferences from "@/components/NotificationPreferences";
import StripeConnectPanel from "@/components/StripeConnectPanel";
import { getStoreDisplayUrl, getStoreUrl } from "@/lib/store-url";

export default function SettingsPage() {
  const { hasStore, storeName: ctxStoreName, storeSlug, storeStatus, xUsername } = useConsole();

  const [storeName, setStoreName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [verified, setVerified] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/stores/edit")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setStoreName(d.storeName || ctxStoreName || "");
        setDisplayName(d.displayName || "");
        setBio(d.bio || "");
        setLocation(d.location || "");
        setWebsite(d.website || "");
        setAvatarUrl(d.avatarUrl || "");
        setFollowers(d.followers || 0);
        setFollowing(d.following || 0);
        setPostCount(d.postCount || 0);
        setVerified(d.verified || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore, ctxStoreName]);

  const handleSave = useCallback(async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch("/api/stores/edit", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeName, displayName, bio, location, website }) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else { const d = await res.json(); setError(d.error || "Save failed"); }
    } catch { setError("Save failed"); } finally { setSaving(false); }
  }, [storeName, displayName, bio, location, website]);

  const handleSyncX = useCallback(async () => {
    setSyncing(true); setError(null);
    try {
      const res = await fetch("/api/stores/sync-x", { method: "POST" });
      const d = await res.json();
      if (res.ok && d.success) {
        if (d.displayName) setDisplayName(d.displayName);
        if (d.bio) setBio(d.bio);
        if (d.avatarUrl) setAvatarUrl(d.avatarUrl);
        setFollowers(d.followers || followers);
        setFollowing(d.following || following);
        setPostCount(d.postCount || postCount);
        setVerified(d.verified ?? verified);
        if (d.location) setLocation(d.location);
      } else { setError(d.error || "Sync failed"); }
    } catch { setError("Sync failed"); } finally { setSyncing(false); }
  }, [followers, following, postCount, verified]);


  if (!hasStore) return <div className="py-12 text-center text-zinc-500">Create a store first to manage settings.</div>;
  if (loading) return <div className="py-12 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-400 font-medium">Saved!</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Store Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Store Details</h2>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Store Name</label>
          <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Subdomain</label>
            <div className="flex items-center gap-2">
              <a href={getStoreUrl(storeSlug || "")} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300">{getStoreDisplayUrl(storeSlug || "")}</a>
              <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                Permanent
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${storeStatus === "approved" ? "bg-green-900/30 text-green-400" : storeStatus === "suspended" ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400"}`}>
              {storeStatus || "pending"}
            </span>
          </div>
        </div>

      </div>

      {/* X Profile */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">X Profile</h2>
          <button onClick={handleSyncX} disabled={syncing} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50 transition">{syncing ? "Syncing..." : "Sync from X"}</button>
        </div>

        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-700" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/20 text-lg font-bold text-indigo-400">{(displayName || xUsername)?.[0]?.toUpperCase() || "?"}</div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{displayName || xUsername}</p>
              {verified && <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" /></svg>}
              <span className="text-xs text-zinc-600">@{xUsername}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
              <span>{followers.toLocaleString()} followers</span>
              <span>{following.toLocaleString()} following</span>
              <span>{postCount.toLocaleString()} posts</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none" />
          <p className="text-[10px] text-zinc-600 mt-0.5">{bio.length}/500</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Website</label>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none" />
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Payments</h2>
        <StripeConnectPanel />
      </div>

      {/* Printful */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">Print on Demand</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">Manage your Printful connection and products.</p>
          <a href="/console/printful" className="text-xs text-indigo-400 hover:text-indigo-300">Manage Printful &rarr;</a>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Notifications</h2>
        <NotificationPreferences />
      </div>
    </div>
  );
}
