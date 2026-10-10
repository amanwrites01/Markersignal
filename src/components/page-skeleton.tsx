import { Skeleton } from "@/components/ui/skeleton";

/** Shown instantly while a workspace page loads its data. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-in fade-in">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-4">
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}
