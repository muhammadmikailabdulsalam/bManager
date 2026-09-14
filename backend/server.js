/*
==================================================
bManager Backend
File: server.js
Purpose: Main Backend Server
==================================================
*/

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDatabase =
    require("./config/database");

const Product =
    require("./models/product");

const Inventory =
    require("./models/inventory");
const ActualValue =
    require("./models/actualvalue");

const authRoutes =
    require("./routes/auth");
const authenticateToken =
    require("./middleware/auth");

/*
==================================================
APP CONFIGURATION
==================================================
*/

const app = express();

const PORT = 3000;


/*
==================================================
MIDDLEWARE
==================================================
*/

/*
 * The frontend is served by this same Express server.
 * Only the local bManager origins are allowed for cross-origin
 * requests; the API is not open to every website.
 */
const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Origin not allowed by bManager CORS policy"));
        }
    })
);

app.use(express.json());

const path = require("path");

app.use(express.static(path.join(__dirname, "../frontend")));


/*
==================================================
AUTH ROUTES
==================================================
*/

// Register + Login
// POST /api/auth/register
// POST /api/auth/login
app.use(
    "/api/auth",
    authRoutes
);

/*
==================================================
JWT PROTECTION
==================================================

Authentication routes above remain public:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/google

Every other /api route now requires
a valid JWT.
==================================================
*/

app.use(
    "/api",
    authenticateToken
);


/*
==================================================
DATE HELPER
==================================================
*/

function getTodayDate() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Africa/Lagos"
        }
    ).format(new Date());

}



/*
==================================================
INVENTORY / REPORT BUSINESS LOGIC
==================================================

The frontend should not know how stock moves are
calculated. These helpers keep the business rules
inside the backend.
*/

function getPreviousDate(dateString) {

    const date = new Date(`${dateString}T00:00:00Z`);

    date.setUTCDate(date.getUTCDate() - 1);

    return date.toISOString().slice(0, 10);
}

function getDaysInMonth(monthString) {

    const [year, month] = monthString.split("-").map(Number);

    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = new Date(Date.UTC(year, month, 0));

    const days = [];

    for (
        let date = first;
        date <= last;
        date.setUTCDate(date.getUTCDate() + 1)
    ) {
        days.push(date.toISOString().slice(0, 10));
    }

    return days;
}

async function getDailyInventorySummary(requestedDate) {

    const previousDate = getPreviousDate(requestedDate);

    const [previousRemaining, currentRecords] =
        await Promise.all([
            Inventory
                .find({
                    date: previousDate,
                    type: "remaining"
                })
                .populate("product", "name price"),

            Inventory
                .find({
                    date: requestedDate,
                    type: {
                        $in: ["new-order", "remaining"]
                    }
                })
                .populate("product", "name price")
                .sort({ createdAt: 1 })
        ]);

    const products = {};

    function ensureProduct(product) {

        if (!product) return null;

        const id = String(product._id);

        if (!products[id]) {

            products[id] = {
                productId: id,
                product: product.name,
                opening: 0,
                newOrder: 0,
                closing: 0,
                price: Number(product.price || 0)
            };
        }

        return products[id];
    }

    previousRemaining.forEach(item => {

        const product = ensureProduct(item.product);

        if (!product) return;

        product.opening += Number(item.quantity || 0);
    });

    currentRecords.forEach(item => {

        const product = ensureProduct(item.product);

        if (!product) return;

        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || item.product.price || 0);

        if (item.type === "new-order") {
            product.newOrder += quantity;
            if (price >= 0) product.price = price;
        }

        if (item.type === "remaining") {
            product.closing += quantity;
            if (price > 0) product.price = price;
        }
    });

    const inventory = Object.values(products)
        .map(product => {

            const currentInventory =
                product.opening + product.newOrder;

            return {
                productId: product.productId,
                product: product.product,
                remaining: product.opening,
                newOrder: product.newOrder,
                total: currentInventory,
                closing: product.closing,
                price: product.price,
                totalValue: currentInventory * product.price
            };
        })
        .filter(product =>
            product.remaining > 0 ||
            product.newOrder > 0 ||
            product.closing > 0
        );

    return {
        date: requestedDate,
        previousDate,
        inventory
    };
}

