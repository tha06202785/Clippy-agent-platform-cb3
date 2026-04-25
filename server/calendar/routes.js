/**
 * Calendar API Routes
 * All routes are protected by authentication middleware
 */

const express = require('express');
const { authenticateToken } = require('../auth/authMiddleware');

// Controllers
const {
    initiateOAuth,
    handleOAuthCallback,
    disconnectAccount,
    getConnectionStatus,
    toggleSync,
    refreshToken
} = require('./googleController');

// Services
const {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    listCalendars,
    syncEvents
} = require('./calendarService');

const {
    getAvailabilitySlots,
    setAvailabilitySlots,
    calculateAvailability,
    bookAppointment
} = require('./availabilityService');

const router = express.Router();

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

// Initiate OAuth flow
router.get('/google/auth', authenticateToken, initiateOAuth);

// OAuth callback (public, handled by Google redirect)
router.get('/google/callback', handleOAuthCallback);

// Disconnect Google account
router.post('/google/disconnect', authenticateToken, disconnectAccount);

// Get connection status
router.get('/google/status', authenticateToken, getConnectionStatus);

// Toggle calendar sync
router.put('/google/sync', authenticateToken, toggleSync);

// Refresh access token
router.post('/google/refresh', authenticateToken, refreshToken);

// ============================================
// CALENDAR EVENT ROUTES
// ============================================

// List events
router.get('/calendar/events', authenticateToken, async (req, res) => {
    try {
        const {
            timeMin,
            timeMax,
            maxResults = 100,
            calendarId = 'primary'
        } = req.query;

        const events = await listEvents(req.user.user_id, {
            timeMin: timeMin || new Date().toISOString(),
            timeMax,
            maxResults: parseInt(maxResults),
            calendarId
        });

        res.json({
            success: true,
            events,
            count: events.length
        });
    } catch (error) {
        console.error('List events error:', error);
        res.status(500).json({
            error: error.message,
            code: 'LIST_EVENTS_FAILED'
        });
    }
});

// Create event
router.post('/calendar/events', authenticateToken, async (req, res) => {
    try {
        const {
            title,
            description,
            startTime,
            endTime,
            location,
            attendees,
            conference,
            calendarId
        } = req.body;

        // Validate required fields
        if (!title || !startTime || !endTime) {
            return res.status(400).json({
                error: 'title, startTime, and endTime are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        const event = await createEvent(req.user.user_id, {
            title,
            description,
            startTime,
            endTime,
            location,
            attendees: attendees || [],
            conference: conference || false,
            calendarId
        });

        res.json({
            success: true,
            event
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            error: error.message,
            code: 'CREATE_EVENT_FAILED'
        });
    }
});

// Update event
router.put('/calendar/events/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const eventData = req.body;

        const event = await updateEvent(req.user.user_id, id, eventData);

        res.json({
            success: true,
            event
        });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({
            error: error.message,
            code: 'UPDATE_EVENT_FAILED'
        });
    }
});

// Delete event
router.delete('/calendar/events/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { sendNotifications = true } = req.query;

        await deleteEvent(req.user.user_id, id, sendNotifications === 'true');

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({
            error: error.message,
            code: 'DELETE_EVENT_FAILED'
        });
    }
});

// List calendars
router.get('/calendar/calendars', authenticateToken, async (req, res) => {
    try {
        const calendars = await listCalendars(req.user.user_id);

        res.json({
            success: true,
            calendars
        });
    } catch (error) {
        console.error('List calendars error:', error);
        res.status(500).json({
            error: error.message,
            code: 'LIST_CALENDARS_FAILED'
        });
    }
});

// Sync events
router.post('/calendar/sync', authenticateToken, async (req, res) => {
    try {
        const result = await syncEvents(req.user.user_id, req.body);

        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Sync events error:', error);
        res.status(500).json({
            error: error.message,
            code: 'SYNC_FAILED'
        });
    }
});

// ============================================
// AVAILABILITY ROUTES
// ============================================

// Get availability slots
router.get('/calendar/availability/slots', authenticateToken, async (req, res) => {
    try {
        const slots = await getAvailabilitySlots(req.user.user_id);

        res.json({
            success: true,
            slots
        });
    } catch (error) {
        console.error('Get availability slots error:', error);
        res.status(500).json({
            error: error.message,
            code: 'GET_AVAILABILITY_FAILED'
        });
    }
});

// Set availability slots
router.put('/calendar/availability/slots', authenticateToken, async (req, res) => {
    try {
        const { slots } = req.body;

        if (!Array.isArray(slots)) {
            return res.status(400).json({
                error: 'slots must be an array',
                code: 'INVALID_PARAMS'
            });
        }

        await setAvailabilitySlots(req.user.user_id, slots);

        res.json({
            success: true,
            message: 'Availability slots updated'
        });
    } catch (error) {
        console.error('Set availability slots error:', error);
        res.status(500).json({
            error: error.message,
            code: 'SET_AVAILABILITY_FAILED'
        });
    }
});

// Calculate available time slots
router.get('/calendar/availability', authenticateToken, async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            durationMinutes = 30
        } = req.query;

        const slots = await calculateAvailability(req.user.user_id, {
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            durationMinutes: parseInt(durationMinutes),
            calendarSync: true
        });

        res.json({
            success: true,
            slots,
            count: slots.length
        });
    } catch (error) {
        console.error('Calculate availability error:', error);
        res.status(500).json({
            error: error.message,
            code: 'CALCULATE_AVAILABILITY_FAILED'
        });
    }
});

// ============================================
// BOOKING ROUTES
// ============================================

// Create booking
router.post('/calendar/bookings', authenticateToken, async (req, res) => {
    try {
        const {
            leadId,
            title,
            description,
            startTime,
            endTime,
            location,
            notes
        } = req.body;

        // Validate required fields
        if (!title || !startTime || !endTime) {
            return res.status(400).json({
                error: 'title, startTime, and endTime are required',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        const result = await bookAppointment(req.user.user_id, {
            leadId,
            title,
            description,
            startTime,
            endTime,
            location,
            notes
        });

        res.json({
            success: true,
            booking: result.booking,
            calendarEvent: result.calendarEvent,
            status: result.status
        });
    } catch (error) {
        console.error('Create booking error:', error);
        
        if (error.message.includes('no longer available')) {
            return res.status(409).json({
                error: error.message,
                code: 'SLOT_UNAVAILABLE'
            });
        }

        res.status(500).json({
            error: error.message,
            code: 'BOOKING_FAILED'
        });
    }
});

module.exports = router;
