-- updated_at triggeri i RLS politike za sve tabele.

-- updated_at trigger na svim tabelama koje imaju tu kolonu
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'updated_at'
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- created_by i organization_id se ne smeju menjati nakon kreiranja
create or replace function public.protect_immutable_columns()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id se ne može menjati';
  end if;
  return new;
end;
$$;

-- Standardne politike: samo owner/member (staff) organizacije.
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'contacts', 'pipeline_stages', 'leads', 'activities',
    'quotes', 'quote_items', 'invoices', 'invoice_items', 'document_counters',
    'message_templates', 'reminders', 'maintenance_items', 'prospects',
    'outreach_campaigns', 'outreach_messages',
    'project_templates', 'project_template_tasks'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy staff_select on public.%I for select to authenticated using (public.is_org_staff(organization_id))', t);
    execute format('create policy staff_insert on public.%I for insert to authenticated with check (public.is_org_staff(organization_id))', t);
    execute format('create policy staff_update on public.%I for update to authenticated using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id))', t);
    execute format('create policy staff_delete on public.%I for delete to authenticated using (public.is_org_staff(organization_id))', t);
  end loop;
end $$;

-- organization_id guard na svim tabelama osim organizations/memberships koje imaju drugačija pravila
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'contacts', 'pipeline_stages', 'leads', 'activities',
    'quotes', 'quote_items', 'invoices', 'invoice_items',
    'message_templates', 'reminders', 'maintenance_items', 'prospects',
    'outreach_campaigns', 'outreach_messages', 'project_templates', 'project_template_tasks',
    'projects', 'project_members', 'project_milestones', 'tasks', 'change_requests', 'files'
  ]
  loop
    execute format('create trigger protect_org before update on public.%I for each row execute function public.protect_immutable_columns()', t);
  end loop;
end $$;

-- Projektne tabele: staff vidi sve, collaborator samo dodeljene projekte.
alter table public.projects enable row level security;
create policy projects_select on public.projects for select to authenticated using (public.has_project_access(id));
create policy projects_insert on public.projects for insert to authenticated with check (public.is_org_staff(organization_id));
create policy projects_update on public.projects for update to authenticated using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy projects_delete on public.projects for delete to authenticated using (public.is_org_staff(organization_id));

alter table public.project_members enable row level security;
create policy pm_select on public.project_members for select to authenticated using (public.is_org_staff(organization_id) or user_id = auth.uid());
create policy pm_insert on public.project_members for insert to authenticated with check (public.is_org_staff(organization_id));
create policy pm_update on public.project_members for update to authenticated using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy pm_delete on public.project_members for delete to authenticated using (public.is_org_staff(organization_id));

-- milestone-ovi i change requests: collaborator čita, staff piše
do $$
declare t text;
begin
  foreach t in array array['project_milestones', 'change_requests']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy proj_select on public.%I for select to authenticated using (public.has_project_access(project_id))', t);
    execute format('create policy staff_insert on public.%I for insert to authenticated with check (public.is_org_staff(organization_id))', t);
    execute format('create policy staff_update on public.%I for update to authenticated using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id))', t);
    execute format('create policy staff_delete on public.%I for delete to authenticated using (public.is_org_staff(organization_id))', t);
  end loop;
end $$;

-- zadaci: collaborator radi nad zadacima dodeljenih projekata
alter table public.tasks enable row level security;
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_org_staff(organization_id) or (project_id is not null and public.has_project_access(project_id)));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_org_staff(organization_id) or (project_id is not null and public.has_project_access(project_id)));
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_org_staff(organization_id) or (project_id is not null and public.has_project_access(project_id)))
  with check (public.is_org_staff(organization_id) or (project_id is not null and public.has_project_access(project_id)));
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_org_staff(organization_id));

-- fajlovi: isto kao zadaci; fajlovi vezani samo za klijenta su staff-only
alter table public.files enable row level security;
create policy files_select on public.files for select to authenticated
  using (public.is_org_staff(organization_id) or (project_id is not null and public.has_project_access(project_id)));
create policy files_insert on public.files for insert to authenticated
  with check (public.is_org_staff(organization_id) or (project_id is not null and public.has_project_access(project_id)));
create policy files_update on public.files for update to authenticated
  using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy files_delete on public.files for delete to authenticated using (public.is_org_staff(organization_id));

-- Tenancy tabele
alter table public.organizations enable row level security;
create policy org_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy org_update on public.organizations for update to authenticated using (public.is_org_owner(id)) with check (public.is_org_owner(id));
create policy org_delete on public.organizations for delete to authenticated using (public.is_org_owner(id));
-- insert namerno nema politiku: organizacija se kreira preko create_organization()

alter table public.memberships enable row level security;
create policy mem_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_org_staff(organization_id));
create policy mem_insert on public.memberships for insert to authenticated with check (public.is_org_owner(organization_id));
create policy mem_update on public.memberships for update to authenticated using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));
create policy mem_delete on public.memberships for delete to authenticated using (public.is_org_owner(organization_id) or user_id = auth.uid());

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid() or public.shares_org_with(user_id));
create policy profiles_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.invitations enable row level security;
create policy inv_all on public.invitations for all to authenticated
  using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

-- Privilegije: anon ništa; authenticated samo kroz RLS
revoke all on all tables in schema public from anon;
revoke execute on function public.create_organization(text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;
revoke execute on function public.next_document_number(uuid, text) from public, anon;
grant execute on function public.next_document_number(uuid, text) to authenticated;