async function getDailySalesReport(requestedDate) {

    const summary =
        await getDailyInventorySummary(requestedDate);

    const sales = summary.inventory
        .map(item => {

            const sold =
                item.remaining +
                item.newOrder -
                item.closing;

            const quantitySold =
                Math.max(0, sold);

            return {
                productId: item.productId,
                product: item.product,
                opening: item.remaining,
                newOrder: item.newOrder,
                closing: item.closing,
                quantitySold,
                price: item.price,
                total: quantitySold * item.price
            };
        })
        .filter(item => item.quantitySold > 0);

    return {
        success: true,
        date: requestedDate,
        previousDate: summary.previousDate,
        sales,
        totalQuantity: sales.reduce(
            (sum, item) => sum + item.quantitySold,
            0
        ),
        totalValue: sales.reduce(
            (sum, item) => sum + item.total,
            0
        )
    };
}

async function getMonthlySalesReport(requestedMonth) {

    const [year, month] = requestedMonth.split("-").map(Number);
    const startDate = `${requestedMonth}-01`;
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const endDate = nextMonth.toISOString().slice(0, 10);

    const [monthlyRecords, previousRemaining] =
        await Promise.all([
            Inventory
                .find({
                    date: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    type: {
                        $in: ["new-order", "remaining"]
                    }
                })
                .populate("product", "name price")
                .sort({ date: 1, createdAt: 1 }),

            Inventory
                .find({
                    date: { $lt: startDate },
                    type: "remaining"
                })
                .populate("product", "name price")
                .sort({ date: -1, createdAt: -1 })
        ]);

    const openingByProduct = {};

    previousRemaining.forEach(item => {

        if (!item.product) return;

        const id = String(item.product._id);

        if (openingByProduct[id] !== undefined) return;

        openingByProduct[id] = Number(item.quantity || 0);
    });

    const byDate = {};

    monthlyRecords.forEach(item => {

        if (!item.product) return;

        const date = item.date;
        const id = String(item.product._id);

        if (!byDate[date]) byDate[date] = {};

        if (!byDate[date][id]) {
            byDate[date][id] = {
                productId: id,
                product: item.product.name,
                newOrder: 0,
                closing: null,
                price: Number(item.product.price || 0)
            };
        }

        const record = byDate[date][id];
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || item.product.price || 0);

        if (item.type === "new-order") {
            record.newOrder += quantity;
            record.price = price;
        }

        if (item.type === "remaining") {
            record.closing =
                (record.closing === null ? 0 : record.closing) +
                quantity;

            if (price > 0) record.price = price;
        }
    });

    const previousClosing = { ...openingByProduct };
    const sales = [];
    const warnings = [];

    for (const date of getDaysInMonth(requestedMonth)) {

        const day = byDate[date];

        if (!day) continue;

        for (const id of Object.keys(day)) {

            const item = day[id];

            // A closing/remaining value is required to calculate
            // that day's sales for this product.
            if (item.closing === null) {
                warnings.push(
                    `${date}: ${item.product} has no remaining stock record.`
                );
                continue;
            }

            const opening = previousClosing[id] || 0;
            const sold =
                opening +
                item.newOrder -
                item.closing;

            const quantitySold = Math.max(0, sold);

            sales.push({
                date,
                productId: item.productId,
                product: item.product,
                opening,
                newOrder: item.newOrder,
                closing: item.closing,
                quantitySold,
                price: item.price,
                total: quantitySold * item.price
            });

            previousClosing[id] = item.closing;
        }
    }

    const totals = sales.reduce(
        (result, item) => {
            result.quantity += item.quantitySold;
            result.value += item.total;
            return result;
        },
        { quantity: 0, value: 0 }
    );

    // Aggregate the daily product rows into the format used by
    // the existing Monthly Sales page.
    const products = {};

    sales.forEach(item => {

        const id = item.productId;

        if (!products[id]) {
            products[id] = {
                productId: id,
                product: item.product,
                quantitySold: 0,
                total: 0,
                price: item.price
            };
        }

        products[id].quantitySold += item.quantitySold;
        products[id].total += item.total;
        products[id].price = item.price;
    });

    return {
        success: true,
        month: requestedMonth,
        totalProducts: Object.keys(products).length,
        totalQuantitySold: totals.quantity,
        totalSales: totals.value,
        products: Object.values(products),
        warnings
    };
}

