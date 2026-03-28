'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import TemplatePicker from '@/components/TemplatePicker';
import { createCreatorSite } from '@/app/actions/onboarding';
import { DEFAULT_TEMPLATE_ID, type TemplateId } from '@/templates/catalog';

type WizardProfile = {
  handle: string;
  name: string;
  bio: string;
  verified: boolean;
};

export default function OnboardingWizard() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE_ID);
  const [profile, setProfile] = useState<WizardProfile>({
    handle: '',
    name: '',
    bio: '',
    verified: false,
  });

  const sessionData = session as typeof session & {
    xUsername?: string;
    xBio?: string;
    xVerified?: boolean;
  };

  const effectiveProfile: WizardProfile = {
    handle: profile.handle || sessionData?.xUsername || '',
    name: profile.name || session?.user?.name || '',
    bio: profile.bio || sessionData?.xBio || '',
    verified: profile.verified || Boolean(sessionData?.xVerified),
  };

  const handleConfirmProfile = () => setStep(2);

  const handleCreateTheme = async (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    await createCreatorSite(effectiveProfile, templateId);
    return {
      builderUrl: `/builder/new-tab?handle=${encodeURIComponent(effectiveProfile.handle)}&template=${encodeURIComponent(templateId)}`,
    };
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-base text-white placeholder-zinc-500 outline-none transition focus:border-[#1DA1F2]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8 text-white">
      <div className="w-full max-w-3xl">
        <h1 className="mb-12 text-center text-4xl font-bold tracking-tight sm:text-5xl">
          Build Your X Store on rareimagery.net
        </h1>

        {step === 1 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Step 1: Verify Your X Info</h2>
            <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
              <div className="text-lg font-medium text-zinc-200">
                @{effectiveProfile.handle || 'yourhandle'}{' '}
                <span className="text-[#1DA1F2]">{effectiveProfile.verified ? 'Verified' : ''}</span>
              </div>
              <input
                className={inputClass}
                value={effectiveProfile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Display Name"
              />
              <input
                className={inputClass}
                value={effectiveProfile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Short bio (shows on your profile)"
              />
            </div>
            <button
              type="button"
              onClick={handleConfirmProfile}
              className="w-full rounded-2xl bg-[#1DA1F2] px-6 py-5 text-xl font-semibold text-white transition hover:bg-[#0f8bd6]"
            >
              Looks correct - Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Step 2: Pick Your Store Template</h2>
            <TemplatePicker
              current={selectedTemplate}
              sellerHandle={effectiveProfile.handle}
              xAvatar={session?.user?.image ?? undefined}
              xBio={effectiveProfile.bio}
              onChange={setSelectedTemplate}
              onCreateTheme={handleCreateTheme}
            />
            <p className="text-center text-sm text-zinc-400">
              Choosing a template launches your builder tab with your profile elements and AI helper.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
