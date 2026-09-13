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


// Multi-row entry tables
const newOrderRows =
    document.getElementById("newOrderRows");

const remainingRows =
    document.getElementById("remainingRows");

const addOrderRowBtn =
    document.getElementById("addOrderRowBtn");

const addRemainingRowBtn =
    document.getElementById("addRemainingRowBtn");

const newOrderEntryTotal =
    document.getElementById("newOrderEntryTotal");

const remainingEntryTotal =
    document.getElementById("remainingEntryTotal");


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


// Edit product
const editProductModal =
    document.getElementById("editProductModal");
const editProductForm =
    document.getElementById("editProductForm");
const editProductId =
    document.getElementById("editProductId");
const editProductName =
    document.getElementById("editProductName");
const editProductPrice =
    document.getElementById("editProductPrice");

const editProductRemaining =
    document.getElementById("editProductRemaining");

const editProductNewOrder =
    document.getElementById("editProductNewOrder");

const deleteProductBtn =
    document.getElementById("deleteProductBtn");

const closeEditProductBtn =
    document.getElementById("closeEditProductBtn");
const cancelEditProductBtn =
    document.getElementById("cancelEditProductBtn");


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
    await apiFetch(
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

    /*
       The backend now performs the inventory calculation.

       For the selected day:

       Opening / Previous Remaining
       + Today's New Order
       = Current Inventory

       Today's Closing (remaining) is kept separately
       for the next day's opening and for sales reports.
    */

    return inventoryData.map(item => ({

        product: item.product,

        productId: item.productId || "",

        remaining: Number(item.remaining || 0),

        newOrder: Number(item.newOrder || 0),

        total: Number(item.total || 0),

        closing: Number(item.closing || 0),

        price: Number(item.price || 0)

    }));
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
                product.total;


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

               <td>
    ${
        selectedDate === getTodayDate()
            ? `
                <button
                    type="button"
                    class="secondary-btn edit-product-btn"
                    data-product-id="${escapeHTML(String(product.productId || ""))}"
                    data-product-name="${escapeHTML(product.product)}"
                    data-product-price="${product.price}"
                    data-product-remaining="${product.closing}"
                    data-product-new-order="${product.newOrder}">
                    ✏️ Edit
                </button>
            `
            : ""
    }
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

    const rows = Array.from(
        newOrderRows.querySelectorAll(".order-entry-row")
    );

    const orders = [];

    for (const row of rows) {

        const product = row.querySelector('[name="product"]').value.trim();
        const quantity = Number(row.querySelector('[name="quantity"]').value);
        const price = Number(row.querySelector('[name="price"]').value);

        if (!product) {
            showMessage("Please enter a product in every row.");
            return;
        }

        if (!quantity || quantity <= 0) {
            showMessage("Every order quantity must be greater than 0.");
            return;
        }

        if (Number.isNaN(price) || price < 0) {
            showMessage("Please enter a valid price in every row.");
            return;
        }

        orders.push({ product, quantity, price });
    }

    if (orders.length === 0) {
        showMessage("Please add at least one product.");
        return;
    }

    try {

        for (const order of orders) {

            const response = await apiFetch(`${API_URL}/order`, {
              
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(order)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to save order"
                );
            }
        }

        showMessage(
            `${orders.length} order${orders.length === 1 ? "" : "s"} saved successfully! ✅`
        );

        resetNewOrderRows();
        closeNewOrderModal();
        await loadInventory();

    } catch (error) {

        console.error("Save orders error:", error);
        showMessage(error.message);

    }
}


/* =========================================================
   11. REMAINING STOCK
   ========================================================= */

