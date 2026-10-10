import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RoleChooser } from "@/components/onboarding/role-chooser";
import { homeFor, requireViewer, type Role } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const viewer = await requireViewer("/onboarding");
  const role = viewer.profile.role as Role | null;
  if (role === "admin") redirect("/settings");
  if (role && viewer.profile.onboarding_completed_at) redirect(homeFor(role));
  if (role) redirect(`/${role}/onboarding`);

  return (
    <div className="min-h-dvh">
      <div className="container-page flex items-center justify-between py-6">
        <Logo />
        <ThemeToggle />
      </div>
      <main id="main" className="container-page max-w-3xl py-10 sm:py-16">
        <p className="eyebrow">Step 1 of 2</p>
        <h1 className="h-page mt-2">How will you use MAKERSIGNAL?</h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          This sets up the right workspace for you. It can&apos;t be switched later, so if you need both, use separate accounts.
        </p>
        <RoleChooser />
      </main>
    </div>
  );
}
