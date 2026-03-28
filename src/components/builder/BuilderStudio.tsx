"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import BuilderDocumentRenderer from "@/components/builder/BuilderDocumentRenderer";
import {
  createBlock,
  createDefaultBuilderDocument,
  createEmptyPreviewData,
  normalizeBuilderBlocks,
  reflowBuilderBlocks,
  parseStoredBuilderDocument,
  touchDocument,
  type BuilderBlock,
  type BuilderBlockType,
  type BuilderDocument,
  type BuilderPreviewData,
  type BuilderTheme,
} from "@/lib/builderDocument";

type SavedBuild = {
  id: string;
  label: string;
  code: string;
  createdAt: string;
  published?: boolean;
};

type AiMessage = {
  role: "assistant" | "user";
  content: string;
};

type AiAction =
  | { type: "add_block"; blockType: BuilderBlockType }
  | { type: "remove_block"; blockType: BuilderBlockType }
  | { type: "set_theme"; field: keyof BuilderTheme; value: string }
  | { type: "set_name"; name: string }
  | { type: "set_block_prop"; blockType: BuilderBlockType; key: string; value: string | number | boolean };

const STARTER_LAYOUTS: Array<{ id: "minimal" | "social" | "shop" | "story" | "members"; title: string; blocks: BuilderBlockType[] }> = [
  { id: "minimal", title: "Minimal", blocks: ["top-menu", "profile-header", "product-grid"] },
  { id: "social", title: "Social", blocks: ["top-menu", "profile-header", "post-feed", "friends-list"] },
  { id: "shop", title: "Shop", blocks: ["top-menu", "profile-header", "sidebar", "product-grid", "media-widget"] },
  { id: "story", title: "Story", blocks: ["profile-header", "post-feed", "media-widget", "custom-embed", "product-grid"] },
  { id: "members", title: "Members", blocks: ["top-menu", "profile-header", "sidebar", "friends-list", "post-feed"] },
];

const THEME_PRESETS: Array<{ id: "night" | "cream" | "pop" | "sunset" | "forest" | "mono"; label: string; theme: BuilderTheme }> = [
  {
    id: "night",
    label: "Night Studio",
    theme: {
      pageBg: "#090f1d",
      menuBg: "#0f172a",
      sidebarBg: "#101827",
      surface: "#131c2e",
      surfaceMuted: "#1c2740",
      accent: "#60a5fa",
      textPrimary: "#f8fafc",
      textSecondary: "#94a3b8",
      border: "#334155",
    },
  },
  {
    id: "cream",
    label: "Cream Editorial",
    theme: {
      pageBg: "#f6f0e6",
      menuBg: "#fffaf0",
      sidebarBg: "#efe4d0",
      surface: "#fffdf8",
      surfaceMuted: "#f3e7d4",
      accent: "#b45309",
      textPrimary: "#1f2937",
      textSecondary: "#6b7280",
      border: "#d6c6ab",
    },
  },
  {
    id: "pop",
    label: "Pop Energy",
    theme: {
      pageBg: "#06141f",
      menuBg: "#0a2438",
      sidebarBg: "#10334b",
      surface: "#0f2a3f",
      surfaceMuted: "#153952",
      accent: "#22d3ee",
      textPrimary: "#ecfeff",
      textSecondary: "#a5f3fc",
      border: "#1e566f",
    },
  },
  {
    id: "sunset",
    label: "Sunset Stage",
    theme: {
      pageBg: "#221217",
      menuBg: "#341b22",
      sidebarBg: "#4a2630",
      surface: "#5a2f3a",
      surfaceMuted: "#7a3b47",
      accent: "#ffb454",
      textPrimary: "#fff4e6",
      textSecondary: "#ffd7a3",
      border: "#a85d41",
    },
  },
  {
    id: "forest",
    label: "Forest Signal",
    theme: {
      pageBg: "#08110d",
      menuBg: "#0d1d16",
      sidebarBg: "#133026",
      surface: "#1a3d31",
      surfaceMuted: "#245443",
      accent: "#86efac",
      textPrimary: "#ecfdf3",
      textSecondary: "#bbf7d0",
      border: "#2f6c57",
    },
  },
  {
    id: "mono",
    label: "Mono Wireframe",
    theme: {
      pageBg: "#101010",
      menuBg: "#161616",
      sidebarBg: "#1c1c1c",
      surface: "#232323",
      surfaceMuted: "#2d2d2d",
      accent: "#f5f5f5",
      textPrimary: "#fafafa",
      textSecondary: "#b5b5b5",
      border: "#3a3a3a",
    },
  },
];

type StarterLayoutId = (typeof STARTER_LAYOUTS)[number]["id"];
type ThemePresetId = (typeof THEME_PRESETS)[number]["id"] | "custom";
type TemplateSlotId = "header" | "menu" | "left" | "center" | "right";

const BLOCK_LIBRARY: Array<{ type: BuilderBlockType; label: string; description: string }> = [
  { type: "top-menu", label: "Top menu", description: "Navigation pills across the top of the page." },
  { type: "profile-header", label: "Profile header", description: "Banner, avatar, intro, and CTA." },
  { type: "sidebar", label: "Sidebar", description: "Bio, links, or supporter callout card." },
  { type: "friends-list", label: "Friends list", description: "Pulls in top followers / friends." },
  { type: "post-feed", label: "Post feed", description: "Recent X posts with optional media." },
  { type: "product-grid", label: "Product grid", description: "Shop block powered by store products." },
  { type: "media-widget", label: "Music / media", description: "Spotify, YouTube, or other media link block." },
  { type: "custom-embed", label: "Custom embed", description: "Paste HTML or iframe markup." },
];

const THEME_FIELDS: Array<{ key: keyof BuilderTheme; label: string }> = [
  { key: "pageBg", label: "Page background" },
  { key: "menuBg", label: "Menu background" },
  { key: "sidebarBg", label: "Sidebar background" },
  { key: "surface", label: "Primary surface" },
  { key: "surfaceMuted", label: "Muted surface" },
  { key: "accent", label: "Accent" },
  { key: "textPrimary", label: "Primary text" },
  { key: "textSecondary", label: "Secondary text" },
  { key: "border", label: "Border" },
];

const TEMPLATE_SLOTS: Array<{
  id: TemplateSlotId;
  label: string;
  gridColumn: number;
  gridSpan: number;
  gridRow: number;
}> = [
  { id: "header", label: "Header", gridColumn: 1, gridSpan: 12, gridRow: 1 },
  { id: "menu", label: "Menu", gridColumn: 1, gridSpan: 12, gridRow: 2 },
  { id: "left", label: "Left Sidebar", gridColumn: 1, gridSpan: 3, gridRow: 3 },
  { id: "center", label: "Main Content", gridColumn: 4, gridSpan: 6, gridRow: 3 },
  { id: "right", label: "Right Sidebar", gridColumn: 10, gridSpan: 3, gridRow: 3 },
];

const SLOT_GUIDANCE: Record<
  TemplateSlotId,
  { iconLabel: string; hint: string; recommended: BuilderBlockType[] }
> = {
  menu: {
    iconLabel: "NAV",
    hint: "Best for navigation right below the header.",
    recommended: ["top-menu"],
  },
  header: {
    iconLabel: "HERO",
    hint: "Best for profile intro and banner.",
    recommended: ["profile-header"],
  },
  left: {
    iconLabel: "COL",
    hint: "Use for supporting info and community widgets.",
    recommended: ["sidebar", "friends-list", "media-widget"],
  },
  center: {
    iconLabel: "COL",
    hint: "Use for primary content and conversion blocks.",
    recommended: ["post-feed", "product-grid", "custom-embed"],
  },
  right: {
    iconLabel: "COL",
    hint: "Use for extra links, media, or social proof.",
    recommended: ["media-widget", "sidebar", "custom-embed"],
  },
};

const TEMPLATE_SLOT_LIMITS: Record<TemplateSlotId, number> = {
  header: 1,
  menu: 1,
  left: 4,
  center: 8,
  right: 4,
};

const TEMPLATE_PRESETS: Array<{
  id: "social" | "shop" | "community";
  label: string;
  slots: {
    header: BuilderBlockType;
    menu: BuilderBlockType;
    left: BuilderBlockType[];
    center: BuilderBlockType[];
    right: BuilderBlockType[];
  };
}> = [
  {
    id: "social",
    label: "Social",
    slots: {
      header: "profile-header",
      menu: "top-menu",
      left: ["friends-list"],
      center: ["post-feed", "custom-embed"],
      right: ["media-widget"],
    },
  },
  {
    id: "shop",
    label: "Shop",
    slots: {
      header: "profile-header",
      menu: "top-menu",
      left: ["sidebar"],
      center: ["product-grid", "post-feed"],
      right: ["media-widget"],
    },
  },
  {
    id: "community",
    label: "Community",
    slots: {
      header: "profile-header",
      menu: "top-menu",
      left: ["friends-list", "sidebar"],
      center: ["post-feed"],
      right: ["media-widget", "custom-embed"],
    },
  },
];

