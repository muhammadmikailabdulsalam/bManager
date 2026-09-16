/* =========================================================
   bMANAGER - PROFIT CENTER
   ========================================================= */

const DAILY_SALES_API =
    "/api/reports/daily-sales";

const MONTHLY_SALES_API =
    "/api/inventory/monthly";

const ACTUAL_VALUES_API =
    "/api/profit/actual-values";


/* =========================================================
   1. APPLICATION STATE
   ========================================================= */

let reportType = "daily";
let selectedPeriod = getToday();

let salesReport = [];
let actualValues = {};


/* =========================================================
   2. DOM ELEMENTS
   ========================================================= */

const dailyBtn =
    document.getElementById("dailyBtn");

const monthlyBtn =
    document.getElementById("monthlyBtn");

const dailyControl =
    document.getElementById("dailyControl");

const monthlyControl =
    document.getElementById("monthlyControl");

const dailyPeriod =
    document.getElementById("dailyPeriod");

const monthlyPeriod =
    document.getElementById("monthlyPeriod");

const actualValueBody =
    document.getElementById("actualValueTableBody");

const actualValueStep =
    document.getElementById("actualValueStep");

const profitStep =
    document.getElementById("profitStep");

const nextBtn =
    document.getElementById("nextBtn");

const backBtn =
    document.getElementById("backBtn");

const homeBtn =
    document.getElementById("homeBtn");

const profitMessage =
    document.getElementById("profitMessage");

const totalSalesValue =
    document.getElementById("totalSalesValue");

const totalCost =
    document.getElementById("totalCost");

const totalProfit =
    document.getElementById("totalProfit");

const profitTableBody =
    document.getElementById("profitTableBody");

const tableSalesTotal =
    document.getElementById("tableSalesTotal");

const tableCostTotal =
    document.getElementById("tableCostTotal");

const tableProfitTotal =
    document.getElementById("tableProfitTotal");


/* =========================================================
   3. INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    setDefaultPeriods();
    attachEvents();
    showStep(1);

    await loadSalesReport();
    await loadActualValues();
    renderActualValueTable();
}


/* =========================================================
   4. EVENTS
   ========================================================= */

function attachEvents() {

    dailyBtn.addEventListener(
        "click",
        async () => {

            reportType = "daily";
            selectedPeriod = dailyPeriod.value;

            dailyBtn.classList.add("active");
            monthlyBtn.classList.remove("active");

            dailyControl.classList.remove("hidden");
            monthlyControl.classList.add("hidden");

            showStep(1);
            await loadSalesReport();
            await loadActualValues();
            renderActualValueTable();
        }
    );

    monthlyBtn.addEventListener(
        "click",
        async () => {

            reportType = "monthly";
            selectedPeriod = monthlyPeriod.value;

            monthlyBtn.classList.add("active");
            dailyBtn.classList.remove("active");

            monthlyControl.classList.remove("hidden");
            dailyControl.classList.add("hidden");

            showStep(1);
            await loadSalesReport();
            await loadActualValues();
            renderActualValueTable();
        }
    );

    dailyPeriod.addEventListener(
        "change",
        async () => {

            if (!dailyPeriod.value) return;

            selectedPeriod = dailyPeriod.value;

            showStep(1);
            await loadSalesReport();
            await loadActualValues();
            renderActualValueTable();
        }
    );

    monthlyPeriod.addEventListener(
        "change",
        async () => {

            if (!monthlyPeriod.value) return;

            selectedPeriod = monthlyPeriod.value;

            showStep(1);
            await loadSalesReport();
            await loadActualValues();
            renderActualValueTable();
        }
    );

    nextBtn.addEventListener(
        "click",
        goToProfitReport
    );

    backBtn.addEventListener(
        "click",
        () => showStep(1)
    );

    homeBtn.addEventListener(
        "click",
        () => {
            window.location.href = "index.html";
        }
    );
}


/* =========================================================
   5. DATE HELPERS
   ========================================================= */

function getToday() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getCurrentMonth() {

    return getToday().substring(0, 7);
}


