// Authentication & Role Authorization Middleware
exports.requireAuth = (requiredRole) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized access. Please log in again.' });
        }
        if (requiredRole && req.session.user.role !== requiredRole) {
            return res.status(403).json({ success: false, error: `Unauthorized access. Access restricted to ${requiredRole} accounts.` });
        }
        next();
    };
};