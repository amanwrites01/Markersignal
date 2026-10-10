-- =============================================================================
-- MAKERSIGNAL — SAMPLE DATA FOR DEVELOPMENT
--
-- Runs automatically after the schema on:   npm run db:reset   (local only)
-- It is NOT applied by `supabase db push`, so it never reaches production.
-- Emails use example.com, which is reserved and never receives mail.
--
-- Accounts (all emails pre-confirmed; password = first name + "@2026"):
--   Creators: Aman (aman@example.com), Riya Sharma, Arjun Mehta, Zoya Khan,
--             Maya Okafor, Theo Laurent, Priya Raman, Jordan Reyes, Sana Malik
--             (firstname.lastname@example.com)
--   Brands:   Neha Kapoor — Kapoor Organics, Vikram Rao — Northpeak Gear,
--             Sara Fernandes — Bloom Beauty Co., Ava Chen — Lumen Skin
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers (temporary — dropped automatically at the end of the session)
-- ---------------------------------------------------------------------------

create function pg_temp.seed_user(p_email text, p_password text, p_name text, p_role text)
returns uuid
language plpgsql
as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name), now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  -- profiles row is created by the on_auth_user_created trigger
  update public.profiles set role = p_role, full_name = p_name, onboarding_completed_at = now() where id = v_id;
  return v_id;
end;
$$;

create function pg_temp.ref(p_table text, p_slug text)
returns smallint
language plpgsql
as $$
declare v smallint;
begin
  execute format('select id from public.%I where slug = $1', p_table) into v using p_slug;
  if v is null then raise exception 'unknown % slug: %', p_table, p_slug; end if;
  return v;
end;
$$;

