import { Panel } from "@/components/page-header";
import { ChangePasswordForm, DeletionSection, SignOutEverywhereButton } from "./account-forms";
import type { Viewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Account, security and data sections shared by creator and brand settings. */
export async function AccountSettings({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const [{ data: deletion }, { data: auth }] = await Promise.all([
    supabase
    .from("account_deletion_requests")
    .select("id, created_at")
    .eq("profile_id", viewer.id)
    .in("status", ["pending", "processing"])
    .maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const emailConfirmed = Boolean(auth.user?.email_confirmed_at);

  return (
    <>
      <Panel>
        <h2 className="h-section">Account</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-ink-muted">Email</dt>
          <dd className="font-medium">{viewer.email}</dd>
          <dt className="text-ink-muted">Account type</dt>
          <dd className="capitalize">{viewer.profile.role}</dd>
          <dt className="text-ink-muted">Email confirmed</dt>
          <dd>{emailConfirmed ? "Yes" : "Not yet — check your inbox"}</dd>
        </dl>
        <p className="mt-3 text-xs text-ink-muted">To change your login email, contact support (email changes require confirmation on both addresses).</p>
      </Panel>

      <Panel>
        <h2 className="h-section mb-1">Password</h2>
        <p className="meta mb-5">We ask for your current password before changing it.</p>
        <ChangePasswordForm />
      </Panel>

      <Panel>
        <h2 className="h-section mb-1">Sessions</h2>
        <p className="meta mb-4">Lost a device or used a shared computer? End every session at once.</p>
        <SignOutEverywhereButton />
      </Panel>

      <Panel>
        <h2 id="data" className="h-section mb-1 scroll-mt-24">Data & privacy</h2>
        <div className="prose-body mb-5 space-y-2 text-sm text-ink-muted">
          <p>Requesting deletion starts our documented process:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your profile, portfolio, services, saved items and notifications are removed and your public profile disappears.</li>
            <li>Active projects should be completed or cancelled first; we&apos;ll contact you if any are open.</li>
            <li>
              Records the other party relies on — completed projects, agreed Rights Passport terms, deliverable history and reviews — are retained in
              de-identified form where needed for their records or legal obligations.
            </li>
            <li>We confirm by email when deletion is complete (normally within 30 days).</li>
          </ul>
        </div>
        <DeletionSection pending={deletion ?? null} />
      </Panel>
    </>
  );
}
