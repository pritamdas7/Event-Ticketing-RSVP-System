const Event = require('../models/Event');
const QRCode = require('qrcode');
const { sendTicketEmail } = require('../utils/emailService');

// Stream all available events for the Attendee Feed
exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find({}).sort({ date: 1 });
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to stream event registry data.' });
    }
};

// Create Event Dashboard Action
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, seats, coupons } = req.body;
        if (!title || !date || !seats || !Array.isArray(seats)) {
            return res.status(400).json({ success: false, error: 'Missing required configuration elements or seat map.' });
        }
        const newEvent = await Event.create({
            title: String(title).trim(),
            description: String(description || '').trim(),
            date: new Date(date),
            capacity: seats.length,
            seats: seats,
            coupons: Array.isArray(coupons) ? coupons : [],
            createdBy: req.session.user.id
        });
        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        console.error("Create Event DB Error:", error);
        res.status(500).json({ success: false, error: error.message || 'Could not execute database event write.' });
    }
};

// View Organizer Events Feed
exports.getOrganizerEvents = async (req, res) => {
    try {
        const myEvents = await Event.find({})
            .populate('attendees', 'username')
            .sort({ date: 1 });
        res.json({ success: true, events: myEvents });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed retrieving host metadata.' });
    }
};

// Fetch metrics & platform total revenue for the organizer dashboard
exports.getOrganizerAnalytics = async (req, res) => {
    try {
        const totalEvents = await Event.countDocuments({});

        // Calculate total revenue generated across all events
        const revenueAggregation = await Event.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$revenue" } } }
        ]);

        const metricsAggregation = await Event.aggregate([
            { $unwind: { path: "$seats", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalVip: { $sum: { $cond: [{ $in: [{ $toLower: "$seats.type" }, ["vip", "premium"]] }, 1, 0] } },
                    bookedVip: { $sum: { $cond: [{ $and: [{ $in: [{ $toLower: "$seats.type" }, ["vip", "premium"]] }, { $eq: ["$seats.status", "booked"] }] }, 1, 0] } },
                    totalGeneral: { $sum: { $cond: [{ $in: [{ $toLower: "$seats.type" }, ["general", "standard"]] }, 1, 0] } },
                    bookedGeneral: { $sum: { $cond: [{ $and: [{ $in: [{ $toLower: "$seats.type" }, ["general", "standard"]] }, { $eq: ["$seats.status", "booked"] }] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    vipStats: { total: "$totalVip", booked: "$bookedVip" },
                    generalStats: { total: "$totalGeneral", booked: "$bookedGeneral" }
                }
            }
        ]);

        const totalWaitlist = await Event.aggregate([
            { $project: { waitlistSize: { $size: { $ifNull: ["$waitlist", []] } } } },
            { $group: { _id: null, total: { $sum: "$waitlistSize" } } }
        ]);

        const checkInStats = await Event.aggregate([
            { $unwind: "$tickets" },
            {
                $group: {
                    _id: null,
                    totalTickets: { $sum: 1 },
                    checkedInCount: { $sum: { $cond: ["$tickets.checkedIn", 1, 0] } }
                }
            }
        ]);

        const liveMetrics = metricsAggregation[0] || {
            vipStats: { total: 0, booked: 0 },
            generalStats: { total: 0, booked: 0 }
        };

        const totalTickets = checkInStats[0]?.totalTickets || 0;
        const checkedInCount = checkInStats[0]?.checkedInCount || 0;

        res.json({
            success: true,
            metrics: {
                eventsCount: totalEvents,
                totalRevenue: revenueAggregation[0]?.totalRevenue || 0,
                vipStats: liveMetrics.vipStats,
                generalStats: liveMetrics.generalStats,
                waitlistCount: totalWaitlist[0]?.total || 0,
                checkInRate: `${checkedInCount} / ${totalTickets}`
            }
        });
    } catch (error) {
        console.error("Aggregation analytics crash:", error);
        res.status(500).json({ success: false, error: 'Failed compiling data analytics matrices.' });
    }
};

// Unified RSVP Reservation & Dynamic Revenue Increment
// Unified RSVP Reservation & Dynamic Revenue Increment
exports.handleRsvp = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.session.user.id;
        let { tier, seatId } = req.body;

        const targetedEvent = await Event.findById(eventId);
        if (!targetedEvent) {
            return res.status(404).json({ success: false, error: 'Event asset not found.' });
        }

        // Validate seat availability before allowing waitlist entry
        const availableSeatsInEvent = targetedEvent.seats.filter(s => s.status === 'available');

        if (tier === 'waitlist') {
            if (availableSeatsInEvent.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Seats are still available! Please select an open seat on the seating map instead of joining the waitlist.'
                });
            }
            // Auto-assign waitlist preference to whichever tier was filled
            const vipFull = targetedEvent.seats.filter(s => s.type === 'vip' && s.status === 'available').length === 0;
            const generalFull = targetedEvent.seats.filter(s => s.type === 'general' && s.status === 'available').length === 0;
            tier = (vipFull && !generalFull) ? 'vip' : 'general';
        }

        if (!tier || !['general', 'vip'].includes(tier)) {
            return res.status(400).json({ success: false, error: 'A valid target seating tier is required.' });
        }

        const alreadyAttending = targetedEvent.attendees.includes(userId);
        const alreadyWaitlisted = targetedEvent.waitlist.some(w => w.user.toString() === userId && w.tierPreference === tier);
        if (alreadyAttending || alreadyWaitlisted) {
            return res.status(400).json({ success: false, error: 'You are already registered or waitlisted for this event.' });
        }

        const tierSeats = targetedEvent.seats.filter(s => s.type === tier);
        const availableTierSeats = tierSeats.filter(s => s.status === 'available');

        // If trying to book a specific tier that has no open seats, automatically queue to waitlist
        if (availableTierSeats.length === 0) {
            targetedEvent.waitlist.push({
                user: userId,
                tierPreference: tier,
                joinedAt: new Date()
            });
            await targetedEvent.save();
            return res.json({
                success: true,
                status: 'waitlisted',
                message: `Requested tier is full. You have been placed in the ${tier.toUpperCase()} FIFO waitlist.`
            });
        }

        let selectedSeat = null;
        if (seatId) {
            selectedSeat = availableTierSeats.find(s => s.id === seatId);
            if (!selectedSeat) {
                return res.status(400).json({ success: false, error: 'The requested seat coordinates are unavailable.' });
            }
        } else {
            selectedSeat = availableTierSeats[0];
        }

        selectedSeat.status = 'booked';
        targetedEvent.attendees.push(userId);

        // Increment total event revenue by selected seat price
        targetedEvent.revenue = (targetedEvent.revenue || 0) + (selectedSeat.price || 10);

        const ticketToken = `TICKET-${eventId}-${userId}-${selectedSeat.id}-${Date.now()}`;
        const qrDataUrl = await QRCode.toDataURL(ticketToken);

        targetedEvent.tickets.push({
            qrCodeToken: ticketToken,
            user: userId,
            seatId: selectedSeat.id
        });

        await targetedEvent.save();

        sendTicketEmail(req.session.user.email, targetedEvent.title, selectedSeat.id, qrDataUrl);

        return res.json({
            success: true,
            status: 'confirmed',
            seatId: selectedSeat.id,
            qrCodeUrl: qrDataUrl,
            ticketToken: ticketToken,
            message: 'Seat reservation confirmed!'
        });
    } catch (error) {
        console.error("RSVP fault:", error);
        return res.status(500).json({ success: false, error: 'Failed handling reservation request.' });
    }
};

