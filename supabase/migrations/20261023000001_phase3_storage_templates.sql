-- Faza 3: storage bucket + politike, podrazumevani šabloni projekata, last_update_at trigeri.

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

create or replace function public.safe_uuid(v text)
returns uuid
language plpgsql immutable
as $$
begin
  return v::uuid;
exception when others then
  return null;
end;
$$;

-- Putanja: <organization_id>/<project_id | client-files>/<uuid>-<ime>
create or replace function public.can_access_file_path(path text)
returns boolean
language sql stable security definer set search_path = public, storage
as $$
  select
    public.is_org_staff(public.safe_uuid((storage.foldername(path))[1]))
    or public.has_project_access(public.safe_uuid((storage.foldername(path))[2]))
$$;

create policy files_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'files' and public.can_access_file_path(name));
create policy files_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.can_access_file_path(name));
create policy files_bucket_update on storage.objects for update to authenticated
  using (bucket_id = 'files' and public.can_access_file_path(name))
  with check (bucket_id = 'files' and public.can_access_file_path(name));
create policy files_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.is_org_staff(public.safe_uuid((storage.foldername(name))[1])));

-- ---------- Šabloni projekata ----------
create or replace function public.seed_default_templates(org uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t uuid;
begin
  insert into public.project_templates (organization_id, name, description)
  values (org, 'Real estate sajt', 'Sajt/portal za agenciju za nekretnine') returning id into t;
  insert into public.project_template_tasks (organization_id, template_id, title, position, offset_days)
  select org, t, x.title, x.ord, x.off from (values
    ('Prikupiti zahteve i sadržaj', 1, 3), ('Dizajn početne stranice', 2, 10), ('Dizajn stranice oglasa', 3, 14),
    ('Odobrenje dizajna', 4, 17), ('Model podataka za oglase i pretraga', 5, 24), ('Frontend implementacija', 6, 35),
    ('Admin panel za oglase', 7, 42), ('SEO i performanse', 8, 46), ('Testiranje na staging-u', 9, 49), ('Puštanje u produkciju', 10, 52)
  ) as x(title, ord, off);

  insert into public.project_templates (organization_id, name, description)
  values (org, 'Mobilna aplikacija', 'Mobilna aplikacija (iOS/Android)') returning id into t;
  insert into public.project_template_tasks (organization_id, template_id, title, position, offset_days)
  select org, t, x.title, x.ord, x.off from (values
    ('Specifikacija i korisnički tokovi', 1, 5), ('UI dizajn ekrana', 2, 15), ('Odobrenje dizajna', 3, 18),
    ('Backend i autentifikacija', 4, 30), ('Implementacija ekrana', 5, 50), ('Interno testiranje', 6, 58),
    ('Beta testiranje (TestFlight / interni track)', 7, 65), ('Objava u prodavnicama', 8, 75)
  ) as x(title, ord, off);

  insert into public.project_templates (organization_id, name, description)
  values (org, 'Redizajn', 'Redizajn postojećeg sajta') returning id into t;
  insert into public.project_template_tasks (organization_id, template_id, title, position, offset_days)
  select org, t, x.title, x.ord, x.off from (values
    ('Audit postojećeg sajta', 1, 3), ('Novi dizajn', 2, 12), ('Odobrenje dizajna', 3, 15),
    ('Implementacija', 4, 28), ('Migracija sadržaja', 5, 33), ('Redirekcije i SEO provera', 6, 36), ('Puštanje u produkciju', 7, 38)
  ) as x(title, ord, off);
end;
$$;
revoke execute on function public.seed_default_templates(uuid) from public, anon, authenticated;

-- onboarding sada seed-uje i šablone
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
  perform public.seed_default_templates(org);
  return org;
end;
$$;

-- postojeće organizacije bez šablona
do $$
declare o record;
begin
  for o in select id from public.organizations where not exists (select 1 from public.project_templates where organization_id = organizations.id)
  loop
    perform public.seed_default_templates(o.id);
  end loop;
end $$;

-- ---------- last_update_at ----------
create or replace function public.touch_project()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare pid uuid;
begin
  pid := coalesce(new.project_id, null);
  if pid is not null then
    update public.projects set last_update_at = now() where id = pid;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['tasks', 'project_milestones', 'change_requests', 'files', 'activities']
  loop
    execute format('create trigger touch_project after insert or update on public.%I for each row execute function public.touch_project()', t);
  end loop;
end $$;
