-- Clippy Staging QA Test Data
-- Safe to run on staging - NO production data

-- Create Organisation A (Test Agency Alpha)
INSERT INTO orgs (id, name, slug, plan, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Agency Alpha', 'agency-alpha', 'professional', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Organisation B (Test Agency Beta)
INSERT INTO orgs (id, name, slug, plan, created_at) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Test Agency Beta', 'agency-beta', 'solo', NOW())
ON CONFLICT (id) DO NOTHING;

-- QA Users (You'll need to get actual user IDs from Clerk after creating accounts)
-- These are placeholders - update user_id values after creating Clerk test users

-- Organisation A - Owner
-- INSERT INTO org_members (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000001', 'REPLACE_WITH_CLERK_USER_ID', 'owner');

-- Organisation A - Agent
-- INSERT INTO org_members (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000001', 'REPLACE_WITH_CLERK_USER_ID', 'agent');

-- Organisation B - Owner
-- INSERT INTO org_members (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000002', 'REPLACE_WITH_CLERK_USER_ID', 'owner');

-- Organisation B - Agent
-- INSERT INTO org_members (org_id, user_id, role) VALUES ('00000000-0000-0000-0000-000000000002', 'REPLACE_WITH_CLERK_USER_ID', 'agent');

-- Sample Leads for Organisation A
INSERT INTO leads (org_id, full_name, email, phone, source, status, stage) VALUES
  ('00000000-0000-0000-0000-000000000001', 'John Test Buyer', 'john.test@example.com', '+61400000001', 'website', 'new', 'inquiry'),
  ('00000000-0000-0000-0000-000000000001', 'Sarah Test Seller', 'sarah.test@example.com', '+61400000002', 'facebook', 'contacted', 'warm')
ON CONFLICT DO NOTHING;

-- Sample Leads for Organisation B
INSERT INTO leads (org_id, full_name, email, phone, source, status, stage) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Mike Test Tenant', 'mike.test@example.com', '+61400000003', 'manual', 'new', 'inquiry'),
  ('00000000-0000-0000-0000-000000000002', 'Emma Test Landlord', 'emma.test@example.com', '+61400000004', 'referral', 'qualified', 'hot')
ON CONFLICT DO NOTHING;

-- Sample Listings for Organisation A
INSERT INTO listings (org_id, address, price, bedrooms, bathrooms, property_type, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '123 Test Street, Melbourne VIC 3000', '50,000', 3, 2, 'house', 'active'),
  ('00000000-0000-0000-0000-000000000001', '456 Example Avenue, Sydney NSW 2000', ',200,000', 4, 2, 'house', 'active')
ON CONFLICT DO NOTHING;

-- Sample Listings for Organisation B
INSERT INTO listings (org_id, address, price, bedrooms, bathrooms, property_type, status) VALUES
  ('00000000-0000-0000-0000-000000000002', '789 Demo Lane, Brisbane QLD 4000', '50,000', 2, 1, 'apartment', 'active')
ON CONFLICT DO NOTHING;

-- Sample Inspection Slots for Organisation A
INSERT INTO inspection_time_slots (org_id, listing_id, starts_at, ends_at, timezone, capacity, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 
   (SELECT id FROM listings WHERE org_id = '00000000-0000-0000-0000-000000000001' LIMIT 1),
   NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 30 minutes',
   'Australia/Melbourne', 10, 'published')
ON CONFLICT DO NOTHING;

-- Verification Query
SELECT 
  'QA Data Loaded' as status,
  (SELECT COUNT(*) FROM orgs WHERE slug LIKE 'agency-%') as test_orgs,
  (SELECT COUNT(*) FROM leads WHERE org_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')) as test_leads,
  (SELECT COUNT(*) FROM listings WHERE org_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')) as test_listings;
