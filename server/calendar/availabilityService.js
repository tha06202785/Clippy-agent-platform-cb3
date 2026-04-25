/**
 * Availability Service
 * Calculates available time slots for booking
 */

const { supabase } = require('../auth/authMiddleware');
const { getFreeBusy } = require('./calendarService');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Get user's availability slots
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Availability slots
 */
async function getAvailabilitySlots(userId) {
    const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Failed to fetch availability slots:', error);
        throw new Error('Failed to load availability');
    }

    return data || [];
}

/**
 * Set user's availability slots
 * @param {string} userId - User ID
 * @param {Array} slots - Array of availability slot objects
 * @returns {Promise<void>}
 */
async function setAvailabilitySlots(userId, slots) {
    // Delete existing slots
    await supabase
        .from('availability_slots')
        .delete()
        .eq('user_id', userId);

    // Insert new slots
    if (slots.length > 0) {
        const slotsToInsert = slots.map(slot => ({
            user_id: userId,
            day_of_week: slot.dayOfWeek,
            specific_date: slot.specificDate || null,
            start_time: slot.startTime,
            end_time: slot.endTime,
            timezone: slot.timezone || 'UTC',
            is_available: slot.isAvailable !== false,
            buffer_minutes: slot.bufferMinutes || 0
        }));

        const { error } = await supabase
            .from('availability_slots')
            .insert(slotsToInsert);

        if (error) {
            console.error('Failed to set availability slots:', error);
            throw new Error('Failed to save availability');
        }
    }
}

/**
 * Calculate available time slots for a date range
 * @param {string} userId - User ID
 * @param {Object} options - Calculation options
 * @returns {Promise<Array>} Available slots
 */
async function calculateAvailability(userId, options = {}) {
    const {
        startDate = new Date(),
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        durationMinutes = 30,
        calendarSync = true
    } = options;

    // Get user's configured availability
    const availabilitySlots = await getAvailabilitySlots(userId);

    if (availabilitySlots.length === 0) {
        return [];
    }

    // Get busy times from Google Calendar if connected
    let busyTimes = [];
    if (calendarSync) {
        try {
            busyTimes = await getFreeBusy(userId, startDate, endDate);
        } catch (error) {
            console.warn('Could not sync with Google Calendar:', error.message);
        }
    }

    // Get existing events from local database
    const { data: localEvents } = await supabase
        .from('calendar_events')
        .select('start_time, end_time')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .neq('status', 'cancelled');

    const allBusyTimes = [
        ...busyTimes,
        ...(localEvents || []).map(e => ({
            start: e.start_time,
            end: e.end_time
        }))
    ];

    // Generate available slots
    const availableSlots = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current < end) {
        const dayOfWeek = current.getDay();
        const daySlots = availabilitySlots.filter(s => s.day_of_week === dayOfWeek);

        for (const slot of daySlots) {
            // Parse slot times
            const [startHour, startMin] = slot.start_time.split(':').map(Number);
            const [endHour, endMin] = slot.end_time.split(':').map(Number);

            const slotStart = new Date(current);
            slotStart.setHours(startHour, startMin, 0, 0);

            const slotEnd = new Date(current);
            slotEnd.setHours(endHour, endMin, 0, 0);

            // Generate appointment slots within this availability window
            let appointmentStart = new Date(slotStart);
            const buffer = (slot.buffer_minutes || 0) * 60 * 1000;

            while (appointmentStart.getTime() + durationMinutes * 60 * 1000 <= slotEnd.getTime()) {
                const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60 * 1000);

                // Check if this slot conflicts with busy times
                const isBusy = allBusyTimes.some(busy => {
                    const busyStart = new Date(busy.start);
                    const busyEnd = new Date(busy.end);
                    return appointmentStart < busyEnd && appointmentEnd > busyStart;
                });

                if (!isBusy) {
                    availableSlots.push({
                        start: appointmentStart.toISOString(),
                        end: appointmentEnd.toISOString(),
                        duration: durationMinutes
                    });
                }

                // Move to next slot (including buffer)
                appointmentStart = new Date(appointmentEnd.getTime() + buffer);
            }
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
    }

    return availableSlots;
}

