// Auth Guard Middleware (Guards both JSON API responses and Page Route blocks)
const requireAuth = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            return next();
        }
        // If it's an API request, return clean JSON instead of an HTML redirect string
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(404).json({ success: false, error: 'Unauthorized access.' });
        }
        res.redirect('/login?unauthorized=1');
    };
};

// ANTI-CACHE MIDDLEWARE: Prevents browsers from loading sensitive dashboard views from disk history
const antiCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
};

module.exports = { requireAuth, antiCache };