/*
==================================================
HOME ROUTE
==================================================
*/

app.get("/", (req, res) => {

    res.json({

        success: true,

        app: "bManager",

        status: "Running",

        database: "MongoDB Atlas",

        message:
            "bManager API is working 🚀"

    });

});


/*
==================================================
DATABASE TEST ROUTE
==================================================
*/

app.get(
    "/api/inventory",
    async (req, res) => {

        try {

            const inventory =
                await Inventory
                    .find()
                    .populate(
                        "product",
                        "name price"
                    )
                    .sort({
                        createdAt: -1
                    });


            const formattedInventory =
                inventory.map(item => ({

                    id: item._id,

                    type: item.type,

                    date: item.date,

                    productId:
                        item.product._id,

                    product:
                        item.product.name,

                    quantity:
                        item.quantity,

                    price:
                        item.price,

                    totalValue:
                        item.totalValue

                }));


            res.json({

                success: true,

                count:
                    formattedInventory.length,

                inventory:
                    formattedInventory

            });

        } catch (error) {

            console.error(
                "Inventory error:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load inventory"

            });

        }

    }
);


/*
==================================================
NEW ORDER
==================================================
*/

app.post(
    "/api/inventory/order",
    async (req, res) => {

        try {

            const {
                product,
                quantity,
                price
            } = req.body;


            if (
                !product ||
                product.trim() === ""
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product is required"

                });

            }


            if (
                quantity === undefined ||
                Number(quantity) <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Quantity must be greater than 0"

                });

            }


            if (
                price === undefined ||
                Number(price) < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Price cannot be negative"

                });

            }


            const productName =
                product.trim();

            const numericPrice =
                Number(price);

            const numericQuantity =
                Number(quantity);


            let productRecord =
                await Product.findOne({
                    name: productName
                });


            if (!productRecord) {

                productRecord =
                    await Product.create({

                        name:
                            productName,

                        price:
                            numericPrice

                    });

            } else {

                productRecord.price =
                    numericPrice;

                await productRecord.save();

            }


            const order =
                await Inventory.create({

                    type:
                        "new-order",

                    product:
                        productRecord._id,

                    date:
                        getTodayDate(),

                    quantity:
                        numericQuantity,

                    price:
                        numericPrice,

                    totalValue:
                        numericQuantity *
                        numericPrice

                });


            res.status(201).json({

                success: true,

                message:
                    "New order saved to MongoDB successfully",

                order: {

                    id:
                        order._id,

                    type:
                        order.type,

                    date:
                        order.date,

                    product:
                        productRecord.name,

                    quantity:
                        order.quantity,

                    price:
                        order.price,

                    totalValue:
                        order.totalValue

                }

            });


        } catch (error) {

            console.error(
                "New order error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to save new order"

            });

        }

    }
);


/*
==================================================
REMAINING STOCK
==================================================
*/

