const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        type: {
    type: String,

    enum: [
        "new-order",
        "remaining",
        "sale"
    ],

    required: true
},

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        date: {
            type: String,
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        price: {
            type: Number,
            default: 0,
            min: 0
        },

        totalValue: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;