function setDefaultPeriods() {

    dailyPeriod.value = getToday();
    monthlyPeriod.value = getCurrentMonth();

    selectedPeriod = dailyPeriod.value;
    reportType = "daily";
}


/* =========================================================
   6. LOAD SALES REPORT
   ========================================================= */

async function loadSalesReport() {

    clearMessage();

    try {

        const url =
            reportType === "daily"
                ? `${DAILY_SALES_API}/${encodeURIComponent(selectedPeriod)}`
                : `${MONTHLY_SALES_API}/${encodeURIComponent(selectedPeriod)}`;

        const response =
            await apiFetch(url);

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Unable to load sales report."
            );
        }

        if (reportType === "daily") {
            salesReport =
                Array.isArray(data.sales)
                    ? data.sales
                    : [];
        } else {
            salesReport =
                Array.isArray(data.products)
                    ? data.products
                    : [];
        }

        if (!salesReport.length) {
            showMessage(
                "No sales were recorded for the selected period.",
                "info"
            );
        }

    } catch (error) {

        console.error(
            "Profit sales report error:",
            error
        );

        salesReport = [];

        showMessage(
            error.message ||
            "Unable to load sales data.",
            "error"
        );
    }
}


/* =========================================================
   7. LOAD SAVED ACTUAL VALUES
   ========================================================= */

async function loadActualValues() {

    actualValues = {};

    if (!selectedPeriod) return;

    try {

        const url =
            `${ACTUAL_VALUES_API}` +
            `?type=${encodeURIComponent(reportType)}` +
            `&period=${encodeURIComponent(selectedPeriod)}`;

        const response =
            await apiFetch(url);

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Unable to load saved actual values."
            );
        }

        if (Array.isArray(data.actualValues)) {

            data.actualValues.forEach(item => {

                const productId =
                    item.productId ||
                    item.product?._id ||
                    item.product;

                if (!productId) return;

                actualValues[String(productId)] =
                    Number(item.actualValue) || 0;
            });
        }

    } catch (error) {

        console.error(
            "Actual value loading error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to load saved actual values.",
            "error"
        );
    }
}


/* =========================================================
   8. STEP ONE - ACTUAL VALUE INPUT
   ========================================================= */