create function pg_temp.seed_creator(
  p_email text, p_password text, p_name text, p_slug text, p_headline text, p_bio text,
  p_city text, p_country text, p_rate int, p_availability text,
  p_categories text[], p_styles text[], p_skills text[], p_platforms text[]
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  v_id := pg_temp.seed_user(p_email, p_password, p_name, 'creator');
  insert into public.creator_profiles (id, slug, display_name, headline, bio, location_city, location_country, languages,
    availability, starting_rate_cents, currency, collaboration_types, visibility, onboarding_step)
  values (v_id, p_slug, p_name, p_headline, p_bio, p_city, p_country, '{English}',
    p_availability, p_rate * 100, 'USD', '{remote}', 'public', 3);
  insert into public.creator_category_links select v_id, pg_temp.ref('creator_categories', s) from unnest(p_categories) s;
  insert into public.creator_style_tags select v_id, pg_temp.ref('creative_style_tags', s) from unnest(p_styles) s;
  insert into public.creator_skills select v_id, pg_temp.ref('skills', s) from unnest(p_skills) s;
  insert into public.creator_platforms (creator_id, platform_id) select v_id, pg_temp.ref('platforms', s) from unnest(p_platforms) s;
  return v_id;
end;
$$;

create function pg_temp.seed_portfolio(p_creator uuid, p_title text, p_type text, p_industry text, p_category text, p_platform text, p_description text, p_order int)
returns void
language sql
as $$
  insert into public.portfolio_items (creator_id, title, description, media_type, external_url, deliverable_type_id, industry_id, category_id, platform_id, sort_order)
  select p_creator, p_title, p_description, 'link',
         'https://example.com/work/' || (select slug from public.creator_profiles where id = p_creator) || '/' || (p_order + 1),
         pg_temp.ref('deliverable_types', p_type), pg_temp.ref('industries', p_industry),
         pg_temp.ref('creator_categories', p_category), pg_temp.ref('platforms', p_platform), p_order;
$$;

create function pg_temp.seed_service(p_creator uuid, p_title text, p_type text, p_price int, p_days int, p_revisions int)
returns void
language sql
as $$
  insert into public.creator_services (creator_id, title, deliverable_type_id, starting_price_cents, currency, turnaround_days, revisions_included)
  values (p_creator, p_title, pg_temp.ref('deliverable_types', p_type), p_price * 100, 'USD', p_days, p_revisions);
$$;

create function pg_temp.seed_campaign(
  p_brand uuid, p_title text, p_objective text, p_description text, p_product text, p_audience text,
  p_category text, p_industry text, p_status text, p_blind boolean, p_min int, p_max int, p_deadline_days int, p_paid boolean,
  p_deliverables text[][], p_styles text[], p_skills text[], p_platforms text[]
) returns uuid
language plpgsql
as $$
declare v_id uuid; d text[];
begin
  insert into public.campaigns (brand_id, title, objective, description, product_description, target_audience, category_id, industry_id,
    budget_min_cents, budget_max_cents, currency, deadline, usage_organic, usage_paid_ads, usage_duration_months, usage_territory,
    revisions_expected, status, blind_review, visibility, published_at)
  values (p_brand, p_title, p_objective, p_description, p_product, p_audience,
    pg_temp.ref('creator_categories', p_category), pg_temp.ref('industries', p_industry),
    p_min * 100, p_max * 100, 'USD', current_date + p_deadline_days, true, p_paid, 12, 'Worldwide',
    2, p_status, p_blind, 'public', case when p_status = 'published' then now() end)
  returning id into v_id;
  foreach d slice 1 in array p_deliverables loop
    insert into public.campaign_deliverables (campaign_id, deliverable_type_id, platform_id, quantity)
    values (v_id, pg_temp.ref('deliverable_types', d[1]), pg_temp.ref('platforms', d[2]), d[3]::smallint);
  end loop;
  insert into public.campaign_style_tags select v_id, pg_temp.ref('creative_style_tags', s) from unnest(p_styles) s;
  insert into public.campaign_skills select v_id, pg_temp.ref('skills', s) from unnest(p_skills) s;
  insert into public.campaign_platforms select v_id, pg_temp.ref('platforms', s) from unnest(p_platforms) s;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Data
-- ---------------------------------------------------------------------------

do $$
declare
  c uuid;
  lumen uuid;
  neha uuid;
begin
  -- Creators --------------------------------------------------------------
  c := pg_temp.seed_creator('aman@example.com', 'Aman@2026', 'Aman', 'aman',
    'Story-driven reels and product films for D2C brands',
    'Mumbai-based video creator. I shoot and edit reels, unboxings and short brand stories for food, fashion and skincare D2C brands.',
    'Mumbai', 'India', 500, 'available',
    '{video,social}', '{story-driven,authentic-casual,cinematic}', '{videography,short-form-editing,scriptwriting,on-camera}', '{instagram,youtube-shorts}');
  perform pg_temp.seed_portfolio(c, 'Cold-pressed juice launch reels', 'short-form-video', 'food-beverage', 'video', 'instagram', 'Four launch reels with a day-in-the-life story arc.', 0);
  perform pg_temp.seed_portfolio(c, 'Handloom saree brand story', 'long-form-video', 'fashion', 'video', 'youtube-shorts', 'A 60-second maker story filmed with weavers.', 1);
  perform pg_temp.seed_portfolio(c, 'Sunscreen routine reel', 'short-form-video', 'beauty-skincare', 'social', 'instagram', 'Morning-routine reel for a skincare brand.', 2);
  perform pg_temp.seed_service(c, '2 product reels with script', 'short-form-video', 900, 7, 2);

  c := pg_temp.seed_creator('maya.okafor@example.com', 'Maya@2026', 'Maya Okafor', 'maya-okafor',
    'Short-form product films for skincare and beauty brands',
    'I make calm, detail-led product videos for beauty brands — texture shots, routines and honest explainers built for Reels and TikTok.',
    'London', 'United Kingdom', 650, 'available',
    '{video,ugc}', '{minimalist,editorial,educational}', '{short-form-editing,videography,color-grading,on-camera}', '{instagram,tiktok}');
  perform pg_temp.seed_portfolio(c, 'Barrier serum launch reels', 'short-form-video', 'beauty-skincare', 'video', 'instagram', 'Three 20-second texture-led reels for a serum launch.', 0);
  perform pg_temp.seed_portfolio(c, 'Morning routine series', 'short-form-video', 'beauty-skincare', 'ugc', 'tiktok', 'Five-part routine series filmed in natural light.', 1);
  perform pg_temp.seed_portfolio(c, 'SPF explainer', 'ugc-video', 'beauty-skincare', 'ugc', 'tiktok', 'On-camera explainer on SPF myths.', 2);
  perform pg_temp.seed_service(c, '3 short-form product videos', 'short-form-video', 1500, 10, 2);

  c := pg_temp.seed_creator('theo.laurent@example.com', 'Theo@2026', 'Theo Laurent', 'theo-laurent',
    'Cinematic brand films and colour grading',
    'Director-editor working on story-driven brand films for travel and hospitality.',
    'Lyon', 'France', 2500, 'limited',
    '{video,editing}', '{cinematic,story-driven,luxury}', '{videography,color-grading,drone,scriptwriting}', '{youtube,instagram}');
  perform pg_temp.seed_portfolio(c, 'Alpine hotel film', 'long-form-video', 'travel-hospitality', 'video', 'youtube', 'A 90-second hero film.', 0);
  perform pg_temp.seed_portfolio(c, 'Coastal resort cutdowns', 'short-form-video', 'travel-hospitality', 'editing', 'instagram', 'Six cutdowns from a hero film.', 1);
  perform pg_temp.seed_service(c, 'Hero brand film', 'long-form-video', 6000, 30, 2);

  c := pg_temp.seed_creator('priya.raman@example.com', 'Priya@2026', 'Priya Raman', 'priya-raman',
    'Product and lifestyle photography with a soft, editorial eye',
    'Still-life and lifestyle photographer for beauty, home and food brands.',
    'Bengaluru', 'India', 400, 'available',
    '{photography}', '{minimalist,editorial,luxury}', '{product-photography,lifestyle-photography,retouching}', '{instagram,website,pinterest}');
  perform pg_temp.seed_portfolio(c, 'Clean beauty still life', 'photo-set', 'beauty-skincare', 'photography', 'website', '12-image e-commerce and social set.', 0);
  perform pg_temp.seed_portfolio(c, 'Ceramics lookbook', 'photo-set', 'home-living', 'photography', 'instagram', 'Lifestyle lookbook for a ceramics studio.', 1);
  perform pg_temp.seed_service(c, 'Product photo set (10 images)', 'photo-set', 900, 7, 1);

  c := pg_temp.seed_creator('jordan.reyes@example.com', 'Jordan@2026', 'Jordan Reyes', 'jordan-reyes',
    'Bold, high-energy UGC for apps and gaming',
    'Fast-cut, hook-first UGC for app installs and game launches.',
    'Austin', 'United States', 300, 'available',
    '{ugc,social}', '{bold-energetic,playful,authentic-casual}', '{on-camera,short-form-editing,trend-research}', '{tiktok,youtube-shorts,instagram}');
  perform pg_temp.seed_portfolio(c, 'Puzzle game launch UGC', 'ugc-video', 'gaming', 'ugc', 'tiktok', 'Ten hook variations for paid testing.', 0);
  perform pg_temp.seed_portfolio(c, 'Budgeting app explainer', 'ugc-video', 'finance', 'ugc', 'instagram', 'Talking-head explainer.', 1);
  perform pg_temp.seed_service(c, 'UGC video with 3 hooks', 'ugc-video', 350, 5, 1);

  c := pg_temp.seed_creator('sana.malik@example.com', 'Sana@2026', 'Sana Malik', 'sana-malik',
    'Motion design and kinetic typography for product launches',
    '2D motion designer turning product features into crisp animated explainers.',
    'Toronto', 'Canada', 1200, 'available',
    '{motion,design}', '{motion-heavy,minimalist,educational}', '{motion-design,social-graphics,brand-identity}', '{linkedin,youtube,website}');
  perform pg_temp.seed_portfolio(c, 'SaaS feature explainer', 'motion-graphic', 'tech', 'motion', 'linkedin', '45-second animated explainer.', 0);
  perform pg_temp.seed_service(c, '30s animated explainer', 'motion-graphic', 1800, 14, 2);

  -- Brands ----------------------------------------------------------------
  neha := pg_temp.seed_user('neha.kapoor@example.com', 'Neha@2026', 'Neha Kapoor', 'brand');
  insert into public.brand_profiles (id, slug, brand_name, industry_id, description, website, location_country, team_size, onboarding_step)
  values (neha, 'kapoor-organics', 'Kapoor Organics', pg_temp.ref('industries', 'food-beverage'),
    E'Small-batch organic snacks and cold-pressed juices from Pune. We want warm, real, everyday content.',
    'https://example.com/kapoor-organics', 'India', '2-10', 3);
  insert into public.brand_contacts (brand_id, contact_name, contact_email) values (neha, 'Neha Kapoor', 'neha.kapoor@example.com');

  lumen := pg_temp.seed_user('ava.chen@example.com', 'Ava@2026', 'Ava Chen', 'brand');
  insert into public.brand_profiles (id, slug, brand_name, industry_id, description, website, location_country, team_size, onboarding_step)
  values (lumen, 'lumen-skin', 'Lumen Skin', pg_temp.ref('industries', 'beauty-skincare'),
    E'Fragrance-free skincare for sensitive skin. We like calm, honest content that shows real texture and real routines.',
    'https://example.com/lumen-skin', 'United Kingdom', '11-50', 3);
  insert into public.brand_contacts (brand_id, contact_name, contact_email) values (lumen, 'Ava Chen', 'ava.chen@example.com');

  -- Campaigns -------------------------------------------------------------
  perform pg_temp.seed_campaign(lumen,
    'Barrier Repair Serum launch — short-form product films',
    'Introduce our new barrier-repair serum to people with sensitive skin and show how it fits a simple routine.',
    'We want three calm, texture-led short-form videos. Show the serum on skin, the routine around it, and an honest first-week reaction. Avoid before/after claims.',
    'Fragrance-free serum with ceramides and panthenol, 30ml.',
    '25–40, sensitive or reactive skin, prefers simple routines.',
    'video', 'beauty-skincare', 'published', false, 1200, 2500, 40, true,
    array[['short-form-video', 'instagram', '2'], ['short-form-video', 'tiktok', '1']],
    '{minimalist,educational}', '{short-form-editing,on-camera}', '{instagram,tiktok}');

  perform pg_temp.seed_campaign(lumen,
    'Spring still-life photo set',
    'Refresh our product page and social grid with a soft, editorial still-life set.',
    'Ten edited still-life images of the full range on neutral backgrounds.',
    'Full range of six products.',
    'Existing customers and first-time visitors to the website.',
    'photography', 'beauty-skincare', 'published', true, 600, 1200, 30, false,
    array[['photo-set', 'website', '1']],
    '{minimalist,editorial}', '{product-photography,retouching}', '{website,instagram}');

  perform pg_temp.seed_campaign(lumen,
    'Holiday gifting campaign',
    'Plan gifting content for the holiday season.',
    null, null, null,
    'design', 'beauty-skincare', 'draft', false, 1000, 3000, 80, false,
    array[['carousel', 'instagram', '2']],
    '{playful}', '{social-graphics}', '{instagram}');

  perform pg_temp.seed_campaign(neha,
    'Cold-pressed juice summer reels',
    'Show our new summer juice range as part of real, busy days — commutes, gym, office.',
    'Two story-led reels with natural light and real routines. No exaggerated health claims.',
    'Three cold-pressed juices: mango-ginger, beet-citrus, green detox. 250ml bottles.',
    '22–35 urban professionals in Indian metros.',
    'video', 'food-beverage', 'published', false, 400, 1000, 35, false,
    array[['short-form-video', 'instagram', '2']],
    '{story-driven,authentic-casual}', '{videography,short-form-editing}', '{instagram}');
end;
$$;

-- =============================================================================
-- More realistic users with complete profiles
-- =============================================================================

create function pg_temp.uid(p_email text) returns uuid language sql as $$ select id from auth.users where email = p_email $$;

create function pg_temp.link(p_profile uuid, p_kind text, p_url text) returns void language sql as $$
  insert into public.profile_links (profile_id, kind, url) values (p_profile, p_kind, p_url) on conflict do nothing;
$$;

do $$
declare c uuid; b uuid;
begin
  -- Riya Sharma — fashion & lifestyle photographer, Delhi
  c := pg_temp.seed_creator('riya.sharma@example.com', 'Riya@2026', 'Riya Sharma', 'riya-sharma',
    'Fashion and lifestyle photography with warm, editorial light',
    'Delhi-based photographer shooting lookbooks, product flat-lays and campaign stills for fashion and beauty labels. I plan every shoot with a mood board and shot list, and deliver retouched selects within a week.',
    'New Delhi', 'India', 450, 'available',
    '{photography}', '{editorial,minimalist,luxury}', '{product-photography,lifestyle-photography,retouching}', '{instagram,website,pinterest}');
  update public.creator_profiles set languages = '{English,Hindi}', collaboration_types = '{remote,on_site}' where id = c;
  perform pg_temp.seed_portfolio(c, 'Monsoon lookbook — handloom label', 'photo-set', 'fashion', 'photography', 'instagram', '24-image outdoor lookbook shot over two days in Old Delhi, with styling and retouching.', 0);
  perform pg_temp.seed_portfolio(c, 'Clean beauty flat-lays', 'photo-set', 'beauty-skincare', 'photography', 'website', 'E-commerce and social flat-lays for a 9-product skincare range.', 1);
  perform pg_temp.seed_portfolio(c, 'Café menu photography', 'product-photo', 'food-beverage', 'photography', 'website', 'Menu and social photography for a Delhi café, 30 dishes.', 2);
  perform pg_temp.seed_portfolio(c, 'Silver jewellery campaign stills', 'photo-set', 'fashion', 'photography', 'instagram', 'Macro and on-model stills for a jewellery launch.', 3);
  perform pg_temp.seed_service(c, 'Lookbook shoot (20 edited images)', 'photo-set', 650, 7, 1);
  perform pg_temp.seed_service(c, 'Product flat-lays (10 images)', 'product-photo', 300, 5, 2);
  perform pg_temp.link(c, 'instagram', 'https://instagram.com/example_riya');
  perform pg_temp.link(c, 'behance', 'https://behance.net/example_riya');

  -- Arjun Mehta — tech explainers & motion, Bengaluru
  c := pg_temp.seed_creator('arjun.mehta@example.com', 'Arjun@2026', 'Arjun Mehta', 'arjun-mehta',
    'Clear, friendly tech explainers and animated product demos',
    'Bengaluru-based creator making explainer videos and short motion pieces for SaaS, fintech and consumer tech. I script, record voiceover and animate, so a feature launch can go from brief to video in two weeks.',
    'Bengaluru', 'India', 700, 'limited',
    '{video,motion}', '{educational,motion-heavy,minimalist}', '{motion-design,scriptwriting,voiceover,short-form-editing}', '{youtube,linkedin,instagram}');
  update public.creator_profiles set languages = '{English,Hindi,Kannada}', available_from = current_date + 10 where id = c;
  perform pg_temp.seed_portfolio(c, 'UPI app feature explainer', 'motion-graphic', 'finance', 'motion', 'linkedin', '60-second animated explainer for a payments feature launch.', 0);
  perform pg_temp.seed_portfolio(c, 'Smartwatch unboxing & setup', 'long-form-video', 'tech', 'video', 'youtube', '8-minute setup walkthrough with on-screen callouts.', 1);
  perform pg_temp.seed_portfolio(c, 'SaaS onboarding shorts', 'short-form-video', 'tech', 'video', 'instagram', 'Five 30-second onboarding tips for a project-management app.', 2);
  perform pg_temp.seed_service(c, '60s animated explainer', 'motion-graphic', 1400, 14, 2);
  perform pg_temp.seed_service(c, 'YouTube review video', 'long-form-video', 1100, 12, 1);
  perform pg_temp.link(c, 'youtube', 'https://youtube.com/@example_arjun');
  perform pg_temp.link(c, 'linkedin', 'https://linkedin.com/in/example-arjun');

  -- Zoya Khan — food creator & stylist, Hyderabad
  c := pg_temp.seed_creator('zoya.khan@example.com', 'Zoya@2026', 'Zoya Khan', 'zoya-khan',
    'Food reels, recipes and honest UGC for kitchen and wellness brands',
    'Hyderabad-based food creator. I develop simple recipes around a product, style and shoot them at home, and edit hook-first reels. Comfortable on camera in English, Hindi and Urdu.',
    'Hyderabad', 'India', 350, 'available',
    '{ugc,social,video}', '{authentic-casual,playful,story-driven}', '{on-camera,food-styling,short-form-editing,trend-research}', '{instagram,youtube-shorts,tiktok}');
  update public.creator_profiles set languages = '{English,Hindi,Urdu}' where id = c;
  perform pg_temp.seed_portfolio(c, 'Millet breakfast series', 'short-form-video', 'food-beverage', 'ugc', 'instagram', 'Four recipe reels for a millet cereal brand with on-screen steps.', 0);
  perform pg_temp.seed_portfolio(c, 'Air-fryer UGC ads', 'ugc-video', 'home-living', 'ugc', 'instagram', 'Six UGC ad variations with different hooks for paid testing.', 1);
  perform pg_temp.seed_portfolio(c, 'Skincare morning routine reel', 'ugc-video', 'beauty-skincare', 'social', 'instagram', 'Relaxed, natural-light routine reel for a sunscreen brand.', 2);
  perform pg_temp.seed_service(c, '3 UGC reels with hooks', 'ugc-video', 600, 6, 2);
  perform pg_temp.seed_service(c, 'Recipe reel with styling', 'short-form-video', 280, 4, 1);
  perform pg_temp.link(c, 'instagram', 'https://instagram.com/example_zoya');

  -- Links for existing creators
  perform pg_temp.link(pg_temp.uid('aman@example.com'), 'instagram', 'https://instagram.com/example_aman');
  perform pg_temp.link(pg_temp.uid('aman@example.com'), 'youtube', 'https://youtube.com/@example_aman');
  update public.creator_profiles set languages = '{English,Hindi,Marathi}' where id = pg_temp.uid('aman@example.com');

  -- Vikram Rao — Northpeak Gear (outdoor apparel), Bengaluru
  b := pg_temp.seed_user('vikram.rao@example.com', 'Vikram@2026', 'Vikram Rao', 'brand');
  insert into public.brand_profiles (id, slug, brand_name, industry_id, description, website, location_country, team_size, onboarding_step)
  values (b, 'northpeak-gear', 'Northpeak Gear', pg_temp.ref('industries', 'travel-hospitality'),
    E'Outdoor and travel apparel designed in Bengaluru for Himalayan treks and city commutes alike. We love cinematic, story-led content shot in real conditions.',
    'https://example.com/northpeak', 'India', '11-50', 3);
  insert into public.brand_contacts (brand_id, contact_name, contact_email, contact_phone) values (b, 'Vikram Rao', 'vikram.rao@example.com', '+91 98450 00000');
  perform pg_temp.link(b, 'instagram', 'https://instagram.com/example_northpeak');
  perform pg_temp.link(b, 'website', 'https://example.com/northpeak');

  -- Sara Fernandes — Bloom Beauty Co. (clean beauty), Goa
  b := pg_temp.seed_user('sara.fernandes@example.com', 'Sara@2026', 'Sara Fernandes', 'brand');
  insert into public.brand_profiles (id, slug, brand_name, industry_id, description, website, location_country, team_size, onboarding_step)
  values (b, 'bloom-beauty', 'Bloom Beauty Co.', pg_temp.ref('industries', 'beauty-skincare'),
    E'Clean, minimalist skincare made in Goa. We work with creators who show real skin and simple routines — no filters, no miracle claims.',
    'https://example.com/bloom', 'India', '2-10', 3);
  insert into public.brand_contacts (brand_id, contact_name, contact_email) values (b, 'Sara Fernandes', 'sara.fernandes@example.com');
  perform pg_temp.link(b, 'instagram', 'https://instagram.com/example_bloom');

  perform pg_temp.link(pg_temp.uid('neha.kapoor@example.com'), 'instagram', 'https://instagram.com/example_kapoororganics');
end;
$$;

-- =============================================================================
-- Realistic activity, created through the real workflow functions as each user
-- (proposals, projects, deliverables, rights, reviews, messages, notifications)
-- =============================================================================

create function pg_temp.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id::text, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.propose(p_creator uuid, p_campaign uuid, p_approach text, p_quote int, p_days int, p_revisions int, p_lines text[][])
returns uuid language plpgsql as $$
declare v_id uuid; l text[]; i int := 0;
begin
  insert into public.proposals (campaign_id, creator_id, approach, quote_cents, currency, timeline_days, proposed_delivery_date, revisions_included, usage_notes)
  values (p_campaign, p_creator, p_approach, p_quote * 100, 'USD', p_days, current_date + p_days, p_revisions,
          'Quote assumes organic use for 12 months; paid usage can be added.')
  returning id into v_id;
  foreach l slice 1 in array p_lines loop
    insert into public.proposal_deliverables (proposal_id, deliverable_type_id, platform_id, quantity, description, sort_order)
    values (v_id, pg_temp.ref('deliverable_types', l[1]), pg_temp.ref('platforms', l[2]), l[3]::smallint, l[4], i);
    i := i + 1;
  end loop;
  perform pg_temp.as_user(p_creator);
  perform public.submit_proposal(v_id);
  return v_id;
end;
$$;

create function pg_temp.say(p_conversation uuid, p_sender uuid, p_body text, p_minutes_ago int) returns void language sql as $$
  insert into public.messages (conversation_id, sender_id, body, created_at) values (p_conversation, p_sender, p_body, now() - make_interval(mins => p_minutes_ago));
$$;

do $$
declare
  aman uuid := pg_temp.uid('aman@example.com');
  riya uuid := pg_temp.uid('riya.sharma@example.com');
  arjun uuid := pg_temp.uid('arjun.mehta@example.com');
  zoya uuid := pg_temp.uid('zoya.khan@example.com');
  maya uuid := pg_temp.uid('maya.okafor@example.com');
  neha uuid := pg_temp.uid('neha.kapoor@example.com');
  vikram uuid := pg_temp.uid('vikram.rao@example.com');
  sara uuid := pg_temp.uid('sara.fernandes@example.com');
  lumen uuid := pg_temp.uid('ava.chen@example.com');
  juice uuid; trek uuid; serum uuid; barrier uuid;
  prop uuid; project uuid; conv uuid; rights uuid; d record; rev int; inv uuid; role_video uuid; role_photo uuid;
begin
  juice := (select id from public.campaigns where brand_id = neha and title like 'Cold-pressed%');
  barrier := (select id from public.campaigns where brand_id = lumen and title like 'Barrier%');

  trek := pg_temp.seed_campaign(vikram,
    'Monsoon trek collection — cinematic launch film',
    'Launch our monsoon trek jackets and packs with a short cinematic film and social cutdowns shot on a real trail.',
    E'A small crew follows two friends on a one-day Western Ghats trek in the rain. Show the gear working in real conditions — wet rock, wind, mist — without staged hero shots.\n\nMust include: jacket hood in heavy rain, pack rain-cover, a warm chai stop at the end. Avoid: drone shots over protected forest areas.',
    'Monsoon shell jacket (3 colours), 28L trek pack, quick-dry trek pants.',
    'Weekend trekkers aged 22–38 in Bengaluru, Pune and Mumbai.',
    'video', 'travel-hospitality', 'published', false, 2500, 5000, 45, true,
    array[['long-form-video', 'youtube', '1'], ['short-form-video', 'instagram', '4'], ['photo-set', 'website', '1']],
    '{cinematic,story-driven,documentary}', '{videography,color-grading,drone,product-photography}', '{youtube,instagram,website}');

  serum := pg_temp.seed_campaign(sara,
    'Bloom Glow Serum — UGC & routine reels',
    'Show how our vitamin C serum fits into a simple morning routine for people with sensitive skin.',
    E'Three relaxed, natural-light reels: texture close-up, morning routine, and an honest two-week check-in. No before/after claims, no filters.',
    'Vitamin C + niacinamide serum, 30ml, fragrance-free.',
    'Women and men 22–35 with sensitive or combination skin, first-time serum users.',
    'ugc', 'beauty-skincare', 'published', true, 600, 1200, 30, false,
    array[['ugc-video', 'instagram', '3']],
    '{authentic-casual,minimalist,educational}', '{on-camera,short-form-editing}', '{instagram}');

  -- Squad roles for the trek campaign
  insert into public.squad_roles (campaign_id, title, description, category_id, deliverable_type_id, budget_cents, headcount, sort_order)
  values (trek, 'Lead filmmaker', 'Directs and shoots the hero film and cutdowns.', pg_temp.ref('creator_categories', 'video'), pg_temp.ref('deliverable_types', 'long-form-video'), 350000, 1, 0)
  returning id into role_video;
  insert into public.squad_role_skills values (role_video, pg_temp.ref('skills', 'videography')), (role_video, pg_temp.ref('skills', 'color-grading'));
  insert into public.squad_roles (campaign_id, title, description, category_id, deliverable_type_id, budget_cents, headcount, sort_order)
  values (trek, 'Stills photographer', 'Product and lifestyle stills on the same trek.', pg_temp.ref('creator_categories', 'photography'), pg_temp.ref('deliverable_types', 'photo-set'), 90000, 1, 1)
  returning id into role_photo;
  insert into public.squad_role_skills values (role_photo, pg_temp.ref('skills', 'product-photography'));

  -- 1) COMPLETED project: Aman × Kapoor Organics (juice reels)
  prop := pg_temp.propose(aman, juice,
    E'Two day-in-the-life reels: a Mumbai commute (juice in the bag, sip at the station) and a post-gym kitchen moment. Natural light, real routines, voiceover in Hinglish with English captions. I''ll share a shot list before filming.',
    850, 14, 2,
    array[['short-form-video', 'instagram', '2', '30–45s vertical reels with captions']]);
  perform pg_temp.as_user(neha);
  perform public.mark_proposal_under_review(prop);
  project := public.accept_proposal(prop, 'Loved the commute idea — let''s go.');
  perform public.agree_project_scope(project);
  perform pg_temp.as_user(aman);
  perform public.agree_project_scope(project);
  for d in select id from public.deliverables where project_id = project loop
    perform public.submit_deliverable_version(d.id, 'First cut of both reels.', null, null, null, null, 'https://example.com/work/aman/juice-v1');
    perform pg_temp.as_user(neha);
    perform public.review_deliverable(d.id, 'revision_requested', 'Great energy! Please show the bottle label clearly in the first 3 seconds of reel 2.');
    perform pg_temp.as_user(aman);
    perform public.submit_deliverable_version(d.id, 'Label is now visible in the opening shot.', null, null, null, null, 'https://example.com/work/aman/juice-v2');
    perform pg_temp.as_user(neha);
    perform public.review_deliverable(d.id, 'approved', 'Perfect — approved.');
  end loop;
  select id into rights from public.rights_records where project_id = project;
  perform public.save_rights_record(project, rights,
    '{"title":"Usage rights — juice summer reels","content_type":"Short-form video","organic_use":true,"paid_ads_use":false,"territory":"India","license_start":"2026-10-01","duration_months":"12","exclusivity":"none","raw_files_included":false,"derivative_edits_allowed":true,"derivative_notes":"Brand may trim to 15s and add subtitles.","ai_training_allowed":false,"attribution_required":true,"attribution_details":"Tag @example_aman in the caption."}'::jsonb,
    array[pg_temp.ref('platforms', 'instagram')], true);
  perform pg_temp.as_user(aman);
  select revision into rev from public.rights_records where id = rights;
  perform public.approve_rights_record(rights, rev);
  perform pg_temp.as_user(neha);
  perform public.complete_project(project);
  perform public.submit_review(project, 5, 'Aman planned everything clearly, shared a shot list early and turned the revision around in a day. The commute reel is our best-performing organic post this month.');
  perform pg_temp.as_user(aman);
  perform public.submit_review(project, 5, 'Clear brief, quick feedback and a fair revision request. Would happily work with Kapoor Organics again.');
  select id into conv from public.conversations where project_id = project;
  perform pg_temp.say(conv, aman, 'Hi Neha! Sharing my shot list for both reels — let me know if the station scene works for you.', 4000);
  perform pg_temp.say(conv, neha, 'Looks great. Can we make sure the mango-ginger bottle is the hero in reel 1?', 3900);
  perform pg_temp.say(conv, aman, 'Absolutely, I''ll open on it. First cuts by Friday.', 3880);
  perform pg_temp.say(conv, neha, 'Approved both — thank you, these feel really real.', 120);
  update public.projects set completed_at = now() - interval '2 days' where id = project;

  -- 2) ACTIVE project in review: Zoya × Bloom Beauty (blind campaign) — revision cycle under way
  prop := pg_temp.propose(zoya, serum,
    E'Three relaxed reels filmed at home in morning light: (1) texture close-up with a quick how-much-to-use tip, (2) full 60-second routine, (3) honest two-week check-in. No filters and no before/after claims, as the brief asks.',
    900, 18, 2,
    array[['ugc-video', 'instagram', '3', 'Vertical, 30–60s, burned-in captions']]);
  perform pg_temp.propose(maya, serum,
    E'Texture-led reels with macro shots and a calm voiceover explaining vitamin C for sensitive skin. Three reels plus raw selects for your team.',
    1150, 14, 2,
    array[['ugc-video', 'instagram', '3', 'Includes raw selects']]);
  perform pg_temp.as_user(sara);
  perform public.reveal_proposal_identity(prop);
  project := public.accept_proposal(prop, 'Your check-in idea is exactly what we wanted.');
  perform public.agree_project_scope(project);
  perform pg_temp.as_user(zoya);
  perform public.agree_project_scope(project);
  insert into public.project_milestones (project_id, title, description, due_date, percentage, sort_order, created_by) values
    (project, 'Concepts & shot list', 'Agree hooks and shot list for all three reels.', current_date + 3, 20, 0, zoya),
    (project, 'First cuts', 'Reels 1 and 2 first cuts.', current_date + 10, 40, 1, zoya),
    (project, 'Final delivery', 'All three reels approved, plus captions.', current_date + 18, 40, 2, zoya);
  update public.deliverables set milestone_id = (select id from public.project_milestones where project_id = project and sort_order = 1) where project_id = project;
  for d in select id from public.deliverables where project_id = project loop
    perform public.submit_deliverable_version(d.id, 'Reels 1 and 2 first cuts — reel 3 after the two-week check-in.', null, null, null, null, 'https://example.com/work/zoya/serum-v1');
    perform pg_temp.as_user(sara);
    perform public.review_deliverable(d.id, 'revision_requested', 'Lovely light! Please shorten the intro of reel 2 to under 3 seconds and mention it''s fragrance-free.');
    perform pg_temp.as_user(zoya);
    perform public.submit_deliverable_version(d.id, 'Shorter intro and fragrance-free callout added.', null, null, null, null, 'https://example.com/work/zoya/serum-v2');
  end loop;
  perform pg_temp.as_user(sara);
  select id into rights from public.rights_records where project_id = project;
  perform public.save_rights_record(project, rights,
    '{"title":"Usage rights — Glow Serum reels","content_type":"UGC video","organic_use":true,"paid_ads_use":true,"paid_ads_notes":"Meta ads, up to 3 months of spend.","territory":"India","license_start":"2026-11-01","duration_months":"6","exclusivity":"category","exclusivity_details":"No competing vitamin C serums for 3 months.","raw_files_included":false,"derivative_edits_allowed":true,"ai_training_allowed":false,"attribution_required":false}'::jsonb,
    array[pg_temp.ref('platforms', 'instagram')], true);
  select id into conv from public.conversations where project_id = project;
  perform pg_temp.say(conv, sara, 'Welcome aboard, Zoya! Rights terms are in the Rights Passport for you to review.', 600);
  perform pg_temp.say(conv, zoya, 'Thanks Sara! v2 is up — shorter intro and the fragrance-free mention.', 45);

  -- 3) Proposals in progress on the trek campaign + invitations
  perform pg_temp.as_user(vikram);
  inv := public.invite_creator(trek, aman, 'Your story-led reels are exactly the feel we want for the trek film. Would you send a proposal for the lead filmmaker role?', role_video);
  perform public.invite_creator(trek, riya, 'We''d love warm, editorial stills from the same trek — interested?', role_photo);
  perform public.invite_creator(trek, pg_temp.uid('theo.laurent@example.com'), 'Your hotel film is beautiful — would you consider a monsoon trek shoot?', role_video);
  perform pg_temp.as_user(aman);
  perform public.respond_invitation(inv, true);
  prop := pg_temp.propose(aman, trek,
    E'A 90-second film following two friends from the trailhead to the chai stall, shot handheld in the rain with weather-sealed gear, plus four vertical cutdowns. I''ll scout the trail the week before.',
    3600, 21, 2,
    array[['long-form-video', 'youtube', '1', '90s hero film, 4K'], ['short-form-video', 'instagram', '4', '15–30s cutdowns']]);
  update public.proposals set squad_role_id = role_video where id = prop;
  prop := pg_temp.propose(riya, trek,
    E'Editorial stills shot alongside the film crew: 25 retouched images covering product details in the rain and candid trek moments.',
    800, 10, 1,
    array[['photo-set', 'website', '1', '25 retouched images']]);
  update public.proposals set squad_role_id = role_photo where id = prop;
  perform pg_temp.as_user(vikram);
  perform public.mark_proposal_under_review(prop);
  conv := public.ensure_proposal_conversation(prop);
  perform pg_temp.say(conv, vikram, 'Hi Riya — could you also shoot a few flat-lays of the pack contents?', 90);
  perform pg_temp.say(conv, riya, 'Sure! I can add 5 flat-lays at no extra cost if we do them the same day.', 60);

  -- Arjun: pending invitation from Lumen Skin, and a proposal on the Lumen serum launch
  perform pg_temp.as_user(lumen);
  perform public.invite_creator(barrier, arjun, 'Could you make one educational explainer about barrier repair to sit alongside the reels?', null);
  perform pg_temp.propose(zoya, barrier,
    E'Two honest routine reels and one texture reel for sensitive skin, filmed in natural light.',
    1300, 14, 2,
    array[['short-form-video', 'instagram', '2', 'Routine reels'], ['short-form-video', 'tiktok', '1', 'Texture reel']]);

  -- Shortlists and saved campaigns
  insert into public.saved_creators (brand_id, creator_id, note) values
    (vikram, aman, 'Great storytelling — first choice for the trek film.'),
    (vikram, riya, 'Warm editorial stills.'),
    (sara, zoya, 'Natural on camera, honest tone.'),
    (sara, riya, 'For the spring product shoot.'),
    (neha, zoya, 'Recipe reels for the snack range?');
  insert into public.saved_campaigns (creator_id, campaign_id) values (arjun, barrier), (riya, serum), (zoya, juice);
end;
$$;
