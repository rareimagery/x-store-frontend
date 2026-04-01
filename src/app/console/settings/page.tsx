"use client";

import { useConsole } from "@/components/ConsoleContext";
import NotificationPreferences from "@/components/NotificationPreferences";
import { resolveTemplateId } from "@/templates/catalog";
import { getTemplateDefinition } from "@/templates/registry";

export default function SettingsPage() {
  const {
    hasStore,
    storeName,
    storeSlug,
    storeStatus,
    currentTheme,
    xUsername,
  } = useConsole();
  const activeTemplate = getTemplateDefinition(resolveTemplateId(currentTheme));

  if (!hasStore) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to manage settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Store Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Store Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Store Name
            </label>
            <p className="mt-1 text-sm text-white">{storeName}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Subdomain
            </label>
            <p className="mt-1 text-sm text-white">
              rareimagery.net/{storeSlug}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Status
            </label>
            <p className="mt-1 text-sm capitalize text-white">
              {storeStatus || "pending"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500">
              Template
            </label>
            <p className="mt-1 text-sm text-white">{activeTemplate?.name || currentTheme}</p>
          </div>
        </div>
      </div>

      {/* X Profile */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">X Profile</h2>
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Connected Account
          </label>
          <p className="mt-1 text-sm text-white">@{xUsername}</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
        <NotificationPreferences />
      </div>
    </div>
  );
}