async function saveRemaining(event) {

    event.preventDefault();

    const rows = Array.from(
        remainingRows.querySelectorAll(".remaining-entry-row")
    );

    const items = [];

    for (const row of rows) {

        const product = row.querySelector('[name="product"]').value.trim();
        const quantity = Number(row.querySelector('[name="quantity"]').value);
        const priceInput = row.querySelector('[name="price"]');
        const price = priceInput.value === "" ? 0 : Number(priceInput.value);

        if (!product) {
            showMessage("Please enter a product in every row.");
            return;
        }

        if (Number.isNaN(quantity) || quantity < 0) {
            showMessage("Please enter a valid quantity in every row.");
            return;
        }

        if (Number.isNaN(price) || price < 0) {
            showMessage("Please enter a valid price in every row.");
            return;
        }

        items.push({ product, quantity, price });
    }

    if (items.length === 0) {
        showMessage("Please add at least one product.");
        return;
    }

    try {

        for (const item of items) {

            const response = await apiFetch(`${API_URL}/remaining`, {
              
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(item)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to save remaining stock"
                );
            }
        }

        showMessage(
            `${items.length} stock item${items.length === 1 ? "" : "s"} saved successfully! ✅`
        );

        resetRemainingRows();
        closeRemainingModal();
        await loadInventory();

    } catch (error) {

        console.error("Save remaining error:", error);
        showMessage(error.message);

    }
}


/* =========================================================
   12. MULTI-ROW ENTRY FUNCTIONS
   ========================================================= */

function calculateEntryTotal(row) {

    const quantity =
        Number(row.querySelector('[name="quantity"]').value) || 0;

    const price =
        Number(row.querySelector('[name="price"]').value) || 0;

    const total = quantity * price;

    const totalElement =
        row.querySelector(".entry-row-total");

    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }

    return total;
}


function updateNewOrderEntryTotal() {

    let total = 0;

    newOrderRows
        .querySelectorAll(".order-entry-row")
        .forEach(row => {
            total += calculateEntryTotal(row);
        });

    newOrderEntryTotal.textContent = formatCurrency(total);
}


function updateRemainingEntryTotal() {

    let total = 0;

    remainingRows
        .querySelectorAll(".remaining-entry-row")
        .forEach(row => {
            total += calculateEntryTotal(row);
        });

    remainingEntryTotal.textContent = formatCurrency(total);
}


function attachOrderRowEvents(row) {

    row.querySelectorAll("input").forEach(input => {
        input.addEventListener(
            "input",
            updateNewOrderEntryTotal
        );
    });

    row.querySelector(".remove-row-btn").addEventListener(
        "click",
        () => {
            row.remove();
            updateNewOrderEntryTotal();
        }
    );
}


function attachRemainingRowEvents(row) {

    row.querySelectorAll("input").forEach(input => {
        input.addEventListener(
            "input",
            updateRemainingEntryTotal
        );
    });

    row.querySelector(".remove-row-btn").addEventListener(
        "click",
        () => {
            row.remove();
            updateRemainingEntryTotal();
        }
    );
}


function addOrderRow() {

    const row = document.createElement("tr");

    row.className = "order-entry-row";

    row.innerHTML = `
        <td>
            <input type="text" name="product" placeholder="Product" required>
        </td>
        <td>
            <input type="number" name="quantity" placeholder="Qty" min="1" required>
        </td>
        <td>
            <input type="number" name="price" placeholder="₦" min="0" step="0.01" required>
        </td>
        <td class="entry-row-total">₦0</td>
        <td>
            <button type="button" class="remove-row-btn">×</button>
        </td>
    `;

    newOrderRows.appendChild(row);
    attachOrderRowEvents(row);
    updateNewOrderEntryTotal();
}


function addRemainingRow() {

    const row = document.createElement("tr");

    row.className = "remaining-entry-row";

    row.innerHTML = `
        <td>
            <input type="text" name="product" placeholder="Product" required>
        </td>
        <td>
            <input type="number" name="quantity" placeholder="Qty" min="0" required>
        </td>
        <td>
            <input type="number" name="price" placeholder="₦" min="0" step="0.01">
        </td>
        <td class="entry-row-total">₦0</td>
        <td>
            <button type="button" class="remove-row-btn">×</button>
        </td>
    `;

    remainingRows.appendChild(row);
    attachRemainingRowEvents(row);
    updateRemainingEntryTotal();
}


