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

