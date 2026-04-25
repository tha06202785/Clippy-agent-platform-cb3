-- Google Calendar Integration Schema
-- Run this in your Supabase SQL Editor

-- Extension already enabled in auth schema
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GOOGLE CONNECTIONS TABLE
-- Stores OAuth tokens for Google Calendar API
-- ============================================
CREATE TABLE google_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    google_email VARCHAR(255),
    refresh_token TEXT NOT NULL,  -- Encrypted refresh token
    access_token TEXT,            -- Encrypted access token (optional, can be derived)
    token_expires_at TIMESTAMP,   -- When access token expires
    calendar_sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX idx_google_connections_user_id ON google_connections(user_id);

-- ============================================
-- CALENDAR EVENTS TABLE
-- Mirrors events from Google Calendar
-- ============================================
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255),           -- Google Calendar event ID
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Optional: link to a lead
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(255),
    event_type VARCHAR(50),                 -- appointment, follow_up, showing, etc.
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
    google_calendar_id VARCHAR(255) DEFAULT 'primary', -- Which calendar
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for calendar events
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_google_event_id ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_events_lead_id ON calendar_events(lead_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time, end_time);

-- ============================================
-- AVAILABILITY SLOTS TABLE
-- User-defined availability for booking
-- ============================================
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER,        -- 0-6 (Sunday-Saturday), NULL for specific dates
    specific_date DATE,           -- Optional: for one-off availability
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_available BOOLEAN DEFAULT true,
    buffer_minutes INTEGER DEFAULT 0,  -- Buffer time between appointments
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for availability
CREATE INDEX idx_availability_slots_user_id ON availability_slots(user_id);
CREATE INDEX idx_availability_slots_day ON availability_slots(user_id, day_of_week);

-- ============================================
-- BOOKING REQUESTS TABLE
-- Track appointment booking requests
-- ============================================
CREATE TABLE booking_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    requested_start TIMESTAMP NOT NULL,
    requested_end TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, declined, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_requests_user_id ON booking_requests(user_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);

-- ============================================
-- SYNC LOG TABLE
-- Track calendar sync operations
-- ============================================
CREATE TABLE calendar_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sync_type VARCHAR(50),      -- full, incremental, webhook
    status VARCHAR(50),         -- success, error, partial
    events_synced INTEGER DEFAULT 0,
    error_message TEXT,
    sync_started_at TIMESTAMP DEFAULT NOW(),
    sync_completed_at TIMESTAMP
);

CREATE INDEX idx_calendar_sync_log_user_id ON calendar_sync_log(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own calendar data
CREATE POLICY "Users can only read own google connections" ON google_connections
    FOR SELECT USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only modify own google connections" ON google_connections
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only read own calendar events" ON calendar_events
    FOR SELECT USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only modify own calendar events" ON calendar_events
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only read own availability" ON availability_slots
    FOR SELECT USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only modify own availability" ON availability_slots
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only read own bookings" ON booking_requests
    FOR SELECT USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY "Users can only modify own bookings" ON booking_requests
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- ============================================
-- AUTO-UPDATE TRIGGER
-- ============================================
CREATE TRIGGER update_google_connections_updated_at
    BEFORE UPDATE ON google_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at
    BEFORE UPDATE ON booking_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
