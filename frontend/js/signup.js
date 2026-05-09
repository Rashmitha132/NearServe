const SIGNUP_API_BASE = window.NEARSERVE_API_BASE;

// -----------------------------
// Signup form
// -----------------------------
const signupForm = document.getElementById("signupForm");
const signupBtn = signupForm ? signupForm.querySelector("#signupBtn") : null;

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = signupForm.querySelector("#name");
    const emailInput = signupForm.querySelector("#email");
    const phoneInput = signupForm.querySelector("#phone");
    const passwordInput = signupForm.querySelector("#password");
    const confirmPasswordInput = signupForm.querySelector("#confirmPassword");
    const roleInput = signupForm.querySelector("#role");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : password;
    const role = roleInput.value;

    if (!name || !email || !phone || !password || !role) {
      showToast("Please fill all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      showToast("Please enter a valid phone number.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      showToast("Password must be at least 8 characters and include one uppercase letter and one special character.");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }

    const originalText = signupBtn.textContent;
    signupBtn.disabled = true;
    signupBtn.textContent = "Creating Account...";

    try {
      const res = await fetch(`${SIGNUP_API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Signup failed");
        return;
      }

      showToast(data.message || "Signup successful. Please check your email to verify your account.", "success");

      nameInput.value = "";
      emailInput.value = "";
      phoneInput.value = "";
      passwordInput.value = "";
      if (confirmPasswordInput) confirmPasswordInput.value = "";
      roleInput.value = "";

      window.setTimeout(() => {
        window.location.href = "login.html#login";
      }, 1800);
    } catch (error) {
      console.error("Signup error:", error);
      showToast("Could not create account. Please check your connection and try again.");
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = originalText;
    }
  });
}
