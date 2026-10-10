import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, ExternalLink, Globe2, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ReportButton } from "@/components/marketplace/report-button";
import { InviteButton, ShortlistButton } from "@/components/marketplace/brand-creator-actions";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { getInvitableCampaigns } from "@/lib/data/brand-campaigns";
import { publicFileUrl } from "@/lib/storage";
import { formatDate, formatMoney, initials } from "@/lib/format";

async function loadCreator(slug: string) {
  const supabase = await createClient();
  const { data: creator } = await supabase.from("creator_profiles").select("*").eq("slug", slug).maybeSingle();
  return { supabase, creator };
}

export async function generateMetadata({ params }: PageProps<"/creators/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { creator } = await loadCreator(slug);
  if (!creator) return { title: "Creator not found" };
  return { title: creator.display_name, description: creator.headline ?? undefined };
}

export default async function CreatorPublicPage({ params }: PageProps<"/creators/[slug]">) {
  const { slug } = await params;
  const { supabase, creator } = await loadCreator(slug);
  if (!creator) notFound();

  const viewer = await getViewer();
  const isBrand = viewer?.profile.role === "brand";
  const [cats, styles, skills, platforms, portfolio, services, links, stats, reviews, saved, campaigns] = await Promise.all([
    supabase.from("creator_category_links").select("creator_categories(name)").eq("creator_id", creator.id),
    supabase.from("creator_style_tags").select("creative_style_tags(name, description, sort_order)").eq("creator_id", creator.id),
    supabase.from("creator_skills").select("skills(name)").eq("creator_id", creator.id),
    supabase.from("creator_platforms").select("handle, platforms(name)").eq("creator_id", creator.id),
    supabase
      .from("portfolio_items")
      .select("id, title, description, media_type, media_path, external_url, client_name, deliverable_types(name), industries(name)")
      .eq("creator_id", creator.id)
      .order("sort_order")
      .order("created_at"),
    supabase.from("creator_services").select("*, deliverable_types(name)").eq("creator_id", creator.id).eq("active", true).order("starting_price_cents"),
    supabase.from("profile_links").select("kind, url").eq("profile_id", creator.id),
    supabase.rpc("creator_trust_stats", { p_creator_id: creator.id }).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, rating, body, created_at, projects(title)")
      .eq("reviewee_id", creator.id)
      .eq("direction", "brand_to_creator")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(10),
    isBrand ? supabase.from("saved_creators").select("creator_id").eq("brand_id", viewer!.id).eq("creator_id", creator.id).maybeSingle() : Promise.resolve({ data: null }),
    isBrand ? getInvitableCampaigns(viewer!.id) : Promise.resolve([]),
  ]);

  const location = [creator.location_city, creator.location_country].filter(Boolean).join(", ");
  const styleTags = (styles.data ?? []).map((s) => s.creative_style_tags).filter(Boolean).sort((a, b) => a!.sort_order - b!.sort_order);
  const avatar = publicFileUrl("avatars", creator.avatar_path);
  const isSelf = viewer?.id === creator.id;

  return (
    <div className="pb-20">
      <section className="border-b border-line bg-white">
        <div className="container-page py-10 sm:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-5">
              <Avatar className="size-24 ring-4 ring-ivory">
                {avatar ? <AvatarImage src={avatar} alt="" /> : null}
                <AvatarFallback className="bg-forest text-2xl text-lime">{initials(creator.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{creator.display_name}</h1>
                {creator.headline ? <p className="mt-1 text-lg text-ink-muted">{creator.headline}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
                  {location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-4" aria-hidden /> {location}
                    </span>
                  ) : null}
                  {creator.languages.length ? (
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="size-4" aria-hidden /> {creator.languages.join(", ")}
                    </span>
                  ) : null}
                  <StatusBadge status={creator.availability} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isBrand ? (
                <>
                  <ShortlistButton creatorId={creator.id} saved={Boolean(saved.data)} />
                  <InviteButton creatorId={creator.id} creatorName={creator.display_name} campaigns={campaigns} />
                </>
              ) : isSelf ? (
                <Button asChild variant="outline">
                  <Link href="/creator/profile">Edit profile</Link>
                </Button>
              ) : !viewer ? (
                <Button asChild>
                  <Link href={`/auth/sign-up`}>Join to invite this creator</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-12">
          {creator.bio ? (
            <section>
              <h2 className="h-section">About</h2>
              <p className="prose-body mt-3 whitespace-pre-line">{creator.bio}</p>
            </section>
          ) : null}

          <section>
            <h2 className="h-section">Portfolio</h2>
            {portfolio.data?.length ? (
              <ul className="mt-4 grid gap-5 sm:grid-cols-2">
                {portfolio.data.map((item) => (
                  <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                    <div className="relative aspect-[4/3] bg-secondary">
                      {item.media_type === "image" && item.media_path ? (
                        <Image src={publicFileUrl("portfolio", item.media_path)!} alt={item.title} fill sizes="(max-width: 640px) 100vw, 40vw" className="object-cover" />
                      ) : item.media_type === "video" && item.media_path ? (
                        <video src={publicFileUrl("portfolio", item.media_path)!} controls preload="metadata" className="size-full bg-black object-contain" aria-label={item.title} />
                      ) : (
                        <div className="grid size-full place-items-center">
                          <ExternalLink className="size-6 text-ink-muted" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {[item.deliverable_types?.name, item.industries?.name, item.client_name].filter(Boolean).join(" · ")}
                      </p>
                      {item.description ? <p className="mt-2 line-clamp-3 text-sm text-forest/85">{item.description}</p> : null}
                      {item.external_url ? (
                        <a href={item.external_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                          View <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="mt-4" title="No portfolio pieces yet" />
            )}
          </section>

          <section>
            <h2 className="h-section">Services</h2>
            {services.data?.length ? (
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
                {services.data.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="font-medium">{s.title}</p>
                      {s.description ? <p className="mt-1 max-w-prose text-sm text-ink-muted">{s.description}</p> : null}
                      <p className="mt-1 text-xs text-ink-muted">
                        {[s.deliverable_types?.name, s.turnaround_days ? `${s.turnaround_days}-day turnaround` : null, s.revisions_included != null ? `${s.revisions_included} revisions` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {s.starting_price_cents != null ? (
                      <p className="text-sm">
                        from <span className="font-semibold">{formatMoney(s.starting_price_cents, s.currency)}</span>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta mt-3">No services listed. Invite the creator to request a quote.</p>
            )}
            <p className="mt-2 text-xs text-ink-muted">Indicative starting prices set by the creator. Final quotes depend on scope and usage rights.</p>
          </section>

          <section>
            <h2 className="h-section">Reviews</h2>
            {reviews.data?.length ? (
              <ul className="mt-4 grid gap-4">
                {reviews.data.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1 text-sm font-medium" aria-label={`${r.rating} out of 5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={i < r.rating ? "size-4 fill-forest text-forest" : "size-4 text-line"} aria-hidden />
                        ))}
                      </span>
                      <span className="text-xs text-ink-muted">{formatDate(r.created_at)}</span>
                    </div>
                    {r.body ? <p className="mt-2 text-sm">{r.body}</p> : null}
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-muted">
                      <BadgeCheck className="size-3.5 text-success" aria-hidden /> Verified MAKERSIGNAL project{r.projects?.title ? ` · ${r.projects.title}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta mt-3">No reviews yet. Reviews appear after completed MAKERSIGNAL projects.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow">Creative DNA</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {styleTags.map((s) => (
                <li key={s!.name} title={s!.description ?? undefined} className="rounded-full bg-forest px-2.5 py-1 text-xs font-medium text-ivory">
                  {s!.name}
                </li>
              ))}
            </ul>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Categories</dt>
                <dd className="mt-1">{(cats.data ?? []).map((c) => c.creator_categories?.name).filter(Boolean).join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Skills</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {(skills.data ?? []).map((s) => (
                    <span key={s.skills?.name} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {s.skills?.name}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Platforms</dt>
                <dd className="mt-1">{(platforms.data ?? []).map((p) => p.platforms?.name).filter(Boolean).join(", ") || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 text-sm">
            <p className="eyebrow">Working with {creator.display_name.split(" ")[0]}</p>
            <dl className="mt-3 grid gap-3">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Starting rate</dt>
                <dd className="font-medium">{creator.starting_rate_cents != null ? formatMoney(creator.starting_rate_cents, creator.currency) : "On request"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Works</dt>
                <dd>{creator.collaboration_types.map((c) => c.replace("_", "-")).join(", ")}</dd>
              </div>
              {creator.available_from ? (
                <div className="flex justify-between gap-3">
                  <dt className="inline-flex items-center gap-1 text-ink-muted">
                    <CalendarClock className="size-3.5" aria-hidden /> Available from
                  </dt>
                  <dd>{formatDate(creator.available_from)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Completed projects</dt>
                <dd>{stats.data?.completed_projects ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Rating</dt>
                <dd>{stats.data?.review_count ? `${stats.data.average_rating} / 5 (${stats.data.review_count})` : "No reviews yet"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-muted">Project and review counts come only from completed MAKERSIGNAL projects.</p>
          </div>
          {links.data?.length ? (
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="eyebrow">Elsewhere</p>
              <ul className="mt-3 grid gap-2 text-sm">
                {links.data.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                      {l.kind === "x" ? "X" : l.kind.charAt(0).toUpperCase() + l.kind.slice(1)} <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-muted">Links are provided by the creator and not verified by MAKERSIGNAL.</p>
            </div>
          ) : null}
          {viewer && !isSelf ? <ReportButton entityType="creator_profile" entityId={creator.id} label="Report profile" /> : null}
        </aside>
      </div>
    </div>
  );
}
