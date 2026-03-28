"use client";

import { useEffect, useRef, useState } from "react";
import BuilderDocumentRenderer from "@/components/builder/BuilderDocumentRenderer";
import { parseStoredBuilderDocument, type BuilderPreviewData } from "@/lib/builderDocument";

interface Build {
  id: string;
  label: string;
  code: string;
}

interface StoreBuildRendererProps {
  builds: Build[];
  previewData?: BuilderPreviewData;
}

function buildIframeHtml(code: string): string {
  const cleaned = code
    .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow-x: hidden; }
    @keyframes blink { 50% { opacity: 0; } }
    @keyframes rainbow { 0%{color:#ff0080} 25%{color:#00ffff} 50%{color:#ffff00} 75%{color:#00ff80} 100%{color:#ff0080} }
    @keyframes glitter { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes marquee { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    ${cleaned}

    try {
      const Component = typeof exports !== 'undefined' && exports.default
        ? exports.default
        : null;
      if (Component) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component));
      }
    } catch(e) {
      document.getElementById('root').innerHTML =
        '<p style="color:#ff4444;padding:1rem;font-family:monospace;font-size:12px">' + e.message + '</p>';
    }
  <\/script>
  <script>
    // Auto-report height to parent so iframe can resize
    function sendHeight() {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: 'builder-resize', height: h }, '*');
    }
    // Send on load and after a short delay (React render takes a tick)
    window.addEventListener('load', function() {
      sendHeight();
      setTimeout(sendHeight, 300);
      setTimeout(sendHeight, 1000);
    });
    // Also watch for DOM changes
    if (window.ResizeObserver) {
      new ResizeObserver(sendHeight).observe(document.body);
    }
  <\/script>
</body>
</html>`;
}

function BuildIframe({ build }: { build: Build }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    if (!iframeRef.current) return;
    iframeRef.current.srcdoc = buildIframeHtml(build.code);
  }, [build.code]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (
        e.data?.type === "builder-resize" &&
        typeof e.data.height === "number" &&
        e.data.height > 0
      ) {
        // Only accept from our iframes (can't verify origin with srcdoc, so check height sanity)
        if (e.data.height < 5000) {
          setHeight(e.data.height);
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      className="w-full border-0 block"
      style={{ height: `${height}px` }}
      title={build.label}
    />
  );
}

export default function StoreBuildRenderer({ builds, previewData }: StoreBuildRendererProps) {
  if (!builds || builds.length === 0) return null;

  return (
    <div className="w-full">
      {builds.map((build) => {
        const document = parseStoredBuilderDocument(build.code);
        return (
          <div key={build.id} className="w-full">
            {document ? <BuilderDocumentRenderer document={document} data={previewData} /> : <BuildIframe build={build} />}
          </div>
        );
      })}
    </div>
  );
}
