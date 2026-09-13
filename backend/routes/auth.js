const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/user");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

let googleKeysCache = null;
let googleKeysExpiresAt = 0;


/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function createToken(user) {

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is missing");
    }

    return jwt.sign(
        {
            userId: user._id.toString(),
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
}


function safeUser(user) {

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider
    };
}


/* =========================================================
   GOOGLE ID TOKEN VERIFICATION
   =========================================================

   Google sends an ID token after the user authenticates.
   We verify its signature, issuer, audience and expiry
   before accepting the Google account information.

   No Google password is ever sent to bManager.
   ========================================================= */

function base64UrlDecode(value) {
    return Buffer.from(
        value.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
    );
}


async function getGoogleKeys() {

    const now = Date.now();

    if (googleKeysCache && googleKeysExpiresAt > now) {
        return googleKeysCache;
    }

    const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/certs"
    );

    if (!response.ok) {
        throw new Error("Unable to load Google verification keys");
    }

    const cacheControl =
        response.headers.get("cache-control") || "";

    const maxAgeMatch =
        cacheControl.match(/max-age=(\d+)/i);

    const maxAge =
        maxAgeMatch
            ? Number(maxAgeMatch[1])
            : 3600;

    const data = await response.json();

    googleKeysCache = data.keys || [];
    googleKeysExpiresAt =
        now + Math.min(maxAge, 86400) * 1000;

    return googleKeysCache;
}


async function verifyGoogleCredential(idToken) {

    if (!GOOGLE_CLIENT_ID) {
        throw new Error("Google login is not configured");
    }

    const parts = String(idToken || "").split(".");

    if (parts.length !== 3) {
        throw new Error("Invalid Google credential");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const header = JSON.parse(
        base64UrlDecode(encodedHeader).toString("utf8")
    );

    const payload = JSON.parse(
        base64UrlDecode(encodedPayload).toString("utf8")
    );

    if (header.alg !== "RS256" || !header.kid) {
        throw new Error("Invalid Google token algorithm");
    }

    const issuerIsValid =
        payload.iss === "https://accounts.google.com" ||
        payload.iss === "accounts.google.com";

    if (!issuerIsValid) {
        throw new Error("Invalid Google token issuer");
    }

    if (payload.aud !== GOOGLE_CLIENT_ID) {
        throw new Error("Google token audience mismatch");
    }

    if (!payload.sub || !payload.email) {
        throw new Error("Google account information is incomplete");
    }

    if (payload.email_verified !== true) {
        throw new Error("Google email is not verified");
    }

    if (!payload.exp || Number(payload.exp) * 1000 <= Date.now()) {
        throw new Error("Google token has expired");
    }

    const keys = await getGoogleKeys();

    const jwk =
        keys.find(key => key.kid === header.kid);

    if (!jwk) {
        // Key rotation can happen. Clear the cache once and retry.
        googleKeysCache = null;
        googleKeysExpiresAt = 0;

        const freshKeys = await getGoogleKeys();
        const freshJwk =
            freshKeys.find(key => key.kid === header.kid);

        if (!freshJwk) {
            throw new Error("Google signing key not found");
        }

        return verifyGoogleSignature(
            encodedHeader,
            encodedPayload,
            encodedSignature,
            freshJwk,
            payload
        );
    }

    return verifyGoogleSignature(
        encodedHeader,
        encodedPayload,
        encodedSignature,
        jwk,
        payload
    );
}


function verifyGoogleSignature(
    encodedHeader,
    encodedPayload,
    encodedSignature,
    jwk,
    payload
) {

    const publicKey =
        crypto.createPublicKey({
            key: jwk,
            format: "jwk"
        });

    const verifier =
        crypto.createVerify("RSA-SHA256");

    verifier.update(
        `${encodedHeader}.${encodedPayload}`
    );

    verifier.end();

    const valid = verifier.verify(
        publicKey,
        base64UrlDecode(encodedSignature)
    );

    if (!valid) {
        throw new Error("Invalid Google token signature");
    }

    return payload;
}


/* =========================================================
   GOOGLE CONFIG
   ========================================================= */

router.get("/google/config", (req, res) => {

    res.json({
        success: true,
        configured: Boolean(GOOGLE_CLIENT_ID),
        clientId: GOOGLE_CLIENT_ID || null
    });
});


/* =========================================================
   REGISTER
   POST /api/auth/register
   ========================================================= */

router.post("/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const cleanName = String(name).trim();
        const cleanEmail = String(email).trim().toLowerCase();

        if (cleanName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Please enter your full name"
            });
        }

        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser =
            await User.findOne({ email: cleanEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        const user =
            await User.create({
                name: cleanName,
                email: cleanEmail,
                passwordHash,
                provider: "local",
                role: "staff"
            });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: safeUser(user)
        });

    } catch (error) {

        console.error("Registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create account"
        });
    }
});


/* =========================================================
   LOGIN
   POST /api/auth/login
   ========================================================= */

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const cleanEmail =
            String(email).trim().toLowerCase();

        if (!isValidEmail(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user =
            await User.findOne({ email: cleanEmail });

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const passwordMatches =
            await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = createToken(user);

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: safeUser(user)
        });

    } catch (error) {

        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to login"
        });
    }
});


/* =========================================================
   GOOGLE LOGIN / REGISTER
   POST /api/auth/google
   ========================================================= */

router.post("/google", async (req, res) => {

    try {

        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: "Google credential is required"
            });
        }

        const googleUser =
            await verifyGoogleCredential(credential);

        const cleanEmail =
            String(googleUser.email).trim().toLowerCase();

        const googleName =
            String(
                googleUser.name ||
                cleanEmail.split("@")[0]
            ).trim();

        let user =
            await User.findOne({ email: cleanEmail });

        if (!user) {

            user = await User.create({
                name: googleName,
                email: cleanEmail,
                passwordHash: null,
                provider: "google",
                googleId: googleUser.sub,
                role: "staff"
            });

        } else {

            // Link an existing local account to the verified
            // Google identity without replacing its password.
            user.googleId = googleUser.sub;

            if (user.provider !== "google") {
                user.provider = "google";
            }

            await user.save();
        }

        const token = createToken(user);

        return res.json({
            success: true,
            message: "Google login successful",
            token,
            user: safeUser(user)
        });

    } catch (error) {

        console.error("Google authentication error:", error.message);

        const configurationError =
            error.message === "Google login is not configured";

        return res.status(configurationError ? 503 : 401).json({
            success: false,
            message: configurationError
                ? "Google login is not configured yet"
                : "Google authentication failed"
        });
    }
});


module.exports = router;
