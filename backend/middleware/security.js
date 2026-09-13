/*
==================================================
bManager
File: backend/middleware/security.js
Purpose: Input sanitization + rate limiting

NOTE: Express 5 makes req.query a read-only
getter, so packages like express-mongo-sanitize
(which reassign req.query) throw errors here.
This sanitizer mutates objects in place instead,
which works safely on Express 5.
==================================================
*/

const rateLimit = require("express-rate-limit");

/*
==================================================
NOSQL INJECTION GUARD

Strips any key starting with "$" or containing
"." from request input, recursively. This stops
payloads like { "email": { "$gt": "" } } from
being used to bypass query logic.
==================================================
*/

function stripDangerousKeys(value) {

    if (Array.isArray(value)) {

        value.forEach(stripDangerousKeys);
        return value;
    }

    if (
        value &&
        typeof value === "object"
    ) {

        for (const key of Object.keys(value)) {

            if (
                key.startsWith("$") ||
                key.includes(".")
            ) {

                delete value[key];
                continue;
            }

            stripDangerousKeys(value[key]);
        }
    }

    return value;
}

function sanitizeInput(req, res, next) {

    if (req.body) {
        stripDangerousKeys(req.body);
    }

    // req.query / req.params are mutated key-by-key
    // (not reassigned) so this stays safe on Express 5.
    if (req.query) {
        stripDangerousKeys(req.query);
    }

    if (req.params) {
        stripDangerousKeys(req.params);
    }

    next();
}


/*
==================================================
RATE LIMITERS
==================================================
*/

// Generous limit for normal API usage.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please slow down and try again shortly."
    }
});

// Tight limit on auth endpoints to slow down
// brute-force login / registration attempts.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Please try again in a few minutes."
    }
});

module.exports = {
    sanitizeInput,
    apiLimiter,
    authLimiter
};
