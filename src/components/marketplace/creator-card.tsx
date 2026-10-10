import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { publicFileUrl } from "@/lib/storage";
import { formatMoney, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CreatorCardData = {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  avatar_path: string | null;
  location_city: string | null;
  location_country: string | null;
  availability: string;
  starting_rate_cents: number | null;
  currency: string;
  categories: string[];
  styles: string[];
  skills: string[];
  preview_paths: string[];
};

export function CreatorCard({ creator, action, href }: { creator: CreatorCardData; action?: React.ReactNode; href?: string }) {
  const location = [creator.location_city, creator.location_country].filter(Boolean).join(", ");
  const previews = creator.preview_paths.slice(0, 3);
  const link = href ?? `/creators/${creator.slug}`;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(20,36,28,0.45)]">
      <div className={cn("grid h-36 gap-0.5 bg-secondary", previews.length > 1 ? "grid-cols-[2fr_1fr]" : "grid-cols-1")}>
        {previews.length ? (
          <>
            <div className="relative">
              <Image src={publicFileUrl("portfolio", previews[0])!} alt="" fill sizes="(max-width: 768px) 70vw, 280px" className="object-cover" />
            </div>
            {previews.length > 1 ? (
              <div className="grid gap-0.5">
                {previews.slice(1).map((p) => (
                  <div key={p} className="relative">
                    <Image src={publicFileUrl("portfolio", p)!} alt="" fill sizes="140px" className="object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex items-end bg-[radial-gradient(circle_at_80%_10%,#d3f36b33,transparent_55%),linear-gradient(135deg,#20382b,#14241c)] p-4">
            <p className="text-xs text-ivory/70">{creator.categories.slice(0, 2).join(" · ") || "Creator"}</p>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="-mt-10 mb-2 flex items-end justify-between">
          <Avatar className="size-14 ring-4 ring-white">
            {creator.avatar_path ? <AvatarImage src={publicFileUrl("avatars", creator.avatar_path)!} alt="" /> : null}
            <AvatarFallback className="bg-forest text-lime">{initials(creator.display_name)}</AvatarFallback>
          </Avatar>
          {creator.starting_rate_cents != null ? (
            <p className="text-xs text-ink-muted">
              from <span className="font-semibold text-forest">{formatMoney(creator.starting_rate_cents, creator.currency)}</span>
            </p>
          ) : null}
        </div>
        <h3 className="font-semibold">
          <Link href={link} className="after:absolute after:inset-0 focus-visible:outline-none">
            {creator.display_name}
          </Link>
        </h3>
        {creator.headline ? <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{creator.headline}</p> : null}
        {location ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
            <MapPin className="size-3.5" aria-hidden /> {location}
          </p>
        ) : null}
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Creative style">
          {creator.styles.slice(0, 3).map((s) => (
            <li key={s} className="rounded-full bg-lime-soft px-2 py-0.5 text-[11px] font-medium text-forest">
              {s}
            </li>
          ))}
          {creator.skills.slice(0, 2).map((s) => (
            <li key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-forest/80">
              {s}
            </li>
          ))}
        </ul>
        {action ? <div className="relative z-10 mt-4 flex gap-2">{action}</div> : null}
      </div>
    </article>
  );
}
