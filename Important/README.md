# MAKERSIGNAL

**Creativity, Connected.** An AI-assisted marketplace where brands find content creators, brief them clearly, and collaborate with transparent scope, deliverables and usage rights.

> **Setting this up on a new computer? Follow [SETUP.md](SETUP.md)** — step by step, including the `.env.local` file.
>
> This README is the single guide to the project — what it does, how to run it, how sign-up and login work, and how each feature behaves. It is updated as features are built. Last updated: 2026-10-09.

---

## Contents

1. [Quick start](#1-quick-start)
2. [Test accounts](#2-test-accounts)
3. [How sign-up works](#3-how-sign-up-works)
4. [How login works](#4-how-login-works)
5. [How the marketplace works](#5-how-the-marketplace-works)
6. [Feature status](#6-feature-status)
7. [Database: one schema file, one seed file](#7-database-one-schema-file-one-seed-file)
8. [Environment variables](#8-environment-variables)
9. [Commands](#9-commands)
10. [Project structure](#10-project-structure)
11. [Security model](#11-security-model)
12. [Going live checklist](#12-going-live-checklist)
13. [Troubleshooting](#13-troubleshooting)
14. [Account deletion process](#14-account-deletion-process)
15. [Third-party services and running costs](#15-third-party-services-and-running-costs)
16. [Known limitations and backlog](#16-known-limitations-and-backlog)

---

## 1. Quick start

Requirements: **Node 20.9+**, **Docker Desktop** (running), **npm**.

```bash
cd makersignal
npm install
npm run db:start      # starts local Supabase (Postgres, Auth, Storage, Mailpit) in Docker
npm run db:reset      # builds the database from supabase/migrations/…_schema.sql + supabase/seed.sql
npm run dev           # http://localhost:3000
```

`.env.local` is already set up for the local stack (see [section 8](#8-environment-variables)).

| What | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio (browse tables) | http://127.0.0.1:54323 |
| Local email inbox (Mailpit) | http://127.0.0.1:54324 |

---

## 2. Test accounts

Created by `supabase/seed.sql` every time you run `npm run db:reset`. Emails use `example.com` (reserved — never receives mail) and are already confirmed. **Password = first name + `@2026`.** What each account contains is described in [SETUP.md → Step 9](SETUP.md#step-9--log-in-with-a-sample-account).

| Name | Role | Email | Password |
|---|---|---|---|
| **Aman** | Creator — video, Mumbai (completed project, reviews) | `aman@example.com` | `Aman@2026` |
| **Riya Sharma** | Creator — photographer, Delhi | `riya.sharma@example.com` | `Riya@2026` |
| **Arjun Mehta** | Creator — tech explainers, Bengaluru | `arjun.mehta@example.com` | `Arjun@2026` |
| **Zoya Khan** | Creator — food & UGC, Hyderabad (active project) | `zoya.khan@example.com` | `Zoya@2026` |
| Maya Okafor | Creator — skincare video, London | `maya.okafor@example.com` | `Maya@2026` |
| Theo Laurent | Creator — brand films, Lyon | `theo.laurent@example.com` | `Theo@2026` |
| Priya Raman | Creator — product photography, Bengaluru | `priya.raman@example.com` | `Priya@2026` |
| Jordan Reyes | Creator — UGC for apps & gaming, Austin | `jordan.reyes@example.com` | `Jordan@2026` |
| Sana Malik | Creator — motion design, Toronto | `sana.malik@example.com` | `Sana@2026` |
| **Neha Kapoor** | Brand — Kapoor Organics | `neha.kapoor@example.com` | `Neha@2026` |
| **Vikram Rao** | Brand — Northpeak Gear (squad, proposals) | `vikram.rao@example.com` | `Vikram@2026` |
| **Sara Fernandes** | Brand — Bloom Beauty Co. (blind review, active project) | `sara.fernandes@example.com` | `Sara@2026` |
| Ava Chen | Brand — Lumen Skin | `ava.chen@example.com` | `Ava@2026` |

The activity (proposals, projects, deliverable versions, revisions, usage rights, reviews, messages, notifications, shortlists) is created by calling the app's real workflow functions as each user, so it behaves exactly like real use.

Automated tests create their own temporary accounts and **delete them automatically** when the test run finishes, so they never appear in the app.

---

## 3. How sign-up works

1. Go to **/auth/sign-up** (or click **Join MAKERSIGNAL**).
2. Choose **Continue with Google**, *or* enter full name, email, password (8+ characters with a letter and a number — use the 👁 icon to show/hide it) and accept the terms.
3. **Confirm your email** on the next screen by entering the 6-digit code:
   - **Right now (temporary):** because email sending isn't configured yet, the code is **shown on the screen** in a yellow "Temporary" box and pre-filled — just press **Verify and continue**. This is controlled by `DEV_SHOW_EMAIL_CODES=true` in `.env.local`.
   - **After email is configured:** set `DEV_SHOW_EMAIL_CODES=false`; the code (and a confirm link) arrive by email instead. Locally those emails appear in Mailpit (http://127.0.0.1:54324).
4. **Choose your role** — *Creator* or *Brand*. This is stored server-side once and can't be changed (use a separate account for the other role).
5. **Onboarding** (saved after every step — you can leave and come back):
   - **Creator:** basics (name, profile URL, headline, bio, photo, location, languages) → **Creative DNA** (categories, up to 5 style tags, skills, platforms) → rates, availability and profile visibility → finish.
   - **Brand:** brand basics (name, URL, industry, description, website, logo) → social links → private team contact → finish.
6. You land on your **dashboard**.

## 4. How login works

- **/auth/login** → email + password (👁 to show/hide) → you're sent to your dashboard, or to onboarding if it isn't finished.
- **Continue with Google** — signs you in with your Google account once Google OAuth keys are configured (see [section 12](#12-going-live-checklist)). Until then the button explains that it isn't switched on yet.
- **Unconfirmed email?** Login offers **Resend confirmation**, which (in temporary mode) shows a new code on screen.
- **Forgot password?** → enter your email → enter the 6-digit reset code (shown on screen in temporary mode) → choose a new password.
- **Log out** from the avatar menu (top right).
- Wrong email or password both show the same message, so the form doesn't reveal which emails have accounts. Login, sign-up and reset are rate-limited per IP.

---

## 5. How the marketplace works

```
Brand creates campaign (Draft) ──► Publish ──► Creators discover it / get invited
        │                                              │
        │                          Creator sends proposal + quote (Draft → Submitted)
        ▼                                              │
Brand reviews proposals (optional Blind Brief Room) ◄──┘
        │  Accept
        ▼
Project created (Awaiting agreement) ──► both confirm scope ──► Active
        │
Creator submits deliverable v1, v2… ──► Brand approves or requests revision
        │
Rights Passport agreed by both ──► Brand completes project ──► both leave reviews
```

Every status change runs through a database function that checks who you are and whether the move is allowed, then records it in the audit log and notifies the other party.

**Creators** build a profile with *Creative DNA* (style, skills, categories, platforms), portfolio pieces and priced services; see recommended campaigns with an explanation of the fit; send proposals; deliver work; agree usage rights; get reviewed.

**Brands** create campaigns (or draft one with the Brief-to-Reality Simulator), get ranked creator matches with reasons, shortlist and invite creators, review proposals, run projects, approve deliverables, agree usage rights and review creators.

### Core differentiators

| Feature | What it does |
|---|---|
| **Creative DNA matching** | Deterministic 0–100 estimate from 8 factors: skills, creative style, portfolio relevance, deliverable experience, category, platforms, budget fit, availability. Every match shows a plain-English reason and an expandable factor breakdown. Factors without data are left out instead of penalised. No sensitive personal attributes are used. Results are stored with their factors (`match_results`). |
| **Rights Passport** | Structured usage terms per project: platforms, organic/paid use, territory, dates, exclusivity, raw files, edits, attribution, and **AI-training permission as a separate opt-in (off by default)**. Each edit resets approval; both parties must approve. Exportable. It is a record of terms, not automatically a legally binding contract. |
| **Blind Brief Room** | Optional per campaign: brands first see proposals without creator name, photo or profile link (enforced in the database), then choose to reveal. Portfolio samples may still identify a creator — the UI says so. |
| **Brief-to-Reality Simulator** | *Brand → Brief simulator.* AI drafts an editable brief, deliverables, outline, timeline, open questions, scope warnings and a proposal checklist, plus a deterministic budget check. Saved only as a **draft** — you publish it yourself. |
| **Scope-to-Price Translator** | *Sidebar → Scope-to-Price*, or from a campaign. Indicative range from the creator's own rates (or platform defaults), with each cost driver explained (paid ads, usage length, exclusivity, raw files, extra revisions, rush), a budget comparison, missing requirements and negotiation questions. Never changes a quote. |
| **Squad Builder** | *Campaign → Squad Builder.* Define roles; see skill and deliverable coverage, gaps and combined budget; find matches per role; invite individually. Nobody is added until they accept. |
| **Creator Growth Map** | On the creator dashboard: portfolio coverage by category, skills without portfolio evidence, pieces needing better descriptions, and proposal/project stats — from your real data only. |

**Payments are not part of the MVP.** Quotes, project and milestone amounts are recorded for planning only; nothing is held, transferred or escrowed.

---

## 6. Feature status

| Area | Status |
|---|---|
| Sign-up, email code verification (on-screen code for now), login, logout, password reset, show/hide password | ✅ Working |
| Google sign-in button | ✅ Built — needs Google OAuth keys to work |
| Role choice + creator/brand onboarding with saved progress | ✅ Working |
| Creator profile, Creative DNA, services, portfolio (upload or link), public profile | ✅ Working |
| Brand campaigns: create, edit, publish, pause, close, archive, delete draft | ✅ Working |
| Explore creators / campaigns with server-side search, filters, sorting, pagination | ✅ Working |
| Creative DNA matching + explanations, shortlist (with notes), invitations, opportunities, saved campaigns | ✅ Working |
| Proposals: draft, submit, withdraw, review, reject, accept → project; Blind Brief Room with reveal | ✅ Working |
| Messaging (proposal & project conversations, unread, read receipts, live updates), notifications | ✅ Working |
| Settings: password change, sign out everywhere, brand profile, account deletion request; About / Contact / Terms / Privacy | ✅ Working (legal pages are templates) |
| Dashboards (real data) + Creator Growth Map | ✅ Working |
| Scope-to-Price Translator (deterministic estimate, cost drivers, budget check, questions) | ✅ Working — AI explanation needs `ANTHROPIC_API_KEY` |
| Squad Builder: roles, coverage & gaps, combined budget, per-role matches & invitations | ✅ Working — AI role suggestions need `ANTHROPIC_API_KEY` |
| Brief-to-Reality Simulator, AI proposal summaries, AI brief check, AI portfolio descriptions, AI match summaries | ✅ Built — need `ANTHROPIC_API_KEY` (show "unavailable" without it) |
| Projects, milestones, deliverables & versions, revisions, approvals, Rights Passport + export, reviews | ✅ Working |
| Payments | ❌ Not in MVP scope |

Pages still being built show a **"Being built"** notice rather than fake content.

---

## 7. Database: one schema file, one seed file

| File | Purpose |
|---|---|
| `supabase/migrations/20261009000000_schema.sql` | **The complete schema** — tables, indexes, constraints, Row Level Security, grants, workflow functions, search, storage buckets and reference data (categories, style tags, skills, platforms, deliverable types, industries). Sections are labelled 1–11 inside the file. |
| `supabase/seed.sql` | **Sample data only** — the test accounts, profiles, portfolio and campaigns above. Applied after the schema on `npm run db:reset`. **Never applied to production** (`supabase db push` does not run it). |

- **Rebuild everything locally:** `npm run db:reset` (wipes local data, re-applies schema + seed).
- **Changing the schema:** edit the schema file, run `npm run db:reset`, then `npm run db:types` to refresh TypeScript types. *Once a production database exists, new changes must go in a new, additional migration file instead of editing this one.*
- **Reference data** (e.g. a new creative style tag) is a normal row — add it to section 9 of the schema file or insert it via Studio; no code changes needed.

Main tables: `profiles`, `creator_profiles`, `brand_profiles`, `brand_contacts`, taxonomy tables, `creator_*` links, `portfolio_items`, `creator_services`, `campaigns` (+ deliverables, platforms, styles, skills), `squad_roles`, `campaign_invitations`, `saved_creators`, `saved_campaigns`, `match_results`, `proposals` (+ deliverables, portfolio samples), `projects`, `project_members`, `project_milestones`, `deliverables`, `deliverable_versions`, `deliverable_feedback`, `project_comments`, `rights_records`, `conversations`, `conversation_members`, `messages`, `notifications`, `reviews`, `reports`, `audit_logs`, `ai_analysis_records`, `rate_limits`, `account_deletion_requests`. Full design notes: `docs/ARCHITECTURE.md` (in the project root).

---

## 8. Environment variables

`.env.local` (not committed) — template in `.env.example`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Base URL used in auth links (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project URL and public key |
| `SUPABASE_SECRET_KEY` | Server-only key (account tasks, temporary on-screen codes). Never exposed to the browser. |
| `DEV_SHOW_EMAIL_CODES` | **Temporary.** `true` shows sign-up / reset codes on screen instead of emailing them. Set `false` once email is configured. |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` once Google OAuth keys are configured in Supabase Auth |
| `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_EFFORT`, `AI_TIMEOUT_MS`, `AI_DAILY_LIMIT_PER_USER` | AI features (optional; app works without them) |

The local Supabase keys in `.env.local` are the standard public local-development keys, not production secrets.

---

## 9. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run db:start` / `npm run db:stop` | Start / stop local Supabase (Docker) |
| `npm run db:reset` | Rebuild the local database from the schema file + seed file |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` from the database |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test:unit` | Unit tests (matching engine, etc.) |
| `npm run test:db` | Database access-rule tests (needs local Supabase) |
| `npm run test:e2e` | Browser tests (Playwright; needs the app + seeded DB) |
| `npm run build` | Production build |

---

## 10. Project structure

```
src/app/(public)/      landing, explore, public creator & campaign pages, legal pages
src/app/auth/          sign-up, login, check-email (code), forgot/reset password, email link handler
src/app/onboarding/    role choice
src/app/creator/       creator onboarding + workspace (dashboard, portfolio, profile, …)
src/app/brand/         brand onboarding + workspace (dashboard, campaigns, …)
src/app/(shared)/      notifications, settings, messages, rights passport
src/components/        UI (shadcn), forms, marketplace cards, matching, onboarding, …
src/server/            server actions (auth, onboarding, creator, brand, campaigns, matching, …)
src/lib/               supabase clients, auth guards, validation (Zod), matching engine, formatting
supabase/              config.toml, migrations/…_schema.sql, seed.sql, email templates
tests/                 unit, db, e2e
docs/ARCHITECTURE.md   technical design
```

---

## 11. Security model

- **Row Level Security on every table.** The app queries as the signed-in user, so the database itself decides what each person can see.
- **Least-privilege grants:** status, role, ownership and counter columns can't be written directly; they change only through workflow functions that check the caller.
- **Role is set once** on the server and can't be self-upgraded.
- **Private files:** deliverables live in a private bucket and open through short-lived signed links for project members only.
- **AI is advisory only** — it never publishes, accepts, approves or changes prices.
- **Rate limits** on login, sign-up, password reset, code verification, invitations and AI.
- No secrets in the code or browser bundle.

---

## 12. Going live checklist

1. Create a Supabase project; run `npx supabase link` then `npx supabase db push` (applies the schema only — not the sample data).
2. **Email:** configure SMTP in Supabase Auth (or a provider such as Resend/Postmark), upload the templates in `supabase/templates/`, then set `DEV_SHOW_EMAIL_CODES=false`.
3. **Google sign-in:** Google Cloud Console → OAuth client (Web). Authorised redirect URI: `https://<project>.supabase.co/auth/v1/callback` (locally `http://127.0.0.1:54321/auth/v1/callback`). Add the client ID/secret in Supabase → Auth → Providers → Google (locally: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` env vars and `enabled = true` under `[auth.external.google]` in `supabase/config.toml`). Then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
4. Deploy to Vercel with the environment variables from section 8 (production URL in `NEXT_PUBLIC_SITE_URL`; add it to Supabase Auth redirect URLs).
5. Replace the template Terms and Privacy pages with legally reviewed text.

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| Pages show "404" for profiles or data is missing | The database was reset or is down. Run `npm run db:start`, then `npm run db:reset`. |
| `Cannot connect to Docker` | Open Docker Desktop and wait until it's running. |
| Logged out after a database reset | Expected — resets clear sessions. Log in again. |
| App feels slow | First visit to each page compiles it in development mode; other Docker containers may be using the CPU. See *Why is it slow?* in SETUP.md. For full speed run `npm run build && npm start`. |
| "1 Issue" badge about hydration in the browser | Usually a browser extension (password manager) changing input fields. Harmless; try a private window. |
| No code shown after sign-up | Check `DEV_SHOW_EMAIL_CODES=true` in `.env.local` and restart `npm run dev`. |
| Google button says "isn't switched on yet" | Google OAuth keys aren't configured — see section 12, step 3. |

---

## 14. Account deletion process

1. The user requests deletion in **Settings → Data & privacy** (optionally with a reason). This creates an `account_deletion_requests` row with status `pending`; the user can cancel while it's pending.
2. **An administrator processes it manually** (there is no admin screen yet):
   - Check the user has no open projects (`projects` where they are a member and status is not `completed`/`cancelled`); contact them if there are.
   - Set the request to `processing`.
   - Delete the user in Supabase → Authentication → Users (or `auth.admin.deleteUser`). This removes their profile, creator/brand profile, portfolio, services, links, saved items, notifications and messages memberships through cascading deletes.
   - Records the other party relies on (completed projects, agreed Rights Passport terms, deliverable versions, reviews) use `restrict`/`set null` relationships so they aren't silently destroyed — export them for the counterparty or de-identify them as your legal advice requires before deleting.
   - Remove the user's files from the `avatars`, `brand-logos` and `portfolio` buckets (folder = user id).
   - Mark the request `completed` and email the user.
3. Have this process reviewed by a privacy professional for the jurisdictions you operate in.

---

## 15. Third-party services and running costs

| Service | Used for | Cost (check current pricing) |
|---|---|---|
| **Supabase** | Postgres database, authentication, file storage, realtime | Free tier for development; Pro plan (~$25/month per project) recommended for production, plus usage (storage, bandwidth) |
| **Vercel** | Hosting the Next.js app | Hobby (free, non-commercial); Pro (~$20/user/month) for a commercial site |
| **Anthropic Claude API** | AI features (optional) | Pay per token. Default model `claude-opus-5-5` ($4 / $20 per million input/output tokens). Each AI action is typically a few thousand tokens; `AI_DAILY_LIMIT_PER_USER` caps usage. Switch `AI_MODEL` to a cheaper model if preferred. |
| **Email (SMTP)** | Sign-up codes, password reset | Needed before launch (Resend, Postmark, SendGrid, AWS SES…); most have a free tier for low volume |
| **Google Cloud OAuth** | "Continue with Google" | Free |
| **Domain name** | Your web address | ~$10–20/year |

---

## 16. Known limitations and backlog

- **Payments** are out of MVP scope — amounts are recorded for planning only. Integration point: a `payments` table + provider webhooks (e.g. Stripe Connect) keyed to `project_milestones`.
- **Email delivery** isn't configured; codes are shown on screen while `DEV_SHOW_EMAIL_CODES=true`. Turn this off before launch.
- **Google sign-in** needs OAuth keys.
- **AI features** need an Anthropic API key.
- **No admin dashboard** yet for moderation (reports) and account deletion — admins use Supabase Studio. Admin role exists in the database (`profiles.role = 'admin'`, set only via SQL).
- **Legal pages** (Terms, Privacy) are templates and must be replaced with legally reviewed text.
- **Rights Passport** is a record of agreed terms, not automatically a legally binding contract.
- **Match scores** are estimates from profile and brief data; they are not a measure of quality.
- **Video files** are limited to 25 MB for portfolio and 50 MB for deliverables; larger work should be shared as links.
