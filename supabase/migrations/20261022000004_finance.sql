-- Ponude, fakture (interne / predračuni), brojači dokumenata.

create type public.quote_status as enum ('draft', 'sent', 'opened', 'accepted', 'rejected');
create type public.quote_package as enum ('basic', 'standard', 'premium', 'custom');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue');

create table public.document_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('quote', 'invoice')),
  year integer not null,
  last_number integer not null default 0,
  primary key (organization_id, kind, year)
);

create or replace function public.next_document_number(org uuid, doc_kind text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  y integer := extract(year from now());
  n integer;
  prefix text := case doc_kind when 'quote' then 'P' else 'F' end;
begin
  if not public.is_org_staff(org) then
    raise exception 'Nemate pristup' using errcode = '42501';
  end if;
  insert into public.document_counters (organization_id, kind, year, last_number)
  values (org, doc_kind, y, 1)
  on conflict (organization_id, kind, year)
  do update set last_number = public.document_counters.last_number + 1
  returning last_number into n;
  return prefix || '-' || y || '-' || lpad(n::text, 4, '0');
end;
$$;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  client_id uuid not null,
  lead_id uuid,
  project_id uuid,
  status public.quote_status not null default 'draft',
  public_token uuid not null default gen_random_uuid(),
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  valid_until date,
  total numeric(12, 2) not null default 0,
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  unique (organization_id, number),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete restrict,
  foreign key (lead_id, organization_id) references public.leads (id, organization_id) on delete set null (lead_id),
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete set null (project_id)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  package public.quote_package not null default 'custom',
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id) on delete cascade
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  client_id uuid not null,
  project_id uuid,
  milestone_id uuid,
  quote_id uuid,
  status public.invoice_status not null default 'draft',
  document_label text not null default 'Interna faktura / predračun',
  issued_at date not null default current_date,
  due_date date,
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  total numeric(12, 2) not null default 0,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  unique (organization_id, number),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete restrict,
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete set null (project_id),
  foreign key (milestone_id, organization_id) references public.project_milestones (id, organization_id) on delete set null (milestone_id),
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id) on delete set null (quote_id)
);
create index invoices_due_idx on public.invoices (organization_id, due_date) where status in ('sent', 'overdue');

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (invoice_id, organization_id) references public.invoices (id, organization_id) on delete cascade
);
