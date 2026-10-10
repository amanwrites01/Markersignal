-- =============================================================================
-- MAKERSIGNAL — complete database schema (single source of truth)
--
-- Applied automatically by:  npm run db:reset   (local)
--                             npx supabase db push (hosted Supabase project)
-- Sections: 1 foundation · 2 profiles & marketplace · 3 campaigns · 4 collaboration
--           5 messaging & trust · 6 RLS & grants · 7 workflows · 8 storage
--           9 reference data · 10 indexes · 11 matching
-- =============================================================================


-- =============================================================================
-- SECTION 1 — from 20261009000100_foundation.sql
-- =============================================================================
-- MAKERSIGNAL foundation: extensions, helpers, profiles, taxonomies.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Lower-case, hyphenated slug. Used for creator/brand public URLs.
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text check (role in ('creator', 'brand', 'admin')),
  full_name text check (char_length(full_name) <= 120),
  avatar_path text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile row with no role yet. The role is chosen
-- during onboarding through set_initial_role(); metadata from sign-up is NOT
-- trusted for the role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Taxonomies. Rows, not enums: new tags are added with INSERT, no code change.
-- ---------------------------------------------------------------------------

create table public.creator_categories (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.creative_style_tags (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.skills (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  category_id smallint references public.creator_categories (id) on delete set null,
  active boolean not null default true
);

create table public.platforms (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.deliverable_types (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  -- Indicative effort multiplier used by the deterministic Scope-to-Price
  -- translator. Configuration, not a market rate.
  effort_units numeric(5, 2) not null default 1 check (effort_units > 0),
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.industries (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- Platform-level configuration for pricing heuristics etc. Readable by all;
-- written only by admins / migrations.
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- Reusable rate limiter (fixed window). Works on serverless without Redis.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create or replace function public.check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_window timestamptz;
  v_count int;
begin
  if p_max <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid rate limit configuration';
  end if;
  v_key := p_bucket || ':' || coalesce(v_uid::text, 'anon');
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (key, window_start, count)
  values (v_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into v_count;

  -- opportunistic cleanup of old windows for this key
  delete from public.rate_limits where key = v_key and window_start < v_window - make_interval(secs => p_window_seconds * 2);

  return v_count <= p_max;
end;
$$;


-- =============================================================================
-- SECTION 2 — from 20261009000200_profiles_marketplace.sql
-- =============================================================================
-- Creator and brand profiles, Creative DNA links, portfolio, services.

create table public.creator_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  display_name text not null check (char_length(display_name) between 1 and 80),
  headline text check (char_length(headline) <= 140),
  bio text check (char_length(bio) <= 3000),
  avatar_path text,
  location_city text check (char_length(location_city) <= 80),
  location_country text check (char_length(location_country) <= 80),
  languages text[] not null default '{}',
  availability text not null default 'available' check (availability in ('available', 'limited', 'unavailable')),
  available_from date,
  starting_rate_cents int check (starting_rate_cents is null or starting_rate_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  collaboration_types text[] not null default '{remote}',
  visibility text not null default 'public' check (visibility in ('public', 'members', 'hidden')),
  onboarding_step smallint not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(headline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_types_valid check (collaboration_types <@ array['remote', 'on_site', 'hybrid']::text[])
);

create index creator_profiles_search_idx on public.creator_profiles using gin (search_vector);
create index creator_profiles_name_trgm_idx on public.creator_profiles using gin (display_name extensions.gin_trgm_ops);
create index creator_profiles_visibility_idx on public.creator_profiles (visibility, availability);
create index creator_profiles_rate_idx on public.creator_profiles (starting_rate_cents);
create index creator_profiles_created_idx on public.creator_profiles (created_at desc);
create trigger creator_profiles_updated_at before update on public.creator_profiles
  for each row execute function public.set_updated_at();

create table public.creator_category_links (
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  category_id smallint not null references public.creator_categories (id) on delete cascade,
  primary key (creator_id, category_id)
);
create index creator_category_links_category_idx on public.creator_category_links (category_id);

create table public.creator_style_tags (
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  style_tag_id smallint not null references public.creative_style_tags (id) on delete cascade,
  primary key (creator_id, style_tag_id)
);
create index creator_style_tags_tag_idx on public.creator_style_tags (style_tag_id);

create table public.creator_skills (
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  skill_id smallint not null references public.skills (id) on delete cascade,
  primary key (creator_id, skill_id)
);
create index creator_skills_skill_idx on public.creator_skills (skill_id);

create table public.creator_platforms (
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  platform_id smallint not null references public.platforms (id) on delete cascade,
  handle text check (char_length(handle) <= 100),
  primary key (creator_id, platform_id)
);
create index creator_platforms_platform_idx on public.creator_platforms (platform_id);

create table public.brand_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  brand_name text not null check (char_length(brand_name) between 1 and 100),
  industry_id smallint references public.industries (id) on delete set null,
  description text check (char_length(description) <= 3000),
  website text check (website is null or website ~* '^https?://'),
  logo_path text,
  location_country text check (char_length(location_country) <= 80),
  team_size text check (team_size in ('solo', '2-10', '11-50', '51-200', '200+')),
  onboarding_step smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Private contact details, owner-only (kept out of the public brand row).
create table public.brand_contacts (
  brand_id uuid primary key references public.brand_profiles (id) on delete cascade,
  contact_name text check (char_length(contact_name) <= 120),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text check (char_length(contact_phone) <= 40),
  updated_at timestamptz not null default now()
);

create index brand_profiles_industry_idx on public.brand_profiles (industry_id);
create trigger brand_profiles_updated_at before update on public.brand_profiles
  for each row execute function public.set_updated_at();

-- Social / external links for both creators and brands.
create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('website', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'behance', 'dribbble', 'vimeo', 'other')),
  url text not null check (url ~* '^https?://' and char_length(url) <= 500),
  created_at timestamptz not null default now(),
  unique (profile_id, kind, url)
);
create index profile_links_profile_idx on public.profile_links (profile_id);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  category_id smallint references public.creator_categories (id) on delete set null,
  deliverable_type_id smallint references public.deliverable_types (id) on delete set null,
  platform_id smallint references public.platforms (id) on delete set null,
  industry_id smallint references public.industries (id) on delete set null,
  client_name text check (char_length(client_name) <= 120),
  media_type text not null default 'image' check (media_type in ('image', 'video', 'link')),
  media_path text,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  sort_order int not null default 0,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(client_name, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_has_media check (media_path is not null or external_url is not null)
);
create index portfolio_items_creator_idx on public.portfolio_items (creator_id, sort_order);
create index portfolio_items_search_idx on public.portfolio_items using gin (search_vector);
create index portfolio_items_deliverable_idx on public.portfolio_items (deliverable_type_id);
create index portfolio_items_category_idx on public.portfolio_items (category_id);
create trigger portfolio_items_updated_at before update on public.portfolio_items
  for each row execute function public.set_updated_at();

create table public.creator_services (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1500),
  deliverable_type_id smallint references public.deliverable_types (id) on delete set null,
  starting_price_cents int check (starting_price_cents is null or starting_price_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  turnaround_days int check (turnaround_days is null or turnaround_days between 1 and 365),
  revisions_included smallint check (revisions_included is null or revisions_included between 0 and 20),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index creator_services_creator_idx on public.creator_services (creator_id);
create index creator_services_deliverable_idx on public.creator_services (deliverable_type_id);
create trigger creator_services_updated_at before update on public.creator_services
  for each row execute function public.set_updated_at();

-- Who may see a creator profile. Hidden profiles are visible to their owner,
-- admins, and parties they already collaborate with (defined later once
-- projects exist; this function is replaced in the collaboration migration).
create or replace function public.can_view_creator(p_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.creator_profiles c
    where c.id = p_creator_id
      and (
        c.visibility = 'public'
        or (c.visibility = 'members' and auth.uid() is not null)
        or c.id = auth.uid()
        or public.is_admin()
      )
  );
$$;


-- =============================================================================
-- SECTION 3 — from 20261009000300_campaigns.sql
-- =============================================================================
-- Campaigns, campaign requirements, squads, invitations, saved items, matches.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brand_profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  objective text check (char_length(objective) <= 1000),
  description text check (char_length(description) <= 8000),
  product_description text check (char_length(product_description) <= 3000),
  target_audience text check (char_length(target_audience) <= 2000),
  category_id smallint references public.creator_categories (id) on delete set null,
  industry_id smallint references public.industries (id) on delete set null,
  budget_min_cents int check (budget_min_cents is null or budget_min_cents >= 0),
  budget_max_cents int check (budget_max_cents is null or budget_max_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  deadline date,
  application_deadline date,
  location_requirement text check (char_length(location_requirement) <= 200),
  -- Usage-rights expectations stated up front (the agreed terms live in rights_records).
  usage_organic boolean not null default true,
  usage_paid_ads boolean not null default false,
  usage_duration_months smallint check (usage_duration_months is null or usage_duration_months between 1 and 120),
  usage_territory text check (char_length(usage_territory) <= 200),
  exclusivity_required boolean not null default false,
  raw_files_required boolean not null default false,
  usage_notes text check (char_length(usage_notes) <= 2000),
  revisions_expected smallint check (revisions_expected is null or revisions_expected between 0 and 20),
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'closed', 'archived')),
  visibility text not null default 'public' check (visibility in ('public', 'members', 'invite_only')),
  blind_review boolean not null default false,
  ai_assisted boolean not null default false,
  published_at timestamptz,
  closed_at timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(objective, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '') || ' ' || coalesce(product_description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_budget_range check (budget_min_cents is null or budget_max_cents is null or budget_min_cents <= budget_max_cents)
);
create index campaigns_brand_idx on public.campaigns (brand_id, status);
create index campaigns_status_idx on public.campaigns (status, visibility, published_at desc);
create index campaigns_search_idx on public.campaigns using gin (search_vector);
create index campaigns_category_idx on public.campaigns (category_id);
create index campaigns_deadline_idx on public.campaigns (deadline);
create index campaigns_budget_idx on public.campaigns (budget_max_cents);
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.campaign_platforms (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  platform_id smallint not null references public.platforms (id) on delete cascade,
  primary key (campaign_id, platform_id)
);
create index campaign_platforms_platform_idx on public.campaign_platforms (platform_id);

create table public.campaign_style_tags (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  style_tag_id smallint not null references public.creative_style_tags (id) on delete cascade,
  primary key (campaign_id, style_tag_id)
);
create index campaign_style_tags_tag_idx on public.campaign_style_tags (style_tag_id);

create table public.campaign_skills (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  skill_id smallint not null references public.skills (id) on delete cascade,
  primary key (campaign_id, skill_id)
);
create index campaign_skills_skill_idx on public.campaign_skills (skill_id);

create table public.campaign_deliverables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  deliverable_type_id smallint not null references public.deliverable_types (id),
  platform_id smallint references public.platforms (id) on delete set null,
  quantity smallint not null default 1 check (quantity between 1 and 100),
  description text check (char_length(description) <= 1000),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index campaign_deliverables_campaign_idx on public.campaign_deliverables (campaign_id, sort_order);
create index campaign_deliverables_type_idx on public.campaign_deliverables (deliverable_type_id);

-- Squad Builder: roles a multi-creator campaign needs.
create table public.squad_roles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 1000),
  category_id smallint references public.creator_categories (id) on delete set null,
  deliverable_type_id smallint references public.deliverable_types (id) on delete set null,
  budget_cents int check (budget_cents is null or budget_cents >= 0),
  headcount smallint not null default 1 check (headcount between 1 and 20),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index squad_roles_campaign_idx on public.squad_roles (campaign_id, sort_order);
create trigger squad_roles_updated_at before update on public.squad_roles
  for each row execute function public.set_updated_at();

create table public.squad_role_skills (
  squad_role_id uuid not null references public.squad_roles (id) on delete cascade,
  skill_id smallint not null references public.skills (id) on delete cascade,
  primary key (squad_role_id, skill_id)
);

create table public.campaign_invitations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  squad_role_id uuid references public.squad_roles (id) on delete set null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
create index campaign_invitations_creator_idx on public.campaign_invitations (creator_id, status);
create index campaign_invitations_campaign_idx on public.campaign_invitations (campaign_id, status);
create trigger campaign_invitations_updated_at before update on public.campaign_invitations
  for each row execute function public.set_updated_at();

create table public.saved_creators (
  brand_id uuid not null references public.brand_profiles (id) on delete cascade,
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (brand_id, creator_id)
);
create index saved_creators_creator_idx on public.saved_creators (creator_id);

create table public.saved_campaigns (
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (creator_id, campaign_id)
);
create index saved_campaigns_campaign_idx on public.saved_campaigns (campaign_id);

-- Creative DNA results. Factors are stored so every score is explainable and
-- debuggable. Scores are estimates from profile + campaign data only.
create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  squad_role_id uuid references public.squad_roles (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  factors jsonb not null,
  explanation text not null,
  ai_explanation text,
  algorithm_version text not null,
  computed_at timestamptz not null default now()
);
create unique index match_results_unique_idx
  on public.match_results (campaign_id, creator_id, coalesce(squad_role_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index match_results_campaign_score_idx on public.match_results (campaign_id, score desc);
create index match_results_creator_idx on public.match_results (creator_id, score desc);

-- Campaign ownership helper.
create or replace function public.owns_campaign(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.campaigns where id = p_campaign_id and brand_id = auth.uid());
$$;


-- =============================================================================
-- SECTION 4 — from 20261009000400_collaboration.sql
-- =============================================================================
-- Proposals, projects, milestones, deliverables, rights records.

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creator_id uuid not null references public.creator_profiles (id) on delete cascade,
  invitation_id uuid references public.campaign_invitations (id) on delete set null,
  squad_role_id uuid references public.squad_roles (id) on delete set null,
  approach text check (char_length(approach) <= 6000),
  timeline_days smallint check (timeline_days is null or timeline_days between 1 and 365),
  proposed_delivery_date date,
  quote_cents int check (quote_cents is null or quote_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  revisions_included smallint check (revisions_included is null or revisions_included between 0 and 20),
  usage_notes text check (char_length(usage_notes) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
  identity_revealed boolean not null default false,
  decision_note text check (char_length(decision_note) <= 2000),
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
create index proposals_campaign_idx on public.proposals (campaign_id, status);
create index proposals_creator_idx on public.proposals (creator_id, status);
create trigger proposals_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();

create table public.proposal_deliverables (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  deliverable_type_id smallint not null references public.deliverable_types (id),
  platform_id smallint references public.platforms (id) on delete set null,
  quantity smallint not null default 1 check (quantity between 1 and 100),
  description text check (char_length(description) <= 1000),
  price_cents int check (price_cents is null or price_cents >= 0),
  sort_order int not null default 0
);
create index proposal_deliverables_proposal_idx on public.proposal_deliverables (proposal_id);

create table public.proposal_portfolio_items (
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  portfolio_item_id uuid not null references public.portfolio_items (id) on delete cascade,
  primary key (proposal_id, portfolio_item_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  proposal_id uuid not null unique references public.proposals (id) on delete restrict,
  brand_id uuid not null references public.brand_profiles (id) on delete restrict,
  creator_id uuid not null references public.creator_profiles (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  scope_summary text check (char_length(scope_summary) <= 6000),
  -- Recorded figure for planning only. No payment is processed by MAKERSIGNAL.
  agreed_amount_cents int check (agreed_amount_cents is null or agreed_amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  start_date date,
  due_date date,
  status text not null default 'awaiting_agreement' check (status in ('awaiting_agreement', 'active', 'in_review', 'revision_requested', 'completed', 'cancelled', 'disputed')),
  brand_agreed_at timestamptz,
  creator_agreed_at timestamptz,
  status_note text check (char_length(status_note) <= 2000),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_brand_idx on public.projects (brand_id, status);
create index projects_creator_idx on public.projects (creator_id, status);
create index projects_campaign_idx on public.projects (campaign_id);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null check (member_role in ('brand', 'creator')),
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);
create index project_members_profile_idx on public.project_members (profile_id);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.project_members where project_id = p_project_id and profile_id = auth.uid());
$$;

create or replace function public.project_member_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select member_role from public.project_members where project_id = p_project_id and profile_id = auth.uid();
$$;

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 2000),
  due_date date,
  -- Planning allocation only; not a payment.
  amount_cents int check (amount_cents is null or amount_cents >= 0),
  percentage numeric(5, 2) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'submitted', 'revision_requested', 'approved')),
  sort_order int not null default 0,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_milestones_project_idx on public.project_milestones (project_id, sort_order);
create index project_milestones_due_idx on public.project_milestones (due_date) where status <> 'approved';
create trigger project_milestones_updated_at before update on public.project_milestones
  for each row execute function public.set_updated_at();

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid references public.project_milestones (id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 2000),
  deliverable_type_id smallint references public.deliverable_types (id) on delete set null,
  platform_id smallint references public.platforms (id) on delete set null,
  due_date date,
  status text not null default 'not_started' check (status in ('not_started', 'submitted', 'revision_requested', 'approved')),
  current_version int not null default 0,
  revision_count int not null default 0,
  approved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deliverables_project_idx on public.deliverables (project_id, status);
create index deliverables_milestone_idx on public.deliverables (milestone_id);
create trigger deliverables_updated_at before update on public.deliverables
  for each row execute function public.set_updated_at();

-- Versions are append-only: a new submission never deletes an earlier one.
create table public.deliverable_versions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  version_number int not null,
  notes text check (char_length(notes) <= 3000),
  storage_path text,
  file_name text check (char_length(file_name) <= 255),
  mime_type text check (char_length(mime_type) <= 120),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  external_url text check (external_url is null or external_url ~* '^https?://'),
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (deliverable_id, version_number),
  constraint version_has_content check (storage_path is not null or external_url is not null)
);
create index deliverable_versions_deliverable_idx on public.deliverable_versions (deliverable_id, version_number desc);

create table public.deliverable_feedback (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  version_id uuid references public.deliverable_versions (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('approved', 'revision_requested', 'comment')),
  body text check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index deliverable_feedback_deliverable_idx on public.deliverable_feedback (deliverable_id, created_at);

create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid references public.project_milestones (id) on delete set null,
  deliverable_id uuid references public.deliverables (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index project_comments_project_idx on public.project_comments (project_id, created_at);

-- Rights Passport: structured record of agreed content-usage terms.
-- A record of terms only; enforceability depends on the parties' agreement and applicable law.
create table public.rights_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  deliverable_id uuid references public.deliverables (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  content_type text check (char_length(content_type) <= 160),
  organic_use boolean not null default true,
  paid_ads_use boolean not null default false,
  paid_ads_notes text check (char_length(paid_ads_notes) <= 1000),
  territory text not null default 'Worldwide' check (char_length(territory) <= 200),
  license_start date,
  license_end date,
  duration_months smallint check (duration_months is null or duration_months between 1 and 240),
  exclusivity text not null default 'none' check (exclusivity in ('none', 'category', 'full')),
  exclusivity_details text check (char_length(exclusivity_details) <= 1000),
  raw_files_included boolean not null default false,
  raw_files_notes text check (char_length(raw_files_notes) <= 1000),
  derivative_edits_allowed boolean not null default false,
  derivative_notes text check (char_length(derivative_notes) <= 1000),
  -- Separate, explicit opt-in. Never inferred from upload consent.
  ai_training_allowed boolean not null default false,
  attribution_required boolean not null default false,
  attribution_details text check (char_length(attribution_details) <= 500),
  additional_terms text check (char_length(additional_terms) <= 4000),
  status text not null default 'draft' check (status in ('draft', 'awaiting_creator', 'awaiting_brand', 'agreed', 'expired', 'disputed')),
  revision int not null default 1,
  creator_approved_at timestamptz,
  brand_approved_at timestamptz,
  dispute_reason text check (char_length(dispute_reason) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  last_edited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rights_dates_valid check (license_start is null or license_end is null or license_start <= license_end)
);
create index rights_records_project_idx on public.rights_records (project_id);
create trigger rights_records_updated_at before update on public.rights_records
  for each row execute function public.set_updated_at();

create table public.rights_record_platforms (
  rights_record_id uuid not null references public.rights_records (id) on delete cascade,
  platform_id smallint not null references public.platforms (id) on delete cascade,
  primary key (rights_record_id, platform_id)
);

-- Effective status: an agreed record past its end date reads as expired.
create or replace view public.rights_records_effective
with (security_invoker = true)
as
select r.*,
  case when r.status = 'agreed' and r.license_end is not null and r.license_end < current_date
    then 'expired' else r.status end as effective_status
from public.rights_records r;

-- Hidden creators are also visible to collaborators and to brands they have
-- engaged (invited or received a proposal from).
create or replace function public.can_view_creator(p_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.creator_profiles c
    where c.id = p_creator_id
      and (
        c.visibility = 'public'
        or (c.visibility = 'members' and auth.uid() is not null)
        or c.id = auth.uid()
        or public.is_admin()
        or exists (select 1 from public.projects p where p.creator_id = c.id and p.brand_id = auth.uid())
        or exists (
          select 1 from public.proposals pr join public.campaigns ca on ca.id = pr.campaign_id
          where pr.creator_id = c.id and ca.brand_id = auth.uid() and pr.status <> 'draft'
            and (ca.blind_review = false or pr.identity_revealed)
        )
      )
  );
$$;


-- =============================================================================
-- SECTION 5 — from 20261009000500_messaging_trust.sql
-- =============================================================================
-- Messaging, notifications, reviews, reports, audit, AI records, account deletion.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  proposal_id uuid references public.proposals (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  subject text check (char_length(subject) <= 200),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index conversations_project_unique on public.conversations (project_id) where project_id is not null;
create unique index conversations_proposal_unique on public.conversations (proposal_id) where proposal_id is not null and project_id is null;
create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index conversation_members_profile_idx on public.conversation_members (profile_id);

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation_id and profile_id = auth.uid());
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'invitation_received', 'invitation_responded', 'proposal_submitted', 'proposal_withdrawn',
    'proposal_accepted', 'proposal_rejected', 'proposal_under_review', 'project_agreement',
    'project_active', 'deliverable_submitted', 'revision_requested', 'deliverable_approved',
    'project_completed', 'project_cancelled', 'project_disputed', 'rights_updated', 'rights_agreed',
    'rights_disputed', 'message_received', 'deadline_upcoming', 'review_received', 'milestone_updated'
  )),
  title text not null check (char_length(title) <= 200),
  body text check (char_length(body) <= 1000),
  link_path text check (link_path is null or link_path ~ '^/'),
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
-- Deadline reminders are de-duplicated per entity per recipient.
create unique index notifications_deadline_unique on public.notifications (recipient_id, entity_id, type) where type = 'deadline_upcoming';

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('brand_to_creator', 'creator_to_brand')),
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 3000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  unique (project_id, direction)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc) where status = 'published';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('creator_profile', 'brand_profile', 'campaign', 'review', 'message', 'portfolio_item', 'proposal')),
  entity_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'misleading', 'inappropriate', 'ip_violation', 'fraud', 'other')),
  details text check (char_length(details) <= 3000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text check (char_length(resolution_note) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create unique index reports_dedupe_idx on public.reports (reporter_id, entity_type, entity_id) where status in ('open', 'reviewing');

-- Written only by SECURITY DEFINER workflow functions and triggers.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  project_id uuid references public.projects (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_project_idx on public.audit_logs (project_id, created_at desc);
create index audit_logs_campaign_idx on public.audit_logs (campaign_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table public.ai_analysis_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('brief_generation', 'brief_completeness', 'match_explanation', 'proposal_summary', 'scope_price', 'portfolio_description', 'squad_plan')),
  entity_type text,
  entity_id uuid,
  model text,
  status text not null check (status in ('succeeded', 'failed')),
  error_code text,
  -- Validated, structured output only. Raw prompts are not stored.
  output jsonb,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index ai_analysis_profile_idx on public.ai_analysis_records (profile_id, created_at desc);
create index ai_analysis_entity_idx on public.ai_analysis_records (entity_type, entity_id, kind);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index account_deletion_pending_idx on public.account_deletion_requests (profile_id) where status in ('pending', 'processing');

-- Internal helpers used by workflow functions.
create or replace function public.notify(
  p_recipient uuid, p_type text, p_title text, p_body text, p_link text, p_entity_type text, p_entity_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient is null then return; end if;
  insert into public.notifications (recipient_id, type, title, body, link_path, entity_type, entity_id)
  values (p_recipient, p_type, left(p_title, 200), left(p_body, 1000), p_link, p_entity_type, p_entity_id);
end;
$$;

create or replace function public.audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_project_id uuid, p_campaign_id uuid, p_metadata jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, project_id, campaign_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_project_id, p_campaign_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- Messages: bump conversation timestamp and notify other members (one unread
-- notification per conversation per recipient to avoid flooding).
create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
  v_sender_name text;
  v_link text;
  v_conv public.conversations;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id returning * into v_conv;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and profile_id = new.sender_id;

  select coalesce(cp.display_name, bp.brand_name, p.full_name, 'Someone') into v_sender_name
  from public.profiles p
  left join public.creator_profiles cp on cp.id = p.id
  left join public.brand_profiles bp on bp.id = p.id
  where p.id = new.sender_id;

  v_link := '/messages/' || new.conversation_id::text;

  for v_member in
    select profile_id from public.conversation_members
    where conversation_id = new.conversation_id and profile_id <> new.sender_id
  loop
    if not exists (
      select 1 from public.notifications
      where recipient_id = v_member.profile_id and type = 'message_received'
        and entity_id = new.conversation_id and read_at is null
    ) then
      perform public.notify(v_member.profile_id, 'message_received', 'New message from ' || v_sender_name,
        left(new.body, 140), v_link, 'conversation', new.conversation_id);
    end if;
  end loop;
  return new;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();


-- =============================================================================
-- SECTION 6 — from 20261009000600_rls_grants.sql
-- =============================================================================
-- Row Level Security and least-privilege grants.
--
-- Supabase grants ALL on public tables to anon/authenticated by default. We
-- revoke that and grant back only what each feature needs. Status, role,
-- ownership and counter columns are deliberately NOT writable by clients;
-- they change only through SECURITY DEFINER workflow functions.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;

-- Enable RLS everywhere.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Helper functions used inside policies must be executable.
grant execute on function public.current_role_name() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_view_creator(uuid) to anon, authenticated;
grant execute on function public.owns_campaign(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.project_member_role(uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.check_rate_limit(text, int, int) to authenticated, service_role;
grant execute on function public.slugify(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Taxonomies & settings: world-readable, admin-writable.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['creator_categories', 'creative_style_tags', 'skills', 'platforms', 'deliverable_types', 'industries', 'platform_settings'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', t || '_admin_delete', t);
  end loop;
end $$;

-- rate_limits: no client access at all (function is SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, avatar_path) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or public.is_admin()
  -- counterparties in shared conversations or projects can see the basic profile
  or exists (
    select 1 from public.conversation_members a
    join public.conversation_members b on a.conversation_id = b.conversation_id
    where a.profile_id = (select auth.uid()) and b.profile_id = profiles.id
  )
  or exists (
    select 1 from public.project_members a
    join public.project_members b on a.project_id = b.project_id
    where a.profile_id = (select auth.uid()) and b.profile_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- creator_profiles and Creative DNA links
-- ---------------------------------------------------------------------------
grant select on public.creator_profiles to anon, authenticated;
grant insert (id, slug, display_name, headline, bio, avatar_path, location_city, location_country, languages,
              availability, available_from, starting_rate_cents, currency, collaboration_types, visibility, onboarding_step)
  on public.creator_profiles to authenticated;
grant update (slug, display_name, headline, bio, avatar_path, location_city, location_country, languages,
              availability, available_from, starting_rate_cents, currency, collaboration_types, visibility, onboarding_step)
  on public.creator_profiles to authenticated;

create policy creator_profiles_select on public.creator_profiles for select using (id = (select auth.uid()) or public.can_view_creator(id));
create policy creator_profiles_insert on public.creator_profiles for insert to authenticated
  with check (id = (select auth.uid()) and public.current_role_name() = 'creator');
create policy creator_profiles_update on public.creator_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['creator_category_links', 'creator_style_tags', 'creator_skills', 'creator_platforms'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select using (public.can_view_creator(creator_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (creator_id = (select auth.uid()))', t || '_insert', t);
    execute format('create policy %I on public.%I for delete to authenticated using (creator_id = (select auth.uid()))', t || '_delete', t);
  end loop;
end $$;
grant update (handle) on public.creator_platforms to authenticated;
create policy creator_platforms_update on public.creator_platforms for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

-- portfolio & services
grant select on public.portfolio_items to anon, authenticated;
grant insert (creator_id, title, description, category_id, deliverable_type_id, platform_id, industry_id, client_name,
              media_type, media_path, external_url, sort_order) on public.portfolio_items to authenticated;
grant update (title, description, category_id, deliverable_type_id, platform_id, industry_id, client_name,
              media_type, media_path, external_url, sort_order) on public.portfolio_items to authenticated;
grant delete on public.portfolio_items to authenticated;
create policy portfolio_select on public.portfolio_items for select using (public.can_view_creator(creator_id));
create policy portfolio_insert on public.portfolio_items for insert to authenticated with check (creator_id = (select auth.uid()));
create policy portfolio_update on public.portfolio_items for update to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy portfolio_delete on public.portfolio_items for delete to authenticated using (creator_id = (select auth.uid()));

grant select on public.creator_services to anon, authenticated;
grant insert (creator_id, title, description, deliverable_type_id, starting_price_cents, currency, turnaround_days, revisions_included, active)
  on public.creator_services to authenticated;
grant update (title, description, deliverable_type_id, starting_price_cents, currency, turnaround_days, revisions_included, active)
  on public.creator_services to authenticated;
grant delete on public.creator_services to authenticated;
create policy services_select on public.creator_services for select using (public.can_view_creator(creator_id));
create policy services_insert on public.creator_services for insert to authenticated with check (creator_id = (select auth.uid()));
create policy services_update on public.creator_services for update to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy services_delete on public.creator_services for delete to authenticated using (creator_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- brand_profiles (public business information)
-- ---------------------------------------------------------------------------
grant select on public.brand_profiles to anon, authenticated;
grant insert (id, slug, brand_name, industry_id, description, website, logo_path, location_country, team_size, onboarding_step)
  on public.brand_profiles to authenticated;
grant update (slug, brand_name, industry_id, description, website, logo_path, location_country, team_size, onboarding_step)
  on public.brand_profiles to authenticated;
create policy brand_profiles_select on public.brand_profiles for select using (true);
create policy brand_profiles_insert on public.brand_profiles for insert to authenticated
  with check (id = (select auth.uid()) and public.current_role_name() = 'brand');
create policy brand_profiles_update on public.brand_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select, insert (brand_id, contact_name, contact_email, contact_phone),
      update (brand_id, contact_name, contact_email, contact_phone) on public.brand_contacts to authenticated;
create policy brand_contacts_own on public.brand_contacts for all to authenticated
  using (brand_id = (select auth.uid())) with check (brand_id = (select auth.uid()));

-- profile links: public for public creators and all brands
grant select on public.profile_links to anon, authenticated;
grant insert (profile_id, kind, url), delete on public.profile_links to authenticated;
create policy profile_links_select on public.profile_links for select using (
  exists (select 1 from public.brand_profiles b where b.id = profile_id)
  or public.can_view_creator(profile_id)
);
create policy profile_links_insert on public.profile_links for insert to authenticated with check (profile_id = (select auth.uid()));
create policy profile_links_delete on public.profile_links for delete to authenticated using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create or replace function public.can_view_campaign(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id
      and (
        c.brand_id = (select auth.uid())
        or public.is_admin()
        or (c.status in ('published', 'paused', 'closed') and (
              c.visibility = 'public'
              or (c.visibility = 'members' and (select auth.uid()) is not null)
              or exists (select 1 from public.campaign_invitations i where i.campaign_id = c.id and i.creator_id = (select auth.uid()))
              or exists (select 1 from public.proposals p where p.campaign_id = c.id and p.creator_id = (select auth.uid()))
           ))
        -- participants keep access to archived campaigns they worked on
        or exists (select 1 from public.proposals p where p.campaign_id = c.id and p.creator_id = (select auth.uid()) and p.status <> 'draft')
      )
  );
$$;
grant execute on function public.can_view_campaign(uuid) to anon, authenticated;

grant select on public.campaigns to anon, authenticated;
grant insert (brand_id, title, objective, description, product_description, target_audience, category_id, industry_id,
              budget_min_cents, budget_max_cents, currency, deadline, application_deadline, location_requirement,
              usage_organic, usage_paid_ads, usage_duration_months, usage_territory, exclusivity_required, raw_files_required,
              usage_notes, revisions_expected, visibility, blind_review, ai_assisted)
  on public.campaigns to authenticated;
grant update (title, objective, description, product_description, target_audience, category_id, industry_id,
              budget_min_cents, budget_max_cents, currency, deadline, application_deadline, location_requirement,
              usage_organic, usage_paid_ads, usage_duration_months, usage_territory, exclusivity_required, raw_files_required,
              usage_notes, revisions_expected, visibility, blind_review, ai_assisted)
  on public.campaigns to authenticated;
grant delete on public.campaigns to authenticated;

-- Owner check is inline so INSERT … RETURNING can see the brand's own new row.
create policy campaigns_select on public.campaigns for select using (brand_id = (select auth.uid()) or public.can_view_campaign(id));
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (brand_id = (select auth.uid()) and public.current_role_name() = 'brand');
-- Editing is allowed while draft/published/paused; closed/archived are read-only.
create policy campaigns_update on public.campaigns for update to authenticated
  using (brand_id = (select auth.uid()) and status in ('draft', 'published', 'paused'))
  with check (brand_id = (select auth.uid()));
-- Only drafts with no proposals can be deleted; otherwise archive.
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (brand_id = (select auth.uid()) and status = 'draft' and not exists (select 1 from public.proposals p where p.campaign_id = campaigns.id));

do $$
declare t text;
begin
  foreach t in array array['campaign_platforms', 'campaign_style_tags', 'campaign_skills'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select using (public.can_view_campaign(campaign_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.owns_campaign(campaign_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.owns_campaign(campaign_id))', t || '_delete', t);
  end loop;
end $$;

grant select on public.campaign_deliverables to anon, authenticated;
grant insert (campaign_id, deliverable_type_id, platform_id, quantity, description, sort_order),
      update (deliverable_type_id, platform_id, quantity, description, sort_order),
      delete on public.campaign_deliverables to authenticated;
create policy campaign_deliverables_select on public.campaign_deliverables for select using (public.can_view_campaign(campaign_id));
create policy campaign_deliverables_insert on public.campaign_deliverables for insert to authenticated with check (public.owns_campaign(campaign_id));
create policy campaign_deliverables_update on public.campaign_deliverables for update to authenticated using (public.owns_campaign(campaign_id)) with check (public.owns_campaign(campaign_id));
create policy campaign_deliverables_delete on public.campaign_deliverables for delete to authenticated using (public.owns_campaign(campaign_id));

-- squads: visible to owner, and to invited creators for their role
grant select on public.squad_roles, public.squad_role_skills to authenticated;
grant insert (campaign_id, title, description, category_id, deliverable_type_id, budget_cents, headcount, sort_order),
      update (title, description, category_id, deliverable_type_id, budget_cents, headcount, sort_order),
      delete on public.squad_roles to authenticated;
grant insert, delete on public.squad_role_skills to authenticated;
create policy squad_roles_select on public.squad_roles for select to authenticated using (
  public.owns_campaign(campaign_id)
  or exists (select 1 from public.campaign_invitations i where i.squad_role_id = squad_roles.id and i.creator_id = (select auth.uid()))
);
create policy squad_roles_insert on public.squad_roles for insert to authenticated with check (public.owns_campaign(campaign_id));
create policy squad_roles_update on public.squad_roles for update to authenticated using (public.owns_campaign(campaign_id)) with check (public.owns_campaign(campaign_id));
create policy squad_roles_delete on public.squad_roles for delete to authenticated using (public.owns_campaign(campaign_id));
create policy squad_role_skills_select on public.squad_role_skills for select to authenticated using (
  exists (select 1 from public.squad_roles r where r.id = squad_role_id and public.owns_campaign(r.campaign_id))
);
create policy squad_role_skills_insert on public.squad_role_skills for insert to authenticated with check (exists (select 1 from public.squad_roles r where r.id = squad_role_id and public.owns_campaign(r.campaign_id)));
create policy squad_role_skills_delete on public.squad_role_skills for delete to authenticated using (exists (select 1 from public.squad_roles r where r.id = squad_role_id and public.owns_campaign(r.campaign_id)));

-- invitations: created/responded via functions; readable by both sides
grant select on public.campaign_invitations to authenticated;
create policy invitations_select on public.campaign_invitations for select to authenticated using (
  creator_id = (select auth.uid()) or public.owns_campaign(campaign_id)
);

-- saved items
grant select, insert (brand_id, creator_id, campaign_id, note), update (campaign_id, note), delete on public.saved_creators to authenticated;
create policy saved_creators_own on public.saved_creators for all to authenticated
  using (brand_id = (select auth.uid())) with check (brand_id = (select auth.uid()) and public.current_role_name() = 'brand');

grant select, insert (creator_id, campaign_id), delete on public.saved_campaigns to authenticated;
create policy saved_campaigns_own on public.saved_campaigns for all to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()) and public.current_role_name() = 'creator');

-- match results: brand owner sees all for its campaign; creator sees own
grant select on public.match_results to authenticated;
create policy match_results_select on public.match_results for select to authenticated using (
  public.owns_campaign(campaign_id) or creator_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------
grant select on public.proposals to authenticated;
grant insert (campaign_id, creator_id, invitation_id, squad_role_id, approach, timeline_days, proposed_delivery_date,
              quote_cents, currency, revisions_included, usage_notes)
  on public.proposals to authenticated;
grant update (approach, timeline_days, proposed_delivery_date, quote_cents, currency, revisions_included, usage_notes, squad_role_id)
  on public.proposals to authenticated;
grant delete on public.proposals to authenticated;

-- Brands only see a proposal row directly when it is not blind-masked; blind
-- proposals are read through brand_list_proposals(), which masks identity.
create policy proposals_select on public.proposals for select to authenticated using (
  creator_id = (select auth.uid())
  or (
    status <> 'draft'
    and exists (
      select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = (select auth.uid())
        and (c.blind_review = false or proposals.identity_revealed)
    )
  )
);
create policy proposals_insert on public.proposals for insert to authenticated with check (
  creator_id = (select auth.uid()) and public.current_role_name() = 'creator' and public.can_view_campaign(campaign_id)
);
create policy proposals_update on public.proposals for update to authenticated
  using (creator_id = (select auth.uid()) and status = 'draft') with check (creator_id = (select auth.uid()));
create policy proposals_delete on public.proposals for delete to authenticated
  using (creator_id = (select auth.uid()) and status = 'draft');

grant select on public.proposal_deliverables, public.proposal_portfolio_items to authenticated;
grant insert (proposal_id, deliverable_type_id, platform_id, quantity, description, price_cents, sort_order),
      delete on public.proposal_deliverables to authenticated;
grant insert, delete on public.proposal_portfolio_items to authenticated;

create or replace function public.can_view_proposal(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.proposals p join public.campaigns c on c.id = p.campaign_id
    where p.id = p_proposal_id
      and (p.creator_id = (select auth.uid()) or (c.brand_id = (select auth.uid()) and p.status <> 'draft'))
  );
$$;
create or replace function public.owns_draft_proposal(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.proposals where id = p_proposal_id and creator_id = (select auth.uid()) and status = 'draft');
$$;
grant execute on function public.can_view_proposal(uuid), public.owns_draft_proposal(uuid) to authenticated;

create policy proposal_deliverables_select on public.proposal_deliverables for select to authenticated using (public.can_view_proposal(proposal_id));
create policy proposal_deliverables_insert on public.proposal_deliverables for insert to authenticated with check (public.owns_draft_proposal(proposal_id));
create policy proposal_deliverables_delete on public.proposal_deliverables for delete to authenticated using (public.owns_draft_proposal(proposal_id));
create policy proposal_portfolio_select on public.proposal_portfolio_items for select to authenticated using (public.can_view_proposal(proposal_id));
create policy proposal_portfolio_insert on public.proposal_portfolio_items for insert to authenticated with check (
  public.owns_draft_proposal(proposal_id)
  and exists (select 1 from public.portfolio_items pi where pi.id = portfolio_item_id and pi.creator_id = (select auth.uid()))
);
create policy proposal_portfolio_delete on public.proposal_portfolio_items for delete to authenticated using (public.owns_draft_proposal(proposal_id));

-- ---------------------------------------------------------------------------
-- projects & children (members only)
-- ---------------------------------------------------------------------------
grant select on public.projects, public.project_members to authenticated;
grant update (scope_summary, start_date, due_date) on public.projects to authenticated;
create policy projects_select on public.projects for select to authenticated using (public.is_project_member(id) or public.is_admin());
-- Scope can be edited only before both parties agree; editing resets agreement (trigger below).
create policy projects_update on public.projects for update to authenticated
  using (public.is_project_member(id) and status = 'awaiting_agreement')
  with check (public.is_project_member(id));
create policy project_members_select on public.project_members for select to authenticated using (public.is_project_member(project_id));

grant select on public.project_milestones to authenticated;
grant insert (project_id, title, description, due_date, amount_cents, percentage, sort_order, created_by),
      update (title, description, due_date, amount_cents, percentage, sort_order),
      delete on public.project_milestones to authenticated;
create policy milestones_select on public.project_milestones for select to authenticated using (public.is_project_member(project_id));
create policy milestones_insert on public.project_milestones for insert to authenticated with check (
  public.is_project_member(project_id) and created_by = (select auth.uid())
  and exists (select 1 from public.projects p where p.id = project_id and p.status not in ('completed', 'cancelled'))
);
create policy milestones_update on public.project_milestones for update to authenticated
  using (public.is_project_member(project_id) and status <> 'approved')
  with check (public.is_project_member(project_id));
create policy milestones_delete on public.project_milestones for delete to authenticated using (
  public.is_project_member(project_id) and status = 'pending'
  and not exists (select 1 from public.deliverables d where d.milestone_id = project_milestones.id and d.current_version > 0)
);

grant select on public.deliverables to authenticated;
grant insert (project_id, milestone_id, title, description, deliverable_type_id, platform_id, due_date, created_by),
      update (milestone_id, title, description, deliverable_type_id, platform_id, due_date),
      delete on public.deliverables to authenticated;
create policy deliverables_select on public.deliverables for select to authenticated using (public.is_project_member(project_id));
create policy deliverables_insert on public.deliverables for insert to authenticated with check (
  public.is_project_member(project_id) and created_by = (select auth.uid())
  and exists (select 1 from public.projects p where p.id = project_id and p.status not in ('completed', 'cancelled'))
);
create policy deliverables_update on public.deliverables for update to authenticated
  using (public.is_project_member(project_id) and status <> 'approved')
  with check (public.is_project_member(project_id));
create policy deliverables_delete on public.deliverables for delete to authenticated
  using (public.is_project_member(project_id) and current_version = 0);

create or replace function public.deliverable_project(p_deliverable_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select project_id from public.deliverables where id = p_deliverable_id;
$$;
grant execute on function public.deliverable_project(uuid) to authenticated;

-- versions & feedback: inserted only through submit/review functions
grant select on public.deliverable_versions, public.deliverable_feedback to authenticated;
create policy versions_select on public.deliverable_versions for select to authenticated
  using (public.is_project_member(public.deliverable_project(deliverable_id)));
create policy feedback_select on public.deliverable_feedback for select to authenticated
  using (public.is_project_member(public.deliverable_project(deliverable_id)));

grant select, insert (project_id, milestone_id, deliverable_id, author_id, body) on public.project_comments to authenticated;
create policy comments_select on public.project_comments for select to authenticated using (public.is_project_member(project_id));
create policy comments_insert on public.project_comments for insert to authenticated
  with check (public.is_project_member(project_id) and author_id = (select auth.uid()));

-- rights records: read by members; written via save/approve functions
grant select on public.rights_records, public.rights_record_platforms, public.rights_records_effective to authenticated;
create policy rights_select on public.rights_records for select to authenticated using (public.is_project_member(project_id));
create policy rights_platforms_select on public.rights_record_platforms for select to authenticated using (
  exists (select 1 from public.rights_records r where r.id = rights_record_id and public.is_project_member(r.project_id))
);

-- ---------------------------------------------------------------------------
-- messaging & notifications
-- ---------------------------------------------------------------------------
grant select on public.conversations, public.conversation_members to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
create policy conversations_select on public.conversations for select to authenticated using (public.is_conversation_member(id));
create policy conversation_members_select on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy conversation_members_update on public.conversation_members for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

grant select, insert (conversation_id, sender_id, body) on public.messages to authenticated;
create policy messages_select on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id));

grant select, update (read_at), delete on public.notifications to authenticated;
create policy notifications_own on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated using (recipient_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reviews, reports, audit, AI, deletion
-- ---------------------------------------------------------------------------
grant select on public.reviews to anon, authenticated;
create policy reviews_select on public.reviews for select using (
  status = 'published' or reviewer_id = (select auth.uid()) or reviewee_id = (select auth.uid()) or public.is_admin()
);

grant select, insert (reporter_id, entity_type, entity_id, reason, details) on public.reports to authenticated;
grant update (status, resolution_note, resolved_by, resolved_at) on public.reports to authenticated;
create policy reports_select on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or public.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_admin_update on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.audit_logs to authenticated;
create policy audit_select on public.audit_logs for select to authenticated using (
  public.is_admin()
  or (project_id is not null and public.is_project_member(project_id))
  or (campaign_id is not null and public.owns_campaign(campaign_id))
);

grant select on public.ai_analysis_records to authenticated;
create policy ai_records_own on public.ai_analysis_records for select to authenticated using (profile_id = (select auth.uid()));

grant select, insert (profile_id, reason) on public.account_deletion_requests to authenticated;
grant update (status) on public.account_deletion_requests to authenticated;
create policy deletion_select on public.account_deletion_requests for select to authenticated using (profile_id = (select auth.uid()) or public.is_admin());
create policy deletion_insert on public.account_deletion_requests for insert to authenticated with check (profile_id = (select auth.uid()));
create policy deletion_cancel on public.account_deletion_requests for update to authenticated
  using (profile_id = (select auth.uid()) and status = 'pending') with check (profile_id = (select auth.uid()) and status = 'cancelled');

-- ---------------------------------------------------------------------------
-- Guards that RLS alone can't express
-- ---------------------------------------------------------------------------

-- Editing project scope resets both parties' agreement.
create or replace function public.reset_project_agreement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.scope_summary is distinct from old.scope_summary
      or new.start_date is distinct from old.start_date
      or new.due_date is distinct from old.due_date)
     and old.status = 'awaiting_agreement' then
    new.brand_agreed_at := null;
    new.creator_agreed_at := null;
  end if;
  return new;
end;
$$;
create trigger projects_reset_agreement before update on public.projects
  for each row execute function public.reset_project_agreement();

-- Squad role must belong to the proposal's campaign; invitation must be the creator's own.
create or replace function public.validate_proposal_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.squad_role_id is not null and not exists (
    select 1 from public.squad_roles where id = new.squad_role_id and campaign_id = new.campaign_id
  ) then
    raise exception 'squad role does not belong to this campaign';
  end if;
  if new.invitation_id is not null and not exists (
    select 1 from public.campaign_invitations where id = new.invitation_id and creator_id = new.creator_id and campaign_id = new.campaign_id
  ) then
    raise exception 'invitation does not belong to this creator and campaign';
  end if;
  return new;
end;
$$;
create trigger proposals_validate_refs before insert or update on public.proposals
  for each row execute function public.validate_proposal_refs();

-- Milestone/deliverable links must stay inside one project.
create or replace function public.validate_deliverable_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.milestone_id is not null and not exists (
    select 1 from public.project_milestones where id = new.milestone_id and project_id = new.project_id
  ) then
    raise exception 'milestone does not belong to this project';
  end if;
  return new;
end;
$$;
create trigger deliverables_validate_refs before insert or update on public.deliverables
  for each row execute function public.validate_deliverable_refs();

create or replace function public.validate_comment_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deliverable_id is not null and public.deliverable_project(new.deliverable_id) is distinct from new.project_id then
    raise exception 'deliverable does not belong to this project';
  end if;
  if new.milestone_id is not null and not exists (
    select 1 from public.project_milestones where id = new.milestone_id and project_id = new.project_id
  ) then
    raise exception 'milestone does not belong to this project';
  end if;
  return new;
end;
$$;
create trigger comments_validate_refs before insert on public.project_comments
  for each row execute function public.validate_comment_refs();


-- =============================================================================
-- SECTION 7 — from 20261009000700_workflows.sql
-- =============================================================================
-- Workflow functions. Every status transition in the product goes through one
-- of these SECURITY DEFINER functions, which check the caller, ownership and
-- the allowed transition, then write audit + notifications atomically.
--
-- Errors use SQLSTATE codes the app maps to friendly messages:
--   42501 not authorized, P0001 invalid state / validation, P0002 not found.

-- ---------------------------------------------------------------------------
-- Roles & onboarding
-- ---------------------------------------------------------------------------

create or replace function public.set_initial_role(p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_current text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_role not in ('creator', 'brand') then
    raise exception 'role must be creator or brand' using errcode = 'P0001';
  end if;
  select role into v_current from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;
  if v_current is not null and v_current <> p_role then
    raise exception 'role already set' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = auth.uid();
  perform public.audit('role_selected', 'profile', auth.uid(), null, null, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role = 'creator' and not exists (select 1 from public.creator_profiles where id = auth.uid()) then
    raise exception 'creator profile required' using errcode = 'P0001';
  elsif v_role = 'brand' and not exists (select 1 from public.brand_profiles where id = auth.uid()) then
    raise exception 'brand profile required' using errcode = 'P0001';
  elsif v_role is null or v_role = 'admin' then
    raise exception 'choose a role first' using errcode = 'P0001';
  end if;
  update public.profiles set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------

create or replace function public.transition_campaign(p_campaign_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.campaigns;
  v_ok boolean;
begin
  select * into c from public.campaigns where id = p_campaign_id for update;
  if not found then raise exception 'campaign not found' using errcode = 'P0002'; end if;
  if c.brand_id <> auth.uid() then raise exception 'not authorized' using errcode = '42501'; end if;

  v_ok := (c.status, p_status) in (
    ('draft', 'published'), ('published', 'paused'), ('paused', 'published'),
    ('published', 'closed'), ('paused', 'closed'), ('draft', 'archived'), ('closed', 'archived')
  );
  if not v_ok then
    raise exception 'cannot move campaign from % to %', c.status, p_status using errcode = 'P0001';
  end if;

  if p_status = 'published' then
    if c.objective is null or char_length(btrim(c.objective)) < 10 then
      raise exception 'add a campaign objective before publishing' using errcode = 'P0001';
    end if;
    if c.budget_max_cents is null then
      raise exception 'add a budget before publishing' using errcode = 'P0001';
    end if;
    if c.deadline is null or c.deadline < current_date then
      raise exception 'set a future deadline before publishing' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.campaign_deliverables where campaign_id = c.id) then
      raise exception 'add at least one deliverable before publishing' using errcode = 'P0001';
    end if;
  end if;

  update public.campaigns set
    status = p_status,
    published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end,
    closed_at = case when p_status = 'closed' then now() else closed_at end
  where id = c.id;

  -- Closing a campaign withdraws pending invitations.
  if p_status in ('closed', 'archived') then
    update public.campaign_invitations set status = 'withdrawn', responded_at = now()
    where campaign_id = c.id and status = 'pending';
  end if;

  perform public.audit('campaign_' || p_status, 'campaign', c.id, null, c.id, jsonb_build_object('from', c.status, 'to', p_status));
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------

create or replace function public.invite_creator(p_campaign_id uuid, p_creator_id uuid, p_message text, p_squad_role_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.campaigns;
  v_id uuid;
  v_brand text;
begin
  select * into c from public.campaigns where id = p_campaign_id;
  if not found then raise exception 'campaign not found' using errcode = 'P0002'; end if;
  if c.brand_id <> auth.uid() then raise exception 'not authorized' using errcode = '42501'; end if;
  if c.status not in ('published', 'paused') then
    raise exception 'publish the campaign before inviting creators' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.creator_profiles where id = p_creator_id and visibility <> 'hidden') then
    raise exception 'creator not found' using errcode = 'P0002';
  end if;
  if p_squad_role_id is not null and not exists (select 1 from public.squad_roles where id = p_squad_role_id and campaign_id = c.id) then
    raise exception 'squad role does not belong to this campaign' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.proposals where campaign_id = c.id and creator_id = p_creator_id and status <> 'draft') then
    raise exception 'this creator has already sent a proposal' using errcode = 'P0001';
  end if;

  insert into public.campaign_invitations (campaign_id, creator_id, squad_role_id, invited_by, message, status)
  values (c.id, p_creator_id, p_squad_role_id, auth.uid(), left(p_message, 2000), 'pending')
  on conflict (campaign_id, creator_id) do update
    set status = 'pending', message = excluded.message, squad_role_id = excluded.squad_role_id, responded_at = null
    where public.campaign_invitations.status in ('declined', 'withdrawn')
  returning id into v_id;

  if v_id is null then
    raise exception 'this creator already has an invitation' using errcode = 'P0001';
  end if;

  select brand_name into v_brand from public.brand_profiles where id = c.brand_id;
  perform public.notify(p_creator_id, 'invitation_received', v_brand || ' invited you to a campaign',
    c.title, '/creator/opportunities?tab=invitations', 'invitation', v_id);
  perform public.audit('invitation_sent', 'invitation', v_id, null, c.id, jsonb_build_object('creator_id', p_creator_id));
  return v_id;
end;
$$;

create or replace function public.withdraw_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare i public.campaign_invitations;
begin
  select * into i from public.campaign_invitations where id = p_invitation_id for update;
  if not found then raise exception 'invitation not found' using errcode = 'P0002'; end if;
  if not public.owns_campaign(i.campaign_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if i.status <> 'pending' then raise exception 'only pending invitations can be withdrawn' using errcode = 'P0001'; end if;
  update public.campaign_invitations set status = 'withdrawn', responded_at = now() where id = i.id;
  perform public.audit('invitation_withdrawn', 'invitation', i.id, null, i.campaign_id, '{}');
end;
$$;

create or replace function public.respond_invitation(p_invitation_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.campaign_invitations;
  v_brand uuid;
  v_name text;
  v_title text;
begin
  select * into i from public.campaign_invitations where id = p_invitation_id for update;
  if not found then raise exception 'invitation not found' using errcode = 'P0002'; end if;
  if i.creator_id <> auth.uid() then raise exception 'not authorized' using errcode = '42501'; end if;
  if i.status <> 'pending' then raise exception 'invitation is no longer pending' using errcode = 'P0001'; end if;

  update public.campaign_invitations
    set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where id = i.id;

  select c.brand_id, c.title into v_brand, v_title from public.campaigns c where c.id = i.campaign_id;
  select display_name into v_name from public.creator_profiles where id = i.creator_id;
  perform public.notify(v_brand, 'invitation_responded',
    v_name || case when p_accept then ' accepted your invitation' else ' declined your invitation' end,
    v_title, '/brand/campaigns/' || i.campaign_id::text, 'invitation', i.id);
  perform public.audit(case when p_accept then 'invitation_accepted' else 'invitation_declined' end,
    'invitation', i.id, null, i.campaign_id, '{}');
end;
$$;

-- ---------------------------------------------------------------------------
-- Proposals
-- ---------------------------------------------------------------------------

create or replace function public.submit_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  c public.campaigns;
  v_name text;
begin
  select * into p from public.proposals where id = p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if p.creator_id <> auth.uid() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status <> 'draft' then raise exception 'proposal already submitted' using errcode = 'P0001'; end if;
  select * into c from public.campaigns where id = p.campaign_id;
  if c.status <> 'published' then raise exception 'this campaign is not accepting proposals' using errcode = 'P0001'; end if;
  if c.application_deadline is not null and c.application_deadline < current_date then
    raise exception 'the application deadline has passed' using errcode = 'P0001';
  end if;
  if p.approach is null or char_length(btrim(p.approach)) < 30 then
    raise exception 'describe your approach (at least 30 characters)' using errcode = 'P0001';
  end if;
  if p.quote_cents is null then raise exception 'add a quotation' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.proposal_deliverables where proposal_id = p.id) then
    raise exception 'list at least one deliverable' using errcode = 'P0001';
  end if;

  update public.proposals set status = 'submitted', submitted_at = now() where id = p.id;

  -- Accepting an invitation implicitly when a proposal is sent.
  update public.campaign_invitations set status = 'accepted', responded_at = coalesce(responded_at, now())
  where campaign_id = p.campaign_id and creator_id = p.creator_id and status = 'pending';

  -- Open a proposal conversation unless the campaign uses blind review.
  if not c.blind_review then
    perform public.ensure_proposal_conversation(p.id);
  end if;

  if c.blind_review then
    v_name := 'A creator';
  else
    select display_name into v_name from public.creator_profiles where id = p.creator_id;
  end if;
  perform public.notify(c.brand_id, 'proposal_submitted', v_name || ' sent a proposal', c.title,
    '/brand/proposals?campaign=' || c.id::text, 'proposal', p.id);
  perform public.audit('proposal_submitted', 'proposal', p.id, null, c.id, jsonb_build_object('quote_cents', p.quote_cents));
end;
$$;

create or replace function public.withdraw_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare p public.proposals; v_brand uuid; v_title text;
begin
  select * into p from public.proposals where id = p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if p.creator_id <> auth.uid() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status not in ('submitted', 'under_review') then
    raise exception 'only submitted proposals can be withdrawn' using errcode = 'P0001';
  end if;
  update public.proposals set status = 'withdrawn', decided_at = now() where id = p.id;
  select brand_id, title into v_brand, v_title from public.campaigns where id = p.campaign_id;
  perform public.notify(v_brand, 'proposal_withdrawn', 'A proposal was withdrawn', v_title,
    '/brand/proposals?campaign=' || p.campaign_id::text, 'proposal', p.id);
  perform public.audit('proposal_withdrawn', 'proposal', p.id, null, p.campaign_id, '{}');
end;
$$;

-- Creates (or returns) the conversation between a proposal's creator and brand.
create or replace function public.ensure_proposal_conversation(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  c public.campaigns;
  v_conv uuid;
begin
  select * into p from public.proposals where id = p_proposal_id;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  select * into c from public.campaigns where id = p.campaign_id;
  if auth.uid() not in (p.creator_id, c.brand_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status = 'draft' then raise exception 'submit the proposal first' using errcode = 'P0001'; end if;
  if c.blind_review and not p.identity_revealed then
    raise exception 'reveal the creator before starting a conversation' using errcode = 'P0001';
  end if;

  select id into v_conv from public.conversations where proposal_id = p.id order by created_at limit 1;
  if v_conv is null then
    insert into public.conversations (proposal_id, campaign_id, subject)
    values (p.id, c.id, c.title) returning id into v_conv;
    insert into public.conversation_members (conversation_id, profile_id)
    values (v_conv, p.creator_id), (v_conv, c.brand_id)
    on conflict do nothing;
  end if;
  return v_conv;
end;
$$;

create or replace function public.mark_proposal_under_review(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare p public.proposals; v_title text;
begin
  select * into p from public.proposals where id = p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if not public.owns_campaign(p.campaign_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status <> 'submitted' then raise exception 'proposal is not awaiting review' using errcode = 'P0001'; end if;
  update public.proposals set status = 'under_review' where id = p.id;
  select title into v_title from public.campaigns where id = p.campaign_id;
  perform public.notify(p.creator_id, 'proposal_under_review', 'Your proposal is under review', v_title,
    '/creator/proposals', 'proposal', p.id);
  perform public.audit('proposal_under_review', 'proposal', p.id, null, p.campaign_id, '{}');
end;
$$;

create or replace function public.reject_proposal(p_proposal_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare p public.proposals; v_title text;
begin
  select * into p from public.proposals where id = p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if not public.owns_campaign(p.campaign_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status not in ('submitted', 'under_review') then raise exception 'proposal cannot be rejected now' using errcode = 'P0001'; end if;
  update public.proposals set status = 'rejected', decided_at = now(), decision_note = left(p_note, 2000) where id = p.id;
  select title into v_title from public.campaigns where id = p.campaign_id;
  perform public.notify(p.creator_id, 'proposal_rejected', 'Your proposal was not selected', v_title,
    '/creator/proposals', 'proposal', p.id);
  perform public.audit('proposal_rejected', 'proposal', p.id, null, p.campaign_id, '{}');
end;
$$;

create or replace function public.reveal_proposal_identity(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare p public.proposals;
begin
  select * into p from public.proposals where id = p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if not public.owns_campaign(p.campaign_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status = 'draft' then raise exception 'proposal not submitted' using errcode = 'P0001'; end if;
  if p.identity_revealed then return; end if;
  update public.proposals set identity_revealed = true where id = p.id;
  perform public.audit('proposal_identity_revealed', 'proposal', p.id, null, p.campaign_id, '{}');
end;
$$;

-- Accepting a proposal creates the project, membership, conversation, the
-- deliverable checklist, and a draft Rights Passport from the campaign's
-- stated usage expectations. The project starts in awaiting_agreement: both
-- parties still confirm scope before work begins.
create or replace function public.accept_proposal(p_proposal_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.proposals;
  c public.campaigns;
  v_project uuid;
  v_conv uuid;
  v_rights uuid;
  v_brand text;
  d record;
begin
  select * into p from public.proposals where id = p_proposal_id for update;
  if not found then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  select * into c from public.campaigns where id = p.campaign_id;
  if c.brand_id <> auth.uid() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p.status not in ('submitted', 'under_review') then raise exception 'proposal cannot be accepted now' using errcode = 'P0001'; end if;
  if c.status not in ('published', 'paused', 'closed') then raise exception 'campaign is not active' using errcode = 'P0001'; end if;

  update public.proposals set status = 'accepted', decided_at = now(), identity_revealed = true, decision_note = left(p_note, 2000)
  where id = p.id;

  insert into public.projects (campaign_id, proposal_id, brand_id, creator_id, title, scope_summary,
                               agreed_amount_cents, currency, start_date, due_date)
  values (c.id, p.id, c.brand_id, p.creator_id, c.title, p.approach, p.quote_cents, p.currency,
          current_date, coalesce(p.proposed_delivery_date, c.deadline))
  returning id into v_project;

  insert into public.project_members (project_id, profile_id, member_role)
  values (v_project, c.brand_id, 'brand'), (v_project, p.creator_id, 'creator');

  for d in select * from public.proposal_deliverables where proposal_id = p.id order by sort_order loop
    insert into public.deliverables (project_id, title, description, deliverable_type_id, platform_id, due_date, created_by)
    select v_project,
           case when d.quantity > 1 then d.quantity::text || ' × ' else '' end || dt.name,
           d.description, d.deliverable_type_id, d.platform_id, coalesce(p.proposed_delivery_date, c.deadline), auth.uid()
    from public.deliverable_types dt where dt.id = d.deliverable_type_id;
  end loop;

  -- Reuse the proposal conversation if one exists; otherwise create one.
  select id into v_conv from public.conversations where proposal_id = p.id order by created_at limit 1;
  if v_conv is null then
    insert into public.conversations (proposal_id, campaign_id, subject) values (p.id, c.id, c.title) returning id into v_conv;
  end if;
  update public.conversations set project_id = v_project where id = v_conv;
  insert into public.conversation_members (conversation_id, profile_id)
  values (v_conv, p.creator_id), (v_conv, c.brand_id) on conflict do nothing;

  insert into public.rights_records (project_id, title, content_type, organic_use, paid_ads_use, territory,
                                     license_start, duration_months, exclusivity, raw_files_included,
                                     additional_terms, status, created_by, last_edited_by)
  values (v_project, 'Usage rights — ' || c.title, null, c.usage_organic, c.usage_paid_ads,
          coalesce(c.usage_territory, 'Worldwide'), current_date, c.usage_duration_months,
          case when c.exclusivity_required then 'category' else 'none' end, c.raw_files_required,
          c.usage_notes, 'draft', auth.uid(), auth.uid())
  returning id into v_rights;
  insert into public.rights_record_platforms (rights_record_id, platform_id)
  select v_rights, platform_id from public.campaign_platforms where campaign_id = c.id;

  select brand_name into v_brand from public.brand_profiles where id = c.brand_id;
  perform public.notify(p.creator_id, 'proposal_accepted', v_brand || ' accepted your proposal',
    'Review the scope and usage rights to start the project.', '/creator/projects/' || v_project::text, 'project', v_project);
  perform public.audit('proposal_accepted', 'proposal', p.id, v_project, c.id, jsonb_build_object('quote_cents', p.quote_cents));
  perform public.audit('project_created', 'project', v_project, v_project, c.id, '{}');
  return v_project;
end;
$$;

-- Brand-side proposal listing. Masks identity for blind campaigns until revealed.
create or replace function public.brand_list_proposals(p_campaign_id uuid default null)
returns table (
  id uuid, campaign_id uuid, campaign_title text, blind_review boolean, status text,
  approach text, timeline_days smallint, proposed_delivery_date date, quote_cents int, currency text,
  revisions_included smallint, usage_notes text, submitted_at timestamptz, identity_revealed boolean,
  squad_role_id uuid, creator_id uuid, creator_label text, creator_slug text, creator_avatar_path text,
  creator_headline text, creator_location text, skills text[], styles text[], categories text[],
  match_score smallint, deliverables jsonb, samples jsonb, project_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select p.*, c.title as c_title, c.blind_review as c_blind,
      (c.blind_review and not p.identity_revealed) as masked,
      row_number() over (partition by p.campaign_id order by p.submitted_at, p.id) as rn
    from public.proposals p
    join public.campaigns c on c.id = p.campaign_id
    where c.brand_id = auth.uid() and p.status <> 'draft'
      and (p_campaign_id is null or p.campaign_id = p_campaign_id)
  )
  select m.id, m.campaign_id, m.c_title, m.c_blind, m.status,
    m.approach, m.timeline_days, m.proposed_delivery_date, m.quote_cents, m.currency,
    m.revisions_included, m.usage_notes, m.submitted_at, m.identity_revealed, m.squad_role_id,
    case when m.masked then null else m.creator_id end,
    case when m.masked then 'Creator ' || m.rn::text else cp.display_name end,
    case when m.masked then null else cp.slug end,
    case when m.masked then null else cp.avatar_path end,
    case when m.masked then null else cp.headline end,
    case when m.masked then null else nullif(concat_ws(', ', cp.location_city, cp.location_country), '') end,
    array(select s.name from public.creator_skills cs join public.skills s on s.id = cs.skill_id where cs.creator_id = m.creator_id order by s.name),
    array(select t.name from public.creator_style_tags ct join public.creative_style_tags t on t.id = ct.style_tag_id where ct.creator_id = m.creator_id order by t.sort_order),
    array(select k.name from public.creator_category_links cl join public.creator_categories k on k.id = cl.category_id where cl.creator_id = m.creator_id order by k.sort_order),
    (select mr.score from public.match_results mr where mr.campaign_id = m.campaign_id and mr.creator_id = m.creator_id and mr.squad_role_id is null limit 1),
    coalesce((select jsonb_agg(jsonb_build_object('type', dt.name, 'platform', pl.name, 'quantity', pd.quantity,
                'description', pd.description, 'price_cents', pd.price_cents) order by pd.sort_order)
              from public.proposal_deliverables pd
              join public.deliverable_types dt on dt.id = pd.deliverable_type_id
              left join public.platforms pl on pl.id = pd.platform_id
              where pd.proposal_id = m.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', pi.id, 'title', pi.title, 'description', pi.description,
                'media_type', pi.media_type, 'media_path', pi.media_path, 'external_url', pi.external_url))
              from public.proposal_portfolio_items ppi join public.portfolio_items pi on pi.id = ppi.portfolio_item_id
              where ppi.proposal_id = m.id), '[]'::jsonb),
    (select pr.id from public.projects pr where pr.proposal_id = m.id)
  from mine m
  join public.creator_profiles cp on cp.id = m.creator_id
  order by m.submitted_at desc nulls last;
$$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create or replace function public.agree_project_scope(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.projects;
  v_role text;
begin
  select * into pr from public.projects where id = p_project_id for update;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if pr.status <> 'awaiting_agreement' then raise exception 'scope already agreed' using errcode = 'P0001'; end if;

  if v_role = 'brand' then
    update public.projects set brand_agreed_at = now() where id = pr.id returning * into pr;
  else
    update public.projects set creator_agreed_at = now() where id = pr.id returning * into pr;
  end if;
  perform public.audit('scope_agreed', 'project', pr.id, pr.id, pr.campaign_id, jsonb_build_object('party', v_role));

  if pr.brand_agreed_at is not null and pr.creator_agreed_at is not null then
    update public.projects set status = 'active' where id = pr.id;
    perform public.notify(pr.creator_id, 'project_active', 'Project is active', pr.title, '/creator/projects/' || pr.id::text, 'project', pr.id);
    perform public.notify(pr.brand_id, 'project_active', 'Project is active', pr.title, '/brand/projects/' || pr.id::text, 'project', pr.id);
    perform public.audit('project_active', 'project', pr.id, pr.id, pr.campaign_id, '{}');
  else
    perform public.notify(case when v_role = 'brand' then pr.creator_id else pr.brand_id end, 'project_agreement',
      'Scope confirmed by the other party', 'Review and confirm to start: ' || pr.title,
      case when v_role = 'brand' then '/creator/projects/' else '/brand/projects/' end || pr.id::text, 'project', pr.id);
  end if;
end;
$$;

-- Recompute derived milestone and project status after deliverable events.
create or replace function public.refresh_project_progress(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.projects;
  m record;
  v_status text;
begin
  for m in select id from public.project_milestones where project_id = p_project_id loop
    select case
      when count(*) = 0 then null
      when bool_and(status = 'approved') then 'approved'
      when bool_or(status = 'revision_requested') then 'revision_requested'
      when bool_or(status = 'submitted') then 'submitted'
      when bool_or(current_version > 0 or status = 'approved') then 'in_progress'
      else 'pending' end
    into v_status
    from public.deliverables where milestone_id = m.id;
    if v_status is not null then
      update public.project_milestones
        set status = v_status, approved_at = case when v_status = 'approved' then coalesce(approved_at, now()) else null end
      where id = m.id and status is distinct from v_status;
    end if;
  end loop;

  select * into pr from public.projects where id = p_project_id;
  if pr.status in ('active', 'in_review', 'revision_requested') then
    select case
      when bool_or(status = 'submitted') then 'in_review'
      when bool_or(status = 'revision_requested') then 'revision_requested'
      else 'active' end
    into v_status
    from public.deliverables where project_id = p_project_id;
    update public.projects set status = coalesce(v_status, 'active') where id = p_project_id and status is distinct from coalesce(v_status, 'active');
  end if;
end;
$$;

create or replace function public.submit_deliverable_version(
  p_deliverable_id uuid, p_notes text, p_storage_path text, p_file_name text, p_mime_type text,
  p_size_bytes bigint, p_external_url text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deliverables;
  pr public.projects;
  v_version int;
  v_id uuid;
begin
  select * into d from public.deliverables where id = p_deliverable_id for update;
  if not found then raise exception 'deliverable not found' using errcode = 'P0002'; end if;
  select * into pr from public.projects where id = d.project_id;
  if pr.creator_id <> auth.uid() then raise exception 'only the creator can submit deliverables' using errcode = '42501'; end if;
  if pr.status not in ('active', 'in_review', 'revision_requested') then
    raise exception 'the project must be active to submit work' using errcode = 'P0001';
  end if;
  if d.status = 'approved' then raise exception 'this deliverable is already approved' using errcode = 'P0001'; end if;
  if d.status = 'submitted' then raise exception 'the latest version is still awaiting review' using errcode = 'P0001'; end if;
  if p_storage_path is null and p_external_url is null then
    raise exception 'attach a file or a link' using errcode = 'P0001';
  end if;
  if p_storage_path is not null and split_part(p_storage_path, '/', 1) <> pr.id::text then
    raise exception 'file must be uploaded to this project' using errcode = '42501';
  end if;
  if p_external_url is not null and p_external_url !~* '^https?://' then
    raise exception 'links must start with http:// or https://' using errcode = 'P0001';
  end if;

  v_version := d.current_version + 1;
  insert into public.deliverable_versions (deliverable_id, version_number, notes, storage_path, file_name, mime_type, size_bytes, external_url, submitted_by)
  values (d.id, v_version, left(p_notes, 3000), p_storage_path, left(p_file_name, 255), left(p_mime_type, 120), p_size_bytes, p_external_url, auth.uid())
  returning id into v_id;

  update public.deliverables set status = 'submitted', current_version = v_version where id = d.id;
  perform public.refresh_project_progress(pr.id);

  perform public.notify(pr.brand_id, 'deliverable_submitted', 'New deliverable to review',
    d.title || ' (v' || v_version::text || ')', '/brand/projects/' || pr.id::text, 'deliverable', d.id);
  perform public.audit('deliverable_submitted', 'deliverable', d.id, pr.id, pr.campaign_id, jsonb_build_object('version', v_version));
  return v_id;
end;
$$;

create or replace function public.review_deliverable(p_deliverable_id uuid, p_decision text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deliverables;
  pr public.projects;
  v_version_id uuid;
begin
  if p_decision not in ('approved', 'revision_requested') then raise exception 'invalid decision' using errcode = 'P0001'; end if;
  select * into d from public.deliverables where id = p_deliverable_id for update;
  if not found then raise exception 'deliverable not found' using errcode = 'P0002'; end if;
  select * into pr from public.projects where id = d.project_id;
  if pr.brand_id <> auth.uid() then raise exception 'only the brand can review deliverables' using errcode = '42501'; end if;
  if d.status <> 'submitted' then raise exception 'there is no submitted version to review' using errcode = 'P0001'; end if;
  if p_decision = 'revision_requested' and (p_body is null or char_length(btrim(p_body)) < 5) then
    raise exception 'explain what should change' using errcode = 'P0001';
  end if;

  select id into v_version_id from public.deliverable_versions where deliverable_id = d.id and version_number = d.current_version;
  insert into public.deliverable_feedback (deliverable_id, version_id, author_id, decision, body)
  values (d.id, v_version_id, auth.uid(), p_decision, left(p_body, 4000));

  update public.deliverables set
    status = p_decision,
    revision_count = revision_count + case when p_decision = 'revision_requested' then 1 else 0 end,
    approved_at = case when p_decision = 'approved' then now() else null end
  where id = d.id;
  perform public.refresh_project_progress(pr.id);

  perform public.notify(pr.creator_id,
    case when p_decision = 'approved' then 'deliverable_approved' else 'revision_requested' end,
    case when p_decision = 'approved' then 'Deliverable approved' else 'Revision requested' end,
    d.title, '/creator/projects/' || pr.id::text, 'deliverable', d.id);
  perform public.audit('deliverable_' || p_decision, 'deliverable', d.id, pr.id, pr.campaign_id, jsonb_build_object('version', d.current_version));
end;
$$;

create or replace function public.complete_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare pr public.projects;
begin
  select * into pr from public.projects where id = p_project_id for update;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  if pr.brand_id <> auth.uid() then raise exception 'only the brand can complete the project' using errcode = '42501'; end if;
  if pr.status not in ('active', 'in_review', 'revision_requested') then
    raise exception 'project cannot be completed from %', pr.status using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.deliverables where project_id = pr.id) then
    raise exception 'add at least one deliverable first' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deliverables where project_id = pr.id and status <> 'approved') then
    raise exception 'approve every deliverable before completing' using errcode = 'P0001';
  end if;
  update public.projects set status = 'completed', completed_at = now() where id = pr.id;
  perform public.notify(pr.creator_id, 'project_completed', 'Project completed', pr.title || ' — you can now leave a review.',
    '/creator/projects/' || pr.id::text, 'project', pr.id);
  perform public.audit('project_completed', 'project', pr.id, pr.id, pr.campaign_id, '{}');
end;
$$;

create or replace function public.cancel_project(p_project_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare pr public.projects; v_role text;
begin
  select * into pr from public.projects where id = p_project_id for update;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if pr.status in ('completed', 'cancelled') then raise exception 'project is already closed' using errcode = 'P0001'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then raise exception 'give a reason' using errcode = 'P0001'; end if;
  update public.projects set status = 'cancelled', cancelled_at = now(), status_note = left(p_reason, 2000) where id = pr.id;
  perform public.notify(case when v_role = 'brand' then pr.creator_id else pr.brand_id end, 'project_cancelled',
    'Project cancelled', pr.title, case when v_role = 'brand' then '/creator/projects/' else '/brand/projects/' end || pr.id::text, 'project', pr.id);
  perform public.audit('project_cancelled', 'project', pr.id, pr.id, pr.campaign_id, jsonb_build_object('by', v_role));
end;
$$;

create or replace function public.dispute_project(p_project_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare pr public.projects; v_role text;
begin
  select * into pr from public.projects where id = p_project_id for update;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if pr.status in ('completed', 'cancelled', 'disputed') then raise exception 'project cannot be disputed now' using errcode = 'P0001'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then raise exception 'describe the issue (at least 10 characters)' using errcode = 'P0001'; end if;
  update public.projects set status = 'disputed', status_note = left(p_reason, 2000) where id = pr.id;
  perform public.notify(case when v_role = 'brand' then pr.creator_id else pr.brand_id end, 'project_disputed',
    'A dispute was raised', pr.title, case when v_role = 'brand' then '/creator/projects/' else '/brand/projects/' end || pr.id::text, 'project', pr.id);
  perform public.audit('project_disputed', 'project', pr.id, pr.id, pr.campaign_id, jsonb_build_object('by', v_role, 'reason', left(p_reason, 500)));
end;
$$;

-- Either party (or an admin) can close a dispute and resume work.
create or replace function public.resolve_project_dispute(p_project_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare pr public.projects;
begin
  select * into pr from public.projects where id = p_project_id for update;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  if not (public.is_project_member(pr.id) or public.is_admin()) then raise exception 'not authorized' using errcode = '42501'; end if;
  if pr.status <> 'disputed' then raise exception 'project is not disputed' using errcode = 'P0001'; end if;
  update public.projects set status = 'active', status_note = left(p_note, 2000) where id = pr.id;
  perform public.refresh_project_progress(pr.id);
  perform public.audit('project_dispute_resolved', 'project', pr.id, pr.id, pr.campaign_id, jsonb_build_object('note', left(p_note, 500)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Rights Passport
-- ---------------------------------------------------------------------------

-- Saves a rights record. Saving with p_submit = true counts as the editor's
-- approval of this revision and asks the other party to approve. Any edit
-- resets the other party's approval.
create or replace function public.save_rights_record(
  p_project_id uuid, p_record_id uuid, p_terms jsonb, p_platform_ids smallint[], p_submit boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.projects;
  r public.rights_records;
  v_role text;
  v_id uuid;
  v_status text;
begin
  select * into pr from public.projects where id = p_project_id;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if pr.status = 'cancelled' then raise exception 'project is cancelled' using errcode = 'P0001'; end if;

  if p_record_id is not null then
    select * into r from public.rights_records where id = p_record_id and project_id = pr.id for update;
    if not found then raise exception 'rights record not found' using errcode = 'P0002'; end if;
    if r.status = 'disputed' and not p_submit then
      raise exception 'resubmit the terms to resolve the dispute' using errcode = 'P0001';
    end if;
  end if;

  if (p_terms ->> 'deliverable_id') is not null and not exists (
    select 1 from public.deliverables where id = (p_terms ->> 'deliverable_id')::uuid and project_id = pr.id
  ) then
    raise exception 'deliverable does not belong to this project' using errcode = 'P0001';
  end if;

  v_status := case when not p_submit then 'draft' when v_role = 'brand' then 'awaiting_creator' else 'awaiting_brand' end;

  if p_record_id is null then
    insert into public.rights_records (project_id, title, created_by) values (pr.id, coalesce(p_terms ->> 'title', 'Usage rights'), auth.uid())
    returning * into r;
  end if;

  update public.rights_records set
    deliverable_id = nullif(p_terms ->> 'deliverable_id', '')::uuid,
    title = coalesce(nullif(btrim(p_terms ->> 'title'), ''), r.title),
    content_type = nullif(p_terms ->> 'content_type', ''),
    organic_use = coalesce((p_terms ->> 'organic_use')::boolean, false),
    paid_ads_use = coalesce((p_terms ->> 'paid_ads_use')::boolean, false),
    paid_ads_notes = nullif(p_terms ->> 'paid_ads_notes', ''),
    territory = coalesce(nullif(btrim(p_terms ->> 'territory'), ''), 'Worldwide'),
    license_start = nullif(p_terms ->> 'license_start', '')::date,
    license_end = nullif(p_terms ->> 'license_end', '')::date,
    duration_months = nullif(p_terms ->> 'duration_months', '')::smallint,
    exclusivity = coalesce(nullif(p_terms ->> 'exclusivity', ''), 'none'),
    exclusivity_details = nullif(p_terms ->> 'exclusivity_details', ''),
    raw_files_included = coalesce((p_terms ->> 'raw_files_included')::boolean, false),
    raw_files_notes = nullif(p_terms ->> 'raw_files_notes', ''),
    derivative_edits_allowed = coalesce((p_terms ->> 'derivative_edits_allowed')::boolean, false),
    derivative_notes = nullif(p_terms ->> 'derivative_notes', ''),
    ai_training_allowed = coalesce((p_terms ->> 'ai_training_allowed')::boolean, false),
    attribution_required = coalesce((p_terms ->> 'attribution_required')::boolean, false),
    attribution_details = nullif(p_terms ->> 'attribution_details', ''),
    additional_terms = nullif(p_terms ->> 'additional_terms', ''),
    status = v_status,
    revision = r.revision + case when p_record_id is null then 0 else 1 end,
    brand_approved_at = case when p_submit and v_role = 'brand' then now() else null end,
    creator_approved_at = case when p_submit and v_role = 'creator' then now() else null end,
    dispute_reason = null,
    last_edited_by = auth.uid()
  where id = r.id
  returning id into v_id;

  delete from public.rights_record_platforms where rights_record_id = v_id;
  if p_platform_ids is not null then
    insert into public.rights_record_platforms (rights_record_id, platform_id)
    select v_id, unnest(p_platform_ids) on conflict do nothing;
  end if;

  if p_submit then
    perform public.notify(case when v_role = 'brand' then pr.creator_id else pr.brand_id end, 'rights_updated',
      'Usage rights need your approval', pr.title, '/projects/' || pr.id::text || '/rights', 'rights_record', v_id);
  end if;
  perform public.audit(case when p_submit then 'rights_submitted' else 'rights_draft_saved' end,
    'rights_record', v_id, pr.id, pr.campaign_id, jsonb_build_object('by', v_role, 'ai_training_allowed', coalesce((p_terms ->> 'ai_training_allowed')::boolean, false)));
  return v_id;
end;
$$;

create or replace function public.approve_rights_record(p_record_id uuid, p_revision int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rights_records;
  pr public.projects;
  v_role text;
begin
  select * into r from public.rights_records where id = p_record_id for update;
  if not found then raise exception 'rights record not found' using errcode = 'P0002'; end if;
  select * into pr from public.projects where id = r.project_id;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if r.revision <> p_revision then
    raise exception 'these terms changed since you opened them — review the latest version' using errcode = 'P0001';
  end if;
  if (v_role = 'creator' and r.status <> 'awaiting_creator') or (v_role = 'brand' and r.status <> 'awaiting_brand') then
    raise exception 'these terms are not awaiting your approval' using errcode = 'P0001';
  end if;

  if v_role = 'creator' then
    update public.rights_records set creator_approved_at = now(), status = 'agreed' where id = r.id;
  else
    update public.rights_records set brand_approved_at = now(), status = 'agreed' where id = r.id;
  end if;

  perform public.notify(case when v_role = 'brand' then pr.creator_id else pr.brand_id end, 'rights_agreed',
    'Usage rights agreed', r.title, '/projects/' || pr.id::text || '/rights', 'rights_record', r.id);
  perform public.audit('rights_agreed', 'rights_record', r.id, pr.id, pr.campaign_id, jsonb_build_object('revision', r.revision));
end;
$$;

create or replace function public.dispute_rights_record(p_record_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r public.rights_records; pr public.projects; v_role text;
begin
  select * into r from public.rights_records where id = p_record_id for update;
  if not found then raise exception 'rights record not found' using errcode = 'P0002'; end if;
  select * into pr from public.projects where id = r.project_id;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if r.status = 'draft' then raise exception 'drafts cannot be disputed' using errcode = 'P0001'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then raise exception 'describe the issue (at least 10 characters)' using errcode = 'P0001'; end if;
  update public.rights_records set status = 'disputed', dispute_reason = left(p_reason, 2000) where id = r.id;
  perform public.notify(case when v_role = 'brand' then pr.creator_id else pr.brand_id end, 'rights_disputed',
    'Usage rights disputed', r.title, '/projects/' || pr.id::text || '/rights', 'rights_record', r.id);
  perform public.audit('rights_disputed', 'rights_record', r.id, pr.id, pr.campaign_id, jsonb_build_object('by', v_role));
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

create or replace function public.submit_review(p_project_id uuid, p_rating int, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.projects;
  v_role text;
  v_id uuid;
  v_reviewee uuid;
begin
  select * into pr from public.projects where id = p_project_id;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  v_role := public.project_member_role(pr.id);
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if pr.status <> 'completed' then raise exception 'reviews open once the project is completed' using errcode = 'P0001'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'rating must be 1 to 5' using errcode = 'P0001'; end if;

  v_reviewee := case when v_role = 'brand' then pr.creator_id else pr.brand_id end;
  insert into public.reviews (project_id, reviewer_id, reviewee_id, direction, rating, body)
  values (pr.id, auth.uid(), v_reviewee, case when v_role = 'brand' then 'brand_to_creator' else 'creator_to_brand' end,
          p_rating, nullif(left(btrim(coalesce(p_body, '')), 3000), ''))
  on conflict (project_id, direction) do nothing
  returning id into v_id;
  if v_id is null then raise exception 'you have already reviewed this project' using errcode = 'P0001'; end if;

  perform public.notify(v_reviewee, 'review_received', 'You received a review', pr.title,
    case when v_role = 'brand' then '/creator/projects/' else '/brand/projects/' end || pr.id::text, 'review', v_id);
  perform public.audit('review_submitted', 'review', v_id, pr.id, pr.campaign_id, jsonb_build_object('rating', p_rating));
  return v_id;
end;
$$;

-- Public trust stats for a creator (verified = from completed MAKERSIGNAL projects).
create or replace function public.creator_trust_stats(p_creator_id uuid)
returns table (completed_projects int, review_count int, average_rating numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.projects where creator_id = p_creator_id and status = 'completed'),
    (select count(*)::int from public.reviews where reviewee_id = p_creator_id and direction = 'brand_to_creator' and status = 'published'),
    (select round(avg(rating)::numeric, 1) from public.reviews where reviewee_id = p_creator_id and direction = 'brand_to_creator' and status = 'published')
  where public.can_view_creator(p_creator_id);
$$;

-- ---------------------------------------------------------------------------
-- Deadline reminders (idempotent; called when a user opens their dashboard)
-- ---------------------------------------------------------------------------

create or replace function public.refresh_my_deadline_notifications()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
  d record;
begin
  if auth.uid() is null then return 0; end if;
  for d in
    select dl.id, dl.title, dl.due_date, pr.id as project_id, pm.member_role
    from public.deliverables dl
    join public.projects pr on pr.id = dl.project_id
    join public.project_members pm on pm.project_id = pr.id and pm.profile_id = auth.uid()
    where dl.status in ('not_started', 'revision_requested', 'submitted')
      and pr.status in ('active', 'in_review', 'revision_requested')
      and dl.due_date between current_date and current_date + 3
  loop
    insert into public.notifications (recipient_id, type, title, body, link_path, entity_type, entity_id)
    values (auth.uid(), 'deadline_upcoming', 'Due ' || to_char(d.due_date, 'Mon DD'), d.title,
            case when d.member_role = 'brand' then '/brand/projects/' else '/creator/projects/' end || d.project_id::text,
            'deliverable', d.id)
    on conflict do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Search (security invoker: RLS visibility rules apply)
-- ---------------------------------------------------------------------------

create or replace function public.search_creators(
  p_query text default null,
  p_category_id smallint default null,
  p_style_ids smallint[] default null,
  p_skill_id smallint default null,
  p_platform_id smallint default null,
  p_availability text default null,
  p_max_rate_cents int default null,
  p_country text default null,
  p_language text default null,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid, slug text, display_name text, headline text, avatar_path text, location_city text, location_country text,
  availability text, starting_rate_cents int, currency text, categories text[], styles text[], skills text[],
  preview_paths text[], rank real, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select case when nullif(btrim(p_query), '') is null then null
                else websearch_to_tsquery('english', p_query) end as tsq,
           nullif(btrim(p_query), '') as raw
  ),
  base as (
    select c.*,
      case when q.tsq is null then 0::real
           else ts_rank(c.search_vector, q.tsq)
              + coalesce(extensions.similarity(c.display_name, q.raw), 0)::real
              + case when exists (select 1 from public.creator_skills cs join public.skills s on s.id = cs.skill_id
                                  where cs.creator_id = c.id and s.name ilike '%' || q.raw || '%') then 0.5 else 0 end
              + case when exists (select 1 from public.portfolio_items pi where pi.creator_id = c.id and pi.search_vector @@ q.tsq) then 0.3 else 0 end
      end as r
    from public.creator_profiles c, q
    where c.visibility <> 'hidden'
      and (q.raw is null
           or c.search_vector @@ q.tsq
           or c.display_name operator(extensions.%) q.raw
           or c.display_name ilike '%' || q.raw || '%'
           or exists (select 1 from public.creator_skills cs join public.skills s on s.id = cs.skill_id
                      where cs.creator_id = c.id and s.name ilike '%' || q.raw || '%')
           or exists (select 1 from public.creator_style_tags ct join public.creative_style_tags t on t.id = ct.style_tag_id
                      where ct.creator_id = c.id and t.name ilike '%' || q.raw || '%')
           or exists (select 1 from public.creator_category_links cl join public.creator_categories k on k.id = cl.category_id
                      where cl.creator_id = c.id and k.name ilike '%' || q.raw || '%')
           or exists (select 1 from public.portfolio_items pi where pi.creator_id = c.id and pi.search_vector @@ q.tsq))
      and (p_category_id is null or exists (select 1 from public.creator_category_links cl where cl.creator_id = c.id and cl.category_id = p_category_id))
      and (p_style_ids is null or cardinality(p_style_ids) = 0
           or exists (select 1 from public.creator_style_tags ct where ct.creator_id = c.id and ct.style_tag_id = any (p_style_ids)))
      and (p_skill_id is null or exists (select 1 from public.creator_skills cs where cs.creator_id = c.id and cs.skill_id = p_skill_id))
      and (p_platform_id is null or exists (select 1 from public.creator_platforms cp where cp.creator_id = c.id and cp.platform_id = p_platform_id))
      and (p_availability is null or c.availability = p_availability)
      and (p_max_rate_cents is null or c.starting_rate_cents is null or c.starting_rate_cents <= p_max_rate_cents)
      and (p_country is null or c.location_country ilike p_country)
      and (p_language is null or p_language ilike any (c.languages))
  )
  select b.id, b.slug, b.display_name, b.headline, b.avatar_path, b.location_city, b.location_country,
    b.availability, b.starting_rate_cents, b.currency,
    array(select k.name from public.creator_category_links cl join public.creator_categories k on k.id = cl.category_id where cl.creator_id = b.id order by k.sort_order),
    array(select t.name from public.creator_style_tags ct join public.creative_style_tags t on t.id = ct.style_tag_id where ct.creator_id = b.id order by t.sort_order),
    array(select s.name from public.creator_skills cs join public.skills s on s.id = cs.skill_id where cs.creator_id = b.id order by s.name limit 6),
    array(select pi.media_path from public.portfolio_items pi where pi.creator_id = b.id and pi.media_type = 'image' and pi.media_path is not null order by pi.sort_order, pi.created_at limit 3),
    b.r,
    count(*) over ()
  from base b
  order by
    case when p_sort = 'newest' then extract(epoch from b.created_at) end desc nulls last,
    case when p_sort = 'rate_low' then b.starting_rate_cents end asc nulls last,
    case when p_sort = 'rate_high' then b.starting_rate_cents end desc nulls last,
    b.r desc, b.created_at desc
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

create or replace function public.search_campaigns(
  p_query text default null,
  p_category_id smallint default null,
  p_platform_id smallint default null,
  p_deliverable_type_id smallint default null,
  p_min_budget_cents int default null,
  p_deadline_before date default null,
  p_sort text default 'newest',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid, title text, objective text, brand_id uuid, brand_name text, brand_slug text, brand_logo_path text,
  category text, budget_min_cents int, budget_max_cents int, currency text, deadline date,
  platforms text[], deliverables text[], styles text[], blind_review boolean, published_at timestamptz,
  rank real, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select case when nullif(btrim(p_query), '') is null then null else websearch_to_tsquery('english', p_query) end as tsq,
           nullif(btrim(p_query), '') as raw
  ),
  base as (
    select c.*, case when q.tsq is null then 0::real else ts_rank(c.search_vector, q.tsq) end as r
    from public.campaigns c, q
    where c.status = 'published'
      and (q.raw is null or c.search_vector @@ q.tsq or c.title ilike '%' || q.raw || '%')
      and (p_category_id is null or c.category_id = p_category_id)
      and (p_platform_id is null or exists (select 1 from public.campaign_platforms cp where cp.campaign_id = c.id and cp.platform_id = p_platform_id))
      and (p_deliverable_type_id is null or exists (select 1 from public.campaign_deliverables cd where cd.campaign_id = c.id and cd.deliverable_type_id = p_deliverable_type_id))
      and (p_min_budget_cents is null or c.budget_max_cents >= p_min_budget_cents)
      and (p_deadline_before is null or c.deadline <= p_deadline_before)
      and (c.deadline is null or c.deadline >= current_date)
  )
  select b.id, b.title, b.objective, b.brand_id, bp.brand_name, bp.slug, bp.logo_path,
    (select k.name from public.creator_categories k where k.id = b.category_id),
    b.budget_min_cents, b.budget_max_cents, b.currency, b.deadline,
    array(select p.name from public.campaign_platforms cp join public.platforms p on p.id = cp.platform_id where cp.campaign_id = b.id order by p.sort_order),
    array(select distinct dt.name from public.campaign_deliverables cd join public.deliverable_types dt on dt.id = cd.deliverable_type_id where cd.campaign_id = b.id),
    array(select t.name from public.campaign_style_tags cs join public.creative_style_tags t on t.id = cs.style_tag_id where cs.campaign_id = b.id order by t.sort_order),
    b.blind_review, b.published_at, b.r, count(*) over ()
  from base b
  join public.brand_profiles bp on bp.id = b.brand_id
  order by
    case when p_sort = 'deadline' then b.deadline end asc nulls last,
    case when p_sort = 'budget' then b.budget_max_cents end desc nulls last,
    case when p_sort = 'relevance' then b.r end desc,
    b.published_at desc nulls last
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- Grants for callable functions
-- ---------------------------------------------------------------------------
grant execute on function
  public.set_initial_role(text),
  public.complete_onboarding(),
  public.transition_campaign(uuid, text),
  public.invite_creator(uuid, uuid, text, uuid),
  public.withdraw_invitation(uuid),
  public.respond_invitation(uuid, boolean),
  public.submit_proposal(uuid),
  public.withdraw_proposal(uuid),
  public.ensure_proposal_conversation(uuid),
  public.mark_proposal_under_review(uuid),
  public.reject_proposal(uuid, text),
  public.reveal_proposal_identity(uuid),
  public.accept_proposal(uuid, text),
  public.brand_list_proposals(uuid),
  public.agree_project_scope(uuid),
  public.submit_deliverable_version(uuid, text, text, text, text, bigint, text),
  public.review_deliverable(uuid, text, text),
  public.complete_project(uuid),
  public.cancel_project(uuid, text),
  public.dispute_project(uuid, text),
  public.resolve_project_dispute(uuid, text),
  public.save_rights_record(uuid, uuid, jsonb, smallint[], boolean),
  public.approve_rights_record(uuid, int),
  public.dispute_rights_record(uuid, text),
  public.submit_review(uuid, int, text),
  public.refresh_my_deadline_notifications()
to authenticated;

grant execute on function
  public.creator_trust_stats(uuid),
  public.search_creators(text, smallint, smallint[], smallint, smallint, text, int, text, text, text, int, int),
  public.search_campaigns(text, smallint, smallint, smallint, int, date, text, int, int)
to anon, authenticated;


-- =============================================================================
-- SECTION 8 — from 20261009000800_storage.sql
-- =============================================================================
-- Storage buckets and object policies.
--
-- Path conventions (enforced below):
--   avatars/{user_id}/...       public  — profile images
--   brand-logos/{user_id}/...   public  — brand logos
--   portfolio/{user_id}/...     public  — portfolio media creators publish deliberately
--   deliverables/{project_id}/... private — project files, members only, signed URLs

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('brand-logos', 'brand-logos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('portfolio', 'portfolio', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('deliverables', 'deliverables', false, 52428800, array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/zip', 'audio/mpeg', 'audio/wav', 'text/plain'
  ])
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Own-folder write access for the public buckets.
create policy "own folder insert (public buckets)" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'brand-logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder update (public buckets)" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'brand-logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('avatars', 'brand-logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete (public buckets)" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'brand-logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);

-- Deliverables: only the project's creator uploads; both members read.
-- No update/delete: versions are append-only.
create or replace function public.can_upload_deliverable(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_project uuid;
begin
  begin
    v_project := (storage.foldername(p_object_name))[1]::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.projects
    where id = v_project and creator_id = auth.uid() and status in ('active', 'in_review', 'revision_requested')
  );
end;
$$;

create or replace function public.can_read_project_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_project uuid;
begin
  begin
    v_project := (storage.foldername(p_object_name))[1]::uuid;
  exception when others then
    return false;
  end;
  return public.is_project_member(v_project);
end;
$$;
grant execute on function public.can_upload_deliverable(text), public.can_read_project_object(text) to authenticated;

create policy "deliverables insert by project creator" on storage.objects for insert to authenticated
  with check (bucket_id = 'deliverables' and public.can_upload_deliverable(name));
create policy "deliverables read by project members" on storage.objects for select to authenticated
  using (bucket_id = 'deliverables' and public.can_read_project_object(name));

-- Needed for upsert/overwrite of one's own files; public URLs are readable anyway.
create policy "own folder select (public buckets)" on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'brand-logos', 'portfolio') and (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- SECTION 9 — from 20261009000900_reference_data.sql
-- =============================================================================
-- Reference data required in every environment (not demo data).
-- Add more rows any time; the app reads these tables, nothing is hard-coded.

insert into public.creator_categories (slug, name, sort_order) values
  ('video', 'Video creator', 10),
  ('photography', 'Photographer', 20),
  ('design', 'Designer', 30),
  ('editing', 'Video editor', 40),
  ('motion', 'Motion designer', 50),
  ('copywriting', 'Copywriter', 60),
  ('ugc', 'UGC creator', 70),
  ('illustration', 'Illustrator', 80),
  ('audio', 'Audio & podcast', 90),
  ('social', 'Social media creator', 100)
on conflict (slug) do nothing;

insert into public.creative_style_tags (slug, name, description, sort_order) values
  ('minimalist', 'Minimalist', 'Clean compositions, negative space, restrained palettes.', 10),
  ('cinematic', 'Cinematic', 'Film-like lighting, framing and pacing.', 20),
  ('documentary', 'Documentary', 'Observational, real people and places.', 30),
  ('bold-energetic', 'Bold and energetic', 'High contrast, fast cuts, punchy colour.', 40),
  ('editorial', 'Editorial', 'Magazine-style art direction and typography.', 50),
  ('playful', 'Playful', 'Humour, colour and lightness.', 60),
  ('educational', 'Educational', 'Explains and teaches clearly.', 70),
  ('luxury', 'Luxury', 'Premium materials, slow pacing, refined detail.', 80),
  ('authentic-casual', 'Authentic and casual', 'Lo-fi, personal, native to social feeds.', 90),
  ('motion-heavy', 'Motion-heavy', 'Animation and kinetic typography lead the story.', 100),
  ('story-driven', 'Story-driven', 'Narrative arcs and characters.', 110)
on conflict (slug) do nothing;

insert into public.platforms (slug, name, sort_order) values
  ('instagram', 'Instagram', 10),
  ('tiktok', 'TikTok', 20),
  ('youtube', 'YouTube', 30),
  ('youtube-shorts', 'YouTube Shorts', 35),
  ('linkedin', 'LinkedIn', 40),
  ('x', 'X', 50),
  ('pinterest', 'Pinterest', 60),
  ('website', 'Website', 70),
  ('podcast', 'Podcast', 80),
  ('print', 'Print / OOH', 90)
on conflict (slug) do nothing;

insert into public.deliverable_types (slug, name, effort_units, sort_order) values
  ('short-form-video', 'Short-form video', 1.0, 10),
  ('long-form-video', 'Long-form video', 3.0, 20),
  ('ugc-video', 'UGC video', 0.8, 30),
  ('photo-set', 'Photo set', 1.2, 40),
  ('product-photo', 'Product photo', 0.4, 50),
  ('carousel', 'Carousel post', 0.6, 60),
  ('static-graphic', 'Static graphic', 0.4, 70),
  ('motion-graphic', 'Motion graphic', 1.5, 80),
  ('story', 'Story / ephemeral post', 0.3, 90),
  ('blog-article', 'Blog article', 1.0, 100),
  ('ad-copy', 'Ad copy set', 0.5, 110),
  ('video-edit', 'Video edit', 1.2, 120),
  ('illustration', 'Illustration', 1.0, 130),
  ('podcast-episode', 'Podcast episode', 2.0, 140)
on conflict (slug) do nothing;

insert into public.industries (slug, name, sort_order) values
  ('beauty-skincare', 'Beauty & skincare', 10),
  ('fashion', 'Fashion & apparel', 20),
  ('food-beverage', 'Food & beverage', 30),
  ('tech', 'Technology & software', 40),
  ('fitness-wellness', 'Fitness & wellness', 50),
  ('travel-hospitality', 'Travel & hospitality', 60),
  ('home-living', 'Home & living', 70),
  ('finance', 'Finance', 80),
  ('education', 'Education', 90),
  ('gaming', 'Gaming', 100),
  ('automotive', 'Automotive', 110),
  ('nonprofit', 'Non-profit', 120)
on conflict (slug) do nothing;

insert into public.skills (slug, name, category_id) values
  ('short-form-editing', 'Short-form editing', (select id from public.creator_categories where slug = 'editing')),
  ('color-grading', 'Colour grading', (select id from public.creator_categories where slug = 'editing')),
  ('videography', 'Videography', (select id from public.creator_categories where slug = 'video')),
  ('drone', 'Drone footage', (select id from public.creator_categories where slug = 'video')),
  ('on-camera', 'On-camera presenting', (select id from public.creator_categories where slug = 'ugc')),
  ('scriptwriting', 'Scriptwriting', (select id from public.creator_categories where slug = 'copywriting')),
  ('product-photography', 'Product photography', (select id from public.creator_categories where slug = 'photography')),
  ('lifestyle-photography', 'Lifestyle photography', (select id from public.creator_categories where slug = 'photography')),
  ('food-styling', 'Food styling', (select id from public.creator_categories where slug = 'photography')),
  ('retouching', 'Retouching', (select id from public.creator_categories where slug = 'photography')),
  ('brand-identity', 'Brand identity', (select id from public.creator_categories where slug = 'design')),
  ('social-graphics', 'Social graphics', (select id from public.creator_categories where slug = 'design')),
  ('motion-design', '2D motion design', (select id from public.creator_categories where slug = 'motion')),
  ('3d-animation', '3D animation', (select id from public.creator_categories where slug = 'motion')),
  ('copywriting', 'Copywriting', (select id from public.creator_categories where slug = 'copywriting')),
  ('seo-writing', 'SEO writing', (select id from public.creator_categories where slug = 'copywriting')),
  ('illustration', 'Illustration', (select id from public.creator_categories where slug = 'illustration')),
  ('sound-design', 'Sound design', (select id from public.creator_categories where slug = 'audio')),
  ('voiceover', 'Voiceover', (select id from public.creator_categories where slug = 'audio')),
  ('community-management', 'Community management', (select id from public.creator_categories where slug = 'social')),
  ('trend-research', 'Trend research', (select id from public.creator_categories where slug = 'social'))
on conflict (slug) do nothing;

-- Scope-to-Price configuration. These multipliers are platform configuration
-- used to flag likely cost drivers; they are not market rates.
insert into public.platform_settings (key, value, description) values
  ('pricing.multipliers', jsonb_build_object(
     'paid_ads_usage', 0.30,
     'exclusivity_category', 0.25,
     'exclusivity_full', 0.50,
     'raw_files', 0.20,
     'extra_revision', 0.08,
     'rush_under_7_days', 0.25,
     'usage_per_extra_6_months', 0.10
   ), 'Indicative uplift factors used to flag cost drivers. Not market rates.'),
  ('pricing.default_unit_cents', '30000'::jsonb, 'Fallback per-effort-unit estimate when a creator has not set rates (USD cents).'),
  ('ai.daily_limit_per_user', '40'::jsonb, 'Maximum AI requests per user per day.')
on conflict (key) do nothing;


-- =============================================================================
-- SECTION 10 — from 20261009001000_fk_indexes.sql
-- =============================================================================
-- Performance: covering indexes for foreign keys flagged by the Supabase advisor.
create index if not exists audit_logs_actor_id_fk_idx on public.audit_logs (actor_id);
create index if not exists campaign_deliverables_platform_id_fk_idx on public.campaign_deliverables (platform_id);
create index if not exists campaign_invitations_invited_by_fk_idx on public.campaign_invitations (invited_by);
create index if not exists campaign_invitations_squad_role_id_fk_idx on public.campaign_invitations (squad_role_id);
create index if not exists campaigns_industry_id_fk_idx on public.campaigns (industry_id);
create index if not exists conversations_campaign_id_fk_idx on public.conversations (campaign_id);
create index if not exists deliverable_feedback_author_id_fk_idx on public.deliverable_feedback (author_id);
create index if not exists deliverable_feedback_version_id_fk_idx on public.deliverable_feedback (version_id);
create index if not exists deliverable_versions_submitted_by_fk_idx on public.deliverable_versions (submitted_by);
create index if not exists deliverables_created_by_fk_idx on public.deliverables (created_by);
create index if not exists deliverables_deliverable_type_id_fk_idx on public.deliverables (deliverable_type_id);
create index if not exists deliverables_platform_id_fk_idx on public.deliverables (platform_id);
create index if not exists match_results_squad_role_id_fk_idx on public.match_results (squad_role_id);
create index if not exists messages_sender_id_fk_idx on public.messages (sender_id);
create index if not exists portfolio_items_industry_id_fk_idx on public.portfolio_items (industry_id);
create index if not exists portfolio_items_platform_id_fk_idx on public.portfolio_items (platform_id);
create index if not exists project_comments_author_id_fk_idx on public.project_comments (author_id);
create index if not exists project_comments_deliverable_id_fk_idx on public.project_comments (deliverable_id);
create index if not exists project_comments_milestone_id_fk_idx on public.project_comments (milestone_id);
create index if not exists project_milestones_created_by_fk_idx on public.project_milestones (created_by);
create index if not exists proposal_deliverables_deliverable_type_id_fk_idx on public.proposal_deliverables (deliverable_type_id);
create index if not exists proposal_deliverables_platform_id_fk_idx on public.proposal_deliverables (platform_id);
create index if not exists proposal_portfolio_items_portfolio_item_id_fk_idx on public.proposal_portfolio_items (portfolio_item_id);
create index if not exists proposals_invitation_id_fk_idx on public.proposals (invitation_id);
create index if not exists proposals_squad_role_id_fk_idx on public.proposals (squad_role_id);
create index if not exists reports_resolved_by_fk_idx on public.reports (resolved_by);
create index if not exists reviews_reviewer_id_fk_idx on public.reviews (reviewer_id);
create index if not exists rights_record_platforms_platform_id_fk_idx on public.rights_record_platforms (platform_id);
create index if not exists rights_records_created_by_fk_idx on public.rights_records (created_by);
create index if not exists rights_records_deliverable_id_fk_idx on public.rights_records (deliverable_id);
create index if not exists rights_records_last_edited_by_fk_idx on public.rights_records (last_edited_by);
create index if not exists saved_creators_campaign_id_fk_idx on public.saved_creators (campaign_id);
create index if not exists skills_category_id_fk_idx on public.skills (category_id);
create index if not exists squad_role_skills_skill_id_fk_idx on public.squad_role_skills (skill_id);
create index if not exists squad_roles_category_id_fk_idx on public.squad_roles (category_id);
create index if not exists squad_roles_deliverable_type_id_fk_idx on public.squad_roles (deliverable_type_id);


-- =============================================================================
-- SECTION 11 — from 20261009001100_matching.sql
-- =============================================================================
-- Creative DNA matching support: candidate prefilter and result storage.

-- Visible creators with any overlap with the campaign (skills, styles,
-- category, deliverable evidence or platforms), most overlap first.
-- SECURITY INVOKER: creator visibility RLS applies to the caller.
create or replace function public.campaign_match_candidates(p_campaign_id uuid, p_limit int default 200)
returns table (creator_id uuid, overlap int)
language sql
stable
security invoker
set search_path = ''
as $$
  with c as (select * from public.campaigns where id = p_campaign_id),
  hits as (
    select cs.creator_id, 2 as w from public.creator_skills cs where cs.skill_id in (select skill_id from public.campaign_skills where campaign_id = p_campaign_id)
    union all
    select ct.creator_id, 2 from public.creator_style_tags ct where ct.style_tag_id in (select style_tag_id from public.campaign_style_tags where campaign_id = p_campaign_id)
    union all
    select cl.creator_id, 1 from public.creator_category_links cl, c where cl.category_id = c.category_id
    union all
    select pi.creator_id, 1 from public.portfolio_items pi where pi.deliverable_type_id in (select deliverable_type_id from public.campaign_deliverables where campaign_id = p_campaign_id)
    union all
    select sv.creator_id, 1 from public.creator_services sv where sv.active and sv.deliverable_type_id in (select deliverable_type_id from public.campaign_deliverables where campaign_id = p_campaign_id)
    union all
    select cp.creator_id, 1 from public.creator_platforms cp where cp.platform_id in (select platform_id from public.campaign_platforms where campaign_id = p_campaign_id)
  )
  select h.creator_id, sum(h.w)::int as overlap
  from hits h
  join public.creator_profiles p on p.id = h.creator_id
  where p.visibility <> 'hidden'
  group by h.creator_id
  order by overlap desc
  limit least(greatest(p_limit, 1), 500);
$$;

-- Stores computed results for a campaign the caller owns. Replaces previous
-- results for the same (campaign, squad role) scope.
create or replace function public.store_match_results(p_campaign_id uuid, p_squad_role_id uuid, p_results jsonb, p_algorithm_version text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.owns_campaign(p_campaign_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_squad_role_id is not null and not exists (select 1 from public.squad_roles where id = p_squad_role_id and campaign_id = p_campaign_id) then
    raise exception 'squad role does not belong to this campaign' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) > 500 then
    raise exception 'invalid results' using errcode = 'P0001';
  end if;

  delete from public.match_results
  where campaign_id = p_campaign_id and squad_role_id is not distinct from p_squad_role_id;

  insert into public.match_results (campaign_id, creator_id, squad_role_id, score, factors, explanation, algorithm_version)
  select p_campaign_id, (r ->> 'creator_id')::uuid, p_squad_role_id,
         greatest(0, least(100, (r ->> 'score')::int)), coalesce(r -> 'factors', '[]'::jsonb),
         left(coalesce(r ->> 'explanation', ''), 2000), left(p_algorithm_version, 40)
  from jsonb_array_elements(p_results) r
  where exists (select 1 from public.creator_profiles cp where cp.id = (r ->> 'creator_id')::uuid);
  get diagnostics v_count = row_count;

  perform public.audit('matches_computed', 'campaign', p_campaign_id, null, p_campaign_id,
    jsonb_build_object('count', v_count, 'algorithm', p_algorithm_version, 'squad_role_id', p_squad_role_id));
  return v_count;
end;
$$;

-- AI-assisted rewording of a stored explanation (owner only).
create or replace function public.set_match_ai_explanation(p_match_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.match_results m set ai_explanation = left(p_text, 1000)
  where m.id = p_match_id and public.owns_campaign(m.campaign_id);
  if not found then raise exception 'not authorized' using errcode = '42501'; end if;
end;
$$;

grant execute on function public.campaign_match_candidates(uuid, int) to authenticated;
grant execute on function public.store_match_results(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.set_match_ai_explanation(uuid, text) to authenticated;


-- =============================================================================
-- SECTION 12 — AI analysis records
-- =============================================================================

-- Records an AI run for the calling user. Only validated, structured output
-- is stored; raw prompts are not.
create or replace function public.record_ai_analysis(
  p_kind text, p_entity_type text, p_entity_id uuid, p_model text, p_status text, p_error_code text,
  p_output jsonb, p_input_tokens int, p_output_tokens int, p_latency_ms int
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  insert into public.ai_analysis_records (profile_id, kind, entity_type, entity_id, model, status, error_code, output, input_tokens, output_tokens, latency_ms)
  values (auth.uid(), p_kind, left(p_entity_type, 40), p_entity_id, left(p_model, 80), p_status, left(p_error_code, 60),
          case when p_output is not null and pg_column_size(p_output) < 200000 then p_output end,
          p_input_tokens, p_output_tokens, p_latency_ms)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.record_ai_analysis(text, text, uuid, text, text, text, jsonb, int, int, int) to authenticated;

-- Live message delivery (Supabase Realtime). RLS still applies to subscribers.
alter publication supabase_realtime add table public.messages;
