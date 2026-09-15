-- Keep the production listings table aligned with Property 360 and Copilot.
alter table public.listings
  add column if not exists features jsonb,
  add column if not exists images jsonb,
  add column if not exists updated_at timestamptz not null default now();

notify pgrst, 'reload schema';
