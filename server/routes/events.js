const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

// GET: Stream all available events for the Attendee Feed
router.get('/api/events', eventController.getAllEvents);

// POST: Create Event Dashboard Action
router.post('/api/events', requireAuth('organizer'), eventController.createEvent);

// GET: View Organizer Events Feed
router.get('/api/organizer/events', requireAuth('organizer'), eventController.getOrganizerEvents);

// GET: Fetch high-level metrics for the organizer's analytics dashboard
router.get('/api/organizer/analytics', requireAuth('organizer'), eventController.getOrganizerAnalytics);

// POST: Validate coupon code for event discount
router.post('/api/events/:id/apply-coupon', requireAuth('attendee'), eventController.applyCoupon);

// POST: Verify & check-in attendee QR ticket token
router.post('/api/events/verify-ticket', requireAuth('organizer'), eventController.verifyTicket);

// POST: Unified RSVP Reservation & Dynamic FIFO Waitlist Route
router.post('/api/events/:id/rsvp', requireAuth('attendee'), eventController.handleRsvp);

// DELETE: Cancel RSVP / Release Ticket & Execute Auto-Promotion FIFO Pipeline
router.delete('/api/events/:id/rsvp', requireAuth('attendee'), eventController.cancelRsvp);

// DELETE: Remove event permanently
router.delete('/api/events/:id', requireAuth('organizer'), eventController.deleteEvent);

// PUT: Modify Core Event Metadata
router.put('/api/events/:id', requireAuth('organizer'), eventController.updateEvent);

module.exports = router;