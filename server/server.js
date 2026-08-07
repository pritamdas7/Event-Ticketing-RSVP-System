require('dotenv').config(); // Load secure environment variables at boot
const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/db');
const { antiCache } = require('./middleware/auth');

// Core Router Imports
const authRoutes = require('./routes/auth');
const organizerRoutes = require('./routes/organizer');
const eventRoutes = require('./routes/events');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

// Initialize Database Connection Channel
connectDB();

// ==========================================
// GLOBALS & REQUEST PARSING CONFIGURATION
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Secure Session State Management
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 600000,
    httpOnly: true,
    secure: false
  }
}));

// ==========================================
// APP ROUTING AGGREGATION PIPELINES
// ==========================================
app.use(authRoutes);
app.use(organizerRoutes);
app.use(eventRoutes);
app.use(paymentRoutes);

// Serve the React client build in production.
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  if (fs.existsSync(clientIndexPath)) {
    return res.sendFile(clientIndexPath);
  }

  return res.status(503).send('React client not built yet. Run the client dev server or build client/ first.');
});

// Run Engine Node Lifecycle Instance
app.listen(PORT, () => console.log(`RSVP Secure Core active on port ${PORT}`));
