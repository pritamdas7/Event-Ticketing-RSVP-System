const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rsvp_system';

        await mongoose.connect(MONGO_URI);
        console.log('Successfully connected to MongoDB.');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit application process with failure code if connection fails
        process.exit(1);
    }
};

module.exports = connectDB;