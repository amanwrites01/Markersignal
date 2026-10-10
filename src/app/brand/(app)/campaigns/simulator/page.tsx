import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { BriefSimulator } from "@/components/ai/brief-simulator";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { aiConfigured } from "@/lib/ai/client";

export const metadata: Metadata = { title: "Brief-to-Reality Simulator" };

export default async function SimulatorPage() {
  await requireRole("brand");
  return (
    <>
      <PageHeader
        eyebrow="AI-assisted"
        title="Brief-to-Reality Simulator"
        description="Turn a rough idea into a structured, editable brief with deliverables, an outline, a timeline, open questions and scope warnings."
      />
      <BriefSimulator taxonomy={await getTaxonomy()} aiReady={aiConfigured()} />
    </>
  );
}