function normalizeHandle(value: string | null | undefined): string {
  return (value || "").replace(/^@+/, "").trim();
}

function isXHostedAvatar(url: string | null | undefined): boolean {
  return typeof url === "string" && /pbs\.twimg\.com/i.test(url);
}

function fallbackBuildLabel(document: BuilderDocument, published: boolean): string {
  const timestamp = new Date().toLocaleString();
  return `${document.meta.name} ${published ? "Publish" : "Draft"} ${timestamp}`;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("No JSON object found in AI response.");
}

function extractAiPayload(raw: string): { summary?: string; actions?: AiAction[] } | null {
  try {
    return extractJsonObject(raw) as { summary?: string; actions?: AiAction[] };
  } catch {
    const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      try {
        return JSON.parse(fenceMatch[1]) as { summary?: string; actions?: AiAction[] };
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildFallbackActionsFromPrompt(prompt: string): AiAction[] {
  const text = prompt.toLowerCase();
  const actions: AiAction[] = [];

  if (text.includes("friend")) {
    actions.push({ type: "add_block", blockType: "friends-list" });
  }
  if (text.includes("post") || text.includes("feed") || text.includes("timeline")) {
    actions.push({ type: "add_block", blockType: "post-feed" });
  }
  if (text.includes("shop") || text.includes("product") || text.includes("store")) {
    actions.push({ type: "add_block", blockType: "product-grid" });
  }
  if (text.includes("sidebar")) {
    actions.push({ type: "add_block", blockType: "sidebar" });
  }
  if (text.includes("menu") || text.includes("nav")) {
    actions.push({ type: "add_block", blockType: "top-menu" });
  }
  if (text.includes("music") || text.includes("media") || text.includes("spotify") || text.includes("youtube")) {
    actions.push({ type: "add_block", blockType: "media-widget" });
  }
  if (text.includes("bright") || text.includes("light")) {
    actions.push({ type: "set_theme", field: "pageBg", value: "#f6f0e6" });
    actions.push({ type: "set_theme", field: "textPrimary", value: "#1f2937" });
  }

  return actions;
}

function mapFriends(value: unknown): BuilderPreviewData["friends"] {
  if (!Array.isArray(value)) return [];

  const mapped: Array<BuilderPreviewData["friends"][number] | null> = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const username = typeof candidate.username === "string" ? candidate.username : `friend-${index + 1}`;
      return {
        id: `${username}-${index}`,
        username,
        displayName:
          typeof candidate.display_name === "string"
            ? candidate.display_name
            : typeof candidate.displayName === "string"
              ? candidate.displayName
              : username,
        avatar:
          typeof candidate.profile_image_url === "string"
            ? candidate.profile_image_url
            : typeof candidate.avatar === "string"
              ? candidate.avatar
              : undefined,
        followerCount: typeof candidate.follower_count === "number" ? candidate.follower_count : undefined,
      };
    });

  return mapped.filter((entry): entry is BuilderPreviewData["friends"][number] => entry !== null);
}

function seedProductsFromPosts(data: BuilderPreviewData): BuilderPreviewData["products"] {
  if (data.products.length > 0) return data.products;

  const fromPosts = data.posts
    .filter((post) => typeof post?.text === "string" && post.text.trim().length > 0)
    .slice(0, 6)
    .map((post, index) => {
      const clean = post.text.replace(/https?:\/\/\S+/g, "").replace(/[#@][\w_]+/g, "").trim();
      const words = clean.split(/\s+/).filter(Boolean);
      const title = words.slice(0, 5).join(" ") || `Creator Drop ${index + 1}`;
      const inferredPrice = Math.max(9, Math.min(79, 14 + words.length * 2 + index * 3));

      return {
        id: `seed-${index + 1}`,
        title,
        price: inferredPrice,
        image: post.image,
        description: clean.slice(0, 180) || "Limited creator release inspired by recent content.",
      };
    });

  if (fromPosts.length > 0) return fromPosts;

  const fallbackPrefix = data.handle ? `@${data.handle}` : "Creator";
  return [
    {
      id: "seed-fallback-1",
      title: `${fallbackPrefix} Signature Pack`,
      price: 24,
      description: "Starter bundle generated from your profile style.",
    },
    {
      id: "seed-fallback-2",
      title: `${fallbackPrefix} Members Drop`,
      price: 39,
      description: "Exclusive tier for supporters and subscribers.",
    },
    {
      id: "seed-fallback-3",
      title: `${fallbackPrefix} Collector Edition`,
      price: 59,
      description: "Premium offer highlighted in your storefront hero.",
    },
  ];
}

export default function BuilderStudio({
  defaultHandle,
  defaultStoreSlug,
}: {
  defaultHandle?: string | null;
  defaultStoreSlug?: string | null;
}) {
  const searchParams = useSearchParams();
  const initialHandle = normalizeHandle(searchParams.get("handle") || defaultHandle || defaultStoreSlug);
  const step2ModeStorageKey = `builder_step2_mode_${initialHandle || "default"}`;
  const step2ModeGlobalStorageKey = "builder_step2_mode_last";

  const [document, setDocument] = useState<BuilderDocument>(() => createDefaultBuilderDocument(initialHandle || "creator"));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<BuilderPreviewData>(() => createEmptyPreviewData(initialHandle || "creator"));
  const [syncState, setSyncState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("Waiting for X data sync.");
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(true);
  const [persisting, setPersisting] = useState<"draft" | "publish" | null>(null);
  const [persistMessage, setPersistMessage] = useState("Drafts are private until you publish.");
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardProgress, setWizardProgress] = useState({
    stylePicked: false,
    layoutArranged: false,
    published: false,
  });
  const [selectedStarterLayout, setSelectedStarterLayout] = useState<StarterLayoutId | null>(null);
  const [selectedThemePreset, setSelectedThemePreset] = useState<ThemePresetId | null>(null);
  const [step2Mode, setStep2Mode] = useState<"basic" | "advanced">("basic");
  const [gridDragOverCell, setGridDragOverCell] = useState<string | null>(null);
  const [showBuildHistory, setShowBuildHistory] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content:
        "I am your builder copilot. Ask for a layout and I can add sections, rename your store page, and tune colors.",
    },
  ]);
  const [publishInfo, setPublishInfo] = useState<{
    currentPublishedId: string;
    previousPublishedId: string | null;
    publishedAtIso: string;
  } | null>(null);
  const hydratedFromBuild = useRef(false);

  const activeHandle = useMemo(() => normalizeHandle(searchParams.get("handle") || document.meta.handle || defaultHandle || defaultStoreSlug), [searchParams, document.meta.handle, defaultHandle, defaultStoreSlug]);
  const selectedBlock = document.blocks.find((block) => block.id === selectedBlockId) || null;
  const isGuidedMode = true;
  const styleReady = !!selectedStarterLayout && !!selectedThemePreset;
  const slotBlocks = useMemo(() => {
    const isColumnSlot = (slotId: TemplateSlotId) => slotId === "left" || slotId === "center" || slotId === "right";

    return TEMPLATE_SLOTS.map((slot) => ({
      slot,
      blocks: document.blocks
        .filter((block) => {
          const matchesColumn =
            block.gridColumn === slot.gridColumn && block.gridSpan === slot.gridSpan;
          if (!matchesColumn) return false;
          return isColumnSlot(slot.id)
            ? block.gridRow >= slot.gridRow
            : block.gridRow === slot.gridRow;
        })
        .sort((left, right) => left.gridRow - right.gridRow),
    }));
  }, [document.blocks]);
  const hasMenuSlot = slotBlocks.some((entry) => entry.slot.id === "menu" && entry.blocks.length > 0);
  const hasHeaderSlot = slotBlocks.some((entry) => entry.slot.id === "header" && entry.blocks.length > 0);
  const filledColumnSlots = slotBlocks.filter((entry) => (entry.slot.id === "left" || entry.slot.id === "center" || entry.slot.id === "right") && entry.blocks.length > 0).length;
  const hasCommerceOrContentAnchor = slotBlocks.some(
    (entry) => entry.blocks.some((block) => block.type === "product-grid" || block.type === "post-feed")
  );

  const helperPrompt = `Handle @${previewData.handle || document.meta.handle}. Build a starter that includes top menu, profile header, post feed, and product grid with readable text contrast.`;

  function advanceWizard(step: 1 | 2 | 3) {
    setWizardStep((current) => (step > current ? step : current));
  }

  function updateDocument(mutator: (current: BuilderDocument) => BuilderDocument) {
    setDocument((current) => touchDocument(mutator(current)));
  }

  function updateSelectedBlock(mutator: (block: BuilderBlock) => BuilderBlock) {
    if (!selectedBlock) return;

    updateDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === selectedBlock.id ? mutator(block) : block)),
    }));
  }

  function updateBlockGrid(
    blockId: string,
    partial: Partial<Pick<BuilderBlock, "gridColumn" | "gridSpan" | "gridRow">>,
    options?: { announce?: boolean }
  ) {
    const announce = options?.announce ?? true;

    updateDocument((current) => {
      const blocks = current.blocks.map((block) => {
        if (block.id !== blockId) return block;

        const nextSpan = Math.max(1, Math.min(12, partial.gridSpan ?? block.gridSpan));
        const nextColumn = Math.max(1, Math.min(13 - nextSpan, partial.gridColumn ?? block.gridColumn));
        const nextRow = Math.max(1, partial.gridRow ?? block.gridRow);

        return {
          ...block,
          gridSpan: nextSpan,
          gridColumn: nextColumn,
          gridRow: nextRow,
        };
      });

      return {
        ...current,
        blocks: normalizeBuilderBlocks(blocks),
      };
    });

    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
    if (announce) {
      setPersistMessage("Grid placement updated.");
    }
  }

  async function loadPreviewData(): Promise<BuilderPreviewData | null> {
    setSyncState("loading");
    setSyncMessage("Refreshing X data...");

    let handle = activeHandle;
    let merged = createEmptyPreviewData(handle || "creator");

    try {
      const insightsRes = await fetch("/api/console/insights", { cache: "no-store" });
      if (insightsRes.ok) {
        const insights = await insightsRes.json();
        handle = handle || normalizeHandle(insights.xUsername);
        merged = {
          ...merged,
          handle: handle || merged.handle,
          bio: typeof insights.bio === "string" ? insights.bio : merged.bio,
          avatar: typeof insights.profilePictureUrl === "string" ? insights.profilePictureUrl : merged.avatar,
          banner: typeof insights.bannerUrl === "string" ? insights.bannerUrl : merged.banner,
          followerCount: typeof insights.followerCount === "number" ? insights.followerCount : merged.followerCount,
          friends: mapFriends(insights.topFollowers),
        };
      }

      if (handle) {
        const previewRes = await fetch(`/api/template-preview/${handle}`, { cache: "no-store" });
        if (previewRes.ok) {
          const preview = await previewRes.json();
          merged = {
            ...merged,
            handle,
            bio: typeof preview.bio === "string" && preview.bio ? preview.bio : merged.bio,
            avatar:
              typeof preview.avatar === "string"
                ? (isXHostedAvatar(preview.avatar) && !!merged.avatar && !isXHostedAvatar(merged.avatar)
                    ? merged.avatar
                    : preview.avatar)
                : merged.avatar,
            banner: typeof preview.banner === "string" ? preview.banner : merged.banner,
            followerCount: typeof preview.followerCount === "number" ? preview.followerCount : merged.followerCount,
            friends: merged.friends.length ? merged.friends : mapFriends(preview.friends),
            posts: Array.isArray(preview.posts) ? preview.posts : merged.posts,
            products: Array.isArray(preview.products) ? preview.products : merged.products,
          };
        }
      }

      const finalized = {
        ...merged,
        products: seedProductsFromPosts(merged),
      };

      setPreviewData(finalized);
      setSyncState("ready");
      setSyncMessage(handle ? `Synced X data for @${handle}.` : "Loaded builder context.");
      setDocument((current) => touchDocument({
        ...current,
        meta: {
          ...current.meta,
          handle: handle || current.meta.handle,
          name: current.meta.name === `@${current.meta.handle} storefront` || !current.meta.name
            ? `@${handle || current.meta.handle || "creator"} storefront`
            : current.meta.name,
        },
      }));
      return finalized;
    } catch {
      setSyncState("error");
      setSyncMessage("Could not refresh X data. The builder is using fallback preview content.");
      return null;
    }
  }

  async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const data = await response.json().catch(() => null);
      return { response, data };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function importFromX(options: { includeProducts: boolean }) {
    setSyncState("loading");
    setSyncMessage(options.includeProducts ? "Importing profile + product context from X..." : "Importing latest profile media from X...");

    let importNotice = "";
    let diagnosticsNotice = "";
    let importSucceeded = false;
    let importedAvatarUrl: string | null = null;
    let importedBannerUrl: string | null = null;
    try {
      const { response, data } = await fetchJsonWithTimeout("/api/stores/import-x-data", { method: "POST" }, 25000);
      if (response.ok) {
        const postsImported = typeof data?.summary?.postsImported === "number" ? data.summary.postsImported : 0;
        importNotice = `Imported X profile data (${postsImported} posts analyzed).`;
        const uploadPfp = typeof data?.summary?.diagnostics?.uploadIds?.profilePicture === "string"
          ? data.summary.diagnostics.uploadIds.profilePicture
          : "none";
        const uploadBanner = typeof data?.summary?.diagnostics?.uploadIds?.backgroundBanner === "string"
          ? data.summary.diagnostics.uploadIds.backgroundBanner
          : "none";
        const fieldPfp = typeof data?.summary?.diagnostics?.profileFieldIds?.profilePicture === "string"
          ? data.summary.diagnostics.profileFieldIds.profilePicture
          : "none";
        const fieldBanner = typeof data?.summary?.diagnostics?.profileFieldIds?.backgroundBanner === "string"
          ? data.summary.diagnostics.profileFieldIds.backgroundBanner
          : "none";
        const mediaUrlPfp = typeof data?.summary?.diagnostics?.mediaUrls?.profilePicture === "string"
          ? data.summary.diagnostics.mediaUrls.profilePicture
          : "none";
        const mediaUrlBanner = typeof data?.summary?.diagnostics?.mediaUrls?.backgroundBanner === "string"
          ? data.summary.diagnostics.mediaUrls.backgroundBanner
          : "none";

        importedAvatarUrl = typeof data?.summary?.diagnostics?.mediaUrls?.profilePicture === "string"
          ? data.summary.diagnostics.mediaUrls.profilePicture
          : null;
        importedBannerUrl = typeof data?.summary?.diagnostics?.mediaUrls?.backgroundBanner === "string"
          ? data.summary.diagnostics.mediaUrls.backgroundBanner
          : null;

        diagnosticsNotice = ` Sync diagnostics: upload(profile=${uploadPfp}, banner=${uploadBanner}); fields(profile=${fieldPfp}, banner=${fieldBanner}); urls(profile=${mediaUrlPfp}, banner=${mediaUrlBanner}).`;
        importSucceeded = true;
      } else {
        if (response.status === 401) {
          importNotice = "X authorization expired. Reconnect X from your account session, then retry import.";
        } else {
          importNotice = typeof data?.error === "string" ? data.error : "X import endpoint unavailable.";
        }
      }
    } catch {
      importNotice = "X import request timed out; using latest available preview data.";
    }

    const synced = await loadPreviewData();
    const productCount = synced?.products.length ?? previewData.products.length;
    const successSuffix = options.includeProducts ? ` Products ready: ${productCount}.` : "";
    const finalMessage = `${importNotice}${successSuffix}${diagnosticsNotice}`.trim();

    if (importedAvatarUrl || importedBannerUrl) {
      setPreviewData((current) => ({
        ...current,
        avatar: importedAvatarUrl || current.avatar,
        banner: importedBannerUrl || current.banner,
      }));
    }

    setSyncMessage(finalMessage || "Import complete.");
    setPersistMessage(finalMessage || "Import complete.");
    setAiMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: options.includeProducts
          ? importSucceeded
            ? `${importNotice} Product catalog is ready in preview.`
            : `${importNotice} Product sync was not applied.`
          : importSucceeded
            ? `${importNotice} Avatar and banner are refreshed in preview.`
            : `${importNotice} Avatar/banner sync was not applied.`,
      },
    ]);
    // Keep the user in their current step so sync actions do not skip AI editing.
  }

  async function loadBuilds() {
    setBuildsLoading(true);
    try {
      const { response, data } = await fetchJsonWithTimeout("/api/builds", { cache: "no-store" }, 15000);
      if (!response.ok) {
        const message = typeof data?.error === "string" ? data.error : "Could not load saved builds.";
        setPersistMessage(message);
        setBuilds([]);
        return;
      }

      const nextBuilds = Array.isArray(data?.builds) ? data.builds : [];
      setBuilds(nextBuilds);

      const live = [...nextBuilds].reverse().find((build) => build?.published === true);
      if (live?.id) {
        setPublishInfo((current) => ({
          currentPublishedId: live.id,
          previousPublishedId: current?.previousPublishedId || null,
          publishedAtIso: current && current.currentPublishedId === live.id ? current.publishedAtIso : new Date().toISOString(),
        }));
      }

      if (!hydratedFromBuild.current) {
        const firstLoadable = [...nextBuilds].reverse().find((build) => parseStoredBuilderDocument(build.code));
        if (firstLoadable) {
          const parsed = parseStoredBuilderDocument(firstLoadable.code);
          if (parsed) {
            hydratedFromBuild.current = true;
            setDocument(parsed);
            setSelectedBlockId(parsed.blocks[0]?.id ?? null);
            setPersistMessage(`Loaded ${firstLoadable.published ? "published" : "draft"} snapshot: ${firstLoadable.label}`);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "Loading builds timed out. Please try again."
        : "Could not load saved builds.";
      setPersistMessage(message);
      setBuilds([]);
    } finally {
      setBuildsLoading(false);
    }
  }

  useEffect(() => {
    void loadPreviewData();
    void loadBuilds();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(step2ModeStorageKey) || localStorage.getItem(step2ModeGlobalStorageKey);
      if (saved === "basic" || saved === "advanced") {
        setStep2Mode(saved);
      }
    } catch {
      // Non-critical if storage is unavailable.
    }
  }, [step2ModeStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(step2ModeStorageKey, step2Mode);
      localStorage.setItem(step2ModeGlobalStorageKey, step2Mode);
    } catch {
      // Non-critical if storage is unavailable.
    }
  }, [step2Mode, step2ModeStorageKey]);

  useEffect(() => {
    if (!selectedBlockId && document.blocks[0]) {
      setSelectedBlockId(document.blocks[0].id);
    }
  }, [document.blocks, selectedBlockId]);

  function insertBlock(type: BuilderBlockType, index = document.blocks.length) {
    const nextBlock = createBlock(type);
    updateDocument((current) => {
      const blocks = [...current.blocks];
      blocks.splice(index, 0, nextBlock);
      return { ...current, blocks: reflowBuilderBlocks(blocks) };
    });
    setSelectedBlockId(nextBlock.id);
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
  }

  function moveBlock(blockId: string, targetIndex: number) {
    updateDocument((current) => {
      const currentIndex = current.blocks.findIndex((block) => block.id === blockId);
      if (currentIndex < 0) return current;

      const blocks = [...current.blocks];
      const [moved] = blocks.splice(currentIndex, 1);
      const normalizedIndex = Math.max(0, Math.min(targetIndex, blocks.length));
      blocks.splice(normalizedIndex, 0, moved);
      return { ...current, blocks: reflowBuilderBlocks(blocks) };
    });
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    const newType = event.dataTransfer.getData("application/x-builder-new");
    const existingId = event.dataTransfer.getData("application/x-builder-existing");

    if (newType) {
      insertBlock(newType as BuilderBlockType, index);
      return;
    }

    if (existingId) {
      moveBlock(existingId, index);
    }
  }

  function getSlotPlacement(slotId: TemplateSlotId) {
    return TEMPLATE_SLOTS.find((slot) => slot.id === slotId) || TEMPLATE_SLOTS[0];
  }

  function isColumnSlot(slotId: TemplateSlotId): boolean {
    return slotId === "left" || slotId === "center" || slotId === "right";
  }

  function slotLimit(slotId: TemplateSlotId): number {
    return TEMPLATE_SLOT_LIMITS[slotId];
  }

  function findBlocksInSlotFrom(blocks: BuilderBlock[], slotId: TemplateSlotId): BuilderBlock[] {
    const placement = getSlotPlacement(slotId);
    return blocks
      .filter((block) => {
        const matchesColumn =
          block.gridColumn === placement.gridColumn && block.gridSpan === placement.gridSpan;
        if (!matchesColumn) return false;

        return isColumnSlot(slotId)
          ? block.gridRow >= placement.gridRow
          : block.gridRow === placement.gridRow;
      })
      .sort((left, right) => left.gridRow - right.gridRow);
  }

  function findBlocksInSlot(slotId: TemplateSlotId): BuilderBlock[] {
    return findBlocksInSlotFrom(document.blocks, slotId);
  }

  function findPrimaryBlockInSlot(slotId: TemplateSlotId): BuilderBlock | null {
    return findBlocksInSlot(slotId)[0] || null;
  }

  function removeBlocksInSlot(blocks: BuilderBlock[], slotId: TemplateSlotId): BuilderBlock[] {
    const placement = getSlotPlacement(slotId);
    return blocks.filter((block) => {
      const matchesColumn =
        block.gridColumn === placement.gridColumn && block.gridSpan === placement.gridSpan;
      if (!matchesColumn) return true;

      return isColumnSlot(slotId)
        ? block.gridRow < placement.gridRow
        : block.gridRow !== placement.gridRow;
    });
  }

  function nextRowForSlot(blocks: BuilderBlock[], slotId: TemplateSlotId): number {
    const placement = getSlotPlacement(slotId);
    if (!isColumnSlot(slotId)) return placement.gridRow;

    const inSlot = blocks.filter(
      (block) =>
        block.gridColumn === placement.gridColumn &&
        block.gridSpan === placement.gridSpan &&
        block.gridRow >= placement.gridRow
    );

    if (inSlot.length === 0) return placement.gridRow;
    return Math.max(...inSlot.map((block) => block.gridRow)) + 1;
  }

  function isRecommendedForSlot(slotId: TemplateSlotId, type: BuilderBlockType): boolean {
    return SLOT_GUIDANCE[slotId].recommended.includes(type);
  }

  function isSlotAtCapacity(
    blocks: BuilderBlock[],
    slotId: TemplateSlotId,
    movingBlockId?: string
  ): boolean {
    if (!isColumnSlot(slotId)) return false;

    const inSlot = findBlocksInSlotFrom(blocks, slotId);
    if (movingBlockId) {
      const movingBlock = blocks.find((block) => block.id === movingBlockId);
      if (movingBlock && inSlot.some((block) => block.id === movingBlock.id)) {
        return false;
      }
    }

    return inSlot.length >= slotLimit(slotId);
  }

  function recommendedSlotsForType(type: BuilderBlockType): TemplateSlotId[] {
    return (Object.keys(SLOT_GUIDANCE) as TemplateSlotId[]).filter((slotId) =>
      SLOT_GUIDANCE[slotId].recommended.includes(type)
    );
  }

  function placeBlockInTemplateSlot(blockId: string, slotId: TemplateSlotId) {
    const placement = getSlotPlacement(slotId);
    if (isSlotAtCapacity(document.blocks, slotId, blockId)) {
      setPersistMessage(`${placement.label} is full (${slotLimit(slotId)} max). Move or remove a block first.`);
      return;
    }

    updateDocument((current) => {
      const baseBlocks = isColumnSlot(slotId)
        ? current.blocks
        : removeBlocksInSlot(current.blocks.filter((block) => block.id !== blockId), slotId);
      const targetRow = nextRowForSlot(baseBlocks, slotId);

      const blocks = baseBlocks.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          gridRow: targetRow,
          gridColumn: placement.gridColumn,
          gridSpan: placement.gridSpan,
        };
      });

      return { ...current, blocks: normalizeBuilderBlocks(blocks) };
    });

    setSelectedBlockId(blockId);
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
    setPersistMessage(`Placed block in ${placement.label}.`);
  }

  function addBlockToTemplateSlot(type: BuilderBlockType, slotId: TemplateSlotId) {
    const placement = getSlotPlacement(slotId);
    if (isSlotAtCapacity(document.blocks, slotId)) {
      setPersistMessage(`${placement.label} is full (${slotLimit(slotId)} max). Remove one to add another.`);
      return;
    }

    const nextBlock = createBlock(type);

    updateDocument((current) => {
      const withoutReplaced = isColumnSlot(slotId)
        ? current.blocks
        : removeBlocksInSlot(current.blocks, slotId);
      const targetRow = nextRowForSlot(withoutReplaced, slotId);

      const blocks = [
        ...withoutReplaced,
        {
          ...nextBlock,
          gridRow: targetRow,
          gridColumn: placement.gridColumn,
          gridSpan: placement.gridSpan,
        },
      ];

      return { ...current, blocks: normalizeBuilderBlocks(blocks) };
    });

    setSelectedBlockId(nextBlock.id);
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
    setPersistMessage(
      isRecommendedForSlot(slotId, type)
        ? `Added ${type} to ${placement.label}.`
        : `Added ${type} to ${placement.label}. Tip: ${SLOT_GUIDANCE[slotId].hint}`
    );
  }

  function handleTemplateSlotDrop(event: React.DragEvent<HTMLDivElement>, slotId: TemplateSlotId) {
    event.preventDefault();
    const newType = event.dataTransfer.getData("application/x-builder-new");
    const existingId = event.dataTransfer.getData("application/x-builder-existing");

    if (newType) {
      addBlockToTemplateSlot(newType as BuilderBlockType, slotId);
    } else if (existingId) {
      const movedType = document.blocks.find((block) => block.id === existingId)?.type;
      placeBlockInTemplateSlot(existingId, slotId);
      if (movedType && !isRecommendedForSlot(slotId, movedType)) {
        setPersistMessage(`Placed ${movedType} in ${getSlotPlacement(slotId).label}. Tip: ${SLOT_GUIDANCE[slotId].hint}`);
      }
    }

    setGridDragOverCell(null);
  }

  function addBlockToAdvancedGrid(type: BuilderBlockType, gridRow: number, gridColumn: number) {
    const nextBlock = createBlock(type);
    updateDocument((current) => {
      const blocks = [
        ...current.blocks,
        {
          ...nextBlock,
          gridRow: Math.max(1, gridRow),
          gridColumn: Math.max(1, Math.min(12, gridColumn)),
        },
      ];
      return {
        ...current,
        blocks: normalizeBuilderBlocks(blocks),
      };
    });

    setSelectedBlockId(nextBlock.id);
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
    setPersistMessage(`Added ${type} to advanced grid.`);
  }

  function handleAdvancedGridCellDrop(event: React.DragEvent<HTMLDivElement>, gridRow: number, gridColumn: number) {
    event.preventDefault();
    const newType = event.dataTransfer.getData("application/x-builder-new");
    const existingId = event.dataTransfer.getData("application/x-builder-existing");

    if (newType) {
      addBlockToAdvancedGrid(newType as BuilderBlockType, gridRow, gridColumn);
    } else if (existingId) {
      updateBlockGrid(existingId, { gridRow, gridColumn }, { announce: false });
      setSelectedBlockId(existingId);
      setPersistMessage(`Moved block to row ${gridRow}, column ${gridColumn}.`);
    }

    setGridDragOverCell(null);
  }

  function applyTemplatePreset(presetId: "social" | "shop" | "community") {
    const preset = TEMPLATE_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;

    updateDocument((current) => {
      let retained = current.blocks;
      for (const slot of TEMPLATE_SLOTS) {
        retained = removeBlocksInSlot(retained, slot.id);
      }

      const slotBlocks: BuilderBlock[] = [];

      const headerBlock = createBlock(preset.slots.header);
      slotBlocks.push({
        ...headerBlock,
        gridRow: getSlotPlacement("header").gridRow,
        gridColumn: getSlotPlacement("header").gridColumn,
        gridSpan: getSlotPlacement("header").gridSpan,
      });

      const menuBlock = createBlock(preset.slots.menu);
      slotBlocks.push({
        ...menuBlock,
        gridRow: getSlotPlacement("menu").gridRow,
        gridColumn: getSlotPlacement("menu").gridColumn,
        gridSpan: getSlotPlacement("menu").gridSpan,
      });

      const zoneSlots: Array<"left" | "center" | "right"> = ["left", "center", "right"];
      for (const zone of zoneSlots) {
        const placement = getSlotPlacement(zone);
        const zoneBlocks = preset.slots[zone];
        zoneBlocks.forEach((type, index) => {
          const block = createBlock(type);
          slotBlocks.push({
            ...block,
            gridRow: placement.gridRow + index,
            gridColumn: placement.gridColumn,
            gridSpan: placement.gridSpan,
          });
        });
      }

      return {
        ...current,
        blocks: normalizeBuilderBlocks([...retained, ...slotBlocks]),
      };
    });

    setSelectedBlockId(null);
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
    setPersistMessage(`Applied ${preset.label} slot preset.`);
  }

  function clearTemplateSlots() {
    updateDocument((current) => {
      let retained = current.blocks;
      for (const slot of TEMPLATE_SLOTS) {
        retained = removeBlocksInSlot(retained, slot.id);
      }
      return {
        ...current,
        blocks: normalizeBuilderBlocks(retained),
      };
    });
    setSelectedBlockId(null);
    setPersistMessage("Template slots cleared.");
  }

  function continueFromGridStep() {
    setWizardProgress((current) => ({ ...current, layoutArranged: true }));
    setWizardStep(3);
  }

  async function persistDocument(published: boolean) {
    setPersisting(published ? "publish" : "draft");
    setPersistMessage(published ? "Publishing storefront..." : "Saving draft...");

    const nextDocument = touchDocument(document);
    setDocument(nextDocument);
    const previouslyPublished = builds.find((build) => build.published);

    try {
      const { response, data } = await fetchJsonWithTimeout("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: fallbackBuildLabel(nextDocument, published),
          code: JSON.stringify(nextDocument),
          published,
        }),
      });

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Build persistence failed.");
      }

      const payload = (data ?? null) as { build?: { id?: string } } | null;

      if (published) {
        if (!payload?.build?.id) {
          throw new Error("Publish failed: server did not return a live build id.");
        }
        setPublishInfo({
          currentPublishedId: payload.build.id,
          previousPublishedId: previouslyPublished?.id || null,
          publishedAtIso: new Date().toISOString(),
        });
      }

      setPersistMessage(published ? "Published to your live store." : "Draft saved successfully.");
      if (published) {
        setWizardProgress((current) => ({ ...current, published: true }));
      }
      await loadBuilds();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Build persistence failed.";
      if (error instanceof Error && error.name === "AbortError") {
        setPersistMessage("Publish timed out. No changes were confirmed.");
      } else if (errorText.includes("permission is required") || errorText.includes("PATCH failed (403)")) {
        setPersistMessage("Save is blocked by Drupal permissions. Please ask ops to grant API write access for creator profile/store content.");
      } else {
        setPersistMessage(errorText);
      }
    } finally {
      setPersisting(null);
    }
  }

  function loadSavedBuild(build: SavedBuild) {
    const parsed = parseStoredBuilderDocument(build.code);
    if (!parsed) {
      setPersistMessage(`Cannot load ${build.label} because it uses the legacy builder format.`);
      return;
    }

    hydratedFromBuild.current = true;
    setDocument(parsed);
    setSelectedBlockId(parsed.blocks[0]?.id ?? null);
    setPersistMessage(`Loaded ${build.label}.`);
  }

  async function publishExistingBuild(buildId: string) {
    setPersisting("publish");
    setPersistMessage("Publishing selected build...");
    const previouslyPublished = builds.find((build) => build.published);

    try {
      const { response, data } = await fetchJsonWithTimeout("/api/builds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: buildId, published: true }),
      });

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not publish build.");
      }

      setPersistMessage("Selected build is now live.");
      setPublishInfo({
        currentPublishedId: buildId,
        previousPublishedId: previouslyPublished?.id === buildId ? null : previouslyPublished?.id || null,
        publishedAtIso: new Date().toISOString(),
      });
      await loadBuilds();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setPersistMessage("Publishing timed out. Please retry.");
      } else {
        setPersistMessage(error instanceof Error ? error.message : "Could not publish build.");
      }
    } finally {
      setPersisting(null);
    }
  }

  async function undoPublish() {
    if (!publishInfo) return;

    setPersisting("publish");
    setPersistMessage("Reverting publish...");

    try {
      if (publishInfo.previousPublishedId) {
        const { response: restoreRes, data } = await fetchJsonWithTimeout("/api/builds", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: publishInfo.previousPublishedId, published: true }),
        });

        if (!restoreRes.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not restore previous live build.");
        }

        setPersistMessage("Undo complete. Previous live build restored.");
      } else {
        const { response: unpublishRes, data } = await fetchJsonWithTimeout("/api/builds", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: publishInfo.currentPublishedId, published: false }),
        });

        if (!unpublishRes.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not clear live build.");
        }

        setPersistMessage("Undo complete. No build is currently live.");
      }

      setWizardProgress((current) => ({ ...current, published: false }));
      setPublishInfo(null);
      await loadBuilds();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setPersistMessage("Undo timed out. Please retry.");
      } else {
        setPersistMessage(error instanceof Error ? error.message : "Undo publish failed.");
      }
    } finally {
      setPersisting(null);
    }
  }

  async function deleteBuild(buildId: string) {
    setPersistMessage("Deleting build...");

    try {
      const { response, data } = await fetchJsonWithTimeout("/api/builds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: buildId }),
      });

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not delete build.");
      }

      setPersistMessage("Build deleted.");
      await loadBuilds();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setPersistMessage("Delete timed out. Please retry.");
      } else {
        setPersistMessage(error instanceof Error ? error.message : "Could not delete build.");
      }
    }
  }

  function applyStarterLayout(layoutId: StarterLayoutId) {
    const selected = STARTER_LAYOUTS.find((layout) => layout.id === layoutId) || STARTER_LAYOUTS[0];
    const blocks = selected.blocks.map((type) => createBlock(type));

    updateDocument((current) => ({
      ...current,
      meta: {
        ...current.meta,
        name: `@${previewData.handle || current.meta.handle} ${selected.title} site`,
      },
      blocks: reflowBuilderBlocks(blocks),
    }));

    setSelectedBlockId(blocks[0]?.id ?? null);
    setSelectedStarterLayout(selected.id);
    setSelectedThemePreset(null);
    setPersistMessage(`Started from ${selected.title} layout.`);
    setWizardProgress((current) => ({ ...current, stylePicked: !!selectedThemePreset }));
  }

  function applyThemePreset(presetId: Exclude<ThemePresetId, "custom">) {
    if (!selectedStarterLayout) {
      setPersistMessage("Pick a starter base first, then choose a color scheme.");
      return;
    }
    const selected = THEME_PRESETS.find((preset) => preset.id === presetId) || THEME_PRESETS[0];
    updateDocument((current) => ({ ...current, theme: selected.theme }));
    setSelectedThemePreset(selected.id);
    setPersistMessage(`Applied ${selected.label} theme.`);
    setWizardProgress((current) => ({ ...current, stylePicked: !!selectedStarterLayout }));
  }

  function updateThemeField(field: keyof BuilderTheme, value: string) {
    updateDocument((current) => ({
      ...current,
      theme: {
        ...current.theme,
        [field]: value,
      },
    }));
    setSelectedThemePreset("custom");
    setWizardProgress((current) => ({ ...current, stylePicked: !!selectedStarterLayout }));
    setPersistMessage("Custom colors updated.");
  }

  function continueFromStyleStep() {
    const styleReady = !!selectedStarterLayout && !!selectedThemePreset;
    if (!styleReady) {
      setPersistMessage("Select both a starter layout and a color scheme before continuing.");
      return;
    }

    setWizardProgress((current) => ({ ...current, stylePicked: true }));
    setWizardStep(2);
  }

  function applyAiActions(actions: AiAction[]) {
    let changed = 0;

    updateDocument((current) => {
      let next = { ...current, blocks: [...current.blocks], theme: { ...current.theme } };

      for (const action of actions) {
        if (action.type === "add_block") {
          if (!BLOCK_LIBRARY.some((item) => item.type === action.blockType)) continue;
          next.blocks.push(createBlock(action.blockType));
          changed += 1;
          continue;
        }

        if (action.type === "remove_block") {
          const index = next.blocks.findIndex((block) => block.type === action.blockType);
          if (index >= 0) {
            next.blocks.splice(index, 1);
            changed += 1;
          }
          continue;
        }

        if (action.type === "set_name") {
          const nextName = action.name.trim() || next.meta.name;
          next.meta = { ...next.meta, name: nextName };
          const heroIndex = next.blocks.findIndex((block) => block.type === "profile-header");
          if (heroIndex >= 0) {
            const hero = next.blocks[heroIndex];
            if (hero.type === "profile-header") {
              next.blocks[heroIndex] = {
                ...hero,
                title: nextName,
              };
            }
          }
          changed += 1;
          continue;
        }

        if (action.type === "set_theme") {
          if (!THEME_FIELDS.some((field) => field.key === action.field)) continue;
          next.theme[action.field] = action.value;
          changed += 1;
          continue;
        }

        if (action.type === "set_block_prop") {
          const index = next.blocks.findIndex((block) => block.type === action.blockType);
          if (index < 0) continue;

          const target = next.blocks[index] as unknown as Record<string, unknown>;
          if (!(action.key in target)) continue;
          target[action.key] = action.value;
          next.blocks[index] = target as unknown as BuilderBlock;
          changed += 1;
        }
      }

      return {
        ...next,
        blocks: normalizeBuilderBlocks(next.blocks),
      };
    });

    setPersistMessage(changed > 0 ? `AI copilot applied ${changed} change${changed === 1 ? "" : "s"}.` : "AI did not find safe changes to apply.");
  }

  async function runAiCopilot(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || aiLoading) return;

    const lower = trimmed.toLowerCase();
    const asksForProductImport =
      lower.includes("import") && (lower.includes("product") || lower.includes("shop") || lower.includes("catalog"));
    const asksForAvatarSync =
      lower.includes("pfp") ||
      lower.includes("avatar") ||
      lower.includes("profile pic") ||
      lower.includes("profile picture") ||
      (lower.includes("import") && lower.includes("photo"));

    if (asksForAvatarSync || asksForProductImport) {
      setAiMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      await importFromX({ includeProducts: asksForProductImport });
      return;
    }

    setAiLoading(true);
    setAiPrompt("");
    setAiMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    const summary = {
      handle: previewData.handle || document.meta.handle,
      blockTypes: document.blocks.map((block) => block.type),
      hasProducts: previewData.products.length > 0,
      hasPosts: previewData.posts.length > 0,
      theme: document.theme,
    };

    const message = [
      "You are a website builder copilot.",
      "Return strict JSON only.",
      "Schema: { summary: string, actions: AiAction[] }.",
      "AiAction types:",
      "1) { type: 'add_block', blockType: 'top-menu'|'profile-header'|'sidebar'|'friends-list'|'post-feed'|'product-grid'|'media-widget'|'custom-embed' }",
      "2) { type: 'remove_block', blockType: ... }",
      "3) { type: 'set_name', name: string }",
      "4) { type: 'set_theme', field: 'pageBg'|'menuBg'|'sidebarBg'|'surface'|'surfaceMuted'|'accent'|'textPrimary'|'textSecondary'|'border', value: string }",
      "5) { type: 'set_block_prop', blockType: ..., key: string, value: string|number|boolean }",
      "Keep actions safe and minimal.",
      `Current builder state: ${JSON.stringify(summary)}`,
      `User request: ${trimmed}`,
    ].join("\n");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, theme: "builder-copilot" }),
      });

      if (!response.ok) {
        throw new Error("AI copilot request failed.");
      }

      const raw = await response.text();
      const parsed = extractAiPayload(raw);
      const aiActions = Array.isArray(parsed?.actions) ? parsed?.actions : [];
      const actions = aiActions.length > 0 ? aiActions : buildFallbackActionsFromPrompt(trimmed);

      if (actions.length > 0) {
        applyAiActions(actions);
        setWizardProgress((current) => ({ ...current, layoutArranged: true }));
        advanceWizard(3);
      }

      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: parsed?.summary || (actions.length > 0 ? `Applied ${actions.length} AI actions.` : "I reviewed your request but could not map it to safe changes. Try mentioning specific blocks like menu, friends, posts, or shop."),
        },
      ]);
    } catch (error) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "AI copilot failed. Please try again.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/55 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Guided Builder</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Build Your Storefront</h1>
        <p className="mt-2 text-sm text-zinc-400">Pick a starter layout, then a color preset, then arrange your grid in the steps below.</p>
      </div>

      <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/55 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">3-Step Wizard</p>
            <p className="mt-2 text-sm text-zinc-300">Step {wizardStep} of 3. Choose style, arrange your grid, then publish.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  const requested = step as 1 | 2 | 3;
                  if (requested > 1 && !styleReady) {
                    setPersistMessage("Pick both a starter layout and a color scheme before opening the next step.");
                    return;
                  }
                  setWizardStep(requested);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${wizardStep === step ? "bg-cyan-400 text-slate-950" : "border border-zinc-700 text-zinc-300"}`}
              >
                Step {step}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">What Happens Next</p>
          <div className="mt-2 space-y-2 text-sm text-zinc-300">
            <ChecklistItem done={wizardProgress.stylePicked} label="1. Pick a starter layout and color scheme" />
            <ChecklistItem done={wizardProgress.layoutArranged} label="2. Arrange your component grid with drag and drop" />
            <ChecklistItem done={wizardProgress.published} label="3. Save draft, then publish live" />
          </div>
        </div>

        {wizardStep === 1 ? (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">1) Pick a starter base</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {STARTER_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => applyStarterLayout(layout.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition hover:border-zinc-600 ${selectedStarterLayout === layout.id ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-800 bg-zinc-950/70"}`}
                >
                  <p className="text-sm font-semibold text-white">Start {layout.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{layout.blocks.join(" • ")}</p>
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">2) Pick a color scheme</p>
            {!selectedStarterLayout ? (
              <p className="mt-2 text-sm text-zinc-500">Choose a starter base in step 1 first, then select a preset here.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyThemePreset(preset.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${selectedThemePreset === preset.id ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white"}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              <p className="mb-2 text-xs text-zinc-500">Next action: choose both a starter and a color scheme.</p>
              <button
                type="button"
                onClick={continueFromStyleStep}
                disabled={!selectedStarterLayout || !selectedThemePreset}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Grid Builder
              </button>
            </div>
          </>
        ) : null}

        {wizardStep === 2 ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">Choose Basic for guided slots or Advanced for free placement.</p>
              <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950/60 p-1">
                <button
                  type="button"
                  onClick={() => setStep2Mode("basic")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${step2Mode === "basic" ? "bg-cyan-400 text-slate-950" : "text-zinc-300 hover:text-white"}`}
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => setStep2Mode("advanced")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${step2Mode === "advanced" ? "bg-cyan-400 text-slate-950" : "text-zinc-300 hover:text-white"}`}
                >
                  Advanced
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-400">
              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">Build checklist</p>
              <ul className="space-y-1">
                <li>{hasMenuSlot ? "[x]" : "[ ]"} Add a top menu slot</li>
                <li>{hasHeaderSlot ? "[x]" : "[ ]"} Add a profile header slot</li>
                <li>{filledColumnSlots >= 2 ? "[x]" : "[ ]"} Fill at least 2 of 3 columns</li>
                <li>{hasCommerceOrContentAnchor ? "[x]" : "[ ]"} Include at least one posts or products block</li>
              </ul>
              {step2Mode === "basic" ? (
                <p className="mt-2 text-zinc-500">Basic tip: start with a preset, then swap only one or two slots.</p>
              ) : (
                <p className="mt-2 text-zinc-500">Advanced tip: place your strongest conversion block in row 3, column 2 for center focus.</p>
              )}
            </div>

            {step2Mode === "basic" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Components</p>
                <div className="space-y-2">
                  {BLOCK_LIBRARY.map((item) => (
                    <div
                      key={`wizard-grid-${item.type}`}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("application/x-builder-new", item.type)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2"
                    >
                      {(() => {
                        const slots = recommendedSlotsForType(item.type);
                        const slotNames = slots.map((slotId) => getSlotPlacement(slotId).label).join(", ");
                        return (
                          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                            Best in: {slotNames || "Any slot"}
                          </p>
                        );
                      })()}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-white">{item.label}</p>
                          <p className="text-[11px] text-zinc-500">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {TEMPLATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyTemplatePreset(preset.id)}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearTemplateSlots}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                  >
                    Clear
                  </button>
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Center Template</p>
                <div className="space-y-3">
                  {TEMPLATE_SLOTS.filter((slot) => slot.id === "header" || slot.id === "menu").map((slot) => {
                    const block = findPrimaryBlockInSlot(slot.id);
                    const isOver = gridDragOverCell === slot.id;
                    const slotGuide = SLOT_GUIDANCE[slot.id];
                    const blockLabel = block
                      ? BLOCK_LIBRARY.find((item) => item.type === block.type)?.label || block.type
                      : null;
                    const showMismatch = !!block && !isRecommendedForSlot(slot.id, block.type);

                    return (
                      <div
                        key={slot.id}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setGridDragOverCell(slot.id);
                        }}
                        onDrop={(event) => handleTemplateSlotDrop(event, slot.id)}
                        className={`rounded-xl border px-4 py-4 transition ${isOver ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-700 bg-zinc-900/70"}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{slot.label}</p>
                          <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{slotGuide.iconLabel}</span>
                        </div>
                        <p className="mb-2 text-[11px] text-zinc-500">{slotGuide.hint}</p>
                        {block ? (
                          <div
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData("application/x-builder-existing", block.id)}
                            onClick={() => setSelectedBlockId(block.id)}
                            className="cursor-grab rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-white">{blockLabel}</p>
                            <p className="text-xs text-zinc-500">Drag to another slot to move</p>
                            {showMismatch ? (
                              <p className="mt-1 text-[11px] text-amber-300">Not a typical fit for this slot.</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">Drop a component here</p>
                        )}
                      </div>
                    );
                  })}

                  <div className="grid gap-3 md:grid-cols-12">
                    {TEMPLATE_SLOTS.filter((slot) => slot.id === "left" || slot.id === "center" || slot.id === "right").map((slot) => {
                      const blocks = findBlocksInSlot(slot.id);
                      const isOver = gridDragOverCell === slot.id;
                      const slotGuide = SLOT_GUIDANCE[slot.id];
                      const zoneWidthClass = slot.id === "center" ? "md:col-span-6" : "md:col-span-3";
                      const limit = slotLimit(slot.id);
                      const isAtLimit = blocks.length >= limit;

                      return (
                        <div
                          key={slot.id}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setGridDragOverCell(slot.id);
                          }}
                          onDrop={(event) => handleTemplateSlotDrop(event, slot.id)}
                          className={`${zoneWidthClass} min-h-[140px] rounded-xl border px-3 py-3 transition ${isOver ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-700 bg-zinc-900/70"}`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{slot.label}</p>
                            <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{slotGuide.iconLabel}</span>
                          </div>
                          <p className="mb-2 text-[11px] text-zinc-500">{slotGuide.hint}</p>
                          <p className={`mb-2 text-[11px] ${isAtLimit ? "text-amber-300" : "text-zinc-500"}`}>
                            {blocks.length}/{limit} used{isAtLimit ? " - zone full" : ""}
                          </p>
                          {blocks.length === 0 ? (
                            <p className="text-xs text-zinc-500">Drop a component here</p>
                          ) : (
                            <div className="space-y-2">
                              {blocks.map((block) => {
                                const blockLabel =
                                  BLOCK_LIBRARY.find((item) => item.type === block.type)?.label || block.type;
                                const showMismatch = !isRecommendedForSlot(slot.id, block.type);
                                return (
                                  <div
                                    key={`slot-${slot.id}-${block.id}`}
                                    draggable
                                    onDragStart={(event) => event.dataTransfer.setData("application/x-builder-existing", block.id)}
                                    onClick={() => setSelectedBlockId(block.id)}
                                    className="cursor-grab rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2"
                                  >
                                    <p className="text-sm font-medium text-white">{blockLabel}</p>
                                    <p className="text-xs text-zinc-500">Drag to another slot to move</p>
                                    {showMismatch ? (
                                      <p className="mt-1 text-[11px] text-amber-300">Not a typical fit for this slot.</p>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Components</p>
                <div className="space-y-2">
                  {BLOCK_LIBRARY.map((item) => (
                    <div
                      key={`wizard-advanced-${item.type}`}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("application/x-builder-new", item.type)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-white">{item.label}</p>
                      <p className="text-[11px] text-zinc-500">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Advanced Grid</p>
                <div className="grid min-h-[300px] grid-cols-1 gap-2 rounded-xl border border-dashed border-zinc-700/80 bg-zinc-900/60 p-2 lg:grid-cols-12 lg:auto-rows-min">
                  {document.blocks.map((block) => {
                    const label = BLOCK_LIBRARY.find((item) => item.type === block.type)?.label || block.type;
                    return (
                      <div
                        key={`advanced-block-${block.id}`}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("application/x-builder-existing", block.id)}
                        onClick={() => setSelectedBlockId(block.id)}
                        style={{ gridColumn: `${block.gridColumn} / span ${block.gridSpan}`, gridRow: block.gridRow }}
                        className={`rounded-xl border px-3 py-3 text-left transition ${selectedBlockId === block.id ? "border-cyan-400 bg-cyan-500/10" : "border-zinc-700 bg-zinc-950/80 hover:border-zinc-500"}`}
                      >
                        <p className="text-xs font-semibold text-white">{label}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">row {block.gridRow} col {block.gridColumn} span {block.gridSpan}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-6 gap-1 lg:grid-cols-12">
                  {Array.from({ length: 72 }).map((_, index) => {
                    const row = Math.floor(index / 12) + 1;
                    const col = (index % 12) + 1;
                    const cellId = `adv-${row}-${col}`;
                    const isOver = gridDragOverCell === cellId;
                    return (
                      <div
                        key={cellId}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setGridDragOverCell(cellId);
                        }}
                        onDrop={(event) => handleAdvancedGridCellDrop(event, row, col)}
                        className={`h-6 rounded border text-center text-[10px] leading-6 ${isOver ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}
                      >
                        {row}:{col}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Selected Block</p>
                {selectedBlock ? (
                  <div className="space-y-3 text-xs text-zinc-400">
                    <p className="text-sm font-semibold text-white">{BLOCK_LIBRARY.find((item) => item.type === selectedBlock.type)?.label || selectedBlock.type}</p>
                    <label className="block">
                      <span className="mb-1 block">Row</span>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={selectedBlock.gridRow}
                        onChange={(event) => updateBlockGrid(selectedBlock.id, { gridRow: Number(event.target.value) || 1 })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block">Column</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={selectedBlock.gridColumn}
                        onChange={(event) => updateBlockGrid(selectedBlock.id, { gridColumn: Number(event.target.value) || 1 })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block">Span</span>
                      <select
                        value={selectedBlock.gridSpan}
                        onChange={(event) => updateBlockGrid(selectedBlock.id, { gridSpan: Number(event.target.value) || 4 })}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 12].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Select a block on the grid to edit placement.</p>
                )}
              </div>
            </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueFromGridStep}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Continue to Publish
              </button>
            </div>
          </>
        ) : null}

        {wizardStep === 3 ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
              {persistMessage}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              <span>Review preview, save draft, then publish when ready.</span>
              <button
                type="button"
                onClick={() => void persistDocument(false)}
                disabled={persisting !== null}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => void persistDocument(true)}
                disabled={persisting !== null}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Publish Live
              </button>
            </div>

            {publishInfo ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="font-semibold text-emerald-200">Published live</p>
                <p className="mt-1 text-xs text-emerald-200/80">{new Date(publishInfo.publishedAtIso).toLocaleString()}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/stores/${previewData.handle || document.meta.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-emerald-300/50 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200"
                  >
                    Open Live Store
                  </a>
                  <button
                    type="button"
                    onClick={() => void undoPublish()}
                    disabled={persisting !== null}
                    className="rounded-full border border-amber-300/50 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Undo Publish
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`grid gap-6 ${isGuidedMode ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[320px_minmax(0,1fr)_340px]"}`}>
        {!isGuidedMode ? <aside className="space-y-5 rounded-[28px] border border-zinc-800 bg-zinc-900/55 p-4">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Block Library</h2>
              <span className="text-xs text-zinc-500">Drag or click to add</span>
            </div>
            <div className="space-y-2">
              {BLOCK_LIBRARY.map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("application/x-builder-new", item.type)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => insertBlock(item.type)}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Page Structure</h2>
              <span className="text-xs text-zinc-500">{document.blocks.length} blocks</span>
            </div>
            <div className="space-y-2">
              {document.blocks.map((block, index) => (
                <div key={block.id} className="space-y-2">
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, index)}
                    className="h-2 rounded-full border border-dashed border-zinc-800 bg-zinc-950/40"
                  />
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("application/x-builder-existing", block.id)}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${selectedBlockId === block.id ? "border-sky-500 bg-sky-500/10" : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"}`}
                  >
                    <p className="text-sm font-medium text-white">{BLOCK_LIBRARY.find((item) => item.type === block.type)?.label || block.type}</p>
                    <p className="mt-1 text-xs text-zinc-500">{block.type}</p>
                  </button>
                </div>
              ))}
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, document.blocks.length)}
                className="h-2 rounded-full border border-dashed border-zinc-800 bg-zinc-950/40"
              />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Build History</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{buildsLoading ? "Loading..." : builds.length}</span>
                <button
                  type="button"
                  onClick={() => setShowBuildHistory((current) => !current)}
                  className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300"
                >
                  {showBuildHistory ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {showBuildHistory ? <div className="space-y-2">
              {buildsLoading ? (
                <p className="text-sm text-zinc-500">Loading saved builds...</p>
              ) : builds.length === 0 ? (
                <p className="text-sm text-zinc-500">No draft or published snapshots yet.</p>
              ) : (
                builds
                  .slice()
                  .reverse()
                  .map((build) => {
                    const loadable = !!parseStoredBuilderDocument(build.code);
                    return (
                      <div key={build.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{build.label}</p>
                            <p className="mt-1 text-xs text-zinc-500">{new Date(build.createdAt).toLocaleString()}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${build.published ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>
                            {build.published ? "Live" : "Draft"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => loadSavedBuild(build)}
                          disabled={!loadable}
                          className="mt-3 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loadable ? "Load" : "Unsupported"}
                        </button>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void publishExistingBuild(build.id)}
                            disabled={persisting !== null || build.published}
                            className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {build.published ? "Live" : "Publish"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBuild(build.id)}
                            className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300 transition hover:border-red-400 hover:text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div> : <p className="text-sm text-zinc-500">Hidden to keep the workspace focused. Use Show to manage snapshots.</p>}
          </section>
        </aside> : null}

        <section className="space-y-4">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/55 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Storefront Preview</p>
                <p className="mt-2 text-sm text-zinc-400">{syncMessage}</p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>Status: {syncState}</p>
                <p>Handle: @{previewData.handle || document.meta.handle}</p>
              </div>
            </div>
          </div>

          <BuilderDocumentRenderer document={document} data={previewData} />

          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/55 px-5 py-4 text-sm text-zinc-400">
            {persistMessage}
          </div>
        </section>

        {!isGuidedMode ? <aside className="space-y-5 rounded-[28px] border border-zinc-800 bg-zinc-900/55 p-4">
          <section>
            <h2 className="text-sm font-semibold text-white">AI Copilot</h2>
            <p className="mt-2 text-xs text-zinc-500">Describe what you want and AI will apply safe block and style edits.</p>

            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
              {aiMessages.map((entry, index) => (
                <div key={`${entry.role}-${index}`} className={entry.role === "user" ? "text-right" : "text-left"}>
                  <span className={`inline-block max-w-[90%] rounded-2xl px-3 py-2 text-xs ${entry.role === "user" ? "bg-cyan-500 text-slate-950" : "bg-zinc-800 text-zinc-200"}`}>
                    {entry.content}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void runAiCopilot(aiPrompt);
                  }
                }}
                placeholder="Example: make this look premium and add a friends block"
                className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                onClick={() => void runAiCopilot(aiPrompt)}
                disabled={aiLoading || !aiPrompt.trim()}
                className="rounded-2xl border border-cyan-500/60 px-3 py-2 text-sm text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading ? "Thinking..." : "Run"}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-white">Page Settings</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-zinc-500">
                Storefront name
                <input
                  value={document.meta.name}
                  onChange={(event) => updateDocument((current) => ({ ...current, meta: { ...current.meta, name: event.target.value } }))}
                  className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
                />
              </label>
            </div>
          </section>

          {!isGuidedMode ? <section>
            <h2 className="text-sm font-semibold text-white">Color Controls</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={`pro-${preset.id}`}
                  type="button"
                  onClick={() => applyThemePreset(preset.id)}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {THEME_FIELDS.map((field) => (
                <label key={field.key} className="block text-xs text-zinc-500">
                  {field.label}
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                    <input
                      type="color"
                      value={document.theme[field.key]}
                      onChange={(event) => updateDocument((current) => ({
                        ...current,
                        theme: { ...current.theme, [field.key]: event.target.value },
                      }))}
                      className="h-8 w-10 rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-sm text-white">{document.theme[field.key]}</span>
                  </div>
                </label>
              ))}
            </div>
          </section> : null}

          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Selected Block</h2>
              {selectedBlock ? (
                <button
                  type="button"
                  onClick={() => {
                    updateDocument((current) => ({
                      ...current,
                      blocks: current.blocks.filter((block) => block.id !== selectedBlock.id),
                    }));
                    setSelectedBlockId(null);
                  }}
                  className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300 transition hover:border-red-400 hover:text-red-200"
                >
                  Remove
                </button>
              ) : null}
            </div>

            {!selectedBlock ? (
              <p className="mt-3 text-sm text-zinc-500">Select a block from the page structure to edit its content.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {selectedBlock.type === "profile-header" ? (
                  <>
                    <Field label="Title" value={selectedBlock.title} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { title: string }), title: value }))} />
                    <TextAreaField label="Subtitle" value={selectedBlock.subtitle} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { subtitle: string }), subtitle: value }))} />
                    <Field label="CTA label" value={selectedBlock.ctaLabel} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { ctaLabel: string }), ctaLabel: value }))} />
                    <ToggleField label="Show banner" checked={selectedBlock.showBanner} onChange={(checked) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { showBanner: boolean }), showBanner: checked }))} />
                    <ToggleField label="Show avatar" checked={selectedBlock.showAvatar} onChange={(checked) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { showAvatar: boolean }), showAvatar: checked }))} />
                  </>
                ) : null}

                {selectedBlock.type === "top-menu" ? (
                  <TextAreaField label="Menu items (comma separated)" value={selectedBlock.items.join(", ")} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { items: string[] }), items: value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
                ) : null}

                {selectedBlock.type === "sidebar" ? (
                  <>
                    <Field label="Heading" value={selectedBlock.heading} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { heading: string }), heading: value }))} />
                    <TextAreaField label="Description" value={selectedBlock.description} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { description: string }), description: value }))} />
                    <Field label="CTA label" value={selectedBlock.ctaLabel} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { ctaLabel: string }), ctaLabel: value }))} />
                  </>
                ) : null}

                {selectedBlock.type === "friends-list" ? (
                  <>
                    <Field label="Title" value={selectedBlock.title} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { title: string }), title: value }))} />
                    <NumberField label="Max items" value={selectedBlock.maxItems} min={1} max={12} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { maxItems: number }), maxItems: value }))} />
                  </>
                ) : null}

                {selectedBlock.type === "post-feed" ? (
                  <>
                    <Field label="Title" value={selectedBlock.title} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { title: string }), title: value }))} />
                    <NumberField label="Max items" value={selectedBlock.maxItems} min={1} max={10} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { maxItems: number }), maxItems: value }))} />
                  </>
                ) : null}

                {selectedBlock.type === "product-grid" ? (
                  <>
                    <Field label="Title" value={selectedBlock.title} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { title: string }), title: value }))} />
                    <NumberField label="Max items" value={selectedBlock.maxItems} min={1} max={12} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { maxItems: number }), maxItems: value }))} />
                    <NumberField label="Columns" value={selectedBlock.columns} min={2} max={3} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { columns: 2 | 3 }), columns: value === 2 ? 2 : 3 }))} />
                  </>
                ) : null}

                {selectedBlock.type === "media-widget" ? (
                  <>
                    <Field label="Title" value={selectedBlock.title} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { title: string }), title: value }))} />
                    <Field label="Media URL" value={selectedBlock.embedUrl} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { embedUrl: string }), embedUrl: value }))} />
                    <TextAreaField label="Caption" value={selectedBlock.caption} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { caption: string }), caption: value }))} />
                  </>
                ) : null}

                {selectedBlock.type === "custom-embed" ? (
                  <>
                    <Field label="Title" value={selectedBlock.title} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { title: string }), title: value }))} />
                    <TextAreaField label="Embed HTML" rows={8} value={selectedBlock.html} onChange={(value) => updateSelectedBlock((block) => ({ ...(block as BuilderBlock & { html: string }), html: value }))} />
                  </>
                ) : null}
              </div>
            )}
          </section>
        </aside> : null}
      </div>

    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
    </label>
  );
}

function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
    </label>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value) || min)} className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600" />
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-sm text-white">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-zinc-700 bg-zinc-900" />
    </label>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-emerald-500 text-emerald-950" : "border border-zinc-600 text-zinc-400"}`}>
        {done ? "✓" : "-"}
      </span>
      <span className={done ? "text-zinc-200" : "text-zinc-400"}>{label}</span>
    </div>
  );
}