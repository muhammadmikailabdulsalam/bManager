/* =========================================================
   bMANAGER - MONTHLY SALES REPORT
   ========================================================= */

const API_URL =
    "/api/inventory/monthly";


/* =========================================================
   1. DOM ELEMENTS
   ========================================================= */

const salesMonth =
    document.getElementById("salesMonth");

const viewReportBtn =
    document.getElementById("viewReportBtn");

const reportTitle =
    document.getElementById("reportTitle");

const reportDate =
    document.getElementById("reportDate");

const salesEmpty =
    document.getElementById("salesEmpty");

const salesTableWrapper =
    document.getElementById("salesTableWrapper");

const salesTableBody =
    document.getElementById("salesTableBody");

const salesQuantityTotal =
    document.getElementById("salesQuantityTotal");

const salesValueTotal =
    document.getElementById("salesValueTotal");

const totalQuantitySold =
    document.getElementById("totalQuantitySold");

const totalSalesValue =
    document.getElementById("totalSalesValue");

const monthlySummary =
    document.getElementById("monthlySummary");


/* =========================================================
   2. DATE / MONTH HELPERS
   ========================================================= */

function getCurrentMonth() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    return `${year}-${month}`;
}


function formatMonth(monthString) {

    const date =
        new Date(`${monthString}-01T00:00:00`);

    return date.toLocaleDateString(
        "en-NG",
        {
            year: "numeric",
            month: "long"
        }
    );
}


/* =========================================================
   3. CURRENCY
   ========================================================= */

function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-NG",
        {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        }
    ).format(Number(value) || 0);
}


/* =========================================================
   4. VIEW MONTHLY REPORT
   ========================================================= */

async function viewMonthlyReport() {

    const month =
        salesMonth.value;

    if (!month) {

        alert(
            "bManager: Please select a month."
        );

        return;
    }

    viewReportBtn.disabled = true;
    viewReportBtn.textContent = "Loading...";

    try {

        /*
         * The backend owns the sales calculation.
         * It applies the rule for every day:
         *
         * previous closing
         * + current new order
         * - current closing
         * = current day sales
         *
         * The backend then adds all days in the
         * selected month.
         */

        const response =
            await apiFetch(
                `${API_URL}/${encodeURIComponent(month)}`
            );

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to load monthly sales report"
            );
        }

        renderReport(data, month);

    } catch (error) {

        console.error(
            "Monthly sales error:",
            error
        );

        salesEmpty.style.display = "block";
        salesTableWrapper.style.display = "none";
        monthlySummary.style.display = "none";

        salesEmpty.innerHTML = `
            <div class="empty-icon">⚠️</div>
            <h3>Could not load report</h3>
            <p>${escapeHTML(error.message)}</p>
        `;

    } finally {

        viewReportBtn.disabled = false;
        viewReportBtn.textContent = "View Report";
    }
}


/* =========================================================
   5. RENDER REPORT
   ========================================================= */

function renderReport(data, month) {

    const sales =
        Array.isArray(data.products)
            ? data.products
            : [];

    reportTitle.textContent =
        "Monthly Sales Report";

    reportDate.textContent =
        formatMonth(month);

    salesTableBody.innerHTML = "";

    if (sales.length === 0) {

        salesEmpty.style.display = "block";
        salesTableWrapper.style.display = "none";
        monthlySummary.style.display = "none";

        salesQuantityTotal.textContent = "0";
        salesValueTotal.textContent = formatCurrency(0);
        totalQuantitySold.textContent = "0";
        totalSalesValue.textContent = formatCurrency(0);

        return;
    }

    salesEmpty.style.display = "none";
    salesTableWrapper.style.display = "block";
    monthlySummary.style.display = "grid";

    let quantityTotal = 0;
    let valueTotal = 0;

    sales
        .sort((a, b) =>
            String(a.product || "")
                .localeCompare(String(b.product || ""))
        )
        .forEach((sale, index) => {

            const quantity =
                Number(sale.quantitySold) || 0;

            const total =
                Number(sale.total) || 0;

            quantityTotal += quantity;
            valueTotal += total;

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(sale.product)}</td>
                <td><strong>${quantity}</strong></td>
                <td>${formatCurrency(sale.price)}</td>
                <td><strong>${formatCurrency(total)}</strong></td>
            `;

            salesTableBody.appendChild(row);
        });

    salesQuantityTotal.textContent =
        quantityTotal;

    salesValueTotal.textContent =
        formatCurrency(valueTotal);

    totalQuantitySold.textContent =
        quantityTotal;

    totalSalesValue.textContent =
        formatCurrency(valueTotal);
}


/* =========================================================
   6. HTML SAFETY
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   7. INITIALISE
   ========================================================= */

salesMonth.value =
    getCurrentMonth();

viewReportBtn.addEventListener(
    "click",
    viewMonthlyReport
);