app.post(
    "/api/inventory/remaining",
    async (req, res) => {

        try {

            const {
                product,
                quantity
            } = req.body;


            if (
                !product ||
                product.trim() === ""
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product is required"

                });

            }


            if (
                quantity === undefined ||
                Number(quantity) < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Quantity cannot be negative"

                });

            }


            const productName =
                product.trim();

            const numericQuantity =
                Number(quantity);


            const productRecord =
                await Product.findOne({
                    name: productName
                });


            if (!productRecord) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product does not exist. Add it through New Order first."

                });

            }


            const today = getTodayDate();
            const previousDate = getPreviousDate(today);
            const [previousRemaining, todayOrders] = await Promise.all([
                Inventory.find({ product: productRecord._id, date: previousDate, type: "remaining" }),
                Inventory.find({ product: productRecord._id, date: today, type: "new-order" })
            ]);
            const openingStock = previousRemaining.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const newOrderToday = todayOrders.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const availableStock = openingStock + newOrderToday;
            if (numericQuantity > availableStock) {
                return res.status(400).json({ success: false, message: `Remaining stock (${numericQuantity}) cannot be greater than current inventory (${availableStock}).` });
            }


            const remaining =
                await Inventory.create({

                    type:
                        "remaining",

                    product:
                        productRecord._id,

                    date:
                        getTodayDate(),

                    quantity:
                        numericQuantity,

                    price:
                        productRecord.price,

                    totalValue:
                        numericQuantity *
                        productRecord.price

                });


            res.status(201).json({

                success: true,

                message:
                    "Remaining stock saved to MongoDB successfully",

                remaining: {

                    id:
                        remaining._id,

                    type:
                        remaining.type,

                    date:
                        remaining.date,

                    product:
                        productRecord.name,

                    quantity:
                        remaining.quantity,

                    price:
                        remaining.price,

                    totalValue:
                        remaining.totalValue

                }

            });


        } catch (error) {

            console.error(
                "Remaining stock error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to save remaining stock"

            });

        }

    }
);

/*
==================================================
RECORD SALE
==================================================
*/

app.post(
    "/api/inventory/sale",
    async (req, res) => {

        try {

            const {
                product,
                quantity
            } = req.body;


            if (
                !product ||
                product.trim() === ""
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product is required"

                });

            }


            if (
                quantity === undefined ||
                Number(quantity) <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Quantity must be greater than 0"

                });

            }


            const productName =
                product.trim();

            const numericQuantity =
                Number(quantity);


            const productRecord =
                await Product.findOne({
                    name: productName
                });


            if (!productRecord) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product does not exist."

                });

            }


            const sale =
                await Inventory.create({

                    type:
                        "sale",

                    product:
                        productRecord._id,

                    date:
                        getTodayDate(),

                    quantity:
                        numericQuantity,

                    price:
                        productRecord.price,

                    totalValue:
                        numericQuantity *
                        productRecord.price

                });


            res.status(201).json({

                success: true,

                message:
                    "Sale saved successfully",

                sale: {

                    id:
                        sale._id,

                    date:
                        sale.date,

                    product:
                        productRecord.name,

                    quantity:
                        sale.quantity,

                    price:
                        sale.price,

                    totalValue:
                        sale.totalValue

                }

            });


        } catch (error) {

            console.error(
                "Sale error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to save sale"

            });

        }

    }
);

/*
==================================================
GET INVENTORY SUMMARY FOR SPECIFIC DATE
==================================================
*/

app.get("/api/inventory/date/:date", async (req, res) => {
    try {
        const requestedDate = req.params.date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
            return res.status(400).json({ success: false, message: "Date must be in YYYY-MM-DD format" });
        }
        const summary = await getDailyInventorySummary(requestedDate);
        res.json({ success: true, ...summary });
    } catch (error) {
        console.error("Date inventory error:", error.message);
        res.status(500).json({ success: false, message: "Failed to load daily inventory" });
    }
});

/*
==================================================
EDIT PRODUCT
TODAY ONLY
==================================================
*/

