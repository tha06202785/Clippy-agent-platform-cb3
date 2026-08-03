-- Remove redundant indexes reported by the Supabase performance advisor.
-- The retained indexes have identical btree definitions on org_id.
drop index if exists public.idx_leads_org_id;
drop index if exists public.idx_listings_org_id;
