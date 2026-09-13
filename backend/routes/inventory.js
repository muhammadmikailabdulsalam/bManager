/* =========================================================
   bManager - Daily Inventory
   Frontend ↔ Backend
   ========================================================= */


/* =========================================================
   1. API CONFIGURATION
   ========================================================= */

const API_URL = "http://localhost:3000/api/inventory";


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

let selectedDate = getTodayDate();

let inventoryData = [];


/* =========================================================
   3. DOM ELEMENTS
   ========================================================= */

// Date
const currentDate =
    document.getElementById("currentDate");

const selectedDateElement =
    document.getElementById("selectedDate");


// Date navigation
const previousDateBtn =
    document.getElementById("previousDateBtn");

const nextDateBtn =
    document.getElementById("nextDateBtn");


// Main buttons
const newOrderBtn =
    document.getElementById("newOrderBtn");

const remainingBtn =
    document.getElementById("remainingBtn");


// Modals
const newOrderModal =
    document.getElementById("newOrderModal");

const remainingModal =
    document.getElementById("remainingModal");


// Close buttons
const closeNewOrderBtn =
    document.getElementById("closeNewOrderBtn");

const cancelNewOrderBtn =
    document.getElementById("cancelNewOrderBtn");

const closeRemainingBtn =
    document.getElementById("closeRemainingBtn");

const cancelRemainingBtn =
    document.getElementById("cancelRemainingBtn");


// Forms
const newOrderForm =
    document.getElementById("newOrderForm");

const remainingForm =
    document.getElementById("remainingForm");


// Automatic dates
const newOrderDate =
    document.getElementById("newOrderDate");

const remainingDate =
    document.getElementById("remainingDate");


// Table
const inventoryTable =
    document.getElementById("inventoryTable");

const inventoryTableBody =
    document.getElementById("inventoryTableBody");


// Empty state
const emptyInventory =
    document.getElementById("emptyInventory");


// Search
const productSearch =
    document.getElementById("productSearch");


// Summary cards
const remainingTotalValue =
    document.getElementById(
        "remainingTotalValue"
    );

const newOrderTotalValue =
    document.getElementById(
        "newOrderTotalValue"
    );

const dailyTotalValue =
    document.getElementById(
        "dailyTotalValue"
    );


// Table totals
const tableRemainingTotal =
    document.getElementById(
        "tableRemainingTotal"
    );

const tableNewOrderTotal =
    document.getElementById(
        "tableNewOrderTotal"
    );

const tableProductTotal =
    document.getElementById(
        "tableProductTotal"
    );

const tableValueTotal =
    document.getElementById(
        "tableValueTotal"
    );


// Empty-state buttons
const emptyNewOrderBtn =
    document.getElementById(
        "emptyNewOrderBtn"
    );

const emptyRemainingBtn =
    document.getElementById(
        "emptyRemainingBtn"
    );


// Message
const messageBox =
    document.getElementById("messageBox");

const messageText =
    document.getElementById("messageText");

const closeMessageBtn =
    document.getElementById(
        "closeMessageBtn"
    );


/* =========================================================
   4. DATE FUNCTIONS
   ========================================================= */


/*
   Returns today's date in:

   YYYY-MM-DD

   Example:

   2026-08-13
*/

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/*
   Convert YYYY-MM-DD
   into a readable date.
*/

function formatDate(dateString) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "en-NG",
        {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );
}


/*
   Change selected date by
   a number of days.
*/

function changeDate(days) {

    const date =
        new Date(
            `${selectedDate}T00:00:00`
        );

    date.setDate(
        date.getDate() + days
    );

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    selectedDate =
        `${year}-${month}-${day}`;

    updateDateDisplay();

    loadInventory();
}


/*
   Update all date displays.
*/

function updateDateDisplay() {

    const readableDate =
        formatDate(selectedDate);

    currentDate.textContent =
        formatDate(getTodayDate());

    selectedDateElement.textContent =
        readableDate;

    newOrderDate.textContent =
        readableDate;

    remainingDate.textContent =
        readableDate;
}


/* =========================================================
   5. CURRENCY
   ========================================================= */

function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-NG",
        {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        }
    ).format(value || 0);

}


/* =========================================================
   6. LOAD INVENTORY
   ========================================================= */

