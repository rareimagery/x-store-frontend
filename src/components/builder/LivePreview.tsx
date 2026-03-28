"use client";

import { useEffect, useRef } from "react";
import { buildPreviewDocument } from "@/components/builder/previewDocument";

export default function LivePreview({ code }: { code: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !code) return;

    iframeRef.current.srcdoc = buildPreviewDocument(code);
  }, [code]);

  if (!code) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Generate a component to preview it here
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      className="w-full h-[400px] border-0"
      title="Component Preview"
    />
  );
}
