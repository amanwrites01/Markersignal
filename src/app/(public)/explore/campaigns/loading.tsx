import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-10 sm:py-14" aria-busy="true" aria-label="Loading campaigns">
      <Skeleton className="h-10 w-64" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-[520px] rounded-2xl lg:block" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
