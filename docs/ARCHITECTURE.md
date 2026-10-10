# MAKERSIGNAL — Architecture

_Creativity, Connected._ An AI-assisted marketplace connecting brands with content creators.

This document is the technical proposal the build follows. It is kept current with the code;
where they disagree, the code and migrations are authoritative and this file should be fixed.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | Next.js 16 (App Router, Turbopack, React 19, TypeScript strict) | Server components keep data access on the server; server actions give typed mutations without a separate API layer. `cacheComponents` is disabled: almost every page is per-user, so request-time rendering is simpler and avoids caching private data. |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) + Lucide | Accessible primitives we own as source; tokens map to the MAKERSIGNAL palette. |
| Forms | React Hook Form + Zod | One Zod schema validates on the client for UX and again on the server for security. |
| Data / auth / files | Supabase (Postgres 17, GoTrue auth, Storage) | Row Level Security enforces access in the database itself, so a bug in a page can't leak another user's records. |
| AI | Anthropic Claude via `@anthropic-ai/sdk`, server-only | Structured outputs validated with Zod; model configurable via `AI_MODEL`. |
| Tests | Vitest (unit + DB integration against local Supabase), Playwright (E2E) | |
| Hosting | Vercel (app) + Supabase Cloud (backend) | |

## 2. Security model (the rules everything else follows)

1. **The database is the authority.** Every table has RLS enabled. The browser never receives the
   service-role key. Server code uses the *user's* session (anon key + cookies), so RLS applies to
   every query the app makes on a user's behalf.
2. **Least privilege grants.** Default Supabase grants are revoked. `authenticated`/`anon` receive
   only the column-level `INSERT`/`UPDATE` privileges each feature needs. Status columns, role,
   ownership columns and counters are **not** directly writable.
3. **Workflow transitions are database functions.** Every status change (publish campaign,
   submit/accept proposal, submit deliverable, approve rights, complete project, …) is a
   `SECURITY DEFINER` Postgres function that checks `auth.uid()`, ownership/membership and the
   allowed transition table, then writes an `audit_logs` row and notifications atomically.
   The UI cannot skip a state or act for the other party.
4. **Role is set once, server-side.** `profiles.role` is only writable through
   `set_initial_role()`, which refuses to change an existing role and never grants `admin`.
5. **Private files stay private.** Deliverables and rights exports live in private buckets,
   accessed with short-lived signed URLs after a membership check. Only avatars, logos and
   portfolio media (which creators publish deliberately) use public buckets.
6. **AI is advisory only.** AI functions read data the user can already see, return validated
   JSON, and never call workflow functions. Every consequential action needs a user click.
7. **Rate limits** on auth-adjacent and AI endpoints via `check_rate_limit()` (a Postgres
   fixed-window counter — works on serverless without Redis).

## 3. Domain model

```
auth.users 1─1 profiles (role: creator | brand | admin)
profiles 1─1 creator_profiles ─┬─< creator_category_links >─ creator_categories
                               ├─< creator_style_tags     >─ creative_style_tags   (Creative DNA)
                               ├─< creator_skills         >─ skills
                               ├─< creator_platforms      >─ platforms
                               ├─< portfolio_items
                               └─< creator_services
profiles 1─1 brand_profiles ──< campaigns ─┬─< campaign_deliverables
                                           ├─< campaign_style_tags / campaign_platforms / campaign_skills
                                           ├─< squad_roles                         (Squad Builder)
                                           ├─< campaign_invitations >─ creator_profiles
                                           ├─< match_results                       (Creative DNA scores)
                                           └─< proposals ─┬─< proposal_deliverables
                                                          └─< proposal_portfolio_items
proposals 1─1 projects ─┬─< project_members
                        ├─< project_milestones
                        ├─< deliverables ─< deliverable_versions, deliverable_feedback
                        ├─< project_comments
                        ├─< rights_records ─< rights_record_platforms   (Rights Passport)
                        └─< reviews (one per direction)
conversations ─< conversation_members, messages      notifications, saved_creators, saved_campaigns
reports, audit_logs, ai_analysis_records, rate_limits, account_deletion_requests
```

Taxonomies (`creator_categories`, `creative_style_tags`, `skills`, `platforms`,
`deliverable_types`, `industries`) are rows, not enums — new tags are added with an `INSERT`,
no code change.

### Status machines (enforced in SQL)

| Entity | States | Transitions |
|---|---|---|
| Campaign | draft → published ⇄ paused → closed → archived | owner only; publish requires title, objective, ≥1 deliverable, budget, deadline |
| Proposal | draft → submitted → under_review → accepted / rejected; submitted/under_review → withdrawn | creator submits/withdraws; brand reviews/accepts/rejects |
| Project | awaiting_agreement → active ⇄ in_review ⇄ revision_requested → completed; any open → cancelled / disputed | both parties agree scope → active; deliverable submit → in_review; brand decisions; brand completes only when every deliverable is approved |
| Rights record | draft → awaiting_creator / awaiting_brand → agreed → (expired by date) ; any → disputed | an edit resets both approvals; each party approves its own side |
| Invitation | pending → accepted / declined / withdrawn | |

