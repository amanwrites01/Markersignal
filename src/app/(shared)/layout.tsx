import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireViewer } from "@/lib/auth/session";

export default async function SharedAppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  if (!viewer.profile.role || viewer.profile.role === "admin") {
    if (!viewer.profile.role) redirect("/onboarding");
  }
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
