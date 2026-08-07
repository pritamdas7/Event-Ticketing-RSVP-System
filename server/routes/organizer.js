const express = require('express');
const router = express.Router();
const InviteCode = require('../models/InviteCode');
const { requireAuth } = require('../middleware/auth');

// Generate Invite Code Endpoint
router.post('/api/invite-codes/generate', requireAuth('organizer'), async (req, res) => {
    try {
        const segmentA = Math.random().toString(36).substring(2, 6).toUpperCase();
        const segmentB = Math.floor(1000 + Math.random() * 9000);
        const generatedCode = `ORG-${segmentA}-${segmentB}`;

        const newCode = await InviteCode.create({
            code: generatedCode,
            role: 'organizer',
            isActive: true
        });

        res.status(201).json({ success: true, code: newCode.code });
    } catch (error) {
        console.error('Token Generation Error:', error);
        res.status(500).json({ success: false, error: 'Database operations fault while creating token.' });
    }
});

// List System Tokens Endpoint
router.get('/api/invite-codes', requireAuth('organizer'), async (req, res) => {
    try {
        const codes = await InviteCode.find().sort({ createdAt: -1 });
        res.json({ success: true, codes });
    } catch (error) {
        console.error('Token Query Error:', error);
        res.status(500).json({ success: false, error: 'Unable to query token collection.' });
    }
});

// Toggle Active State of a Token
router.patch('/api/invite-codes/:id/toggle', requireAuth('organizer'), async (req, res) => {
    try {
        const codeDoc = await InviteCode.findById(req.params.id);
        if (!codeDoc) {
            return res.status(404).json({ success: false, error: 'Token document not found.' });
        }

        codeDoc.isActive = !codeDoc.isActive;
        await codeDoc.save();

        res.json({ success: true, isActive: codeDoc.isActive });
    } catch (error) {
        console.error('Token Toggle Error:', error);
        res.status(500).json({ success: false, error: 'Failed updating token authorization state.' });
    }
});

module.exports = router;