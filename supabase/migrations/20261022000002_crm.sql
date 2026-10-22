-- CRM: klijenti, kontakti, pipeline, leadovi, aktivnosti.
-- Svaka tabela ima unique (id, organization_id) da bi kompozitni FK sprečili
-- referenciranje redova iz tuđe organizacije.

create type public.stage_kind as enum ('open', 'won', 'lost');
create type public.activity_type as enum ('note', 'call', 'email', 'meeting', 'message');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  country text,
  language text not null default 'sr' check (language in ('sr', 'en', 'de')),
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  tags text[] not null default '{}',
  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid,
  full_name text not null,
  email text,
  phone text,
  role_title text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete cascade
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  kind public.stage_kind not null default 'open',
  probability integer not null default 0 check (probability between 0 and 100),
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  client_id uuid,
  contact_id uuid,
  stage_id uuid not null,
  source text,
  estimated_value numeric(12, 2) not null default 0,
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  position double precision not null default 0,
  lost_reason text,
  next_step_at timestamptz,
  next_step_note text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete set null (client_id),
  foreign key (contact_id, organization_id) references public.contacts (id, organization_id) on delete set null (contact_id),
  foreign key (stage_id, organization_id) references public.pipeline_stages (id, organization_id) on delete restrict
);
create index leads_org_stage_idx on public.leads (organization_id, stage_id);
create index leads_next_step_idx on public.leads (organization_id, next_step_at);

-- activities.project_id FK se dodaje u migraciji projekata.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.activity_type not null default 'note',
  content text not null,
  occurred_at timestamptz not null default now(),
  client_id uuid,
  lead_id uuid,
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  check (client_id is not null or lead_id is not null or project_id is not null),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete cascade,
  foreign key (lead_id, organization_id) references public.leads (id, organization_id) on delete cascade
);
create index activities_client_idx on public.activities (client_id, occurred_at desc);
create index activities_lead_idx on public.activities (lead_id, occurred_at desc);

create or replace function public.seed_default_pipeline(org uuid)
returns void
language sql security definer set search_path = public
as $$
  insert into public.pipeline_stages (organization_id, name, position, kind, probability, color) values
    (org, 'Novi lead',      0, 'open',  10,  '#64748b'),
    (org, 'Kontaktiran',    1, 'open',  20,  '#0ea5e9'),
    (org, 'Razgovor',       2, 'open',  35,  '#6366f1'),
    (org, 'Ponuda poslata', 3, 'open',  50,  '#f59e0b'),
    (org, 'Pregovori',      4, 'open',  70,  '#f97316'),
    (org, 'Dobijen',        5, 'won',  100,  '#22c55e'),
    (org, 'Izgubljen',      6, 'lost',   0,  '#ef4444');
$$;

-- Ne sme se zvati direktno sa klijenta.
revoke execute on function public.seed_default_pipeline(uuid) from public, anon, authenticated;