function renderActualValueTable() {

    actualValueBody.innerHTML = "";

    if (!salesReport.length) {

        actualValueBody.innerHTML = `
            <tr>
                <td colspan="3">
                    No products with sales found for this period.
                </td>
            </tr>
        `;

        nextBtn.disabled = true;
        return;
    }

    nextBtn.disabled = false;

    salesReport.forEach((sale, index) => {

        const productId =
            sale.productId ||
            sale.id;

        const productName =
            sale.product ||
            "Unnamed Product";

        const savedValue =
            actualValues[String(productId)] ?? "";

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHTML(productName)}</td>
            <td>
                <input
                    class="profit-input actual-value-input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    data-product-id="${escapeHTML(String(productId))}"
                    value="${savedValue}"
                    placeholder="Enter actual value"
                >
            </td>
        `;

        actualValueBody.appendChild(row);
    });
}


/* =========================================================
   9. SAVE ACTUAL VALUES
   ========================================================= */

async function saveActualValues() {

    const inputs =
        document.querySelectorAll(
            ".actual-value-input"
        );

    if (!inputs.length) {
        showMessage(
            "No products with sales are available for this period.",
            "error"
        );
        return false;
    }

    const valuesToSave = [];

    for (const input of inputs) {

        const rawValue =
            input.value.trim();

        if (rawValue === "") {

            showMessage(
                "Please enter the actual value for every product.",
                "error"
            );

            input.focus();
            return false;
        }

        const value = Number(rawValue);

        if (!Number.isFinite(value) || value < 0) {

            showMessage(
                "Actual value must be zero or greater.",
                "error"
            );

            input.focus();
            return false;
        }

        valuesToSave.push({
            productId: input.dataset.productId,
            actualValue: value
        });
    }

    try {

        nextBtn.disabled = true;
        nextBtn.textContent = "Saving...";

        for (const item of valuesToSave) {

            const response =
                await apiFetch(
                    ACTUAL_VALUES_API,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            productId: item.productId,
                            periodType: reportType,
                            period: selectedPeriod,
                            actualValue: item.actualValue
                        })
                    }
                );

            if (!response) return false;

            const data =
                await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to save actual value."
                );
            }

            actualValues[String(item.productId)] =
                item.actualValue;
        }

        return true;

    } catch (error) {

        console.error(
            "Actual value save error:",
            error
        );

        showMessage(
            error.message ||
            "Could not save actual values.",
            "error"
        );

        return false;

    } finally {

        nextBtn.disabled = false;
        nextBtn.textContent = "Next →";
    }
}


/* =========================================================
   10. STEP TWO - PROFIT REPORT
   ========================================================= */

async function goToProfitReport() {

    clearMessage();

    if (!salesReport.length) {
        showMessage(
            "There are no sales to calculate profit for this period.",
            "error"
        );
        return;
    }

    const saved =
        await saveActualValues();

    if (!saved) return;

    buildProfitReport();
    showStep(2);
}


function buildProfitReport() {

    profitTableBody.innerHTML = "";

    let grandSales = 0;
    let grandCost = 0;
    let grandProfit = 0;
    let totalSold = 0;

    salesReport.forEach((sale, index) => {

        const productId =
            sale.productId ||
            sale.id;

        const productName =
            sale.product ||
            "Unnamed Product";

        const sold =
            Number(
                sale.quantitySold ??
                sale.sold ??
                0
            ) || 0;

        const salesValue =
            Number(
                sale.total ??
                sale.totalSales ??
                (sold * Number(sale.price || 0))
            ) || 0;

        const actualValue =
            Number(
                actualValues[String(productId)]
            ) || 0;

        const productCost =
            sold * actualValue;

        const productProfit =
            salesValue - productCost;

        totalSold += sold;
        grandSales += salesValue;
        grandCost += productCost;
        grandProfit += productProfit;

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHTML(productName)}</td>
            <td>${formatNumber(sold)}</td>
            <td>${formatMoney(salesValue)}</td>
            <td>${formatMoney(productCost)}</td>
            <td>${formatMoney(productProfit)}</td>
        `;

        profitTableBody.appendChild(row);
    });

    const totalRow =
        document.createElement("tr");

    totalRow.className =
        "profit-total-row";

    totalRow.innerHTML = `
        <td colspan="2">
            <strong>TOTAL</strong>
        </td>
        <td>
            <strong>${formatNumber(totalSold)}</strong>
        </td>
        <td>
            <strong>${formatMoney(grandSales)}</strong>
        </td>
        <td>
            <strong>${formatMoney(grandCost)}</strong>
        </td>
        <td>
            <strong>${formatMoney(grandProfit)}</strong>
        </td>
    `;

    profitTableBody.appendChild(totalRow);

    totalSalesValue.textContent =
        formatMoney(grandSales);

    totalCost.textContent =
        formatMoney(grandCost);

    totalProfit.textContent =
        formatMoney(grandProfit);

    tableSalesTotal.textContent =
        formatMoney(grandSales);

    tableCostTotal.textContent =
        formatMoney(grandCost);

    tableProfitTotal.textContent =
        formatMoney(grandProfit);
}


/* =========================================================
   11. STEP CONTROL
   ========================================================= */

function showStep(step) {

    if (step === 1) {

        actualValueStep.classList.remove("hidden");
        profitStep.classList.add("hidden");

    } else {

        actualValueStep.classList.add("hidden");
        profitStep.classList.remove("hidden");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   12. MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "info"
) {

    profitMessage.textContent =
        message;

    profitMessage.className =
        `profit-message ${type}`;

    profitMessage.classList.remove("hidden");
}


function clearMessage() {

    profitMessage.textContent = "";
    profitMessage.classList.add("hidden");
}


/* =========================================================
   13. FORMATTING
   ========================================================= */

function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("en-NG");
}


function formatMoney(value) {

    return Number(value || 0)
        .toLocaleString(
            "en-NG",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
