-- Šabloni poruka, podsetnici, održavanje, outreach.

create type public.reminder_source as enum ('manual', 'rule');
create type public.prospect_status as enum ('new', 'contacted', 'replied', 'converted', 'not_interested');
create type public.outreach_channel as enum ('email', 'linkedin', 'instagram', 'phone', 'other');
create type public.outreach_outcome as enum ('interested', 'not_interested', 'no_reply');

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  type text not null default 'other',
  language text not null default 'sr' check (language in ('sr', 'en', 'de')),
  subject text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  done_at timestamptz,
  source public.reminder_source not null default 'manual',
  lead_id uuid,
  project_id uuid,
  client_id uuid,
  invoice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (lead_id, organization_id) references public.leads (id, organization_id) on delete cascade,
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade,
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete cascade,
  foreign key (invoice_id, organization_id) references public.invoices (id, organization_id) on delete cascade
);
create index reminders_due_idx on public.reminders (organization_id, remind_at) where done_at is null;

create table public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null,
  project_id uuid,
  name text not null,
  domain text,
  hosting text,
  domain_expires_at date,
  ssl_expires_at date,
  hosting_expires_at date,
  monthly_price numeric(12, 2) not null default 0,
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete cascade,
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete set null (project_id)
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company text not null,
  website text,
  email text,
  city text,
  country text,
  observation text,
  status public.prospect_status not null default 'new',
  converted_lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (converted_lead_id, organization_id) references public.leads (id, organization_id) on delete set null (converted_lead_id)
);

create table public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  channel public.outreach_channel not null default 'email',
  message_template_id uuid,
  started_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (message_template_id, organization_id) references public.message_templates (id, organization_id) on delete set null (message_template_id)
);

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null,
  prospect_id uuid not null,
  sent_at timestamptz,
  replied_at timestamptz,
  follow_up_at date,
  outcome public.outreach_outcome,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (campaign_id, organization_id) references public.outreach_campaigns (id, organization_id) on delete cascade,
  foreign key (prospect_id, organization_id) references public.prospects (id, organization_id) on delete cascade
);
