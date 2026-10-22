# devbyvojin CRM

Desktop CRM (macOS, Tauri 2) i alat za vođenje freelance firme. Isti kod radi i kao web. Multi-tenant od prvog dana. UI je na srpskom (latinica).

## Stack
Tauri 2 · React 19 · TypeScript (strict, bez `any`) · Vite · Tailwind 4 · TanStack Query · React Router 7 · React Hook Form + Zod · Supabase (Postgres, Auth, Storage, RLS) · i18next.
Planirano: shadcn/ui komponente (pišu se ručno u `src/components/ui`), dnd-kit (Faza 2).

## Komande
- `npm run dev` — web na http://localhost:1420
- `npm run tauri dev` — desktop (traži Rust: https://rustup.rs)
- `npm run tauri build` — .dmg
- `npm run typecheck` / `npm run lint`
- `npm run gen:types` — Supabase tipovi u `src/types/database.ts` (traži `npx supabase login`)

## Struktura
- `src/app` router, layout; `src/features/<ime>` (api.ts, *-page.tsx, komponente); `src/components/ui` osnovne komponente; `src/lib` supabase klijent, util; `src/i18n` prevodi; `src/types/database.ts` tipovi baze.
- `supabase/migrations` SQL migracije (jedini izvor istine za šemu); `supabase/tests` SQL testovi.
- `src-tauri` Rust shell.

## Konvencije
- Tajne nikad u kodu. `.env` je u gitignore, klijent koristi samo publishable/anon ključ.
- Svaka poslovna tabela ima `organization_id`, RLS preko `is_org_staff()` / `has_project_access()`, i kompozitni FK `(id, organization_id)` protiv cross-tenant referenci.
- Nove tabele: dodaj u listu u RLS migraciji ili napiši nove politike; testiraj u `supabase/tests/rls_isolation.sql`.
- Novac `numeric(12,2)` + valuta po redu. Statusi su Postgres enumi (osim pipeline faza koje su tabela).
- Svi tekstovi kroz i18n (`src/i18n/sr.json`), ne hardkodovati stringove u komponentama.
- Podaci kroz TanStack Query hookove u `features/*/api.ts`.
- Faze rada: 1 temelj ✅ · 2 klijenti/leadovi/Danas · 3 projekti · 4 komunikacija · 5 ponude/fakture · 6 održavanje/outreach · 7 multi-user priprema.
