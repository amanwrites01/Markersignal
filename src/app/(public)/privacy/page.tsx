import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 9, 2026">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account data: name, email, password (stored hashed by our authentication provider).</li>
          <li>Profile data you choose to add: bio, location, Creative DNA tags, portfolio, services, rates, brand details.</li>
          <li>Collaboration data: campaigns, proposals, projects, deliverables, rights records, messages, reviews.</li>
          <li>Technical data needed to keep the service secure, such as rate-limit counters and audit logs of important actions.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To run the marketplace: show profiles, match creators and campaigns, and support projects.</li>
          <li>Matching uses profile and brief information only — never sensitive attributes such as age, gender, ethnicity, religion or health.</li>
          <li>
            AI features send the minimum text needed to an AI provider to generate suggestions. We store only the validated result needed for the
            product, not raw prompts.
          </li>
        </ul>
      </section>
      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Public creator profiles and portfolio media are visible to anyone; you can make your profile members-only or hidden.</li>
          <li>Project files, messages and rights records are visible only to the project&apos;s members, through short-lived secure links.</li>
          <li>Brand contact details are private to the brand account.</li>
        </ul>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          You can request account deletion from Settings. We remove your profile, portfolio and personal data. Records the other party relies on
          (completed projects, agreed usage terms, deliverable history and reviews) may be retained in de-identified form where needed for their
          records or legal obligations.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>Depending on where you live, you may have rights to access, correct, export or delete your data. Contact us to make a request.</p>
      </section>
    </LegalPage>
  );
}
