import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AccountSettings } from "@/components/settings/account-settings";
import { requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  if (viewer.profile.role === "brand") redirect("/brand/settings");
  if (viewer.profile.role === "creator") redirect("/creator/settings");
  // Admins (no role workspace) manage their account here.
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6">
        <AccountSettings viewer={viewer} />
      </div>
    </>
  );
}