## 4. Core differentiators

- **Creative DNA matching** — `src/lib/matching/` deterministic scorer. Weighted factors: skills,
  style-tag overlap, category/industry fit, platform expertise, deliverable experience
  (portfolio + services), budget fit (starting rate vs campaign budget), availability vs
  deadline. Output: 0–100 estimate + per-factor breakdown + plain-English explanation, stored in
  `match_results`. No sensitive attributes (age, gender, ethnicity, location-as-proxy) are
  inputs. An optional AI pass rewrites the explanation from the stored factors only.
- **Rights Passport** — structured usage-rights record per project/deliverable, two-party
  approval, AI-training permission is a separate explicit opt-in defaulting to `false`, export
  as a printable/downloadable document. Labelled as a record of terms, not a contract.
- **Brief-to-Reality Simulator** — AI produces an editable structured brief, deliverables,
  storyboard, timeline, clarification questions, scope/budget mismatches and a proposal
  checklist. Nothing is published without the brand saving and publishing it.
- **Scope-to-Price Translator** — deterministic cost-driver analysis (usage, exclusivity,
  raw files, revisions, rush timeline) against creator rates, optionally enriched by AI.
  All ranges labelled estimates; never changes a quote.
- **Blind Brief Room** — per-campaign switch. Brands read proposals through
  `brand_list_proposals()`, which masks name, avatar, slug and profile links until the brand
  reveals; RLS blocks direct reads of unrevealed blind proposals. UI states that portfolio
  samples may still reveal identity.
- **Squad Builder** — roles per campaign with required skills/deliverables/budget, per-role
  recommendations, coverage & gap view, combined budget check, per-role invitations.
- **Creator Growth Map** — computed from the creator's real data (completeness, portfolio
  coverage by category/deliverable, skills lacking samples, proposal stats).

## 5. Routes

Public: `/`, `/explore/creators`, `/explore/campaigns`, `/creators/[slug]`, `/campaigns/[id]`,
`/about`, `/contact`, `/terms`, `/privacy`.
Auth: `/auth/sign-up`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`,
`/auth/confirm` (email link handler), `/auth/check-email`, `/onboarding` (role choice).
Creator: `/creator/{onboarding,dashboard,profile,portfolio,opportunities,proposals,projects,projects/[id],messages,saved,settings}`.
Brand: `/brand/{onboarding,dashboard,campaigns,campaigns/new,campaigns/[id],campaigns/[id]/edit,campaigns/[id]/squad,creators,shortlist,proposals,projects,projects/[id],messages,settings}`.
Shared: `/notifications`, `/settings`, `/projects/[id]/rights`, `/messages/[conversationId]`.

`src/proxy.ts` refreshes the Supabase session and redirects unauthenticated users away from
protected prefixes. Layouts re-check role server-side (`requireRole()`); RLS is the final guard.

## 6. Source layout

```
src/
  app/                 routes (route groups: (public), (auth), creator, brand, shared)
  components/ui/       shadcn primitives
  components/          app components (site header, cards, forms, empty states)
  lib/supabase/        server/browser/admin clients, generated types
  lib/auth/            session + role guards
  lib/validation/      Zod schemas shared by forms and actions
  lib/matching/        Creative DNA scorer (pure, unit-tested)
  lib/pricing/         Scope-to-Price analysis (pure, unit-tested)
  lib/ai/              Claude client, prompts, schemas, service functions
  server/              server actions grouped by domain
supabase/migrations/…_schema.sql  the single schema file (RLS, functions, storage)
supabase/seed.sql      demo-only data (never run in production)
tests/                 unit, db (RLS/workflow), e2e
```

## 7. Delivery phases

1. Foundation — scaffold, design system, schema + RLS, auth, onboarding.
2. Marketplace — profiles, portfolio, campaigns, search, dashboards.
3. Collaboration — invitations, proposals, projects, milestones, deliverables, messaging, notifications, reviews.
4. AI differentiators — matching, brief simulator, scope-to-price, blind room, squads, growth map.
5. Quality — tests, accessibility/responsive pass, security review, docs, deployment guide.

## 8. Explicit MVP boundaries

- **No payments.** Milestone amounts are recorded figures for planning; the UI never says money
  is held, escrowed or transferred. A `payments` integration point is documented in `docs/BACKLOG.md`.
- **Realtime** messaging uses Supabase Realtime for new messages when available, with a
  persisted-data fallback (refresh); correctness never depends on realtime.
- **Legal pages** are placeholders clearly marked for replacement with reviewed content.
