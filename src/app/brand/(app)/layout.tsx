import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function BrandAppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole("brand");
  const supabase = await createClient();
  const { data } = await supabase.from("brand_profiles").select("id").eq("id", viewer.id).maybeSingle();
  if (!data) redirect("/brand/onboarding");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
