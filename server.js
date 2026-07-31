require('dotenv').config(); // Load secure environment variables at boot
const express = require('express');
const session = require('express-session');
const connectDB = require('./config/db');
const { antiCache } = require('./middleware/auth');

// Core Router Imports
const authRoutes = require('./routes/auth');
const organizerRoutes = require('./routes/organizer');
const eventRoutes = require('./routes/events');
const viewRoutes = require('./routes/views');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database Connection Channel
connectDB();

// ==========================================
// GLOBALS & REQUEST PARSING CONFIGURATION
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(antiCache); // Attach Anti-Cache Protection System Core Wide

// Serve all static CSS and Client-Side JS files globally
app.use(express.static('public'));

// Initialize Secure Session State Management
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 600000,
    httpOnly: true, // Mitigate cross-site XSS cookie access vector risk
    secure: false   // Set to true when running inside SSL production architectures
  }
}));

// ==========================================
// APP ROUTING AGGREGATION PIPELINES
// ==========================================
// 1. Core API Logic Pipelines (Executed Before File Resolution Frameworks)
app.use(authRoutes);
app.use(organizerRoutes);
app.use(eventRoutes);

// 2. View Delivery Architecture Layer Handles Document Routing Tasks
app.use(viewRoutes);

// Catch-All 404 Resolution Routing Fallback Rule
app.use((req, res) => res.status(404).send('<h1>404: Resource Not Found</h1>'));

// Run Engine Node Lifecycle Instance
app.listen(PORT, () => console.log(`RSVP Secure Core active on port ${PORT}`));