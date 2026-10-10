import Link from "next/link";
import { Lightbulb, Sprout } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Taxonomy } from "@/lib/data/taxonomy";

/**
 * Creator Growth Map — guidance computed only from the creator's own data.
 * Recommendations, not guarantees of work or income.
 */
export async function GrowthMap({ creatorId, taxonomy }: { creatorId: string; taxonomy: Taxonomy }) {
  const supabase = await createClient();
  const [portfolio, skills, cats, proposals, projects] = await Promise.all([
    supabase.from("portfolio_items").select("id, title, description, category_id, deliverable_type_id, industry_id").eq("creator_id", creatorId),
    supabase.from("creator_skills").select("skill_id").eq("creator_id", creatorId),
    supabase.from("creator_category_links").select("category_id").eq("creator_id", creatorId),
    supabase.from("proposals").select("status").eq("creator_id", creatorId).neq("status", "draft"),
    supabase.from("projects").select("status").eq("creator_id", creatorId),
  ]);
  const items = portfolio.data ?? [];
  const myCats = (cats.data ?? []).map((c) => c.category_id);
  const name = (list: { id: number; name: string }[], id: number | null) => list.find((x) => x.id === id)?.name ?? "Untagged";

  const byCategory = myCats.map((id) => ({ id, name: name(taxonomy.categories, id), count: items.filter((i) => i.category_id === id).length }));
  const typeCounts = new Map<string, number>();
  for (const i of items) typeCounts.set(name(taxonomy.deliverableTypes, i.deliverable_type_id), (typeCounts.get(name(taxonomy.deliverableTypes, i.deliverable_type_id)) ?? 0) + 1);

  // Skills whose category has no portfolio evidence yet.
  const evidencedCats = new Set(items.map((i) => i.category_id));
  const weakSkills = (skills.data ?? [])
    .map((s) => taxonomy.skills.find((k) => k.id === s.skill_id))
    .filter((k): k is NonNullable<typeof k> => Boolean(k && k.categoryId != null && !evidencedCats.has(k.categoryId)));

  const thin = items.filter((i) => (i.description?.length ?? 0) < 80 || i.deliverable_type_id == null || i.industry_id == null);
  const sent = proposals.data?.length ?? 0;
  const accepted = proposals.data?.filter((p) => p.status === "accepted").length ?? 0;
  const completed = projects.data?.filter((p) => p.status === "completed").length ?? 0;
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count));

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="growth-map">
      <div className="flex items-start gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-lime-soft text-forest">
          <Sprout className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="growth-map" className="h-section">Creator Growth Map</h2>
          <p className="meta">Where your profile could show more evidence. Based only on your own profile and activity.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Portfolio coverage by category</p>
          {byCategory.length ? (
            <ul className="mt-3 grid gap-2.5">
              {byCategory.map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-ink-muted">{c.count} piece{c.count === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary" aria-hidden>
                    <div className="h-full rounded-full bg-forest" style={{ width: `${(c.count / maxCount) * 100}%`, minWidth: c.count ? 8 : 0 }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta mt-2">Pick your creator categories in Profile &amp; DNA.</p>
          )}
          {typeCounts.size ? (
            <p className="mt-4 text-xs text-ink-muted">
              By deliverable: {[...typeCounts.entries()].map(([k, v]) => `${k} (${v})`).join(" · ")}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-medium">Activity</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              ["Proposals sent", sent],
              ["Accepted", sent ? `${accepted} (${Math.round((accepted / sent) * 100)}%)` : 0],
              ["Completed projects", completed],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-secondary/60 p-3">
                <dd className="text-xl font-semibold">{value}</dd>
                <dt className="text-[11px] text-ink-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Lightbulb className="size-4" aria-hidden /> Suggestions
        </p>
        <ul className="mt-3 grid gap-2 text-sm">
          {items.length < 3 ? (
            <li>
              Add {3 - items.length} more portfolio piece{3 - items.length === 1 ? "" : "s"} — matching uses tagged pieces as evidence of experience.{" "}
              <Link href="/creator/portfolio" className="font-medium underline underline-offset-4">Add pieces</Link>
            </li>
          ) : null}
          {weakSkills.length ? (
            <li>
              These skills have no portfolio example in their category yet: <strong>{weakSkills.map((s) => s.name).join(", ")}</strong>. Adding one example each makes them
              count in matching.
            </li>
          ) : null}
          {thin.length ? (
            <li>
              {thin.length} piece{thin.length === 1 ? " is" : "s are"} missing a fuller description or deliverable/industry tags ({thin.slice(0, 3).map((t) => `“${t.title}”`).join(", ")}
              {thin.length > 3 ? "…" : ""}). Describe the brief, your role and the outcome you can verify.{" "}
              <Link href="/creator/portfolio" className="font-medium underline underline-offset-4">Edit portfolio</Link>
            </li>
          ) : null}
          {byCategory.filter((c) => c.count === 0).map((c) => (
            <li key={c.id}>You list yourself as a {c.name.toLowerCase()} but have no pieces in that category yet.</li>
          ))}
          {items.length >= 3 && !weakSkills.length && !thin.length && byCategory.every((c) => c.count > 0) ? (
            <li className="text-ink-muted">Your portfolio evidence covers everything you list. Keep adding recent work.</li>
          ) : null}
        </ul>
        <p className="mt-4 text-[11px] text-ink-muted">These are recommendations based on your profile, not a guarantee of work, income or campaign results.</p>
      </div>
    </section>
  );
}