app.put(
    "/api/products/:id",
    async (req, res) => {

        try {

            const {
                name,
                price,
                remainingQuantity,
                newOrderQuantity
            } = req.body;


            const productName =
                typeof name === "string"
                    ? name.trim()
                    : "";

            const numericPrice =
                Number(price);

            const numericRemaining =
                Number(remainingQuantity);

            const numericNewOrder =
                Number(newOrderQuantity);


            if (!productName) {

                return res.status(400).json({
                    success: false,
                    message: "Product name is required"
                });

            }


            if (
                !Number.isFinite(numericPrice) ||
                numericPrice < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Price must be a valid non-negative number"
                });

            }


            if (
                !Number.isFinite(numericRemaining) ||
                numericRemaining < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Remaining quantity must be a valid non-negative number"
                });

            }


            if (
                !Number.isFinite(numericNewOrder) ||
                numericNewOrder < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "New order quantity must be a valid non-negative number"
                });

            }


            const product =
                await Product.findById(req.params.id);


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });

            }


            const today =
                getTodayDate();


            const historicalRecord =
                await Inventory.findOne({
                    product: product._id,
                    date: { $lt: today }
                });


            if (
                historicalRecord &&
                product.name !== productName
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Product name is locked because this product has historical inventory records."
                });

            }


            const existing =
                await Product.findOne({
                    name: productName,
                    _id: {
                        $ne: product._id
                    }
                });


            if (existing) {

                return res.status(409).json({
                    success: false,
                    message:
                        " This product has already exist"
                });

            }


            product.price =
                numericPrice;


            if (!historicalRecord) {

                product.name =
                    productName;

            }


            const previousDate = getPreviousDate(today);
            const previousRemaining = await Inventory.find({ product: product._id, date: previousDate, type: "remaining" });
            const openingStock = previousRemaining.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const availableStock = openingStock + numericNewOrder;
            if (numericRemaining > availableStock) {
                return res.status(400).json({ success: false, message: `Remaining stock (${numericRemaining}) cannot be greater than current inventory (${availableStock}).` });
            }

            await product.save();


            await Inventory.deleteMany({
                product: product._id,
                date: today
            });


            if (numericRemaining > 0) {

                await Inventory.create({

                    type:
                        "remaining",

                    product:
                        product._id,

                    date:
                        today,

                    quantity:
                        numericRemaining,

                    price:
                        numericPrice,

                    totalValue:
                        numericRemaining *
                        numericPrice

                });

            }


            if (numericNewOrder > 0) {

                await Inventory.create({

                    type:
                        "new-order",

                    product:
                        product._id,

                    date:
                        today,

                    quantity:
                        numericNewOrder,

                    price:
                        numericPrice,

                    totalValue:
                        numericNewOrder *
                        numericPrice

                });

            }


            res.json({

                success: true,

                message:
                    "Today's inventory updated successfully",

                product: {

                    id:
                        product._id,

                    name:
                        product.name,

                    price:
                        product.price,

                    remainingQuantity:
                        numericRemaining,

                    newOrderQuantity:
                        numericNewOrder

                }

            });


        } catch (error) {

            console.error(
                "Edit product error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to update today's inventory"

            });

        }

    }
);

/*
==================================================
DELETE TODAY'S INVENTORY ONLY
==================================================
*/

app.delete(
    "/api/products/:id",
    async (req, res) => {

        try {

            const product =
                await Product.findById(
                    req.params.id
                );


            if (!product) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            const today =
                getTodayDate();


            await Inventory.deleteMany({

                product:
                    product._id,

                date:
                    today

            });


            res.json({

                success: true,

                message:
                    "Removed successfully from today's inventory"

            });


        } catch (error) {

            console.error(
                "Delete today's inventory error:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to remove today's inventory"

            });

        }

    }
);

/*
==================================================
DAILY SALES REPORT
==================================================
*/

