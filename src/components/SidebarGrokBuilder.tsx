"use client";

import { useState, useEffect } from "react";

const RAREIMAGERY_X_ID = "1524882641358508032";

function dmLink(text: string): string {
  return `https://x.com/messages/compose?recipient_id=${RAREIMAGERY_X_ID}&text=${encodeURIComponent(text)}`;
}

interface SidebarGrokBuilderProps {
  storeSlug: string | null;
  xUsername: string | null;
}

export default function SidebarGrokBuilder({ storeSlug, xUsername }: SidebarGrokBuilderProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ri_grok_builder_expanded");
    if (saved === "true") setExpanded(true);
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem("ri_grok_builder_expanded", String(next));
  };

  const handle = storeSlug || xUsername || "mystore";

  const actions = [
    {
      label: "Describe new section",
      icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
      text: `Hey @RareImagery, add this to my @${handle}.rareimagery.net store: `,
    },
    {
      label: "Add product grid",
      icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z",
      text: `Hey @RareImagery, add a 3-column product grid with hover zoom to my @${handle}.rareimagery.net store`,
    },
    {
      label: "Generate background",
      icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z",
      text: `Hey @RareImagery, generate a dark cosmic nebula background for my @${handle}.rareimagery.net store`,
    },
    {
      label: "Get help",
      icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z",
      text: `Hey @RareImagery, I need help with my store at ${handle}.rareimagery.net: `,
    },
  ];

  return (
    <div className="border-t border-zinc-800">
      {/* Toggle header */}
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-xs font-semibold text-zinc-300">Grok Builder</span>
        </div>
        <svg
          className={`h-3 w-3 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          <p className="text-[10px] text-zinc-600 px-1 mb-2">
            Ask Grok to build sections in XChat
          </p>

          {actions.map((action) => (
            <a
              key={action.label}
              href={dmLink(action.text)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
              </svg>
              {action.label}
            </a>
          ))}

          <div className="pt-1.5 border-t border-zinc-800">
            <a
              href={`https://x.com/messages/${RAREIMAGERY_X_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition"
            >
              Open full XChat thread
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
