import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { BRAND_NAV, CREATOR_NAV } from "./nav-config";
import type { Viewer } from "@/lib/auth/session";
import { getUnreadCounts } from "@/lib/data/counts";
import { publicFileUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const role = viewer.profile.role === "brand" ? "brand" : "creator";
  const items = role === "brand" ? BRAND_NAV : CREATOR_NAV;
  const home = `/${role}/dashboard`;
  const supabase = await createClient();
  const [counts, identity] = await Promise.all([
    getUnreadCounts(viewer.id),
    role === "brand"
      ? supabase.from("brand_profiles").select("brand_name, logo_path, slug").eq("id", viewer.id).maybeSingle()
      : supabase.from("creator_profiles").select("display_name, avatar_path, slug").eq("id", viewer.id).maybeSingle(),
  ]);
  const data = identity.data as { brand_name?: string; logo_path?: string | null; display_name?: string; avatar_path?: string | null; slug?: string } | null;
  const name = data?.brand_name ?? data?.display_name ?? viewer.profile.full_name ?? "Your account";
  const avatarUrl = role === "brand" ? publicFileUrl("brand-logos", data?.logo_path) : publicFileUrl("avatars", data?.avatar_path);
  const profileHref = role === "brand" ? "/brand/settings" : data?.slug ? `/creators/${data.slug}` : "/creator/profile";
  const settingsHref = `/${role}/settings`;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="on-dark sticky top-0 hidden h-dvh flex-col bg-forest px-4 py-5 text-ivory lg:flex">
        <Logo dark href={home} className="px-2" />
        <p className="mt-6 mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-ivory/50 uppercase">{role === "brand" ? "Brand workspace" : "Creator workspace"}</p>
        <nav aria-label="Workspace" className="flex-1 overflow-y-auto">
          <NavLinks items={items} counts={counts} />
        </nav>
        <div className="border-t border-white/10 pt-3">
          <Link href={settingsHref} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ivory/70 hover:bg-deep/60 hover:text-ivory">
            <Settings className="size-[18px]" aria-hidden /> Settings
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-ivory/90 px-4 backdrop-blur sm:px-6">
          <MobileNav items={items} counts={counts} home={home} />
          <Logo href={home} className="lg:hidden [&>span]:hidden sm:[&>span]:inline" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}>
              <Link href="/notifications">
                <Bell />
                {counts.notifications > 0 ? (
                  <span aria-hidden className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-lime px-1 text-[10px] leading-4 font-semibold text-forest ring-2 ring-ivory">
                    {counts.notifications > 9 ? "9+" : counts.notifications}
                  </span>
                ) : null}
              </Link>
            </Button>
            <UserMenu name={name} email={viewer.email} avatarUrl={avatarUrl} profileHref={profileHref} settingsHref={settingsHref} />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
