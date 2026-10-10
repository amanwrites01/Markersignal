import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AccountSettings } from "@/components/settings/account-settings";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

const VISIBILITY: Record<string, string> = {
  public: "Public — anyone can find and view your profile.",
  members: "Members only — only signed-in MAKERSIGNAL members can view it.",
  hidden: "Hidden — not in search; brands you already work with can still see it.",
};

export default async function CreatorSettingsPage() {
  const viewer = await requireRole("creator");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("creator_profiles").select("visibility, availability, slug").eq("id", viewer.id).single();
  return (
    <>
      <PageHeader eyebrow="Creator" title="Settings" description="Account, security, profile visibility and your data." />
      <div className="grid gap-6">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="h-section">Profile visibility & availability</h2>
              <p className="meta mt-1">{VISIBILITY[profile?.visibility ?? "public"]}</p>
              <div className="mt-3">{profile ? <StatusBadge status={profile.availability} /> : null}</div>
            </div>
            <Button asChild variant="outline">
              <Link href="/creator/profile#rates">
                Change <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </Panel>
        <AccountSettings viewer={viewer} />
      </div>
    </>
  );
}