/**
 * Check if a specific time slot is available
 * @param {string} userId - User ID
 * @param {Date} startTime - Proposed start time
 * @param {Date} endTime - Proposed end time
 * @returns {Promise<boolean>} True if available
 */
async function isTimeSlotAvailable(userId, startTime, endTime) {
    // Check against configured availability
    const availabilitySlots = await getAvailabilitySlots(userId);
    const dayOfWeek = startTime.getDay();
    const daySlots = availabilitySlots.filter(s => s.day_of_week === dayOfWeek);

    if (daySlots.length === 0) {
        return false; // No availability configured for this day
    }

    // Check if within any availability window
    const timeStr = startTime.toTimeString().slice(0, 5); // HH:MM
    const withinAvailability = daySlots.some(slot => {
        return timeStr >= slot.start_time && endTime.toTimeString().slice(0, 5) <= slot.end_time;
    });

    if (!withinAvailability) {
        return false;
    }

    // Check for conflicts in Google Calendar
    try {
        const busyTimes = await getFreeBusy(userId, startTime, endTime);
        const hasConflict = busyTimes.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return startTime < busyEnd && endTime > busyStart;
        });

        if (hasConflict) return false;
    } catch (error) {
        console.warn('Could not check Google Calendar:', error.message);
    }

    // Check for conflicts in local events
    const { data: conflicts } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', userId)
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString())
        .neq('status', 'cancelled')
        .limit(1);

    return !(conflicts && conflicts.length > 0);
}

/**
 * Get default availability template
 * @returns {Array} Default weekly availability
 */
function getDefaultAvailabilityTemplate() {
    return [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Monday
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Tuesday
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Wednesday
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Thursday
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isAvailable: true }, // Friday
    ];
}

/**
 * Book an appointment
 * @param {string} userId - User ID
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} Booking result
 */
async function bookAppointment(userId, bookingData) {
    const {
        leadId,
        title,
        description,
        startTime,
        endTime,
        location,
        notes
    } = bookingData;

    // Verify slot is available
    const isAvailable = await isTimeSlotAvailable(
        userId,
        new Date(startTime),
        new Date(endTime)
    );

    if (!isAvailable) {
        throw new Error('This time slot is no longer available');
    }

    // Create booking request
    const { data: booking, error } = await supabase
        .from('booking_requests')
        .insert({
            user_id: userId,
            lead_id: leadId || null,
            requested_start: startTime,
            requested_end: endTime,
            status: 'confirmed', // Auto-confirm for now
            notes
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create booking:', error);
        throw new Error('Failed to create booking');
    }

    // Create event in Google Calendar (if connected)
    let calendarEvent = null;
    try {
        const { createEvent } = require('./calendarService');
        calendarEvent = await createEvent(userId, {
            title,
            description,
            startTime,
            endTime,
            location,
            sendNotifications: true
        });

        // Store calendar event reference
        await supabase
            .from('calendar_events')
            .insert({
                user_id: userId,
                google_event_id: calendarEvent.googleEventId,
                lead_id: leadId || null,
                title,
                description,
                start_time: startTime,
                end_time: endTime,
                location,
                event_type: 'appointment',
                status: 'confirmed'
            });
    } catch (error) {
        console.warn('Could not create Google Calendar event:', error.message);
        // Continue - booking is still recorded
    }

    return {
        booking,
        calendarEvent,
        status: 'confirmed'
    };
}

module.exports = {
    getAvailabilitySlots,
    setAvailabilitySlots,
    calculateAvailability,
    isTimeSlotAvailable,
    getDefaultAvailabilityTemplate,
    bookAppointment
};
