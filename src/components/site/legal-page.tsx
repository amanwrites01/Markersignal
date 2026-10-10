import { TriangleAlert } from "lucide-react";

export function TemplateNotice() {
  return (
    <div role="note" className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Template — replace with legally reviewed text before launch.</span> This page describes how the product
        works so the structure is in place. It is not legal advice and has not been reviewed by a lawyer.
      </p>
    </div>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">Policies</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="meta mt-2">Last updated {updated}</p>
      <div className="mt-8">
        <TemplateNotice />
      </div>
      <div className="mt-10 space-y-8 text-[15px] leading-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