app.get(
    "/api/reports/daily/:date",
    async (req, res) => {

        try {

            const requestedDate =
                req.params.date;


            const currentDate =
                new Date(
                    `${requestedDate}T00:00:00`
                );

            currentDate.setDate(
                currentDate.getDate() - 1
            );


            const previousYear =
                currentDate.getFullYear();

            const previousMonth =
                String(
                    currentDate.getMonth() + 1
                ).padStart(2, "0");

            const previousDay =
                String(
                    currentDate.getDate()
                ).padStart(2, "0");


            const previousDate =
                `${previousYear}-${previousMonth}-${previousDay}`;


            const previousInventory =
                await Inventory.find({
                    date: previousDate,
                    type: "remaining"
                }).populate(
                    "product",
                    "name price"
                );


            const todayOrders =
                await Inventory.find({
                    date: requestedDate,
                    type: "new-order"
                }).populate(
                    "product",
                    "name price"
                );


            const todayRemaining =
                await Inventory.find({
                    date: requestedDate,
                    type: "remaining"
                }).populate(
                    "product",
                    "name price"
                );


            const products = {};


            function createProduct(
                product
            ) {

                if (!product) return;


                const id =
                    String(product._id);


                if (!products[id]) {

                    products[id] = {

                        productId:
                            id,

                        product:
                            product.name,

                        opening:
                            0,

                        newOrder:
                            0,

                        closing:
                            0,

                        price:
                            Number(
                                product.price || 0
                            )

                    };

                }

            }


            previousInventory.forEach(
                item => {

                    createProduct(
                        item.product
                    );


                    if (!item.product)
                        return;


                    const id =
                        String(
                            item.product._id
                        );


                    products[id].opening +=
                        Number(
                            item.quantity || 0
                        );

                }
            );


            todayOrders.forEach(
                item => {

                    createProduct(
                        item.product
                    );


                    if (!item.product)
                        return;


                    const id =
                        String(
                            item.product._id
                        );


                    products[id].newOrder +=
                        Number(
                            item.quantity || 0
                        );


                    products[id].price =
                        Number(
                            item.price || 0
                        );

                }
            );


            todayRemaining.forEach(
                item => {

                    createProduct(
                        item.product
                    );


                    if (!item.product)
                        return;


                    const id =
                        String(
                            item.product._id
                        );


                    products[id].closing +=
                        Number(
                            item.quantity || 0
                        );

                }
            );


            const sales =
                Object.values(
                    products
                ).map(product => {

                    const available =
                        product.opening +
                        product.newOrder;


                    const sold =
                        available -
                        product.closing;


                    const total =
                        sold *
                        product.price;


                    return {

                        productId:
                            product.productId,

                        product:
                            product.product,

                        opening:
                            product.opening,

                        newOrder:
                            product.newOrder,

                        closing:
                            product.closing,

                        sold:
                            sold,

                        price:
                            product.price,

                        total:
                            total

                    };

                });


            const totalQuantity =
                sales.reduce(
                    (sum, item) =>
                        sum +
                        item.sold,
                    0
                );


            const totalSales =
                sales.reduce(
                    (sum, item) =>
                        sum +
                        item.total,
                    0
                );


            res.json({

                success:
                    true,

                date:
                    requestedDate,

                previousDate:
                    previousDate,

                sales:
                    sales,

                totals: {

                    quantity:
                        totalQuantity,

                    value:
                        totalSales

                }

            });


        } catch (error) {

            console.error(
                "Daily sales report error:",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to generate daily sales report"

            });

        }

    }
);

/*
==================================================
DAILY SALES REPORT
==================================================
*/

app.get("/api/reports/daily-sales/:date", async (req, res) => {
    try {
        const requestedDate = req.params.date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
            return res.status(400).json({ success: false, message: "Date must be in YYYY-MM-DD format" });
        }
        res.json(await getDailySalesReport(requestedDate));
    } catch (error) {
        console.error("Daily sales report error:", error.message);
        res.status(500).json({ success: false, message: "Failed to generate daily sales report" });
    }
});

