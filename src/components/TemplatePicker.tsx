'use client';

import { useEffect, useState } from 'react';
import LiveThemePreview from './LiveThemePreview';
import { updateTemplate } from '@/app/actions/template';
import { TEMPLATE_DEFINITIONS } from '@/templates/registry';
import { resolveTemplateId, type TemplateId } from '@/templates/catalog';
import { DEFAULT_TEMPLATE_ID } from '@/templates/catalog';

const TEMPLATE_EMOJI: Record<TemplateId, string> = {
  retro: '🕹️',
  'modern-cart': '🛒',
  'ai-video-store': '🎥',
  'latest-posts': '📜',
  blank: '✨',
};

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  retro: 'Memories MySpace / Old FB / AOL',
  'modern-cart': 'Modern Shopping Cart',
  'ai-video-store': 'AI Video Store',
  'latest-posts': 'Latest X Posts Feed',
  blank: 'Blank Canvas (build your own)',
};

const templates = TEMPLATE_DEFINITIONS.map((template) => ({
  id: template.id,
  label: TEMPLATE_LABELS[template.id],
  emoji: TEMPLATE_EMOJI[template.id],
}));

type CreateThemeResult = {
  success?: boolean;
  error?: string;
  builderUrl?: string;
};

function normalizeCurrentTemplate(current: string): TemplateId {
  const resolved = resolveTemplateId(current);
  return templates.some((template) => template.id === resolved) ? resolved : DEFAULT_TEMPLATE_ID;
}

export default function TemplatePicker({
  current,
  sellerHandle,
  xAvatar,
  xBio,
  onChange,
  onCreateTheme,
}: {
  current: string;
  sellerHandle: string;
  xAvatar?: string;
  xBio?: string;
  onChange?: (templateId: TemplateId) => void;
  onCreateTheme?: (templateId: TemplateId) => Promise<CreateThemeResult | void>;
}) {
  const [selected, setSelected] = useState<TemplateId>(normalizeCurrentTemplate(current));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(normalizeCurrentTemplate(current));
  }, [current]);

  const handleSelect = (templateId: TemplateId) => {
    setSelected(templateId);
    onChange?.(templateId);
  };

  const handleSave = async () => {
    // Open a placeholder tab synchronously so browsers do not block popup after async save.
    const pendingTab = window.open('about:blank', '_blank');
    let navigated = false;

    setSaving(true);
    try {
      const result = onCreateTheme
        ? await onCreateTheme(selected)
        : await (async () => {
            await updateTemplate(sellerHandle, selected);
            return {
              success: true,
              builderUrl: `/builder/new-tab?handle=${encodeURIComponent(sellerHandle)}&template=${encodeURIComponent(selected)}`,
            } satisfies CreateThemeResult;
          })();

      const builderUrl =
        result?.success === false
          ? null
          :
        result?.builderUrl ||
        `/builder/new-tab?handle=${encodeURIComponent(sellerHandle)}&template=${encodeURIComponent(selected)}`;

      if (result?.success === false) {
        throw new Error(result.error || 'Could not create your theme. Please try again.');
      }

      if (!builderUrl) {
        throw new Error('Could not create your theme. Please try again.');
      }

      if (pendingTab) {
        pendingTab.location.href = builderUrl;
        navigated = true;
      } else {
        const popup = window.open(builderUrl, '_blank');
        if (!popup) {
          window.location.assign(builderUrl);
        } else {
          navigated = true;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create your theme. Please try again.';
      alert(message);
    } finally {
      if (pendingTab && !navigated) {
        try {
          pendingTab.close();
        } catch {
          // no-op
        }
      }
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="lg:w-1/3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cursor-pointer rounded-xl border-4 p-5 text-center transition-all hover:scale-[1.02] ${
                selected === t.id
                  ? 'border-[#1DA1F2] bg-zinc-900 shadow-xl shadow-[#1DA1F2]/20'
                  : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500'
              }`}
              onClick={() => handleSelect(t.id)}
            >
              <div className="mb-3 text-5xl">{t.emoji}</div>
              <h3 className="text-sm font-bold text-white">{t.label}</h3>
            </button>
          ))}
        </div>

        {(!onChange || onCreateTheme) && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-8 w-full rounded-md bg-[#1DA1F2] px-4 py-4 text-base font-semibold text-white transition hover:bg-[#0f8bd6] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Create This Theme'}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl lg:w-2/3">
        <div className="flex items-center gap-3 border-b border-zinc-700 bg-black p-4">
          <div className="flex-1 text-center text-sm text-zinc-400">LIVE PREVIEW - rareimagery.net/shop/@{sellerHandle}</div>
          <div className="rounded-full bg-[#1DA1F2] px-4 py-1 text-xs text-white">X Verified</div>
        </div>
        <div className="h-[520px] overflow-auto bg-white/5 p-8">
          <LiveThemePreview
            templateId={selected}
            handle={sellerHandle}
            avatar={xAvatar}
            bio={xBio}
          />
        </div>
        <div className="border-t border-zinc-700 py-3 text-center text-xs text-zinc-500">
          This is exactly how your site will look to buyers - Grok videos, products, and X Money ready
        </div>
      </div>
    </div>
  );
}
