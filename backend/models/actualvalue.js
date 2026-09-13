/*
==================================================
bManager
File: backend/models/actualvalue.js
Purpose: Store the unit cost entered for each
         product and reporting period.
==================================================
*/

const mongoose = require("mongoose");

const actualValueSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        periodType: {
            type: String,
            enum: ["daily", "monthly"],
            required: true
        },

        period: {
            type: String,
            required: true
        },

        // Actual Value = unit cost, not total cost.
        actualValue: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

actualValueSchema.index(
    {
        product: 1,
        periodType: 1,
        period: 1
    },
    {
        unique: true
    }
);

const ActualValue = mongoose.model(
    "ActualValue",
    actualValueSchema
);

module.exports = ActualValue;
