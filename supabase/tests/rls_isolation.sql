-- RLS test izolacije između organizacija.
-- Pokretanje: nalepi ceo fajl u Supabase SQL editor (ili `psql -f`). Sve se vraća (rollback),
-- ništa ne ostaje u bazi. Svaka provera baca exception ako RLS ne radi; na kraju vidiš "RLS OK".
begin;

-- dva korisnika
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.local', '{}', now(), now());

-- A kreira org i klijenta
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

create temp table _t (k text primary key, v uuid);
grant all on _t to authenticated;

insert into _t select 'org_a', public.create_organization('Org A');
insert into public.clients (organization_id, name) select v, 'Klijent A' from _t where k = 'org_a';

-- B kreira svoju org
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
insert into _t select 'org_b', public.create_organization('Org B');

do $$
declare
  org_a uuid := (select v from _t where k = 'org_a');
  org_b uuid := (select v from _t where k = 'org_b');
  n int;
begin
  -- B ne vidi ništa iz org A
  select count(*) into n from public.clients where organization_id = org_a;
  if n <> 0 then raise exception 'FAIL: B vidi klijente org A'; end if;
  select count(*) into n from public.organizations where id = org_a;
  if n <> 0 then raise exception 'FAIL: B vidi org A'; end if;
  select count(*) into n from public.pipeline_stages where organization_id = org_a;
  if n <> 0 then raise exception 'FAIL: B vidi stage-ove org A'; end if;

  -- B ne može da upiše u org A
  begin
    insert into public.clients (organization_id, name) values (org_a, 'Upad');
    raise exception 'FAIL: B je upisao klijenta u org A';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- B ne može da napravi sebi membership u org A
  begin
    insert into public.memberships (user_id, organization_id, role)
    values ('00000000-0000-0000-0000-0000000000b1', org_a, 'owner');
    raise exception 'FAIL: B je postao član org A';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- B ne može da menja/briše tuđe redove (0 pogođenih)
  update public.clients set name = 'hak' where organization_id = org_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B je izmenio klijenta org A'; end if;
  delete from public.clients where organization_id = org_a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B je obrisao klijenta org A'; end if;
end $$;

-- A i dalje vidi svoje
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.clients;
  if n <> 1 then raise exception 'FAIL: A treba da vidi tačno 1 klijenta, vidi %', n; end if;
  select count(*) into n from public.pipeline_stages;
  if n <> 7 then raise exception 'FAIL: A treba da vidi 7 stage-ova, vidi %', n; end if;
end $$;

-- Cross-tenant FK: B pokušava da veže svoj lead za klijenta org A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
reset role;
create temp table _ids as
  select c.id as client_a, (select v from _t where k = 'org_b') as org_b,
         (select id from public.pipeline_stages where organization_id = (select v from _t where k = 'org_b') limit 1) as stage_b
  from public.clients c limit 1;
grant all on _ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$
declare r record;
begin
  select * into r from _ids;
  begin
    insert into public.leads (organization_id, title, client_id, stage_id)
    values (r.org_b, 'Cross', r.client_a, r.stage_b);
    raise exception 'FAIL: lead org B referencira klijenta org A';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Collaborator (C) vidi samo dodeljene projekte
reset role;
do $$
declare
  org_a uuid := (select v from _t where k = 'org_a');
  cl uuid := (select id from public.clients where organization_id = (select v from _t where k = 'org_a'));
  p1 uuid; p2 uuid;
begin
  insert into public.projects (organization_id, client_id, name) values (org_a, cl, 'Dodeljen') returning id into p1;
  insert into public.projects (organization_id, client_id, name) values (org_a, cl, 'Nedodeljen') returning id into p2;
  insert into public.memberships (user_id, organization_id, role)
  values ('00000000-0000-0000-0000-0000000000c1', org_a, 'collaborator');
  insert into public.project_members (organization_id, project_id, user_id)
  values (org_a, p1, '00000000-0000-0000-0000-0000000000c1');
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from public.projects;
  if n <> 1 then raise exception 'FAIL: collaborator treba da vidi 1 projekat, vidi %', n; end if;
  select count(*) into n from public.clients;
  if n <> 0 then raise exception 'FAIL: collaborator ne sme da vidi klijente, vidi %', n; end if;
end $$;

select 'RLS OK' as result;
rollback;
