import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorAppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole("creator");
  const supabase = await createClient();
  const { data } = await supabase.from("creator_profiles").select("id").eq("id", viewer.id).maybeSingle();
  if (!data) redirect("/creator/onboarding");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
