const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');

// SECURE LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const role = String(req.body.role || '');

        const user = await User.findOne({ username, role });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid username or password.' });
        }

        // Include email in the session for ticket delivery
        req.session.user = { id: user._id, username: user.username, email: user.email, role: user.role };
        return res.json({
            success: true,
            role: user.role,
            redirect: user.role === 'organizer' ? '/organizer' : '/events'
        });
    } catch (error) {
        console.error('Login routing error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// SECURE SIGNUP ROUTE
router.post('/signup', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const email = String(req.body.email || '').trim();
        const password = String(req.body.password || '');
        const role = String(req.body.role || '');
        const inviteCode = String(req.body.inviteCode || '').trim();

        if (!username || !email || !password || !role) {
            return res.status(400).json({ success: false, error: 'Missing registration credentials.' });
        }

        // Verify organizer invite token validity
        if (role === 'organizer') {
            const validCode = await InviteCode.findOne({ code: inviteCode, role: 'organizer', isActive: true });
            if (!validCode) {
                return res.status(400).json({ success: false, error: 'Invalid or deactivated organizer invite token.' });
            }
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username is already taken.' });
        }

        const newUser = await User.create({ username, email, password, role });

        // Save session details
        req.session.user = { id: newUser._id, username: newUser.username, email: newUser.email, role: newUser.role };
        return res.status(201).json({
            success: true,
            role: newUser.role,
            redirect: newUser.role === 'organizer' ? '/organizer' : '/events'
        });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Username already exists.' });
        }
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Secure Async Logout Action
router.post('/api/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ success: false, error: 'Logout failed.' });
            res.clearCookie('connect.sid');
            return res.json({ success: true });
        });
    } else {
        return res.json({ success: true });
    }
});

// Session status validation
router.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ authenticated: true, role: req.session.user.role });
    }
    res.json({ authenticated: false });
});

module.exports = router;