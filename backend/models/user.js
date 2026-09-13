const mongoose = require("mongoose");

// User schema
const userSchema = new mongoose.Schema(
    {
        // User's display name
        name: {
            type: String,
            required: true,
            trim: true
        },

        // Email used for normal login
        // and also associated with Google accounts
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // Password hash for email/password accounts.
        //
        // Google-only users do NOT need a password,
        // so this field is optional.
        passwordHash: {
            type: String,
            default: null
        },

        // Authentication provider
        //
        // "local" = email + password
        // "google" = Google login
        provider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        },

        // Google account ID
        //
        // This is NOT the user's Google password.
        // It identifies the Google account that
        // authenticated through Google.
        googleId: {
            type: String,
            default: null,
            sparse: true
        },

        // User role
        //
        // We will use this later for permissions.
        role: {
            type: String,
            enum: ["admin", "staff"],
            default: "staff"
        }
    },
    {
        // Automatically creates:
        // createdAt
        // updatedAt
        timestamps: true
    }
);

// Create MongoDB model
const User = mongoose.model("User", userSchema);

module.exports = User;