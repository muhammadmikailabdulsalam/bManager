/* =========================================================
   bMANAGER - DAILY SALES REPORT
   ========================================================= */


/* =========================================================
   1. API
   ========================================================= */

const API_URL =
    "/api/reports/daily-sales";


/* =========================================================
   2. DOM ELEMENTS
   ========================================================= */

const salesDate =
    document.getElementById("salesDate");

const viewReportBtn =
    document.getElementById("viewReportBtn");

const reportTitle =
    document.getElementById("reportTitle");

const reportDate =
    document.getElementById("reportDate");

const salesEmpty =
    document.getElementById("salesEmpty");

const salesTableWrapper =
    document.getElementById(
        "salesTableWrapper"
    );

const salesTableBody =
    document.getElementById(
        "salesTableBody"
    );

const salesQuantityTotal =
    document.getElementById(
        "salesQuantityTotal"
    );

const salesValueTotal =
    document.getElementById(
        "salesValueTotal"
    );


/* =========================================================
   3. DATE
   ========================================================= */

function getTodayDate() {

    const now =
        new Date();

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


/* =========================================================
   4. CURRENCY
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
   5. LOAD DAILY SALES
   ========================================================= */

async function loadDailySales() {

    const selectedDate =
        salesDate.value;


    if (!selectedDate) {

        alert(
            "bManager: Please select a date."
        );

        return;

    }


    /*
    Show loading state
    */

    viewReportBtn.disabled =
        true;

    viewReportBtn.textContent =
        "Loading...";


    try {

        const response =
            await apiFetch(
                `${API_URL}/${selectedDate}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load sales report"
            );

        }


        /*
        ------------------------------------------
        UPDATE REPORT HEADER
        ------------------------------------------
        */

        reportTitle.textContent =
            "Daily Sales Report";

        reportDate.textContent =
            formatDate(
                selectedDate
            );


        /*
        ------------------------------------------
        CLEAR OLD TABLE
        ------------------------------------------
        */

        salesTableBody.innerHTML =
            "";


        /*
        ------------------------------------------
        NO SALES
        ------------------------------------------
        */

        if (
            !data.sales ||
            data.sales.length === 0
        ) {

            salesEmpty.style.display =
                "block";

            salesTableWrapper.style.display =
                "none";

            salesQuantityTotal.textContent =
                "0";

            salesValueTotal.textContent =
                formatCurrency(0);

            return;

        }


        /*
        ------------------------------------------
        SHOW TABLE
        ------------------------------------------
        */

        salesEmpty.style.display =
            "none";

        salesTableWrapper.style.display =
            "block";


        /*
        ------------------------------------------
        CREATE TABLE ROWS
        ------------------------------------------
        */

        data.sales.forEach(
            (item, index) => {

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
                            item.product
                        )}
                    </td>

                    <td>
                        ${item.quantitySold}
                    </td>

                    <td>
                        ${formatCurrency(
                            item.price
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatCurrency(
                                item.total
                            )}
                        </strong>
                    </td>

                `;


                salesTableBody.appendChild(
                    row
                );

            }
        );


        /*
        ------------------------------------------
        TOTALS
        ------------------------------------------
        */

        salesQuantityTotal.textContent =
            data.totalQuantity;

        salesValueTotal.textContent =
            formatCurrency(
                data.totalValue
            );

    } catch (error) {

        console.error(
            "Daily sales error:",
            error
        );


        alert(
            `bManager: ${error.message}`
        );

    } finally {

        viewReportBtn.disabled =
            false;

        viewReportBtn.textContent =
            "View Report";

    }

}


/* =========================================================
   6. HTML SAFETY
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   7. INITIALISE CALENDAR
   ========================================================= */

salesDate.value =
    getTodayDate();


/* =========================================================
   8. BUTTON
   ========================================================= */

viewReportBtn.addEventListener(
    "click",
    loadDailySales
);