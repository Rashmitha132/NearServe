const API_BASE = "/api";
window.NEARSERVE_API_BASE = API_BASE;

const loginForm = document.getElementById("loginForm");
const emailOrPhoneInput = loginForm ? loginForm.querySelector("#emailOrPhone") : null;
const passwordInput = loginForm ? loginForm.querySelector("#password") : null;
const roleInput = loginForm ? loginForm.querySelector("#role") : null;
const loginBtn = loginForm ? loginForm.querySelector("#loginBtn") : null;
const resendVerificationBtn = document.getElementById("resendVerificationBtn");

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
      showToast("Enter a valid email or a 10-digit phone number starting with 6, 7, 8, or 9.");
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
        if (data.code === "EMAIL_NOT_VERIFIED" && resendVerificationBtn) {
          resendVerificationBtn.style.display = "block";
        }
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

      localStorage.removeItem("token");
      localStorage.removeItem("authToken");

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
      showToast("Could not connect to the NearServe server. Please try again.");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
}

if (resendVerificationBtn && emailOrPhoneInput) {
  resendVerificationBtn.addEventListener("click", async () => {
    const emailOrPhone = emailOrPhoneInput.value.trim();
    if (!emailOrPhone) {
      showToast("Enter your email or phone number first");
      emailOrPhoneInput.focus();
      return;
    }

    resendVerificationBtn.disabled = true;
    resendVerificationBtn.textContent = "Sending...";

    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || "Could not send verification email");
        return;
      }

      showToast(data.message || "Verification email sent", "success");
    } catch {
      showToast("Server error while sending verification email");
    } finally {
      resendVerificationBtn.disabled = false;
      resendVerificationBtn.textContent = "Resend verification email";
    }
  });
}
