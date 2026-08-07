const mongoose = require('mongoose');

// Dynamic seat coordinate tracking schema with individual seat pricing
const seatSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, enum: ['general', 'vip'], default: 'general' },
    price: { type: Number, required: true, default: 10 },
    status: { type: String, enum: ['available', 'booked'], default: 'available' }
});

// Chronological FIFO waitlist tracking schema
const waitlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tierPreference: { type: String, enum: ['general', 'vip'], required: true },
    joinedAt: { type: Date, default: Date.now },
    claimExpiresAt: { type: Date }
});

// QR-coded verifiable ticket schema
const ticketSchema = new mongoose.Schema({
    qrCodeToken: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seatId: { type: String, required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date }
});

// Coupon schema with subdocument _id disabled
const couponSchema = new mongoose.Schema({
    code: { type: String, required: true },
    discountPercent: { type: Number, required: true }
}, { _id: false });

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    capacity: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    seats: [seatSchema],
    waitlist: [waitlistSchema],
    tickets: [ticketSchema],
    coupons: [couponSchema],
    revenue: { type: Number, default: 0 }
});

eventSchema.index({ "_id": 1, "waitlist.user": 1, "waitlist.tierPreference": 1 });

module.exports = mongoose.model('Event', eventSchema);