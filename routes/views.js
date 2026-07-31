const express = require('express');
const router = express.Router();
const path = require('path');
const { requireAuth } = require('../middleware/auth');

// Page Render Core Interface Handlers
router.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(req.session.user.role === 'organizer' ? '/organizer' : '/events');
    }
    res.sendFile(path.join(__dirname, '../views', 'login', 'index.html'));
});

router.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

router.get('/events', requireAuth('attendee'), (req, res) => {
    res.sendFile(path.join(__dirname, '../views', 'events', 'index.html'));
});

router.get('/event/:eventId', requireAuth('attendee'), (req, res) => {
    res.sendFile(path.join(__dirname, '../views', 'attendee', 'index.html'));
});

router.get('/organizer', requireAuth('organizer'), (req, res) => {
    res.sendFile(path.join(__dirname, '../views', 'organizer', 'index.html'));
});

router.get('/', (req, res) => res.redirect('/login'));

module.exports = router;