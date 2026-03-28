"use client";

import { buildPreviewDocument } from "@/components/builder/previewDocument";

let activePreviewUrl: string | null = null;

export default function OpenPreviewWindowButton({ code }: { code: string }) {
  const openPreviewWindow = () => {
    if (!code.trim()) return;

    const popup = window.open("", "ri-builder-preview", "width=1200,height=850");
    if (!popup) {
      window.alert("Preview window was blocked. Allow pop-ups for RareImagery and try again.");
      return;
    }

    const previewHtml = buildPreviewDocument(code);
    const previewBlob = new Blob([previewHtml], { type: "text/html" });
    const previewUrl = URL.createObjectURL(previewBlob);

    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
    }

    activePreviewUrl = previewUrl;
    popup.location.replace(previewUrl);
    popup.focus();
  };

  return (
    <button
      onClick={openPreviewWindow}
      disabled={!code.trim()}
      className="inline-flex min-h-9 items-center rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      Open Preview Window
    </button>
  );
}
