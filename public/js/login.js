const API_BASE =
  window.location.protocol === "file:" ||
  (window.location.port && window.location.port !== "5000")
    ? "http://localhost:5000/api"
    : "/api";
window.NEARSERVE_API_BASE = API_BASE;

const loginForm = document.getElementById("loginForm");
const emailOrPhoneInput = loginForm ? loginForm.querySelector("#emailOrPhone") : null;
const passwordInput = loginForm ? loginForm.querySelector("#password") : null;
const roleInput = loginForm ? loginForm.querySelector("#role") : null;
const loginBtn = loginForm ? loginForm.querySelector("#loginBtn") : null;

console.log("login.js loaded");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailOrPhone = emailOrPhoneInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value;

    if (!emailOrPhone || !password || !role) {
      showToast("Please fill all fields.");
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
        showToast(data.message || data.error || "Login failed");
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

      showToast("Login successful, but no redirect matched.");

    } catch (error) {
      console.error("Login error:", error);
      showToast("Could not connect to the NearServe server. Please start the server and open http://localhost:5000/login.html");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
}
