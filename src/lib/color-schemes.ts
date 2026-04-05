// ---------------------------------------------------------------------------
// Shared color scheme definitions for wireframe builder + renderer
// Single source of truth — imported by WireframeBuilder and WireframeRenderer
// ---------------------------------------------------------------------------

export interface ColorScheme {
  bg: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
}

export interface ColorSchemeOption {
  id: string;
  label: string;
  colors: ColorScheme;
}

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  midnight: { bg: "#09090b", surface: "rgba(24,24,27,0.5)", border: "#27272a", accent: "#6366f1", text: "#ffffff", textMuted: "#a1a1aa" },
  ocean:    { bg: "#0c1222", surface: "rgba(26,35,50,0.5)", border: "#1e3a5f", accent: "#38bdf8", text: "#e0f2fe", textMuted: "#7dd3fc" },
  forest:   { bg: "#0a0f0a", surface: "rgba(26,46,26,0.5)", border: "#1a3a1a", accent: "#4ade80", text: "#dcfce7", textMuted: "#86efac" },
  sunset:   { bg: "#1a0a0a", surface: "rgba(46,26,26,0.5)", border: "#3a1a1a", accent: "#fb923c", text: "#fff7ed", textMuted: "#fdba74" },
  royal:    { bg: "#0f0a1a", surface: "rgba(30,21,46,0.5)", border: "#2e1a4a", accent: "#a78bfa", text: "#ede9fe", textMuted: "#c4b5fd" },
  cherry:   { bg: "#1a0510", surface: "rgba(50,12,30,0.5)", border: "#4a1530", accent: "#f43f5e", text: "#fff1f2", textMuted: "#fda4af" },
  arctic:   { bg: "#0a1520", surface: "rgba(16,30,46,0.5)", border: "#1a3050", accent: "#67e8f9", text: "#ecfeff", textMuted: "#a5f3fc" },
  ember:    { bg: "#1a1008", surface: "rgba(40,28,14,0.5)", border: "#3a2810", accent: "#f59e0b", text: "#fffbeb", textMuted: "#fcd34d" },
  slate:    { bg: "#111318", surface: "rgba(26,28,36,0.5)", border: "#2a2d38", accent: "#94a3b8", text: "#f1f5f9", textMuted: "#cbd5e1" },
  neon:     { bg: "#0a0a14", surface: "rgba(18,18,32,0.5)", border: "#1e1e3a", accent: "#22d3ee", text: "#e0fcff", textMuted: "#a5f3fc" },
};

export const COLOR_SCHEME_OPTIONS: ColorSchemeOption[] = [
  { id: "midnight", label: "Midnight", colors: COLOR_SCHEMES.midnight },
  { id: "ocean",    label: "Ocean",    colors: COLOR_SCHEMES.ocean },
  { id: "forest",   label: "Forest",   colors: COLOR_SCHEMES.forest },
  { id: "sunset",   label: "Sunset",   colors: COLOR_SCHEMES.sunset },
  { id: "royal",    label: "Royal",    colors: COLOR_SCHEMES.royal },
  { id: "cherry",   label: "Cherry",   colors: COLOR_SCHEMES.cherry },
  { id: "arctic",   label: "Arctic",   colors: COLOR_SCHEMES.arctic },
  { id: "ember",    label: "Ember",    colors: COLOR_SCHEMES.ember },
  { id: "slate",    label: "Slate",    colors: COLOR_SCHEMES.slate },
  { id: "neon",     label: "Neon",     colors: COLOR_SCHEMES.neon },
];

export const DEFAULT_SCHEME = "midnight";

// ---------------------------------------------------------------------------
// Page background presets
// ---------------------------------------------------------------------------

export interface PageBackgroundOption {
  id: string;
  label: string;
  url: string;
  thumbnail: string;
}

export const PAGE_BACKGROUNDS: PageBackgroundOption[] = [
  {
    id: "none",
    label: "None",
    url: "",
    thumbnail: "",
  },
  {
    id: "nature",
    label: "Nature",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=60&auto=format",
  },
  {
    id: "mountain",
    label: "Mountain",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60&auto=format",
  },
  {
    id: "space",
    label: "Space",
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=200&q=60&auto=format",
  },
  {
    id: "ocean-waves",
    label: "Ocean",
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=60&auto=format",
  },
  {
    id: "city-night",
    label: "City Night",
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=200&q=60&auto=format",
  },
  {
    id: "desert",
    label: "Desert",
    url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=60&auto=format",
  },
  {
    id: "aurora",
    label: "Aurora",
    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200&q=60&auto=format",
  },
  {
    id: "abstract",
    label: "Abstract",
    url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80&auto=format",
    thumbnail: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=200&q=60&auto=format",
  },
];
