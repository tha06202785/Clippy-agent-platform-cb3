/**
 * Google Calendar Service
 * Handles all calendar operations: events, availability, syncing
 */

const { createOAuth2ClientWithTokens, createCalendarClient } = require('./googleConfig');
const { decryptToken, prepareTokensForUse, isTokenExpired } = require('./tokenManager');
const { supabase } = require('../auth/authMiddleware');

// Default calendar ID
const PRIMARY_CALENDAR = 'primary';

/**
 * Get or refresh access token for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} OAuth2 client and tokens
 */
async function getAuthenticatedClient(userId) {
    // Get stored tokens
    const { data: connection, error } = await supabase
        .from('google_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !connection) {
        throw new Error('Google Calendar not connected. Please connect your Google account.');
    }

    // Decrypt refresh token
    const refreshToken = decryptToken(connection.refresh_token);
    if (!refreshToken) {
        throw new Error('Invalid refresh token. Please reconnect your Google account.');
    }

    // Prepare tokens
    let tokens = {
        refresh_token: refreshToken
    };

    // Check if access token is expired
    if (connection.access_token && !isTokenExpired(connection.token_expires_at)) {
        tokens.access_token = decryptToken(connection.access_token);
    }

    // Create OAuth client
    const oauth2Client = createOAuth2ClientWithTokens(tokens);

    // If access token expired or missing, refresh it
    if (!tokens.access_token || isTokenExpired(connection.token_expires_at)) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            
            // Update stored tokens
            const { encryptToken, calculateTokenExpiry } = require('./tokenManager');
            await supabase
                .from('google_connections')
                .update({
                    access_token: credentials.access_token ? encryptToken(credentials.access_token) : null,
                    token_expires_at: calculateTokenExpiry(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            // Update client with new token
            oauth2Client.setCredentials(credentials);
        } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Failed to refresh access token. Please reconnect your Google account.');
        }
    }

    return oauth2Client;
}

/**
 * List events from Google Calendar
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Calendar events
 */
async function listEvents(userId, options = {}) {
    const {
        timeMin = new Date().toISOString(),
        timeMax,
        maxResults = 100,
        calendarId = PRIMARY_CALENDAR,
        showDeleted = false,
        singleEvents = true
    } = options;

    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = createCalendarClient(oauth2Client);

    const params = {
        calendarId,
        timeMin,
        maxResults,
        singleEvents,
        showDeleted,
        orderBy: 'startTime'
    };

    if (timeMax) params.timeMax = timeMax;

    const response = await calendar.events.list(params);
    
    return response.data.items.map(event => ({
        googleEventId: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || null,
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        location: event.location || null,
        status: event.status,
        attendees: event.attendees || [],
        hangoutLink: event.hangoutLink || null,
        conferenceData: event.conferenceData || null,
        creator: event.creator || null,
        htmlLink: event.htmlLink
    }));
}

/**
 * Create an event in Google Calendar
 * @param {string} userId - User ID
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event
 */
