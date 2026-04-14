"use client";

import { resolveTemplateId } from "@/templates/catalog";
import { TEMPLATE_DEFINITIONS } from "@/templates/registry";

interface ThemeSelectorProps {
  currentTheme: string;
  sellerHandle?: string;
}

export default function ThemeSelector({
  currentTheme,
  sellerHandle,
}: ThemeSelectorProps) {
  const activeTemplateId = resolveTemplateId(currentTheme || null);
  const normalizedHandle = sellerHandle?.replace(/^@+/, "") || "";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
        Template changes now happen in the builder. Choose a starting template below to open the canonical editing workspace.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_DEFINITIONS.map((template) => {
          const href = normalizedHandle
            ? `/console/page-building`
            : null;

          return (
            <div
              key={template.id}
              className={`rounded-xl border p-4 transition ${
                activeTemplateId === template.id
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-semibold text-white">{template.name}</span>
                {activeTemplateId === template.id && (
                  <span className="text-xs font-medium text-indigo-400">Active</span>
                )}
              </div>
              <p className="min-h-10 text-xs text-zinc-500">{template.description}</p>
              {href ? (
                <a
                  href={href}
                  className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Open in Builder
                </a>
              ) : (
                <p className="mt-4 text-xs text-zinc-500">Link an X handle to launch this template in the builder.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