function resetNewOrderRows() {

    newOrderRows.innerHTML = `
        <tr class="order-entry-row">
            <td>
                <input type="text" id="orderProduct" name="product" placeholder="Product" required>
            </td>
            <td>
                <input type="number" id="orderQuantity" name="quantity" placeholder="Qty" min="1" required>
            </td>
            <td>
                <input type="number" id="orderPrice" name="price" placeholder="₦" min="0" step="0.01" required>
            </td>
            <td class="entry-row-total">₦0</td>
            <td>
                <button type="button" class="remove-row-btn" disabled>×</button>
            </td>
        </tr>
    `;

    attachOrderRowEvents(
        newOrderRows.querySelector(".order-entry-row")
    );

    updateNewOrderEntryTotal();
}


function resetRemainingRows() {

    remainingRows.innerHTML = `
        <tr class="remaining-entry-row">
            <td>
                <input type="text" id="remainingProduct" name="product" placeholder="Product" required>
            </td>
            <td>
                <input type="number" id="remainingQuantity" name="quantity" placeholder="Qty" min="0" required>
            </td>
            <td>
                <input type="number" name="price" placeholder="₦" min="0" step="0.01">
            </td>
            <td class="entry-row-total">₦0</td>
            <td>
                <button type="button" class="remove-row-btn" disabled>×</button>
            </td>
        </tr>
    `;

    attachRemainingRowEvents(
        remainingRows.querySelector(".remaining-entry-row")
    );

    updateRemainingEntryTotal();
}


/* =========================================================
   13. MODAL FUNCTIONS
   ========================================================= */

function openNewOrderModal() {

    updateDateDisplay();

    newOrderModal.classList.remove(
        "hidden"
    );


    document.getElementById(
        "orderProduct"
    ).focus();

}


function closeNewOrderModal() {

    newOrderModal.classList.add(
        "hidden"
    );

}


function openRemainingModal() {

    updateDateDisplay();

    remainingModal.classList.remove(
        "hidden"
    );


    document.getElementById(
        "remainingProduct"
    ).focus();

}


function closeRemainingModal() {

    remainingModal.classList.add(
        "hidden"
    );

}


/* =========================================================
   13. EDIT / DELETE PRODUCT
   ========================================================= */

function openEditProduct(product) {
    editProductId.value = product.productId || "";
    editProductName.value = product.product || "";
    editProductRemaining.value = Number(product.closing || 0);
    editProductNewOrder.value = Number(product.newOrder || 0);
    editProductPrice.value = Number(product.price || 0);
    editProductModal.classList.remove("hidden");
    editProductName.focus();
}

function closeEditProduct() {
    editProductModal.classList.add("hidden");
}

