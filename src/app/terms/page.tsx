import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — RareImagery",
  description: "RareImagery Terms of Service governing use of the platform.",
};

export default function TermsPage() {
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
            <Link href="/terms" className="text-white">Terms</Link>
            <Link href="/eula" className="hover:text-white transition-colors">EULA</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Effective Date: March 12, 2026 &middot; Last Updated: March 12, 2026
        </p>

        <div className="prose-legal space-y-8 text-sm leading-relaxed text-zinc-300">
          <p>
            Welcome to RareImagery. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the RareImagery platform, website, and services located at rareimagery.net and all associated subdomains (collectively, the &quot;Service&quot;). By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>By creating an account, browsing storefronts, or making a purchase on the Service, you confirm that you have read, understood, and agree to these Terms.</p>
            <p>If you are using the Service on behalf of a business or other entity, you represent that you have the authority to bind that entity to these Terms.</p>
            <p>We may update these Terms from time to time with at least 14 days&apos; notice. Continued use constitutes acceptance.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>RareImagery is an online marketplace platform that allows creators to set up branded storefronts on unique subdomains ([store].rareimagery.net). The Service includes:</p>
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li>Creator Storefronts with selectable themes</li>
              <li>X (Twitter) Integration for authentication and profile sync</li>
              <li>AI Page Builder for custom storefront components</li>
              <li>Social Features — follows, shoutouts, and curated picks</li>
              <li>Product Management and inventory tools</li>
              <li>Print-on-Demand via Printful</li>
              <li>Payment Processing via Stripe</li>
            </ul>
            <p>RareImagery is a platform provider, not a seller. Transactions occur between Buyers and Creators.</p>
          </Section>

          <Section title="3. Eligibility">
            <p>You must be at least 18 to create an account or operate a Store. You must be at least 13 to browse or purchase (with parental consent if under 18). The Service is not directed at children under 13.</p>
          </Section>

          <Section title="4. Account Registration">
            <p>Accounts are created via X (Twitter) OAuth 2.0. You are responsible for all activity under your account and for maintaining the security of your X credentials. One account per person; accounts may not be transferred without our written consent.</p>
          </Section>

          <Section title="5. Creator Stores">
            <p>All new Stores are subject to approval. Creators are solely responsible for their content, product listings, pricing, compliance with applicable laws, customer service, returns, and dispute resolution with Buyers.</p>
          </Section>

          <Section title="6. Buyer Terms">
            <p>Purchases are made from Creators, not RareImagery. Refund policies are set by individual Creators. RareImagery does not verify or endorse product claims.</p>
          </Section>

          <Section title="7. Fees and Payments">
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Store Setup:</strong> One-time $5.00 fee + first month&apos;s subscription</li>
              <li><strong className="text-zinc-300">Monthly Subscription:</strong> $6.00/month, billed via Stripe</li>
              <li><strong className="text-zinc-300">Transaction Fee:</strong> 2.9% + $0.30 per sale</li>
            </ul>
            <p className="mt-2">Fees may change with 30 days&apos; notice. Non-payment results in Store suspension. You are responsible for applicable taxes.</p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>You retain ownership of your original content. By uploading, you grant us a non-exclusive license to display and distribute it in connection with operating the Service. The platform&apos;s code, design, and branding remain our intellectual property. AI-generated content from the Page Builder may be freely used, modified, and exported.</p>
          </Section>

          <Section title="9. Prohibited Conduct">
            <p>You may not: violate any law; upload illegal, harmful, or infringing content; sell counterfeit or prohibited goods; engage in fraud or spam; interfere with the Service; reverse-engineer or hack; circumvent security measures; use bots or scrapers; impersonate others; or use social features for harassment.</p>
          </Section>

          <Section title="10. Third-Party Services">
            <p>The Service integrates with X, Stripe, Printful, and xAI/Grok. Use of these integrations is subject to their respective terms. We are not responsible for third-party availability or performance.</p>
          </Section>

          <Section title="11. Privacy">
            <p>Data collection and use is described in our <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link>. Public profile information and store content are publicly accessible.</p>
          </Section>

          <Section title="12. Disclaimers">
            <p className="uppercase text-zinc-500 text-xs leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not warrant uninterrupted, secure, or error-free operation. We make no representations regarding products listed on Creator storefronts. AI-generated content is provided without warranty.
            </p>
          </Section>

          <Section title="13. Limitation of Liability">
            <p className="uppercase text-zinc-500 text-xs leading-relaxed">
              RareImagery shall not be liable for indirect, incidental, special, consequential, or punitive damages. Total aggregate liability shall not exceed the greater of amounts paid by you in the 12 months preceding the claim, or $100.00.
            </p>
          </Section>

          <Section title="14. Indemnification">
            <p>You agree to indemnify and hold harmless RareImagery from claims arising from your use of the Service, your content, your violations of these Terms or any law, and disputes with other users.</p>
          </Section>

          <Section title="15. Termination">
            <p>You may close your account at any time by contacting legal@rareimagery.net. We may suspend or terminate accounts with or without cause. Pending orders must still be fulfilled. Outstanding payouts are processed per Stripe&apos;s schedule.</p>
          </Section>

          <Section title="16. Dispute Resolution">
            <p>Disputes are governed by the laws of the State of Florida, USA. Before filing a formal claim, you must attempt informal resolution by contacting us. Unresolved disputes are subject to binding arbitration via the AAA. You waive participation in class actions.</p>
          </Section>

          <Section title="17. General">
            <p>These Terms, together with our <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link> and <Link href="/eula" className="text-indigo-400 hover:text-indigo-300 underline">EULA</Link>, constitute the entire agreement. If any provision is unenforceable, the rest remain in effect.</p>
          </Section>

          <Section title="18. Contact">
            <p>
              <strong className="text-white">RareImagery</strong><br />
              Email: legal@rareimagery.net<br />
              Website: https://rareimagery.net
            </p>
          </Section>

          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-zinc-400">
              By using RareImagery, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
