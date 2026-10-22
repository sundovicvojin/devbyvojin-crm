-- Projekti, milestone-ovi, zadaci, change requests, šabloni, fajlovi.

create type public.project_status as enum ('preparation', 'in_progress', 'waiting_client', 'review', 'completed', 'maintenance');
create type public.milestone_status as enum ('planned', 'due', 'invoiced', 'paid');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.change_request_status as enum ('proposed', 'approved', 'rejected');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null,
  name text not null,
  status public.project_status not null default 'preparation',
  deadline date,
  value numeric(12, 2) not null default 0,
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  repo_url text,
  figma_url text,
  staging_url text,
  production_url text,
  last_update_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete restrict
);
create index projects_org_status_idx on public.projects (organization_id, status);

alter table public.activities
  add foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade;

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (project_id, user_id),
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade
);

create or replace function public.has_project_access(pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid
      and (
        public.is_org_staff(p.organization_id)
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = auth.uid()
        )
      )
  )
$$;

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  name text not null,
  due_date date,
  amount numeric(12, 2),
  percent numeric(5, 2) check (percent between 0 and 100),
  status public.milestone_status not null default 'planned',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid,
  parent_id uuid,
  title text not null,
  due_date date,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  waiting_on_client boolean not null default false,
  assignee_id uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade,
  foreign key (parent_id, organization_id) references public.tasks (id, organization_id) on delete cascade
);
create index tasks_org_due_idx on public.tasks (organization_id, due_date) where status <> 'done';
create index tasks_project_idx on public.tasks (project_id);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  description text not null,
  price numeric(12, 2) not null default 0,
  currency text not null default 'EUR' check (currency in ('EUR', 'RSD', 'USD')),
  status public.change_request_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade
);

create table public.project_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id)
);

create table public.project_template_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null,
  title text not null,
  position integer not null default 0,
  offset_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  foreign key (template_id, organization_id) references public.project_templates (id, organization_id) on delete cascade
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid,
  client_id uuid,
  storage_path text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  unique (id, organization_id),
  check (project_id is not null or client_id is not null),
  foreign key (project_id, organization_id) references public.projects (id, organization_id) on delete cascade,
  foreign key (client_id, organization_id) references public.clients (id, organization_id) on delete cascade
);
