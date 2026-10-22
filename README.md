# devbyvojin CRM

## Podešavanje
1. `cp .env.example .env` i upiši `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` (publishable key) iz Supabase → Project Settings → API.
2. Migracije: Supabase dashboard → SQL Editor → pokreni fajlove iz `supabase/migrations` redom (ili `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`).
3. Auth → URL Configuration: dodaj `http://localhost:1420` u Redirect URLs (za magic link). Za brži razvoj možeš isključiti "Confirm email" u Auth → Providers → Email.
4. `npm install && npm run dev` (web) ili `npm run tauri dev` (desktop, traži Rust).
5. RLS test: nalepi `supabase/tests/rls_isolation.sql` u SQL Editor — treba da vrati `RLS OK`.
6. .dmg: `npm run tauri build` → `src-tauri/target/release/bundle/dmg`.
