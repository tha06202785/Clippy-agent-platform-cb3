# Google Calendar Integration

Production-ready Google Calendar sync for appointment booking.

## Features

- **OAuth 2.0 Integration**: Secure connection to Google Calendar
- **Token Encryption**: All tokens encrypted at rest with AES-256-GCM
- **Auto-refresh**: Access tokens automatically refreshed before expiry
- **Calendar Operations**: List, create, update, delete events
- **Availability Management**: Define availability slots and calculate open times
- **Booking System**: Book appointments with conflict detection
- **Two-way Sync**: Sync events between Google Calendar and local database

## Setup

### 1. Google Cloud Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services** → **Library**
   - Search "Google Calendar API"
   - Click **Enable**

4. Configure OAuth consent screen:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** (or **Internal** if G Suite)
   - Fill in app name, user support email, developer contact
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Add test users if in testing mode
   - Publish app when ready

5. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Select **Web application**
   - Add authorized redirect URI:
     ```
     https://api.useclippy.com/auth/google/callback
     ```
   - Copy **Client ID** and **Client Secret**

### 2. Database Setup

Run the schema in Supabase SQL Editor:

```bash
# From project root
psql $SUPABASE_URL -f server/calendar/database.sql
```

Or copy contents of `database.sql` into Supabase SQL Editor.

### 3. Environment Variables

Add to your `.env` file:

```env
# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://api.useclippy.com/auth/google/callback

# Token Encryption (uses JWT_SECRET as fallback)
TOKEN_ENCRYPTION_KEY=your-32-char-secret-key-min
```

### 4. Install Dependencies

```bash
cd server
npm install googleapis
```

### 5. Register Routes

Add to `server.js`:

```javascript
const calendarRoutes = require('./calendar/routes');

// ... other routes ...
app.use('/api/calendar', calendarRoutes);
```

## API Endpoints

### OAuth Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/calendar/google/auth` | Start OAuth flow | Yes |
| GET | `/api/calendar/google/callback` | OAuth callback (from Google) | No |
| POST | `/api/calendar/google/disconnect` | Disconnect account | Yes |
| GET | `/api/calendar/google/status` | Check connection status | Yes |
| PUT | `/api/calendar/google/sync` | Toggle sync on/off | Yes |
| POST | `/api/calendar/google/refresh` | Manually refresh token | Yes |

### Calendar Events

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/calendar/events` | List events | Yes |
| POST | `/api/calendar/events` | Create event | Yes |
| PUT | `/api/calendar/events/:id` | Update event | Yes |
| DELETE | `/api/calendar/events/:id` | Delete event | Yes |
| GET | `/api/calendar/calendars` | List calendars | Yes |
| POST | `/api/calendar/sync` | Sync with Google | Yes |

### Availability

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/calendar/availability/slots` | Get availability config | Yes |
| PUT | `/api/calendar/availability/slots` | Set availability | Yes |
| GET | `/api/calendar/availability` | Calculate open slots | Yes |

### Booking

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/calendar/bookings` | Create booking | Yes |

## Usage Examples

### Connect Google Account

```javascript
// Frontend: Initiate OAuth
const response = await fetch('/api/calendar/google/auth', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { authUrl } = await response.json();
window.location.href = authUrl;

// User will be redirected back with ?connected=true or ?error=...
```

### Create Event

```javascript
const response = await fetch('/api/calendar/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Client Meeting',
    description: 'Discuss project requirements',
    startTime: '2026-04-25T14:00:00',
    endTime: '2026-04-25T15:00:00',
    location: '123 Main St',
    attendees: ['client@example.com'],
    conference: true  // Add Google Meet
  })
});
```

### Get Available Slots

```javascript
const response = await fetch('/api/calendar/availability?durationMinutes=60');
const { slots } = await response.json();
// slots = [{ start: '2026-04-25T09:00:00', end: '2026-04-25T10:00:00', duration: 60 }, ...]
```

### Set Availability

```javascript
await fetch('/api/calendar/availability/slots', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    slots: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Friday
    ]
  })
});
```

### Book Appointment

```javascript
const response = await fetch('/api/calendar/bookings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leadId: 'uuid-of-lead',
    title: 'Discovery Call with John',
    description: 'Initial consultation',
    startTime: '2026-04-25T14:00:00',
    endTime: '2026-04-25T14:30:00',
    location: 'Zoom',
    notes: 'Prepare demo'
  })
});
```

## Security

### Token Encryption

All tokens are encrypted using AES-256-GCM:
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: SHA-256 of `TOKEN_ENCRYPTION_KEY` or `JWT_SECRET`
- **IV**: Random 16 bytes per encryption
- **Auth Tag**: 16 bytes for integrity verification

### Token Storage

- `refresh_token`: Encrypted, lasts indefinitely
- `access_token`: Encrypted, expires after 1 hour
- Tokens never exposed to frontend

### Auto-refresh

Access tokens automatically refresh when:
- Token is expired or about to expire (5 min buffer)
- Before any calendar API call
- User manually triggers refresh

## Testing

### Test OAuth Flow

```bash
# 1. Start server
npm run dev

# 2. Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt

# 3. Initiate OAuth
curl http://localhost:3001/api/calendar/google/auth \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Complete OAuth in browser
# Copy the authUrl from response, paste in browser
# After consent, you'll be redirected with ?connected=true
```

### Test Event Creation

```bash
curl -X POST http://localhost:3001/api/calendar/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "description": "Created via API",
    "startTime": "'$(date -d '+1 hour' -Iseconds)'",
    "endTime": "'$(date -d '+2 hours' -Iseconds)'",
    "location": "Test Location"
  }'
```

### Test Availability

```bash
# Set availability
curl -X PUT http://localhost:3001/api/calendar/availability/slots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slots": [
      {"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"},
      {"dayOfWeek":2,"startTime":"09:00","endTime":"17:00"}
    ]
  }'

# Get available slots
curl "http://localhost:3001/api/calendar/availability?durationMinutes=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### "Invalid or expired state token"
- State tokens expire after 10 minutes
- Must complete OAuth flow in same browser session

### "Token refresh failed"
- Refresh token may have been revoked
- User needs to reconnect Google account

### "Google Calendar not connected"
- User hasn't completed OAuth flow
- Check `/api/calendar/google/status`

### Events not syncing
- Check `calendar_sync_enabled` is true
- Check sync log: `SELECT * FROM calendar_sync_log WHERE user_id = '...' ORDER BY created_at DESC`

## Production Checklist

- [ ] OAuth consent screen published (not in testing mode)
- [ ] Redirect URI matches exactly (including https)
- [ ] `TOKEN_ENCRYPTION_KEY` set to strong random value
- [ ] Database migrations run in production
- [ ] Rate limiting configured for calendar endpoints
- [ ] Error monitoring (Sentry, etc.) configured
- [ ] Token rotation strategy documented

## License

Part of Clippy platform. Internal use only.
