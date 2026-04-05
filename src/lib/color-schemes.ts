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
};

export const COLOR_SCHEME_OPTIONS: ColorSchemeOption[] = [
  { id: "midnight", label: "Midnight", colors: COLOR_SCHEMES.midnight },
  { id: "ocean",    label: "Ocean",    colors: COLOR_SCHEMES.ocean },
  { id: "forest",   label: "Forest",   colors: COLOR_SCHEMES.forest },
  { id: "sunset",   label: "Sunset",   colors: COLOR_SCHEMES.sunset },
  { id: "royal",    label: "Royal",    colors: COLOR_SCHEMES.royal },
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
];
