// Calendar Chart using @event-calendar/core
// This chart visualizes events over time (week, month, year views)
// Required mapping: events (array of { title, start, end })
// Optional mapping: view ("week" | "month" | "year")

import EventCalendar from '@event-calendar/core';
import '@event-calendar/core/index.css';

export const graphDefinition = {
    type: 'calendar',
    name: 'Calendar',
    description: 'Event calendar visualization (week, month, year views)',
    requiredInputs: [
        { role: 'events', name: 'Events', description: 'Array of events with title, start, end', required: true }
    ],
    optionalInputs: [
        { role: 'view', name: 'View', description: 'Calendar view: week, month, or year' }
    ]
};

export async function render(container, data, mappings, config = {}) {
    // Remove previous calendar if any
    container.innerHTML = '';

    // Get events from mapping
    const events = mappings.events || [];
    const view = mappings.view || 'month';

    // Prepare calendar options
    const calendarOptions = {
        events,
        view,
        // Allow switching views
        views: ['week', 'month', 'year'],
        // Optionally, add more config here
    };

    // Create calendar
    const calendar = new EventCalendar(container, calendarOptions);
    // Expose for debugging
    container._calendar = calendar;
}
