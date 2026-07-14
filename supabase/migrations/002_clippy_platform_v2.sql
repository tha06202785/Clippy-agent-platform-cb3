-- ============================================================
-- Clippy Platform Migration v2
-- Run this in: Supabase Dashboard > SQL Editor
-- Project: mqydieqeybgxtjqogrwh
-- ============================================================

-- ============================================================
-- STEP 1: Add missing columns to `orgs` table
-- (Fixes: stripe_customer_id, stripe_subscription_id, plan_id)
-- ============================================================

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS plan_id text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS ai_replies_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_replies_limit integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS listings_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_limit integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS leads_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_limit integer DEFAULT 100;

-- Copy existing `plan` values to new `plan_id` column, then drop old column
UPDATE public.orgs SET plan_id = plan WHERE plan IS NOT NULL;
ALTER TABLE public.orgs DROP COLUMN IF EXISTS plan;

-- ============================================================
-- STEP 2: Create `org_members` table
-- (Fixes: user-org relationships, roles, joined dates)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by org_id
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);

-- ============================================================
-- STEP 3: Create `briefings` table
-- (Fixes: deal/listing briefing cards for Property Rooms)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage text DEFAULT 'qualification' CHECK (stage IN ('qualification','viewing','offer','negotiation','contract','settled','lost')),
  lead_name text,
  target_price numeric,
  status text DEFAULT 'active' CHECK (status IN ('active','paused','won','lost')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefings_org_id ON public.briefings(org_id);
CREATE INDEX IF NOT EXISTS idx_briefings_listing_id ON public.briefings(listing_id);
CREATE INDEX IF NOT EXISTS idx_briefings_status ON public.briefings(status);

-- ============================================================
-- STEP 4: Add RLS (Row Level Security) policies
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

-- org_members: users can see their own memberships
CREATE POLICY "Users can view own org memberships"
  ON public.org_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org owners/admins can manage memberships"
  ON public.org_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = org_members.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- briefings: org members can view/manage their org's briefings
CREATE POLICY "Org members can view briefings"
  ON public.briefings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = briefings.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert briefings"
  ON public.briefings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = briefings.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update briefings"
  ON public.briefings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = briefings.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners/admins can delete briefings"
  ON public.briefings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = briefings.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- STEP 5: Verify
-- ============================================================
DO $$
BEGIN
  -- Check orgs columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orgs' AND column_name='plan_id') THEN
    RAISE WARNING 'WARNING: plan_id column not found on orgs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orgs' AND column_name='stripe_customer_id') THEN
    RAISE WARNING 'WARNING: stripe_customer_id column not found on orgs';
  END IF;

  -- Check new tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='org_members') THEN
    RAISE WARNING 'WARNING: org_members table was not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='briefings') THEN
    RAISE WARNING 'WARNING: briefings table was not created';
  END IF;

  RAISE NOTICE 'Migration verification complete. Check for warnings above.';
END $$;
