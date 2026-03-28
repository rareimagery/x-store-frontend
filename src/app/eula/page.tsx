import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "End User License Agreement — RareImagery",
  description: "RareImagery EULA governing use of the platform software and services.",
};

export default function EulaPage() {
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
            <Link href="/eula" className="text-white">EULA</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <h1 className="mb-2 text-3xl font-bold">End User License Agreement</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Effective Date: March 12, 2026 &middot; Last Updated: March 12, 2026
        </p>

        <div className="prose-legal space-y-8 text-sm leading-relaxed text-zinc-300">
          <p>
            This End User License Agreement (&quot;Agreement&quot;) is a legal agreement between you (&quot;User,&quot; &quot;Creator,&quot; &quot;you&quot;) and RareImagery (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;) governing your use of the RareImagery platform, website, services, and related applications located at rareimagery.net and all associated subdomains (the &quot;Platform&quot;).
          </p>

          <Section title="1. Definitions">
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">&quot;Platform&quot;</strong> — The RareImagery website, all creator subdomains, API services, the Store Console, and the Page Builder tool.</li>
              <li><strong className="text-zinc-300">&quot;Creator&quot;</strong> — A registered user who operates a storefront.</li>
              <li><strong className="text-zinc-300">&quot;Buyer&quot;</strong> — Any user who purchases products or subscribes to a Creator&apos;s content.</li>
              <li><strong className="text-zinc-300">&quot;Store&quot;</strong> — A Creator&apos;s storefront hosted on the Platform.</li>
              <li><strong className="text-zinc-300">&quot;Content&quot;</strong> — All text, images, designs, products, product listings, profile information, shoutouts, picks, and other materials uploaded or displayed.</li>
              <li><strong className="text-zinc-300">&quot;AI-Generated Content&quot;</strong> — Components, code, or design assets created by the AI Page Builder tool.</li>
              <li><strong className="text-zinc-300">&quot;Third-Party Services&quot;</strong> — External services including X (Twitter), Stripe, Printful, and xAI/Grok.</li>
            </ul>
          </Section>

          <Section title="2. Eligibility">
            <p>You must be at least 18 to create an account or operate a Store. You must be at least 13 to browse or purchase (with parental consent if under 18).</p>
          </Section>

          <Section title="3. Account Registration and X Authentication">
            <p>Account creation uses X OAuth 2.0. By signing in, you authorize RareImagery to access your public X profile data (username, display name, profile picture, banner, follower/following data). Profile data may be synced automatically and displayed publicly on your storefront. Each X account may be associated with only one RareImagery account.</p>
          </Section>

          <Section title="4. Creator Stores — Rights and Obligations">
            <p>All Stores are subject to review and approval. Creators may sell physical goods (including print-on-demand via Printful), digital downloads, and handmade/custom items. Creators are solely responsible for product listing accuracy, order fulfillment, and customer service. Store templates and storefront builds may be modified or reset if they violate this Agreement.</p>
          </Section>

          <Section title="5. Fees, Payments, and Subscriptions">
            <ul className="ml-4 list-disc space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Setup:</strong> One-time $5.00 + first month&apos;s subscription at checkout</li>
              <li><strong className="text-zinc-300">Monthly:</strong> $6.00/month recurring via Stripe</li>
              <li><strong className="text-zinc-300">Transaction Fee:</strong> 2.9% + $0.30 per sale</li>
              <li><strong className="text-zinc-300">Payouts:</strong> Via Stripe Connect, after platform fee deduction</li>
            </ul>
            <p className="mt-2">Failed subscription payments result in Store suspension. Setup fees are non-refundable. Fee changes require 30 days&apos; notice.</p>
          </Section>

          <Section title="6. AI Page Builder">
            <p>The Page Builder generates React/Tailwind CSS components using xAI/Grok. AI-generated components are provided &quot;as-is&quot; — you are responsible for reviewing and testing them. Usage is limited to 10 requests/hour and 20 saved builds per Store. You may not use it to generate prohibited content or exploit platform security.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>You retain ownership of original content you upload. By uploading, you grant RareImagery a non-exclusive, worldwide, royalty-free license to display and promote your content in connection with the Platform. The Platform&apos;s design, code, themes, and branding are RareImagery&apos;s intellectual property. You warrant that your content does not infringe third-party rights.</p>
          </Section>

          <Section title="8. Social Features">
            <p>Follows, shoutouts (120 characters max), and picks (up to 10) are Platform features. Store owners may delete shoutouts on their wall. Social features must not be used for harassment, spam, or abuse.</p>
          </Section>

          <Section title="9. Prohibited Content and Conduct">
            <p>You may not use the Platform for illegal, harmful, threatening, abusive, or infringing content; counterfeit goods; weapons or controlled substances; discrimination or hate speech; spam, phishing, or malware; or any attempt to circumvent platform security.</p>
          </Section>

          <Section title="10. Privacy and Data">
            <p>Data collection follows our <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link>. X profile data is stored and displayed publicly. Payment data is handled by Stripe. AI prompts are transmitted to xAI/Grok and not stored beyond the session. Creators may export saved builds via the Page Builder.</p>
          </Section>

          <Section title="11. Disclaimers and Limitation of Liability">
            <p className="uppercase text-zinc-500 text-xs leading-relaxed">
              The Platform is provided &quot;as is&quot; without warranties. RareImagery does not guarantee availability, is not responsible for third-party service outages, and shall not be liable for indirect, incidental, special, or consequential damages. Maximum liability is limited to fees paid in the 12 months preceding the claim.
            </p>
          </Section>

          <Section title="12. Indemnification">
            <p>You agree to indemnify RareImagery against claims arising from your use of the Platform, your content, violation of third-party rights, or disputes with other users.</p>
          </Section>

          <Section title="13. Account Termination">
            <p>You may close your account at any time. We may suspend or terminate accounts for cause (violations, non-payment, fraud, inactivity &gt; 12 months). Pending orders must be fulfilled. No refund is issued for termination for cause.</p>
          </Section>

          <Section title="14. Dispute Resolution">
            <p>Governed by the laws of the State of Florida, USA. Disputes must first be raised informally. Unresolved disputes go to binding arbitration via AAA. Class action participation is waived. Small claims court remains available.</p>
          </Section>

          <Section title="15. Modifications">
            <p>We may modify this Agreement with 14 days&apos; notice. Continued use constitutes acceptance. If you disagree, your remedy is to close your account.</p>
          </Section>

          <Section title="16. Contact">
            <p>
              <strong className="text-white">RareImagery</strong><br />
              Email: legal@rareimagery.net<br />
              Website: https://rareimagery.net
            </p>
            <p>For DMCA notices, use the email above with subject &quot;DMCA Takedown Notice.&quot;</p>
          </Section>

          <Section title="17. Severability">
            <p>If any provision is unenforceable, the remaining provisions continue in full force.</p>
          </Section>

          <Section title="18. Entire Agreement">
            <p>This Agreement, the <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">Terms of Service</Link>, and the <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link> constitute the entire agreement.</p>
          </Section>

          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-zinc-400">
              By using RareImagery, you acknowledge that you have read, understood, and agree to be bound by this Agreement.
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
