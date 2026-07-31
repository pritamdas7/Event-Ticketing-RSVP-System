const mongoose = require('mongoose');

// Dynamic seat coordinate tracking schema
const seatSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, enum: ['general', 'vip'], default: 'general' },
    status: { type: String, enum: ['available', 'booked'], default: 'available' }
});

// Chronological FIFO waitlist tracking schema
const waitlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tierPreference: { type: String, enum: ['general', 'vip'], required: true },
    joinedAt: { type: Date, default: Date.now } // Timestamp ensuring strict chronological queue sequencing
});

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    capacity: { type: Number, required: true }, // Derived automatically from total seats layout size
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Seat array mapping engine
    seats: [seatSchema],

    // Active FIFO queue system
    waitlist: [waitlistSchema]
});

// Compound index to guarantee unique waitlist requests per user per tier preference
eventSchema.index({ "_id": 1, "waitlist.user": 1, "waitlist.tierPreference": 1 });

module.exports = mongoose.model('Event', eventSchema);