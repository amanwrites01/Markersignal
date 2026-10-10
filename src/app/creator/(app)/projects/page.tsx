import type { Metadata } from "next";
import { ProjectList } from "@/components/projects/project-list";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Projects" };

export default async function CreatorProjectsPage({ searchParams }: PageProps<"/creator/projects">) {
  const viewer = await requireRole("creator");
  const { tab } = await searchParams;
  return <ProjectList userId={viewer.id} role="creator" tab={typeof tab === "string" ? tab : undefined} />;
}
