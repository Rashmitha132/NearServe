const API_BASE = "/api";

const loginForm = document.getElementById("loginForm");
const emailOrPhoneInput = document.getElementById("emailOrPhone");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const loginBtn = document.getElementById("loginBtn");

console.log("login.js loaded");
console.log("loginForm:", loginForm);
console.log("loginBtn:", loginBtn);

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("submit event triggered");

    const emailOrPhone = emailOrPhoneInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value;

    console.log("form values:", { emailOrPhone, password, role });

    if (!emailOrPhone || !password || !role) {
      alert("Please fill all fields.");
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    try {
      console.log("sending login request...");

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          emailOrPhone,
          password,
          role
        })
      });

      const data = await res.json().catch(() => ({}));
      console.log("LOGIN RESPONSE:", data);

      if (!res.ok) {
        alert(data.message || data.error || "Login failed");
        return;
      }

      const user = data.user || {};

      localStorage.setItem("userName", user.name || "");
      localStorage.setItem("userPhone", user.phone || "");
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("userRole", user.role || "");
      localStorage.setItem("userStatus", user.status || "");

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (user.role === "customer") {
        window.location.href = "dashboard.html";
        return;
      }

      if (user.status === "pending_verification" || user.status === "proof_submitted") {
        window.location.href = "verification_pending.html";
        return;
      }

      if (user.role === "plumber") {
        window.location.href = "plumber_dashboard.html";
        return;
      }

      if (user.role === "electrician") {
        window.location.href = "electrician_dashboard.html";
        return;
      }

      if (user.role === "carpenter") {
        window.location.href = "carpenter_dashboard.html";
        return;
      }

      alert("Login successful, but no redirect matched.");
    } catch (error) {
      console.error("Login error:", error);
      alert("Server error during login");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
}