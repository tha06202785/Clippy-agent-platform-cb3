-- QR Code / Short Links Table
-- For phone call lead capture

CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Short link details
    short_code VARCHAR(16) UNIQUE NOT NULL,
    full_url TEXT NOT NULL,
    
    -- QR code
    qr_code_image TEXT, -- base64 encoded
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Analytics
    scan_count INTEGER DEFAULT 0,
    last_scan_at TIMESTAMPTZ,
    conversion_count INTEGER DEFAULT 0, -- leads created from this link
    
    -- Metadata
    campaign_name TEXT,
    source TEXT DEFAULT 'qr_code', -- qr_code, sms, print, sign
    
    -- Active status
    is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(short_code);
CREATE INDEX IF NOT EXISTS idx_short_links_listing ON short_links(listing_id);
CREATE INDEX IF NOT EXISTS idx_short_links_org ON short_links(org_id);

-- RLS Policy
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY short_links_org ON short_links
    FOR ALL USING (org_id IN (SELECT get_user_org_ids()));

-- Function to generate unique short code
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS VARCHAR(16) AS $$
DECLARE
    code VARCHAR(16);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate random 8 character alphanumeric code
        code := encode(gen_random_bytes(4), 'hex');
        
        -- Check if exists
        SELECT EXISTS(SELECT 1 FROM short_links WHERE short_code = code)
        INTO exists_check;
        
        -- If not exists, return it
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate short code
CREATE OR REPLACE FUNCTION auto_generate_short_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.short_code IS NULL THEN
        NEW.short_code := generate_short_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_short_code
    BEFORE INSERT ON short_links
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_short_code();
