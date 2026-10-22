-- Tenancy: organizations, memberships, profiles, helper funkcije za RLS.

create extension if not exists pgcrypto;

create type public.org_role as enum ('owner', 'member', 'collaborator');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  default_currency text not null default 'EUR' check (default_currency in ('EUR', 'RSD', 'USD')),
  locale text not null default 'sr' check (locale in ('sr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (user_id, organization_id)
);
create index memberships_org_idx on public.memberships (organization_id);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token uuid not null default gen_random_uuid(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

-- Helperi (security definer da RLS nad memberships ne pravi rekurziju).
create or replace function public.org_role(org uuid)
returns public.org_role
language sql stable security definer set search_path = public
as $$
  select role from public.memberships where organization_id = org and user_id = auth.uid()
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.memberships where organization_id = org and user_id = auth.uid())
$$;

create or replace function public.is_org_staff(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org and user_id = auth.uid() and role in ('owner', 'member')
  )
$$;

create or replace function public.is_org_owner(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org and user_id = auth.uid() and role = 'owner'
  )
$$;

create or replace function public.shares_org_with(other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.organization_id = a.organization_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- Profil se kreira automatski pri registraciji.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Onboarding: kreira organizaciju i owner membership u jednoj transakciji.
create or replace function public.create_organization(
  p_name text,
  p_currency text default 'EUR',
  p_locale text default 'sr'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  org uuid;
begin
  if auth.uid() is null then
    raise exception 'Niste prijavljeni' using errcode = '28000';
  end if;

  insert into public.organizations (name, default_currency, locale)
  values (p_name, p_currency, p_locale)
  returning id into org;

  insert into public.memberships (user_id, organization_id, role)
  values (auth.uid(), org, 'owner');

  perform public.seed_default_pipeline(org);
  return org;
end;
$$;
