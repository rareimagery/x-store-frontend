"use client";

import { useEffect, useState } from "react";

export default function NotificationPreferences() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notificationChannel, setNotificationChannel] = useState("email");
  const [smsAlertLevel, setSmsAlertLevel] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setPhoneNumber(data.phoneNumber || "");
          setNotificationChannel(data.notificationChannel || "email");
          setSmsAlertLevel(data.smsAlertLevel || "all");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          notificationChannel,
          smsAlertLevel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Preferences saved" });
      } else {
        setMessage({ type: "error", text: data.error || "Save failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse text-sm text-zinc-500">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-zinc-300">
        Notification Preferences
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Mobile Phone Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+15551234567"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            E.164 format. Required for SMS notifications.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Notification Channel
          </label>
          <select
            value={notificationChannel}
            onChange={(e) => setNotificationChannel(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="email">Email Only</option>
            <option value="email_sms">Email + SMS</option>
          </select>
        </div>

        {notificationChannel === "email_sms" && (
          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              SMS Alert Level
            </label>
            <select
              value={smsAlertLevel}
              onChange={(e) => setSmsAlertLevel(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Events</option>
              <option value="sales">Sales Only</option>
              <option value="critical">
                Critical Only (approval, payment issues)
              </option>
            </select>
          </div>
        )}
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