/*
==================================================
MONTHLY SALES REPORT
==================================================
*/

app.get("/api/inventory/monthly/:month", async (req, res) => {
    try {
        const requestedMonth = req.params.month;
        if (!/^\d{4}-\d{2}$/.test(requestedMonth)) {
            return res.status(400).json({ success: false, message: "Month must be in YYYY-MM format" });
        }
        const [, monthNumber] = requestedMonth.split("-").map(Number);
        if (monthNumber < 1 || monthNumber > 12) {
            return res.status(400).json({ success: false, message: "Invalid month" });
        }
        res.json(await getMonthlySalesReport(requestedMonth));
    } catch (error) {
        console.error("Monthly sales report error:", error.message);
        res.status(500).json({ success: false, message: "Failed to generate monthly sales report" });
    }
});

/*
==================================================
PROFIT CENTER - PRODUCTS
==================================================
*/

app.get(
    "/api/profit/products",
    async (req, res) => {
        try {
            const products = await Product
                .find()
                .sort({ name: 1 });

            res.json({
                success: true,
                products: products.map(product => ({
                    id: product._id,
                    name: product.name
                }))
            });
        } catch (error) {
            console.error(
                "Profit products error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message: "Failed to load products"
            });
        }
    }
);

/*
==================================================
PROFIT CENTER - ACTUAL VALUES
==================================================
*/

app.get(
    "/api/profit/actual-values",
    async (req, res) => {
        try {
            const { type, period } = req.query;

            if (!["daily", "monthly"].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Report type must be daily or monthly"
                });
            }

            const validPeriod =
                type === "daily"
                    ? /^\d{4}-\d{2}-\d{2}$/.test(period || "")
                    : /^\d{4}-\d{2}$/.test(period || "");

            if (!validPeriod) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid report period"
                });
            }

            const values = await ActualValue
                .find({
                    periodType: type,
                    period
                });

            res.json({
                success: true,
                actualValues: values.map(item => ({
                    id: item._id,
                    productId: item.product,
                    actualValue: item.actualValue
                }))
            });
        } catch (error) {
            console.error(
                "Actual values loading error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message: "Failed to load actual values"
            });
        }
    }
);


app.put(
    "/api/profit/actual-values",
    async (req, res) => {
        try {
            const {
                productId,
                periodType,
                period,
                actualValue
            } = req.body;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: "Product is required"
                });
            }

            if (!["daily", "monthly"].includes(periodType)) {
                return res.status(400).json({
                    success: false,
                    message: "Period type must be daily or monthly"
                });
            }

            const validPeriod =
                periodType === "daily"
                    ? /^\d{4}-\d{2}-\d{2}$/.test(period || "")
                    : /^\d{4}-\d{2}$/.test(period || "");

            if (!validPeriod) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid report period"
                });
            }

            const numericActualValue = Number(actualValue);

            if (
                !Number.isFinite(numericActualValue) ||
                numericActualValue < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Actual value must be a valid non-negative number"
                });
            }

            const product = await Product.findById(productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const value = await ActualValue.findOneAndUpdate(
                {
                    product: productId,
                    periodType,
                    period
                },
                {
                    product: productId,
                    periodType,
                    period,
                    actualValue: numericActualValue
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );

            res.json({
                success: true,
                message: "Actual value saved successfully",
                actualValue: {
                    id: value._id,
                    productId: value.product,
                    periodType: value.periodType,
                    period: value.period,
                    actualValue: value.actualValue
                }
            });
        } catch (error) {
            console.error(
                "Actual value save error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message: "Failed to save actual value"
            });
        }
    }
);


/*
==================================================
START SERVER
==================================================
*/

async function startServer() {
  await connectDatabase();

  // Only listen when running locally
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
  }
}

// Start the server (for local development)
startServer();

// Export the app for Vercel
module.exports = app;