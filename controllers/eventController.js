const Event = require('../models/Event');
const mongoose = require('mongoose');

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
        const { title, description, date, seats } = req.body;

        if (!title || !date || !seats || !Array.isArray(seats)) {
            return res.status(400).json({ success: false, error: 'Missing required configuration elements or seat map.' });
        }

        const newEvent = await Event.create({
            title: String(title).trim(),
            description: String(description || '').trim(),
            date: new Date(date),
            capacity: seats.length,
            seats: seats,
            createdBy: req.session.user.id
        });

        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Could not execute database event write.' });
    }
};

// View Organizer Events Feed
exports.getOrganizerEvents = async (req, res) => {
    try {
        const myEvents = await Event.find({ createdBy: req.session.user.id })
            .populate('attendees', 'username')
            .sort({ date: 1 });
        res.json({ success: true, events: myEvents });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed retrieving host metadata.' });
    }
};

// Fetch high-level metrics for the organizer's analytics dashboard
exports.getOrganizerAnalytics = async (req, res) => {
    try {
        const stringId = req.session.user.id;
        let objectIdVariant = null;
        try { objectIdVariant = new mongoose.Types.ObjectId(stringId); } catch (e) { }

        const totalEvents = await Event.countDocuments({
            $or: [{ createdBy: stringId }, { createdBy: objectIdVariant }]
        });

        const metricsAggregation = await Event.aggregate([
            { $match: { $or: [{ createdBy: stringId }, { createdBy: objectIdVariant }] } },
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
            { $match: { $or: [{ createdBy: stringId }, { createdBy: objectIdVariant }] } },
            { $project: { waitlistSize: { $size: { $ifNull: ["$waitlist", []] } } } },
            { $group: { _id: null, total: { $sum: "$waitlistSize" } } }
        ]);

        const liveMetrics = metricsAggregation[0] || {
            vipStats: { total: 0, booked: 0 },
            generalStats: { total: 0, booked: 0 }
        };

        res.json({
            success: true,
            metrics: {
                eventsCount: totalEvents,
                vipStats: liveMetrics.vipStats,
                generalStats: liveMetrics.generalStats,
                waitlistCount: totalWaitlist[0]?.total || 0
            }
        });
    } catch (error) {
        console.error("Aggregation analytics crash:", error);
        res.status(500).json({ success: false, error: 'Failed compiling data analytics matrices.' });
    }
};

// Unified RSVP Reservation & Dynamic FIFO Waitlist Route
exports.handleRsvp = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.session.user.id;
        let { tier, seatId } = req.body;

        const targetedEvent = await Event.findById(eventId);
        if (!targetedEvent) {
            return res.status(404).json({ success: false, error: 'Event asset not found.' });
        }

        if (tier === 'waitlist') {
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
        await targetedEvent.save();

        return res.json({ success: true, status: 'confirmed', seatId: selectedSeat.id, message: 'Seat reservation confirmed.' });
    } catch (error) {
        console.error("RSVP/Waitlist reservation fault:", error);
        return res.status(500).json({ success: false, error: 'Failed handling reservation request.' });
    }
};

// Cancel RSVP / Release Ticket & Execute Auto-Promotion FIFO Pipeline
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
        await targetedEvent.save();

        return res.json({
            success: true,
            message: 'Reservation cancelled successfully.',
            promoted: promotedUser ? true : false
        });
    } catch (error) {
        console.error("Cancellation auto-promotion engine fault:", error);
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
            { _id: req.params.id, createdBy: req.session.user.id },
            {
                title: String(title).trim(),
                date: new Date(date)
            },
            { new: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ success: false, error: 'Target scheduling resource not found or unauthorized.' });
        }

        res.json({ success: true, event: updatedEvent });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Database adjustment transaction crashed.' });
    }
};