import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

/** Honest placeholder for sections not built yet in the current phase. */
export function InProgress({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={Hammer} title={`Being built — ${phase}`} description={description} />
    </>
  );
}
