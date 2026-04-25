-- Stripe Subscription Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- SUBSCRIPTION TABLES
-- ============================================

-- Subscriptions table - tracks Stripe subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- active, past_due, canceled, incomplete, incomplete_expired, unpaid, paused
    tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table - tracks feature usage per billing period
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric VARCHAR(50) NOT NULL, -- leads, ai_calls, emails_sent, storage_mb
    count INTEGER DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, metric, period_start)
);

-- Billing history table - tracks invoices and payments
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    amount INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- paid, open, void, uncollectible, draft
    description TEXT,
    invoice_pdf VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events log - for debugging and replay
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_user_metric_period ON usage_tracking(user_id, metric, period_start);
CREATE INDEX idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX idx_billing_history_stripe_invoice_id ON billing_history(stripe_invoice_id);
CREATE INDEX idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription data
CREATE POLICY "Users can only see own subscriptions" ON subscriptions
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Users can only see their own usage data
CREATE POLICY "Users can only see own usage" ON usage_tracking
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Users can only see their own billing history
CREATE POLICY "Users can only see own billing" ON billing_history
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Webhook events are service-only (no direct user access)
CREATE POLICY "No user access to webhooks" ON webhook_events
    FOR ALL
    USING (false);

-- ============================================
-- USAGE LIMITS VIEW
-- ============================================

CREATE VIEW subscription_limits AS
SELECT 
    'free' as tier,
    50 as leads_limit,
    100 as ai_calls_limit,
    500 as emails_limit,
    100 as storage_mb_limit,
    false as priority_support,
    false as custom_branding,
    false as api_access
UNION ALL
SELECT 
    'pro' as tier,
    500 as leads_limit,
    -1 as ai_calls_limit, -- unlimited
    5000 as emails_limit,
    1000 as storage_mb_limit,
    true as priority_support,
    true as custom_branding,
    true as api_access
UNION ALL
SELECT 
    'enterprise' as tier,
    -1 as leads_limit, -- unlimited
    -1 as ai_calls_limit, -- unlimited
    -1 as emails_limit, -- unlimited
    -1 as storage_mb_limit, -- unlimited
    true as priority_support,
    true as custom_branding,
    true as api_access;

-- Current usage view with limits
CREATE VIEW current_usage_with_limits AS
SELECT 
    u.id as user_id,
    COALESCE(s.tier, 'free') as current_tier,
    COALESCE(l.leads_limit, 50) as leads_limit,
    COALESCE(l.ai_calls_limit, 100) as ai_calls_limit,
    COALESCE(l.emails_limit, 500) as emails_limit,
    COALESCE(l.storage_mb_limit, 100) as storage_mb_limit,
    COALESCE(ut_leads.count, 0) as leads_used,
    COALESCE(ut_ai.count, 0) as ai_calls_used,
    COALESCE(ut_emails.count, 0) as emails_used,
    COALESCE(ut_storage.count, 0) as storage_used
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_limits l ON COALESCE(s.tier, 'free') = l.tier
LEFT JOIN usage_tracking ut_leads ON u.id = ut_leads.user_id 
    AND ut_leads.metric = 'leads' 
    AND ut_leads.period_start <= NOW() 
    AND ut_leads.period_end >= NOW()
LEFT JOIN usage_tracking ut_ai ON u.id = ut_ai.user_id 
    AND ut_ai.metric = 'ai_calls' 
    AND ut_ai.period_start <= NOW() 
    AND ut_ai.period_end >= NOW()
LEFT JOIN usage_tracking ut_emails ON u.id = ut_emails.user_id 
    AND ut_emails.metric = 'emails_sent' 
    AND ut_emails.period_start <= NOW() 
    AND ut_emails.period_end >= NOW()
LEFT JOIN usage_tracking ut_storage ON u.id = ut_storage.user_id 
    AND ut_storage.metric = 'storage_mb' 
    AND ut_storage.period_start <= NOW() 
    AND ut_storage.period_end >= NOW();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get or create usage record for current period
CREATE OR REPLACE FUNCTION get_current_usage_period(p_user_id UUID, p_metric VARCHAR)
RETURNS usage_tracking AS $$
DECLARE
    v_period_start TIMESTAMP WITH TIME ZONE;
    v_period_end TIMESTAMP WITH TIME ZONE;
    v_usage usage_tracking;
BEGIN
    -- Get the user's subscription period
    SELECT current_period_start, current_period_end 
    INTO v_period_start, v_period_end
    FROM subscriptions 
    WHERE user_id = p_user_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no active subscription, use calendar month
    IF v_period_start IS NULL THEN
        v_period_start := DATE_TRUNC('month', NOW());
        v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 second';
    END IF;
    
    -- Get or create usage record
    SELECT * INTO v_usage
    FROM usage_tracking
    WHERE user_id = p_user_id 
      AND metric = p_metric 
      AND period_start = v_period_start;
    
    IF v_usage.id IS NULL THEN
        INSERT INTO usage_tracking (user_id, metric, count, period_start, period_end)
        VALUES (p_user_id, p_metric, 0, v_period_start, v_period_end)
        RETURNING * INTO v_usage;
    END IF;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_metric VARCHAR, p_amount INTEGER DEFAULT 1)
RETURNS usage_tracking AS $$
DECLARE
    v_usage usage_tracking;
BEGIN
    v_usage := get_current_usage_period(p_user_id, p_metric);
    
    UPDATE usage_tracking 
    SET count = count + p_amount,
        updated_at = NOW()
    WHERE id = v_usage.id
    RETURNING * INTO v_usage;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has available quota
CREATE OR REPLACE FUNCTION check_quota(p_user_id UUID, p_metric VARCHAR, p_amount INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
    v_tier VARCHAR;
BEGIN
    SELECT current_tier, 
           CASE p_metric
               WHEN 'leads' THEN leads_limit
               WHEN 'ai_calls' THEN ai_calls_limit
               WHEN 'emails_sent' THEN emails_limit
               WHEN 'storage_mb' THEN storage_mb_limit
               ELSE 0
           END,
           CASE p_metric
               WHEN 'leads' THEN leads_used
               WHEN 'ai_calls' THEN ai_calls_used
               WHEN 'emails_sent' THEN emails_used
               WHEN 'storage_mb' THEN storage_used
               ELSE 0
           END
    INTO v_tier, v_limit, v_used
    FROM current_usage_with_limits
    WHERE user_id = p_user_id;
    
    -- -1 means unlimited
    IF v_limit = -1 THEN
        RETURN true;
    END IF;
    
    RETURN (v_used + p_amount) <= v_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Note: Create Stripe products and prices first, then update these values
-- Or use Stripe's CLI to create them: stripe products create --name="Free Plan"

-- Example: Insert webhook event for testing (uncomment if needed)
-- INSERT INTO webhook_events (stripe_event_id, event_type, payload, processed)
-- VALUES ('evt_test_123', 'checkout.session.completed', '{}', true);
