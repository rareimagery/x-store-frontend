'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
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
  const { data: session, status } = useSession();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("twitter", { callbackUrl: "/onboarding" });
    }
  }, [status]);

  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE_ID);
  const [profile, setProfile] = useState<WizardProfile>({
    handle: '',
    name: '',
    bio: '',
    verified: false,
  });

  // Subdomain picker
  const [subdomain, setSubdomain] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [slugReason, setSlugReason] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Default subdomain to X handle
  useEffect(() => {
    if (!subdomain && effectiveProfile.handle) {
      setSubdomain(effectiveProfile.handle.toLowerCase());
    }
  }, [effectiveProfile.handle, subdomain]);

  const checkSlug = useCallback((value: string) => {
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(clean);
    setSlugReason('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (clean.length < 3) {
      setSlugStatus(clean.length > 0 ? 'invalid' : 'idle');
      if (clean.length > 0) setSlugReason('Must be at least 3 characters');
      return;
    }

    setSlugStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stores/check-slug?slug=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.available) {
          setSlugStatus('available');
          setSlugReason('');
        } else {
          setSlugStatus('taken');
          setSlugReason(data.reason || 'Not available');
        }
      } catch {
        setSlugStatus('available');
      }
    }, 400);
  }, []);

  const handleConfirmProfile = () => {
    if (slugStatus !== 'available' && subdomain.length >= 3) return;
    setStep(2);
  };

  const handleCreateTheme = async (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    await createCreatorSite(effectiveProfile, templateId, subdomain || effectiveProfile.handle);
    return {
      builderUrl: `/builder/new-tab?handle=${encodeURIComponent(effectiveProfile.handle)}&template=${encodeURIComponent(templateId)}`,
    };
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-base text-white placeholder-zinc-500 outline-none transition focus:border-[#1DA1F2]';

  const canContinue = effectiveProfile.handle && subdomain.length >= 3 && slugStatus === 'available';

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

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

              {/* Subdomain picker */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Choose your subdomain
                </label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => checkSlug(e.target.value)}
                    placeholder="yourname"
                    className="flex-1 rounded-l-xl border border-r-0 border-zinc-700 bg-zinc-900 px-4 py-4 text-base text-white placeholder-zinc-500 outline-none transition focus:border-[#1DA1F2]"
                  />
                  <div className="rounded-r-xl border border-zinc-700 bg-zinc-800 px-4 py-4 text-base text-zinc-500">
                    .rareimagery.net
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 min-h-[20px]">
                  {slugStatus === 'checking' && (
                    <span className="text-xs text-zinc-500">Checking availability...</span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {subdomain}.rareimagery.net is available
                    </span>
                  )}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                    <span className="text-xs text-red-400">{slugReason}</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-zinc-600">Tip: Your X username works great, or pick something shorter and memorable.</p>

                {/* Permanence warning */}
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3">
                  <svg className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-amber-300">This is permanent</p>
                    <p className="text-[11px] text-amber-400/70">Your subdomain cannot be changed after store creation. First come, first served. Choose carefully.</p>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirmProfile}
              disabled={!canContinue}
              className="w-full rounded-2xl bg-[#1DA1F2] px-6 py-5 text-xl font-semibold text-white transition hover:bg-[#0f8bd6] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Claim This Subdomain
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold">Step 2: Pick Your Store Template</h2>
            <p className="text-sm text-zinc-400">
              Your store will be at <span className="text-[#1DA1F2] font-medium">{subdomain}.rareimagery.net</span>
            </p>
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
