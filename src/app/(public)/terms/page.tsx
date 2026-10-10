import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 9, 2026">
      <section>
        <h2>1. Who we are and what MAKERSIGNAL does</h2>
        <p>
          MAKERSIGNAL is a marketplace that helps brands and content creators find each other, agree scope, deliver work and record content usage
          terms. MAKERSIGNAL is not a party to agreements between brands and creators.
        </p>
      </section>
      <section>
        <h2>2. Accounts</h2>
        <ul>
          <li>You must provide accurate information and keep your password secure.</li>
          <li>Each account is either a creator or a brand account; the type can&apos;t be changed later.</li>
          <li>You&apos;re responsible for activity under your account.</li>
        </ul>
      </section>
      <section>
        <h2>3. Content you upload</h2>
        <p>
          You keep ownership of your content. You give MAKERSIGNAL permission to host and display it only as needed to run the service (for
          example, showing your portfolio on your profile). Only upload work you have the right to show.
        </p>
        <p>Uploading content does not grant anyone permission to use it for paid advertising, exclusivity, or AI training.</p>
      </section>
      <section id="usage-rights" className="scroll-mt-24">
        <h2>4. Usage rights and the Rights Passport</h2>
        <ul>
          <li>A Rights Passport is a structured record of the usage terms a brand and creator approved inside a project.</li>
          <li>
            It is a record of terms, not automatically a legally binding contract. Whether terms are enforceable depends on the parties&apos;
            agreement and applicable law. We recommend a written agreement for significant work.
          </li>
          <li>Any edit to recorded terms resets approval, so each party approves the exact version they saw.</li>
          <li>
            Permission to use content for AI training is a separate, explicit opt-in on each record and is off by default. It is never inferred
            from general upload consent, paid-ads permission or exclusivity.
          </li>
          <li>Parties can export the recorded terms at any time.</li>
        </ul>
      </section>
      <section>
        <h2>5. Matching and AI features</h2>
        <p>
          Match scores and AI-generated suggestions are estimates based on the information available. They are not guarantees of quality,
          performance, reach or results. AI features never publish, accept, price or approve anything on your behalf.
        </p>
      </section>
      <section>
        <h2>6. Payments</h2>
        <p>
          MAKERSIGNAL does not currently process payments. Quotes, project amounts and milestone allocations are recorded for planning only; no
          money is held, escrowed, transferred or refunded through the platform.
        </p>
      </section>
      <section>
        <h2>7. Acceptable use</h2>
        <ul>
          <li>No spam, harassment, misleading claims, fraud, or use of others&apos; work without permission.</li>
          <li>Don&apos;t try to access records you aren&apos;t authorised to see.</li>
          <li>We may remove content or suspend accounts that break these rules.</li>
        </ul>
      </section>
      <section>
        <h2>8. Ending your account</h2>
        <p>
          You can request deletion from Settings. See the <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link> for what
          is retained.
        </p>
      </section>
    </LegalPage>
  );
}