async function saveEditedProduct(event) {
    event.preventDefault();
    const id = editProductId.value.trim();
    const name = editProductName.value.trim();
    const remainingQuantity = Number(editProductRemaining.value);
    const newOrderQuantity = Number(editProductNewOrder.value);
    const price = Number(editProductPrice.value);

    if (!id) return showMessage("Product ID is missing.");
    if (!name) return showMessage("Product name is required.");
    if (!Number.isFinite(remainingQuantity) || remainingQuantity < 0) return showMessage("Remaining quantity must be 0 or greater.");
    if (!Number.isFinite(newOrderQuantity) || newOrderQuantity < 0) return showMessage("New order quantity must be 0 or greater.");
    if (!Number.isFinite(price) || price < 0) return showMessage("Please enter a valid price.");

    try {
        const response = await apiFetch(
            `http://localhost:3000/api/products/${encodeURIComponent(id)}`,
            {
                method:"PUT",
                headers:{ "Content-Type":"application/json" },
                body:JSON.stringify({ name, price, remainingQuantity, newOrderQuantity })
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to update product");
        closeEditProduct();
        showMessage("Product updated successfully! ✅");
        await loadInventory();
    } catch (error) {
        console.error("Edit product error:", error);
        showMessage(error.message);
    }
}

async function deleteProduct() {
    const id = editProductId.value.trim();
    const name = editProductName.value.trim();
    if (!id) return showMessage("Product ID is missing.");
    if (!window.confirm(`Delete "${name}" completely?\n\nThis will permanently remove the product and all of its inventory records from MongoDB.`)) return;

    try {
        const response = await apiFetch(
            `http://localhost:3000/api/products/${encodeURIComponent(id)}`,
            { method:"DELETE" }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to delete product");
        closeEditProduct();
        showMessage("Product deleted successfully! 🗑️");
        await loadInventory();
    } catch (error) {
        console.error("Delete product error:", error);
        showMessage(error.message);
    }
}


/* =========================================================
   13. MESSAGE SYSTEM
   ========================================================= */

let messageTimer;


function showMessage(message) {

    clearTimeout(messageTimer);


    messageText.textContent =
        message;


    messageBox.classList.remove(
        "hidden"
    );


    messageTimer =
        setTimeout(() => {

            hideMessage();

        }, 3500);

}


function hideMessage() {

    messageBox.classList.add(
        "hidden"
    );

}


/* =========================================================
   14. HTML SAFETY
   ========================================================= */

function escapeHTML(value) {

    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   15. EVENT LISTENERS
   ========================================================= */


/* Multi-row entry controls */

addOrderRowBtn.addEventListener(
    "click",
    addOrderRow
);

addRemainingRowBtn.addEventListener(
    "click",
    addRemainingRow
);

attachOrderRowEvents(
    newOrderRows.querySelector(".order-entry-row")
);

attachRemainingRowEvents(
    remainingRows.querySelector(".remaining-entry-row")
);

updateNewOrderEntryTotal();
updateRemainingEntryTotal();


/* New order */

newOrderBtn.addEventListener(
    "click",
    openNewOrderModal
);


emptyNewOrderBtn.addEventListener(
    "click",
    openNewOrderModal
);


/* Remaining */

remainingBtn.addEventListener(
    "click",
    openRemainingModal
);


emptyRemainingBtn.addEventListener(
    "click",
    openRemainingModal
);


/* Close new order */

closeNewOrderBtn.addEventListener(
    "click",
    closeNewOrderModal
);


cancelNewOrderBtn.addEventListener(
    "click",
    closeNewOrderModal
);


/* Close remaining */

closeRemainingBtn.addEventListener(
    "click",
    closeRemainingModal
);


cancelRemainingBtn.addEventListener(
    "click",
    closeRemainingModal
);


/* Forms */

newOrderForm.addEventListener(
    "submit",
    saveNewOrder
);


remainingForm.addEventListener(
    "submit",
    saveRemaining
);


/* Date navigation */

previousDateBtn.addEventListener(
    "click",
    () => {

        changeDate(-1);

    }
);


nextDateBtn.addEventListener(
    "click",
    () => {

        changeDate(1);

    }
);


/* Search */

productSearch.addEventListener(
    "input",
    renderInventory
);


/* Edit product */

inventoryTableBody.addEventListener(
    "click",
    event => {
        const button = event.target.closest(".edit-product-btn");
        if (!button) return;

        openEditProduct({
            productId: button.dataset.productId,
            product: button.dataset.productName,
            price: button.dataset.productPrice,
            remaining: button.dataset.productRemaining,
            newOrder: button.dataset.productNewOrder
        });
    }
);

editProductForm.addEventListener(
    "submit",
    saveEditedProduct
);

closeEditProductBtn.addEventListener(
    "click",
    closeEditProduct
);

cancelEditProductBtn.addEventListener(
    "click",
    closeEditProduct
);

deleteProductBtn.addEventListener(
    "click",
    deleteProduct
);

editProductModal
    .querySelector(".modal-overlay")
    .addEventListener(
        "click",
        closeEditProduct
    );


/* Message close */

closeMessageBtn.addEventListener(
    "click",
    hideMessage
);


/* =========================================================
   16. CLOSE MODAL WHEN CLICKING OVERLAY
   ========================================================= */

newOrderModal
    .querySelector(".modal-overlay")
    .addEventListener(
        "click",
        closeNewOrderModal
    );


remainingModal
    .querySelector(".modal-overlay")
    .addEventListener(
        "click",
        closeRemainingModal
    );


/* =========================================================
   17. ESC KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }


        closeNewOrderModal();

        closeRemainingModal();

        closeEditProduct();

    }
);


/* =========================================================
   18. START APPLICATION
   ========================================================= */

updateDateDisplay();

loadInventory();