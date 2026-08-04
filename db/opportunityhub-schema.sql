-- OpportunityHub — full schema for the Supabase project
-- Project: https://supabase.com/dashboard/project/iubqolpcuizwmngbkmev
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- It is idempotent: safe to re-run.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.opportunity_type as enum ('internship','job','freelance','hackathon');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum ('applied','in_review','interview','offer','rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  headline text,
  university text,
  skills text[] default '{}',
  avatar_url text,
  resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ----------------------------------------------------------- opportunities
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  type public.opportunity_type not null,
  location text,
  is_remote boolean not null default false,
  compensation text,
  description text,
  tags text[] default '{}',
  apply_url text,
  deadline date,
  logo_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists opportunities_type_idx on public.opportunities (type);
create index if not exists opportunities_created_at_idx on public.opportunities (created_at desc);
create index if not exists opportunities_deadline_idx on public.opportunities (deadline);
create index if not exists opportunities_tags_idx on public.opportunities using gin (tags);

grant select on public.opportunities to anon;
grant select, insert, update, delete on public.opportunities to authenticated;
grant all on public.opportunities to service_role;
alter table public.opportunities enable row level security;

drop policy if exists "Opportunities are public" on public.opportunities;
create policy "Opportunities are public" on public.opportunities for select using (true);
drop policy if exists "Authenticated users can post opportunities" on public.opportunities;
create policy "Authenticated users can post opportunities" on public.opportunities for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Owners update opportunities" on public.opportunities;
create policy "Owners update opportunities" on public.opportunities for update to authenticated using (auth.uid() = created_by);
drop policy if exists "Owners delete opportunities" on public.opportunities;
create policy "Owners delete opportunities" on public.opportunities for delete to authenticated using (auth.uid() = created_by);

-- ----------------------------------------------------- saved_opportunities
create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create index if not exists saved_user_idx on public.saved_opportunities (user_id);

grant select, insert, delete on public.saved_opportunities to authenticated;
grant all on public.saved_opportunities to service_role;
alter table public.saved_opportunities enable row level security;

drop policy if exists "Users read own saves" on public.saved_opportunities;
create policy "Users read own saves" on public.saved_opportunities for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own saves" on public.saved_opportunities;
create policy "Users create own saves" on public.saved_opportunities for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users delete own saves" on public.saved_opportunities;
create policy "Users delete own saves" on public.saved_opportunities for delete to authenticated using (auth.uid() = user_id);

-- ------------------------------------------------------------ applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status public.application_status not null default 'applied',
  cover_note text,
  resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create index if not exists applications_user_idx on public.applications (user_id);
create index if not exists applications_opportunity_idx on public.applications (opportunity_id);

grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;

drop policy if exists "Users read own applications" on public.applications;
create policy "Users read own applications" on public.applications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own applications" on public.applications;
create policy "Users create own applications" on public.applications for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own applications" on public.applications;
create policy "Users update own applications" on public.applications for update to authenticated using (auth.uid() = user_id);
drop policy if exists "Users delete own applications" on public.applications;
create policy "Users delete own applications" on public.applications for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are public" on storage.objects;
create policy "Avatars are public" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar" on storage.objects for all to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users manage own resume" on storage.objects;
create policy "Users manage own resume" on storage.objects for all to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------- seed data
insert into public.opportunities (title, company, type, location, is_remote, compensation, description, tags, apply_url, deadline)
select * from (values
  ('Frontend Engineering Intern','Linear','internship'::public.opportunity_type,'San Francisco, CA',true,'$45/hr','Work with the design engineering team on the core issue tracker UI. You will ship real features to production in your first two weeks.',array['React','TypeScript','UI'],'https://linear.app/careers',current_date + 30),
  ('Data Science Intern','Spotify','internship','Stockholm, Sweden',false,'€2,400/mo','Join the personalization team and help improve recommendation quality for millions of listeners.',array['Python','SQL','ML'],'https://lifeatspotify.com',current_date + 21),
  ('Junior Product Designer','Notion','job','New York, NY',true,'$105k–125k','Design end-to-end product surfaces with a small, senior team. Portfolio matters more than years of experience.',array['Figma','Product Design'],'https://notion.so/careers',current_date + 45),
  ('Backend Engineer (New Grad)','Stripe','job','Bengaluru, India',false,'₹28–34 LPA','Build payment infrastructure used by millions of businesses. Strong fundamentals in distributed systems preferred.',array['Go','Postgres','APIs'],'https://stripe.com/jobs',current_date + 60),
  ('Landing Page Build (Next.js)','Indie Founder','freelance','Remote',true,'$1,200 fixed','One-week project: build a marketing site from a Figma file. A great first freelance gig for a student developer.',array['Next.js','Tailwind'],'https://example.com/gig',current_date + 12),
  ('Technical Content Writer','Supabase','freelance','Remote',true,'$250/article','Write hands-on tutorials about databases, auth, and edge functions for a developer audience.',array['Writing','Databases'],'https://supabase.com/careers',current_date + 25),
  ('HackMIT 2026','MIT','hackathon','Cambridge, MA',false,'$50k prize pool','36-hour hackathon with 1,200 students. Travel reimbursement available for accepted participants.',array['Hardware','AI','Web'],'https://hackmit.org',current_date + 40),
  ('Smart India Hackathon','Govt. of India','hackathon','Multiple cities',false,'₹1,00,000 top prize','National-level hackathon solving real problem statements submitted by ministries and industry partners.',array['Civic Tech','Open Innovation'],'https://sih.gov.in',current_date + 55)
) as seed
where not exists (select 1 from public.opportunities);
