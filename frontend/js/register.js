/* =========================================
   bManager Register
   Email/password + Google Identity Services
   ========================================= */

const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const messageBox = document.getElementById("messageBox");
const registerBtn = document.getElementById("registerBtn");
const googleButton = document.getElementById("googleButton");


function showMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.className = "message " + type;
}


passwordToggle.addEventListener("click", () => {

    const hidden = passwordInput.type === "password";

    passwordInput.type = hidden ? "text" : "password";
    passwordToggle.textContent = hidden ? "🙈" : "👁️";
    passwordToggle.setAttribute(
        "aria-label",
        hidden ? "Hide password" : "Show password"
    );
    passwordToggle.title =
        hidden ? "Hide password" : "Show password";
});


registerForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!name || !email || !password) {
            showMessage("Please complete all fields.");
            return;
        }

        if (password.length < 8) {
            showMessage("Password must be at least 8 characters.");
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = "Creating Account...";

        try {

            const response = await fetch(
                "/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(
                    data.message || "Registration failed."
                );
                return;
            }

            showMessage(
                "Account created successfully. Redirecting to login...",
                "success"
            );

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 700);

        } catch (error) {

            console.error("Registration error:", error);
            showMessage(
                "Unable to connect to bManager server."
            );

        } finally {

            registerBtn.disabled = false;
            registerBtn.textContent = "Create Account";
        }
    }
);


async function googleLogin(credential) {

    try {

        const response = await fetch(
            "/api/auth/google",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ credential })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            showMessage(
                data.message || "Google registration failed."
            );
            return;
        }

        localStorage.setItem(
            "bmanager_token",
            data.token
        );

        localStorage.setItem(
            "bmanager_user",
            JSON.stringify(data.user)
        );

        showMessage(
            "Google account connected. Opening bManager...",
            "success"
        );

        setTimeout(() => {
            window.location.href = "index.html";
        }, 500);

    } catch (error) {

        console.error("Google registration error:", error);
        showMessage("Unable to complete Google registration.");
    }
}


async function setupGoogleLogin() {

    try {

        const response = await fetch(
            "/api/auth/google/config"
        );

        const config = await response.json();

        if (!config.configured || !config.clientId) {
            googleButton.innerHTML =
                '<div class="google-unavailable">Google login is not configured yet.</div>';
            return;
        }

        await loadGoogleScript();

        window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: response => {
                googleLogin(response.credential);
            }
        });

        window.google.accounts.id.renderButton(
            googleButton,
            {
                theme: "outline",
                size: "large",
                width: 360,
                text: "continue_with",
                shape: "rectangular"
            }
        );

    } catch (error) {

        console.error("Google setup error:", error);
        googleButton.innerHTML =
            '<div class="google-unavailable">Google login is unavailable.</div>';
    }
}


function loadGoogleScript() {

    if (window.google && window.google.accounts) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {

        const existing =
            document.querySelector(
                'script[data-google-identity="true"]'
            );

        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            return;
        }

        const script = document.createElement("script");

        script.src =
            "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = "true";

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

setupGoogleLogin();
