import Link from "next/link";
import Image from "next/image";
import { CalendarDays, EyeOff } from "lucide-react";
import { formatBudget, formatDate } from "@/lib/format";
import { publicFileUrl } from "@/lib/storage";

export type CampaignCardData = {
  id: string;
  title: string;
  objective: string | null;
  brand_name: string;
  brand_logo_path: string | null;
  category: string | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  currency: string;
  deadline: string | null;
  platforms: string[];
  deliverables: string[];
  blind_review: boolean;
};

export function CampaignCard({ campaign, footer, href }: { campaign: CampaignCardData; footer?: React.ReactNode; href?: string }) {
  const logo = publicFileUrl("brand-logos", campaign.brand_logo_path);
  return (
    <article className="relative flex flex-col rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(20,36,28,0.45)]">
      <div className="flex items-center gap-3">
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-forest text-sm font-semibold text-lime">
          {logo ? <Image src={logo} alt="" fill sizes="40px" className="object-cover" /> : campaign.brand_name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{campaign.brand_name}</p>
          <p className="truncate text-xs text-ink-muted">{campaign.category ?? "Open brief"}</p>
        </div>
        {campaign.blind_review ? (
          <span title="Blind Brief Room: proposals are reviewed without creator names first" className="ml-auto inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-forest/80">
            <EyeOff className="size-3" aria-hidden /> Blind review
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-lg leading-snug font-semibold">
        <Link href={href ?? `/campaigns/${campaign.id}`} className="after:absolute after:inset-0">
          {campaign.title}
        </Link>
      </h3>
      {campaign.objective ? <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{campaign.objective}</p> : null}
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Deliverables and platforms">
        {campaign.deliverables.slice(0, 3).map((d) => (
          <li key={d} className="rounded-full bg-lime-soft px-2 py-0.5 text-[11px] font-medium text-forest">
            {d}
          </li>
        ))}
        {campaign.platforms.slice(0, 3).map((p) => (
          <li key={p} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-forest/80">
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-sm" style={{ marginTop: "1.25rem" }}>
        <span className="font-semibold">{formatBudget(campaign.budget_min_cents, campaign.budget_max_cents, campaign.currency)}</span>
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <CalendarDays className="size-3.5" aria-hidden /> {campaign.deadline ? formatDate(campaign.deadline) : "Flexible"}
        </span>
      </div>
      {footer ? <div className="relative z-10 mt-3">{footer}</div> : null}
    </article>
  );
}
