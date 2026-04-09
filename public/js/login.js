const API_BASE = "/api";

const loginForm = document.getElementById("loginForm");
const emailOrPhoneInput = document.getElementById("emailOrPhone");
const passwordInput = document.getElementById("password");
const roleInput = document.getElementById("role");
const loginBtn = document.getElementById("loginBtn");

console.log("login.js loaded");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailOrPhone = emailOrPhoneInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value;

    if (!emailOrPhone || !password || !role) {
      alert("Please fill all fields.");
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    try {
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

      if (!res.ok) {
        alert(data.message || data.error || "Login failed");
        return;
      }

      const user = data.user || data;

      const userName = user.name || "";
      const userPhone = user.phone || "";
      const userEmail = user.email || "";
      const userRole = (user.role || "").toLowerCase();
      const userStatus = (user.status || "").toLowerCase();

      // ✅ SAVE USER DATA - save BOTH old + new keys for compatibility
      localStorage.setItem("userName", userName);
      localStorage.setItem("userPhone", userPhone);
      localStorage.setItem("userEmail", userEmail);
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userStatus", userStatus);

      localStorage.setItem("name", userName);
      localStorage.setItem("phone", userPhone);
      localStorage.setItem("email", userEmail);
      localStorage.setItem("role", userRole);
      localStorage.setItem("status", userStatus);

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      console.log("Login success:", user);

      // ✅ CUSTOMER
      if (userRole === "customer") {
        window.location.href = "booking.html";
        return;
      }

      // ✅ WORKER STATUS-BASED REDIRECTS
      if (userRole === "carpenter") {
        if (userStatus === "pending_verification" || userStatus === "proof_submitted") {
          window.location.href = "upload_proof.html";
          return;
        }

        if (userStatus === "probation") {
          window.location.href = "carpenter_dashboard.html";
          return;
        }

        if (userStatus === "full_access") {
          window.location.href = "carpenter_requests.html";
          return;
        }
      }

      if (userRole === "plumber") {
        if (userStatus === "pending_verification" || userStatus === "proof_submitted") {
          window.location.href = "upload_proof.html";
          return;
        }

        if (userStatus === "probation") {
          window.location.href = "plumber_dashboard.html";
          return;
        }

        if (userStatus === "full_access") {
          window.location.href = "plumber_requests.html";
          return;
        }
      }

      if (userRole === "electrician") {
        if (userStatus === "pending_verification" || userStatus === "proof_submitted") {
          window.location.href = "upload_proof.html";
          return;
        }

        if (userStatus === "probation") {
          window.location.href = "electrician_dashboard.html";
          return;
        }

        if (userStatus === "full_access") {
          window.location.href = "electrician_requests.html";
          return;
        }
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