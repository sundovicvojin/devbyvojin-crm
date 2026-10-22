-- Demo podaci (izmišljeni). Nalepi u SQL Editor, promeni email na svoj i pokreni.
-- Dodaje podatke u prvu organizaciju tog korisnika. Bezbedno za ponovno pokretanje samo na praznoj organizaciji.
do $$
declare
  v_email text := 'vojinsundovic@gmail.com';
  v_user uuid;
  v_org uuid;
  c1 uuid; c2 uuid; c3 uuid; p1 uuid;
  s_new uuid; s_contacted uuid; s_talk uuid; s_quote uuid; s_nego uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then raise exception 'Korisnik % ne postoji', v_email; end if;
  select organization_id into v_org from public.memberships where user_id = v_user order by created_at limit 1;
  if v_org is null then raise exception 'Korisnik nema organizaciju (prvo prođi onboarding)'; end if;

  select id into s_new from public.pipeline_stages where organization_id = v_org and name = 'Novi lead';
  select id into s_contacted from public.pipeline_stages where organization_id = v_org and name = 'Kontaktiran';
  select id into s_talk from public.pipeline_stages where organization_id = v_org and name = 'Razgovor';
  select id into s_quote from public.pipeline_stages where organization_id = v_org and name = 'Ponuda poslata';
  select id into s_nego from public.pipeline_stages where organization_id = v_org and name = 'Pregovori';

  insert into public.clients (organization_id, name, country, language, currency, tags, source, notes, created_by)
  values (v_org, 'Nekretnine Panorama d.o.o.', 'Srbija', 'sr', 'EUR', '{real-estate,sajt}', 'Preporuka', 'Agencija sa 12 agenata, žele portal za oglase.', v_user) returning id into c1;
  insert into public.clients (organization_id, name, country, language, currency, tags, source, created_by)
  values (v_org, 'Alpenhaus Immobilien GmbH', 'Austrija', 'de', 'EUR', '{real-estate,mobilna}', 'LinkedIn', v_user) returning id into c2;
  insert into public.clients (organization_id, name, country, language, currency, tags, source, created_by)
  values (v_org, 'Studio Lumen', 'Srbija', 'sr', 'RSD', '{redizajn}', 'Instagram', v_user) returning id into c3;

  insert into public.contacts (organization_id, client_id, full_name, email, phone, role_title, created_by) values
    (v_org, c1, 'Marko Petrović', 'marko@panorama.example', '+381 60 000 0001', 'Direktor', v_user),
    (v_org, c2, 'Anna Gruber', 'anna@alpenhaus.example', '+43 660 000000', 'Marketing', v_user),
    (v_org, c3, 'Jelena Ilić', 'jelena@lumen.example', null, 'Vlasnica', v_user);

  insert into public.leads (organization_id, title, client_id, stage_id, source, estimated_value, currency, position, next_step_at, next_step_note, created_by) values
    (v_org, 'Portal za oglase nekretnina', c1, s_nego, 'Preporuka', 4800, 'EUR', 0, now() - interval '1 day', 'Poslati korigovanu ponudu', v_user),
    (v_org, 'Mobilna aplikacija za agente', c2, s_quote, 'LinkedIn', 9500, 'EUR', 0, now() + interval '3 days', 'Follow-up posle ponude', v_user),
    (v_org, 'Redizajn sajta', c3, s_talk, 'Instagram', 150000, 'RSD', 0, now(), 'Zakazati poziv', v_user),
    (v_org, 'Landing za novi projekat', null, s_new, 'Web forma', 900, 'EUR', 0, null, null, v_user),
    (v_org, 'Sajt za građevinsku firmu', null, s_contacted, 'Hladni mejl', 2200, 'EUR', 0, now() + interval '7 days', 'Čekam odgovor', v_user);

  insert into public.activities (organization_id, type, content, occurred_at, client_id, created_by) values
    (v_org, 'meeting', 'Prvi sastanak, prošli smo kroz zahteve za portal.', now() - interval '6 days', c1, v_user),
    (v_org, 'email', 'Poslata ponuda za mobilnu aplikaciju.', now() - interval '2 days', c2, v_user),
    (v_org, 'call', 'Kratak poziv, žele da vide primere.', now() - interval '1 day', c3, v_user);

  insert into public.projects (organization_id, client_id, name, status, value, currency, created_by)
  values (v_org, c1, 'Panorama — stari sajt, održavanje', 'maintenance', 600, 'EUR', v_user) returning id into p1;

  insert into public.tasks (organization_id, project_id, title, due_date, priority, waiting_on_client, created_by) values
    (v_org, p1, 'Poslati izveštaj o performansama', current_date, 'medium', false, v_user),
    (v_org, p1, 'Dobiti pristupe za hosting', current_date - 2, 'high', true, v_user);

  insert into public.invoices (organization_id, number, client_id, status, due_date, currency, total, created_by)
  values (v_org, 'F-DEMO-0001', c1, 'sent', current_date - 5, 'EUR', 600, v_user);

  insert into public.reminders (organization_id, title, remind_at, created_by)
  values (v_org, 'Javiti se Anni oko ponude', now() - interval '1 hour', v_user);

  insert into public.maintenance_items (organization_id, client_id, name, domain, domain_expires_at, ssl_expires_at, created_by)
  values (v_org, c1, 'panorama.example', 'panorama.example', current_date + 12, current_date + 200, v_user);
end $$;