async function loadInventory() {

    try {

        showMessage(
            "Loading inventory..."
        );


        const response =
            await fetch(
                `${API_URL}/date/${selectedDate}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load inventory"
            );

        }


        const data =
            await response.json();


        inventoryData =
            data.inventory || [];


        renderInventory();


        hideMessage();


    } catch (error) {

        console.error(
            "Inventory loading error:",
            error
        );


        showMessage(
            "Could not connect to bManager server."
        );

    }

}


/* =========================================================
   7. PROCESS INVENTORY
   ========================================================= */


/*
   Our backend stores:

   NEW ORDER

   {
       type: "new-order",
       product,
       quantity,
       price
   }


   REMAINING

   {
       type: "remaining",
       product,
       quantity
   }


   But the user shouldn't see
   separate records.

   We combine them by product.
*/

function buildDailyProducts() {

    const products = {};


    inventoryData.forEach(item => {

        const productName =
            item.product.trim();


        /*
           Create product if
           it doesn't exist yet.
        */

        if (!products[productName]) {

            products[productName] = {

                product:
                    productName,

                remaining: 0,

                newOrder: 0,

                price: 0

            };

        }


        /*
           Remaining stock
        */

        if (
            item.type ===
            "remaining"
        ) {

            products[
                productName
            ].remaining +=
                Number(item.quantity);

        }


        /*
           New order
        */

        if (
            item.type ===
            "new-order"
        ) {

            products[
                productName
            ].newOrder +=
                Number(item.quantity);


            /*
               Keep the latest
               known price.
            */

            products[
                productName
            ].price =
                Number(item.price);

        }

    });


    return Object.values(products);

}


/* =========================================================
   8. RENDER INVENTORY
   ========================================================= */

function renderInventory() {

    const products =
        buildDailyProducts();


    const search =
        productSearch.value
            .trim()
            .toLowerCase();


    const filteredProducts =
        products.filter(product =>

            product.product
                .toLowerCase()
                .includes(search)

        );


    /*
       Clear table.
    */

    inventoryTableBody.innerHTML =
        "";


    /*
       No inventory
    */

    if (
        products.length === 0
    ) {

        inventoryTable.style.display =
            "none";

        emptyInventory.style.display =
            "block";

        updateTotals([]);

        return;

    }


    /*
       Inventory exists
    */

    inventoryTable.style.display =
        "table";

    emptyInventory.style.display =
        "none";


    /*
       Create rows
    */

    filteredProducts.forEach(
        (product, index) => {

            const total =
                product.remaining +
                product.newOrder;


            const totalValue =
                total *
                product.price;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        product.product
                    )}
                </td>

                <td>
                    ${product.remaining}
                </td>

                <td>
                    ${product.newOrder}
                </td>

                <td>
                    <strong>
                        ${total}
                    </strong>
                </td>

                <td>
                    ${formatCurrency(
                        product.price
                    )}
                </td>

                <td>
                    <strong>
                        ${formatCurrency(
                            totalValue
                        )}
                    </strong>
                </td>

            `;


            inventoryTableBody.appendChild(
                row
            );

        }
    );


    updateTotals(products);

}


/* =========================================================
   9. UPDATE TOTALS
   ========================================================= */

function updateTotals(products) {

    let remainingQuantity = 0;

    let newOrderQuantity = 0;

    let totalQuantity = 0;

    let remainingValue = 0;

    let newOrderValue = 0;

    let totalValue = 0;


    products.forEach(product => {

        const remaining =
            Number(
                product.remaining
            );

        const newOrder =
            Number(
                product.newOrder
            );

        const price =
            Number(
                product.price
            );


        const total =
            remaining +
            newOrder;


        remainingQuantity +=
            remaining;

        newOrderQuantity +=
            newOrder;

        totalQuantity +=
            total;


        remainingValue +=
            remaining *
            price;

        newOrderValue +=
            newOrder *
            price;

        totalValue +=
            total *
            price;

    });


    /*
       Summary cards
    */

    remainingTotalValue.textContent =
        formatCurrency(
            remainingValue
        );

    newOrderTotalValue.textContent =
        formatCurrency(
            newOrderValue
        );

    dailyTotalValue.textContent =
        formatCurrency(
            totalValue
        );


    /*
       Table footer
    */

    tableRemainingTotal.textContent =
        remainingQuantity;

    tableNewOrderTotal.textContent =
        newOrderQuantity;

    tableProductTotal.textContent =
        totalQuantity;

    tableValueTotal.textContent =
        formatCurrency(
            totalValue
        );

}


/* =========================================================
   10. NEW ORDER
   ========================================================= */

async function saveNewOrder(event) {

    event.preventDefault();


    const product =
        document.getElementById(
            "orderProduct"
        ).value.trim();


    const quantity =
        Number(
            document.getElementById(
                "orderQuantity"
            ).value
        );


    const price =
        Number(
            document.getElementById(
                "orderPrice"
            ).value
        );


    if (!product) {

        showMessage(
            "Please enter a product."
        );

        return;

    }


    if (
        !quantity ||
        quantity <= 0
    ) {

        showMessage(
            "Quantity must be greater than 0."
        );

        return;

    }


    if (
        price < 0 ||
        Number.isNaN(price)
    ) {

        showMessage(
            "Please enter a valid price."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API_URL}/order`,
                {

                    method: "POST",

                   