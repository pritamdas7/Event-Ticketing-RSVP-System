const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Custom auth check to ensure req.session.user exists
const checkSession = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized access. Please log in again.' });
};

router.post('/api/create-payment-intent', checkSession, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ success: false, error: 'Stripe Secret Key is missing in .env file.' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount || 1000),
            currency: 'usd',
            payment_method_types: ['card']
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Stripe Intent Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;