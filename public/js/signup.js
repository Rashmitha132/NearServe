// js/signup.js
const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ✅ Use getElementById instead of form.fieldname to avoid conflicts
    const name     = document.getElementById("name").value.trim();
    const email    = document.getElementById("email").value.trim();
    const phone    = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();
    const role     = document.getElementById("role").value;

    // ── Validate all fields ──
    if (!name) {
        alert("Please enter your name!");
        return;
    }

    if (!email) {
        alert("Please enter your email!");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address!");
        return;
    }

    if (!phone) {
        alert("Please enter your phone number!");
        return;
    }

    if (!/^\d{10}$/.test(phone)) {
        alert("Please enter a valid 10-digit phone number!");
        return;
    }

    if (!password) {
        alert("Please enter a password!");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters!");
        return;
    }

    if (!role) {
        alert("Please select your role!");
        return;
    }

    // ── All valid — send to server ──
    try {
        const res = await fetch("/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, phone, password, role })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            window.location.href = "login.html";
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Signup failed. Try again.");
    }
});