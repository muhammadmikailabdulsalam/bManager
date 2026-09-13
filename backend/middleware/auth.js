const jwt = require("jsonwebtoken");

/*
 * JWT Authentication Middleware
 *
 * Every protected route will pass through this function.
 *
 * Expected header:
 * Authorization: Bearer YOUR_JWT_TOKEN
 */

function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        // No Authorization header
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Check that the header starts with "Bearer "
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format"
            });
        }

        // Extract the JWT
        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing"
            });
        }

        // Verify the JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Make authenticated user available to the route
        req.user = decoded;

        next();

    } catch (error) {
        // Token expired
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please login again."
            });
        }

        // Invalid/tampered token
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token"
        });
    }
}

module.exports = authenticateToken;