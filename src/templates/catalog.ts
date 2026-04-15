export type TemplateId = 'blank' | 'modern-cart' | 'ai-video-store' | 'latest-posts' | 'retro';

export type TemplateQuickBuildOption = {
  id: TemplateId;
  label: string;
  studioLabel: string;
};

export const DEFAULT_TEMPLATE_ID: TemplateId = 'modern-cart';

export const TEMPLATE_TO_THEME: Record<TemplateId, string> = {
  retro: 'retro',
  'modern-cart': 'xai3',
  'ai-video-store': 'editorial',
  'latest-posts': 'xmimic',
  blank: 'minimal',
};

export const TEMPLATE_QUICK_BUILD_OPTIONS: TemplateQuickBuildOption[] = [
  {
    id: 'ai-video-store',
    label: 'AI Video Store (Grok-first)',
    studioLabel: '🎥 AI Video Store (Grok-first)',
  },
  {
    id: 'modern-cart',
    label: 'Modern Shopping Cart + Subs',
    studioLabel: '🛒 Modern Shopping Cart + Subs',
  },
  {
    id: 'retro',
    label: 'Retro Memories Feed',
    studioLabel: '📼 Retro Memories Feed',
  },
  {
    id: 'latest-posts',
    label: 'Latest X Posts + $4 CTA',
    studioLabel: '📜 Latest X Posts + $4 CTA',
  },
  {
    id: 'blank',
    label: 'Blank Canvas (AI will fill)',
    studioLabel: '✨ Blank Canvas (AI will fill)',
  },
];

export const THEME_TO_TEMPLATE: Record<string, TemplateId> = Object.fromEntries(
  Object.entries(TEMPLATE_TO_THEME).map(([templateId, theme]) => [theme, templateId])
) as Record<string, TemplateId>;

export function resolveTemplateId(value: string | null | undefined): TemplateId {
  if (!value) return DEFAULT_TEMPLATE_ID;
  if (value in TEMPLATE_TO_THEME) return value as TemplateId;
  return THEME_TO_TEMPLATE[value] || DEFAULT_TEMPLATE_ID;
}