// Verify & check-in attendee QR ticket token
exports.verifyTicket = async (req, res) => {
    try {
        const { qrCodeToken } = req.body;
        if (!qrCodeToken) {
            return res.status(400).json({ success: false, error: 'Ticket token string is required.' });
        }
        const targetedEvent = await Event.findOne({ "tickets.qrCodeToken": qrCodeToken });
        if (!targetedEvent) {
            return res.status(404).json({ success: false, error: 'Invalid or unrecognized ticket token.' });
        }
        const ticket = targetedEvent.tickets.find(t => t.qrCodeToken === qrCodeToken);
        if (ticket.checkedIn) {
            return res.status(400).json({ success: false, error: `Ticket already checked in at ${new Date(ticket.checkedInAt).toLocaleTimeString()}.` });
        }
        ticket.checkedIn = true;
        ticket.checkedInAt = new Date();
        await targetedEvent.save();
        return res.json({
            success: true,
            message: `Check-in verified successfully for Seat ${ticket.seatId}!`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Ticket verification error.' });
    }
};

// Validate coupon code for event discount
exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const targetedEvent = await Event.findById(req.params.id);
        if (!targetedEvent) {
            return res.status(404).json({ success: false, error: 'Event asset not found.' });
        }
        const coupon = (targetedEvent.coupons || []).find(
            c => c.code.toUpperCase() === String(couponCode || '').trim().toUpperCase()
        );
        if (!coupon) {
            return res.status(400).json({ success: false, error: 'Invalid or expired promotional coupon.' });
        }
        return res.json({
            success: true,
            discountPercent: coupon.discountPercent,
            message: `Coupon applied! ${coupon.discountPercent}% discount granted.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Coupon evaluation error.' });
    }
};

// Cancel RSVP & Auto-Promote
exports.cancelRsvp = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.session.user.id;
        const targetedEvent = await Event.findById(eventId);
        if (!targetedEvent) return res.status(404).json({ success: false, error: 'Event asset not found.' });

        const waitlistIndex = targetedEvent.waitlist.findIndex(w => w.user.toString() === userId);
        if (waitlistIndex !== -1) {
            targetedEvent.waitlist.splice(waitlistIndex, 1);
            await targetedEvent.save();
            return res.json({ success: true, message: 'Successfully removed from the waitlist.' });
        }

        if (!targetedEvent.attendees.includes(userId)) {
            return res.status(400).json({ success: false, error: 'No active registration found for this user.' });
        }

        const bookedSeat = targetedEvent.seats.find(s => s.status === 'booked');
        let promotedUser = null;
        let targetedTier = bookedSeat ? bookedSeat.type : 'general';

        if (bookedSeat) {
            const nextInLine = targetedEvent.waitlist
                .filter(w => w.tierPreference === targetedTier)
                .sort((a, b) => a.joinedAt - b.joinedAt)[0];
            if (nextInLine) {
                promotedUser = nextInLine.user;
                targetedEvent.attendees.push(promotedUser);
                targetedEvent.waitlist = targetedEvent.waitlist.filter(w => w._id.toString() !== nextInLine._id.toString());
            } else {
                bookedSeat.status = 'available';
            }
        }

        targetedEvent.attendees = targetedEvent.attendees.filter(id => id.toString() !== userId);
        targetedEvent.tickets = targetedEvent.tickets.filter(t => t.user.toString() !== userId);
        await targetedEvent.save();

        return res.json({
            success: true,
            message: 'Reservation cancelled successfully.',
            promoted: Boolean(promotedUser)
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed executing cancellation transaction pipeline.' });
    }
};

// Modify Core Event Metadata
exports.updateEvent = async (req, res) => {
    try {
        const { title, date } = req.body;
        if (!title || !date) {
            return res.status(400).json({ success: false, error: 'Mandatory adjustment updates missing.' });
        }
        const updatedEvent = await Event.findOneAndUpdate(
            { _id: req.params.id },
            {
                title: String(title).trim(),
                date: new Date(date)
            },
            { new: true }
        );
        if (!updatedEvent) {
            return res.status(404).json({ success: false, error: 'Target scheduling resource not found.' });
        }
        res.json({ success: true, event: updatedEvent });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database adjustment transaction crashed.' });
    }
};

// DELETE: Delete or remove an event permanently
exports.deleteEvent = async (req, res) => {
    try {
        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        if (!deletedEvent) {
            return res.status(404).json({ success: false, error: 'Event not found.' });
        }
        return res.json({ success: true, message: 'Event deleted successfully.' });
    } catch (error) {
        console.error('Delete event fault:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete event resource.' });
    }
};