import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, UsersRound } from "lucide-react";
import { PageHeader, Section } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { MatchList } from "@/components/matching/match-list";
import { RefreshMatchesButton } from "@/components/matching/refresh-matches-button";
import { AiSquadSuggestions, DeleteRoleButton, RoleDialogButton } from "@/components/squad/role-editor";
import { requireRole } from "@/lib/auth/session";
import { getCampaignDetail } from "@/lib/data/campaigns";
import { getInvitableCampaigns } from "@/lib/data/brand-campaigns";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { aiConfigured } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Squad Builder" };

export default async function SquadPage({ params }: PageProps<"/brand/campaigns/[id]/squad">) {
  const viewer = await requireRole("brand");
  const { id } = await params;
  const detail = await getCampaignDetail(id);
  if (!detail || detail.campaign.brand_id !== viewer.id) notFound();
  const c = detail.campaign;
  const supabase = await createClient();
  const [taxonomy, rolesRes, invitesRes, inviteCampaigns] = await Promise.all([
    getTaxonomy(),
    supabase.from("squad_roles").select("*, squad_role_skills(skill_id)").eq("campaign_id", id).order("sort_order"),
    supabase
      .from("campaign_invitations")
      .select("id, status, squad_role_id, creator_id, creator_profiles(display_name, slug, availability, available_from)")
      .eq("campaign_id", id)
      .not("squad_role_id", "is", null),
    getInvitableCampaigns(viewer.id),
  ]);
  const roles = (rolesRes.data ?? []).map((r) => ({ ...r, skillIds: r.squad_role_skills.map((s) => s.skill_id) }));
  const invites = invitesRes.data ?? [];
  const name = (list: { id: number; name: string }[], v: number | null) => list.find((x) => x.id === v)?.name;

  // Coverage: campaign skills & deliverable types covered by at least one role.
  const campaignSkills = detail.skills.map((s) => s.skill_id);
  const roleSkills = new Set(roles.flatMap((r) => r.skillIds));
  const missingSkills = campaignSkills.filter((s) => !roleSkills.has(s));
  const campaignTypes = [...new Set(detail.deliverables.map((d) => d.deliverable_type_id))];
  const roleTypes = new Set(roles.map((r) => r.deliverable_type_id));
  const missingTypes = campaignTypes.filter((t) => !roleTypes.has(t));

  // Budget: sum of role budgets × headcount vs campaign maximum.
  const committed = roles.reduce((s, r) => s + (r.budget_cents ?? 0) * r.headcount, 0);
  const unbudgeted = roles.filter((r) => r.budget_cents == null).length;
  const max = c.budget_max_cents;
  const overBudget = max != null && committed > max;

  // Availability warnings for invited/accepted creators.
  const availabilityIssues = invites.filter(
    (i) => ["pending", "accepted"].includes(i.status) && (i.creator_profiles?.availability === "unavailable" || (c.deadline && i.creator_profiles?.available_from && i.creator_profiles.available_from > c.deadline)),
  );
  const canInvite = ["published", "paused"].includes(c.status);

  return (
    <>
      <Link href={`/brand/campaigns/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden /> {c.title}
      </Link>
      <PageHeader
        eyebrow="Squad Builder"
        title="Plan your creator team"
        description="Define the roles this campaign needs, check coverage and budget, then invite creators role by role. Nobody joins until they accept."
        actions={<RoleDialogButton campaignId={id} taxonomy={taxonomy} />}
      />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="meta">Skill coverage</p>
          <p className="mt-1.5 text-2xl font-semibold">{campaignSkills.length ? `${campaignSkills.length - missingSkills.length} / ${campaignSkills.length}` : "—"}</p>
          {missingSkills.length ? (
            <p className="mt-1 text-xs text-warning">Gaps: {missingSkills.map((s) => name(taxonomy.skills, s)).join(", ")}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">{campaignSkills.length ? "Every required skill has a role." : "The brief lists no required skills."}</p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="meta">Deliverable coverage</p>
          <p className="mt-1.5 text-2xl font-semibold">{campaignTypes.length ? `${campaignTypes.length - missingTypes.length} / ${campaignTypes.length}` : "—"}</p>
          {missingTypes.length ? (
            <p className="mt-1 text-xs text-warning">No role for: {missingTypes.map((t) => name(taxonomy.deliverableTypes, t)).join(", ")}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">Each deliverable type has a role.</p>
          )}
        </div>
        <div className={cn("rounded-2xl border bg-white p-5", overBudget ? "border-warning/40" : "border-line")}>
          <p className="meta">Combined role budgets</p>
          <p className="mt-1.5 text-2xl font-semibold">{formatMoney(committed, c.currency)}</p>
          <p className={cn("mt-1 text-xs", overBudget ? "text-warning" : "text-ink-muted")}>
            {max == null ? "Campaign has no budget set." : overBudget ? `Over the campaign budget of ${formatMoney(max, c.currency)}.` : `Within the campaign budget of ${formatMoney(max, c.currency)}.`}
            {unbudgeted ? ` ${unbudgeted} role${unbudgeted === 1 ? " has" : "s have"} no budget yet.` : ""}
          </p>
        </div>
      </div>
      {availabilityIssues.length ? (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Availability: {availabilityIssues.map((i) => i.creator_profiles?.display_name).join(", ")} may not be available before the deadline.
        </p>
      ) : null}
      {!canInvite ? <p className="mb-6 rounded-xl bg-secondary px-4 py-3 text-sm">Publish the campaign to invite creators to roles.</p> : null}

      <div className="mb-10">
        <AiSquadSuggestions campaignId={id} taxonomy={taxonomy} aiReady={aiConfigured()} campaignBudgetCents={max} />
      </div>

      {roles.length === 0 ? (
        <EmptyState icon={UsersRound} title="No roles yet" description="Add the roles you need — for example a video creator, a photographer and an editor." action={<RoleDialogButton campaignId={id} taxonomy={taxonomy} />} />
      ) : (
        <div className="grid gap-10">
          {roles.map((r) => {
            const roleInvites = invites.filter((i) => i.squad_role_id === r.id);
            const accepted = roleInvites.filter((i) => i.status === "accepted").length;
            return (
              <Section
                key={r.id}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {r.title}
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", accepted >= r.headcount ? "bg-lime-soft text-forest" : "bg-secondary text-ink-muted")}>
                      {accepted >= r.headcount ? <Check className="mr-1 inline size-3" aria-hidden /> : null}
                      {accepted} / {r.headcount} accepted
                    </span>
                  </span>
                }
                description={[
                  name(taxonomy.categories, r.category_id),
                  name(taxonomy.deliverableTypes, r.deliverable_type_id),
                  r.budget_cents != null ? `${formatMoney(r.budget_cents, c.currency)} per person` : null,
                  r.skillIds.map((s) => name(taxonomy.skills, s)).join(", ") || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                actions={
                  <div className="flex flex-wrap gap-1">
                    <RefreshMatchesButton campaignId={id} squadRoleId={r.id} label="Find creators" />
                    <RoleDialogButton campaignId={id} taxonomy={taxonomy} role={{ ...r, skillIds: r.skillIds }} />
                    <DeleteRoleButton campaignId={id} roleId={r.id} />
                  </div>
                }
              >
                {roleInvites.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {roleInvites.map((i) => (
                      <li key={i.id} className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-1 pl-3 text-sm">
                        <Link href={`/creators/${i.creator_profiles?.slug}`} className="hover:underline">{i.creator_profiles?.display_name}</Link>
                        <StatusBadge status={i.status} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <MatchList
                  campaignId={id}
                  squadRoleId={r.id}
                  brandId={viewer.id}
                  inviteCampaigns={canInvite ? inviteCampaigns : []}
                  limit={5}
                  invitedIds={roleInvites.filter((i) => ["pending", "accepted"].includes(i.status)).map((i) => i.creator_id)}
                />
              </Section>
            );
          })}
        </div>
      )}
    </>
  );
}
