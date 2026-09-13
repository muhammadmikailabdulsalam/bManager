// bManager App Controller

function getToken() {
    return localStorage.getItem("bmanager_token");
}

function getCurrentUser() {
    const user = localStorage.getItem("bmanager_user");

    if (!user) return null;

    try {
        return JSON.parse(user);
    } catch (error) {
        return null;
    }
}

// Logout
function logout() {
    localStorage.removeItem("bmanager_token");
    localStorage.removeItem("bmanager_user");

    window.location.href = "login.html";
}

// Protect page
function requireLogin() {
    if (!getToken()) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// Secure API request
async function apiFetch(url, options = {}) {
    const token = getToken();

    if (!token) {
        logout();
        return null;
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
        return null;
    }

    return response;
}

// Secure JSON request
async function apiFetchJSON(url, options = {}) {
    try {
        const response = await apiFetch(url, options);

        if (!response) return null;

        const data = await response.json();

        if (!response.ok) {
            console.error("API error:", data);
        }

        return data;

    } catch (error) {
        console.error("Request failed:", error);

        return {
            success: false,
            message: "Unable to connect to bManager server."
        };
    }
}

// Show current user
function displayCurrentUser() {
    const user = getCurrentUser();
    const element = document.getElementById("currentUser");

    if (user && element) {
        element.textContent = user.name || user.email || "User";
    }
}

// Setup logout button
function setupLogoutButton() {
    const button = document.getElementById("logoutBtn");

    if (button) {
        button.addEventListener("click", logout);
    }
}

// Start app
document.addEventListener("DOMContentLoaded", () => {
    if (!requireLogin()) return;

    displayCurrentUser();
    setupLogoutButton();

    console.log("bManager session active 🔐");
});