import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — RareImagery",
  description: "RareImagery Privacy Policy describing how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              RareImagery
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/eula" className="hover:text-white transition-colors">EULA</Link>
            <Link href="/privacy" className="text-white">Privacy</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Effective Date: March 12, 2026 &middot; Last Updated: March 12, 2026
        </p>

        <div className="prose-legal space-y-8 text-sm leading-relaxed text-zinc-300">
          <p>
            RareImagery (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at rareimagery.net and all associated subdomains (the &quot;Service&quot;).
          </p>

          <Section title="1. Information We Collect">
            <h3 className="text-sm font-medium text-zinc-200 mt-2">1.1 Information You Provide</h3>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li>Account information via X (Twitter) OAuth: username, display name, profile picture, banner image</li>
              <li>Store details: store name, subdomain, contact email, currency preference</li>
              <li>Profile information: bio, follower count, top posts, metrics</li>
              <li>Product listings: titles, descriptions, images, pricing</li>
              <li>Social interactions: follows, shoutouts, picks</li>
              <li>AI Page Builder prompts and saved builds</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-200 mt-4">1.2 Information Collected Automatically</h3>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li>Device and browser information (user agent, screen resolution)</li>
              <li>IP address and approximate geolocation</li>
              <li>Pages visited, features used, and interactions with the Service</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-sm font-medium text-zinc-200 mt-4">1.3 Information from Third Parties</h3>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li>X (Twitter): public profile data, follower/following counts, public posts (via X API v2)</li>
              <li>xAI/Grok: AI-generated profile enhancements, theme recommendations</li>
              <li>Stripe: payment confirmation and transaction status (we do not store credit card numbers)</li>
              <li>Printful: order fulfillment status for print-on-demand products</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li>To create and manage your account and Store</li>
              <li>To display your public storefront and profile</li>
              <li>To process transactions and facilitate payments via Stripe</li>
              <li>To operate social features (follows, shoutouts, picks)</li>
              <li>To power the AI Page Builder (prompts are sent to xAI/Grok for processing)</li>
              <li>To send notifications about your Store, orders, and account</li>
              <li>To enforce our Terms of Service and EULA</li>
              <li>To improve the Service and develop new features</li>
              <li>To detect and prevent fraud, abuse, and security incidents</li>
            </ul>
          </Section>

          <Section title="3. How We Share Your Information">
            <p>We do not sell your personal information. We share information only in these circumstances:</p>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Public Display:</strong> Your store name, X username, profile picture, bio, products, shoutouts, and picks are publicly visible</li>
              <li><strong className="text-zinc-300">Service Providers:</strong> X (authentication), Stripe (payments), Printful (fulfillment), xAI/Grok (AI), Vercel (hosting)</li>
              <li><strong className="text-zinc-300">Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
              <li><strong className="text-zinc-300">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong className="text-zinc-300">With Your Consent:</strong> When you explicitly authorize sharing</li>
            </ul>
          </Section>

          <Section title="4. Data Storage and Security">
            <p>Your data is stored on servers hosted by our infrastructure providers. We implement reasonable technical and organizational measures to protect your data, including encrypted connections (HTTPS), secure authentication, and access controls. However, no method of transmission over the internet is 100% secure.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your data for as long as your account is active or as needed to provide the Service. After account deletion:</p>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li>Your Store and profile are removed from public view</li>
              <li>Transaction records are retained as required by law (typically 7 years)</li>
              <li>Anonymized analytics data may be retained indefinitely</li>
              <li>AI Page Builder prompts are not stored beyond the active session</li>
            </ul>
          </Section>

          <Section title="6. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Access</strong> the personal data we hold about you</li>
              <li><strong className="text-zinc-300">Correct</strong> inaccurate personal data</li>
              <li><strong className="text-zinc-300">Delete</strong> your personal data (by deleting your account)</li>
              <li><strong className="text-zinc-300">Export</strong> your data (builds via Page Builder export; other data via email request)</li>
              <li><strong className="text-zinc-300">Object</strong> to certain processing activities</li>
              <li><strong className="text-zinc-300">Withdraw Consent</strong> where processing is based on consent</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact legal@rareimagery.net.</p>
          </Section>

          <Section title="7. Cookies">
            <p>We use cookies and similar technologies for:</p>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Essential cookies:</strong> Authentication session, CSRF protection</li>
              <li><strong className="text-zinc-300">Functional cookies:</strong> Theme preferences, language settings</li>
              <li><strong className="text-zinc-300">Analytics cookies:</strong> Understanding Service usage and performance</li>
            </ul>
            <p className="mt-2">You can control cookies through your browser settings, though disabling essential cookies may prevent you from using the Service.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>The Service is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly. Users aged 13-17 must have parental or guardian consent.</p>
          </Section>

          <Section title="9. International Data Transfers">
            <p>Your information may be transferred to and processed in countries other than your own, including the United States. By using the Service, you consent to such transfers. We ensure appropriate safeguards are in place for international transfers.</p>
          </Section>

          <Section title="10. California Privacy Rights (CCPA)">
            <p>California residents have additional rights under the CCPA, including the right to know what personal information is collected, the right to deletion, and the right to opt-out of the sale of personal information. We do not sell personal information.</p>
          </Section>

          <Section title="11. European Privacy Rights (GDPR)">
            <p>If you are in the European Economic Area (EEA), you have rights under GDPR including access, rectification, erasure, restriction of processing, data portability, and the right to lodge a complaint with a supervisory authority. Our legal bases for processing include consent, contract performance, and legitimate interests.</p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or platform notification at least 14 days before changes take effect. The &quot;Last Updated&quot; date at the top reflects the most recent revision.</p>
          </Section>

          <Section title="13. Contact Us">
            <p>
              For privacy-related questions or to exercise your rights:<br /><br />
              <strong className="text-white">RareImagery</strong><br />
              Email: legal@rareimagery.net<br />
              Website: https://rareimagery.net
            </p>
          </Section>

          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-zinc-400">
              By using RareImagery, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        <div className="flex items-center justify-center gap-4">
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
          <span>&middot;</span>
          <Link href="/eula" className="hover:text-zinc-400 transition-colors">EULA</Link>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
        </div>
        <p className="mt-2">&copy; {new Date().getFullYear()} RareImagery. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
