import type { Metadata } from "next";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Project" };

export default async function BrandProjectPage({ params }: PageProps<"/brand/projects/[id]">) {
  const viewer = await requireRole("brand");
  const { id } = await params;
  return <ProjectWorkspace projectId={id} viewerId={viewer.id} role="brand" />;
}