async function createEvent(userId, eventData) {
    const {
        title,
        description,
        startTime,
        endTime,
        location,
        attendees = [],
        sendNotifications = true,
        conference = false,
        calendarId = PRIMARY_CALENDAR
    } = eventData;

    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = createCalendarClient(oauth2Client);

    const event = {
        summary: title,
        description,
        start: {
            dateTime: new Date(startTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: new Date(endTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    };

    if (location) {
        event.location = location;
    }

    if (attendees.length > 0) {
        event.attendees = attendees.map(email => ({ email }));
    }

    // Add Google Meet if requested
    if (conference) {
        event.conferenceData = {
            createRequest: {
                requestId: `${userId}-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        };
    }

    const response = await calendar.events.insert({
        calendarId,
        resource: event,
        sendUpdates: sendNotifications ? 'all' : 'none',
        conferenceDataVersion: conference ? 1 : 0
    });

    return {
        googleEventId: response.data.id,
        title: response.data.summary,
        description: response.data.description,
        startTime: response.data.start.dateTime || response.data.start.date,
        endTime: response.data.end.dateTime || response.data.end.date,
        location: response.data.location,
        status: response.data.status,
        hangoutLink: response.data.hangoutLink,
        htmlLink: response.data.htmlLink
    };
}

/**
 * Update an event in Google Calendar
 * @param {string} userId - User ID
 * @param {string} eventId - Google event ID
 * @param {Object} eventData - Updated event data
 * @returns {Promise<Object>} Updated event
 */
async function updateEvent(userId, eventId, eventData) {
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = createCalendarClient(oauth2Client);

    // First get existing event
    const existing = await calendar.events.get({
        calendarId: PRIMARY_CALENDAR,
        eventId
    });

    const update = { ...existing.data };

    if (eventData.title !== undefined) update.summary = eventData.title;
    if (eventData.description !== undefined) update.description = eventData.description;
    if (eventData.location !== undefined) update.location = eventData.location;
    if (eventData.startTime) {
        update.start = {
            dateTime: new Date(eventData.startTime).toISOString(),
            timeZone: update.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
    if (eventData.endTime) {
        update.end = {
            dateTime: new Date(eventData.endTime).toISOString(),
            timeZone: update.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    const response = await calendar.events.patch({
        calendarId: PRIMARY_CALENDAR,
        eventId,
        resource: update,
        sendUpdates: eventData.sendNotifications ? 'all' : 'none'
    });

    return {
        googleEventId: response.data.id,
        title: response.data.summary,
        description: response.data.description,
        startTime: response.data.start.dateTime || response.data.start.date,
        endTime: response.data.end.dateTime || response.data.end.date,
        location: response.data.location,
        status: response.data.status,
        htmlLink: response.data.htmlLink
    };
}

/**
 * Delete an event from Google Calendar
 * @param {string} userId - User ID
 * @param {string} eventId - Google event ID
 * @param {boolean} sendNotifications - Notify attendees
 * @returns {Promise<void>}
 */
async function deleteEvent(userId, eventId, sendNotifications = true) {
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = createCalendarClient(oauth2Client);

    await calendar.events.delete({
        calendarId: PRIMARY_CALENDAR,
        eventId,
        sendUpdates: sendNotifications ? 'all' : 'none'
    });
}

/**
 * Get user's Google Calendar list
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of calendars
 */
async function listCalendars(userId) {
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = createCalendarClient(oauth2Client);

    const response = await calendar.calendarList.list();

    return response.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        selected: cal.selected
    }));
}

/**
 * Sync events from Google Calendar to local database
 * @param {string} userId - User ID
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
async function syncEvents(userId, options = {}) {
    const { syncToken, timeMin, timeMax } = options;
    
    // Get events from Google
    const events = await listEvents(userId, { 
        timeMin: timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        timeMax,
        maxResults: 2500
    });

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Upsert events to database
    for (const event of events) {
        const { data: existing } = await supabase
            .from('calendar_events')
            .select('id')
            .eq('user_id', userId)
            .eq('google_event_id', event.googleEventId)
            .single();

        const eventData = {
            user_id: userId,
            google_event_id: event.googleEventId,
            title: event.title,
            description: event.description,
            start_time: event.startTime,
            end_time: event.endTime,
            location: event.location,
            status: event.status
        };

        if (existing) {
            await supabase
                .from('calendar_events')
                .update(eventData)
                .eq('id', existing.id);
            updated++;
        } else {
            await supabase
                .from('calendar_events')
                .insert(eventData);
            created++;
        }
    }

    // Log sync
    await supabase.from('calendar_sync_log').insert({
        user_id: userId,
        sync_type: syncToken ? 'incremental' : 'full',
        status: 'success',
        events_synced: events.length
    });

    return { created, updated, deleted, total: events.length };
}

/**
 * Get free/busy information
 * @param {string} userId - User ID
 * @param {Date} timeMin - Start time
 * @param {Date} timeMax - End time
 * @returns {Promise<Array>} Busy time slots
 */
async function getFreeBusy(userId, timeMin, timeMax) {
    const oauth2Client = await getAuthenticatedClient(userId);
    const calendar = createCalendarClient(oauth2Client);

    const response = await calendar.freebusy.query({
        resource: {
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            items: [{ id: PRIMARY_CALENDAR }]
        }
    });

    const calendarData = response.data.calendars[PRIMARY_CALENDAR];
    return calendarData?.busy || [];
}

module.exports = {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    listCalendars,
    syncEvents,
    getFreeBusy,
    getAuthenticatedClient
};
