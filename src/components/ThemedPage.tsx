import { COLOR_SCHEMES } from "@/lib/color-schemes";

interface ThemedPageProps {
  colorScheme: string;
  pageBackground: string;
  children: React.ReactNode;
}

export default function ThemedPage({ colorScheme, pageBackground, children }: ThemedPageProps) {
  const colors = COLOR_SCHEMES[colorScheme || "midnight"] || COLOR_SCHEMES.midnight;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        ...(pageBackground ? {
          backgroundImage: `linear-gradient(to bottom, ${colors.bg}c0, ${colors.bg}a0), url(${pageBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        } : {}),
        "--wf-bg": colors.bg,
        "--wf-surface": colors.surface,
        "--wf-border": colors.border,
        "--wf-accent": colors.accent,
        "--wf-text": colors.text,
        "--wf-text-muted": colors.textMuted,
      } as React.CSSProperties}
    >
      <style>{`
        .wf-card { background: var(--wf-surface) !important; border-color: var(--wf-border) !important; }
        .wf-accent { color: var(--wf-accent) !important; }
        .wf-muted { color: var(--wf-text-muted) !important; }
        .wf-border { border-color: var(--wf-border) !important; }
        .wf-text { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .text-white { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .text-zinc-200 { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .text-zinc-300 { color: var(--wf-text-muted) !important; }
        [style*="--wf-bg"] .text-zinc-400 { color: var(--wf-text-muted) !important; }
        [style*="--wf-bg"] .text-zinc-500 { color: color-mix(in srgb, var(--wf-text-muted) 60%, transparent) !important; }
        [style*="--wf-bg"] .bg-zinc-800,
        [style*="--wf-bg"] .bg-zinc-900\\/50 { background: var(--wf-surface) !important; }
        [style*="--wf-bg"] .bg-zinc-950 { background: var(--wf-bg) !important; }
        [style*="--wf-bg"] .border-zinc-800 { border-color: var(--wf-border) !important; }
        [style*="--wf-bg"] .border-zinc-700 { border-color: var(--wf-border) !important; }
        [style*="--wf-bg"] .bg-indigo-600 { background: var(--wf-accent) !important; }
        [style*="--wf-bg"] .text-indigo-400 { color: var(--wf-accent) !important; }
      `}</style>
      {children}
    </div>
  );
}
