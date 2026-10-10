import type { Metadata } from "next";
import { ProjectList } from "@/components/projects/project-list";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Projects" };

export default async function BrandProjectsPage({ searchParams }: PageProps<"/brand/projects">) {
  const viewer = await requireRole("brand");
  const { tab } = await searchParams;
  return <ProjectList userId={viewer.id} role="brand" tab={typeof tab === "string" ? tab : undefined} />;
}
