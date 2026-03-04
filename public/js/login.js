// login.js
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const emailOrPhone = document.getElementById("emailOrPhone").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value.trim().toLowerCase();

    if (!emailOrPhone || !password || !role) {
        alert("Please fill all fields and select a role.");
        return;
    }

    try {
        const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailOrPhone, password, role })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Login failed");
            return;
        }

        // ✅ Store user info immediately
        localStorage.setItem("phone", data.user.phone);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("name", data.user.name);
        

        // ================================
        // WORKER FLOW
        // ================================
        if (data.user.role !== "customer") {

            if (data.user.status === "pending_verification") {
                // 👉 Redirect to proof upload page
                window.location.href = "upload_proof.html";
                return;
            }

            if (data.user.status === "probation") {
                // 👉 Redirect to dashboard (probation jobs page)
                window.location.href = data.user.role + "_dashboard.html";
                return;
            }

            if (data.user.status === "blocked") {
                alert("Your account is blocked. Contact admin.");
                return;
            }

            if (data.user.status === "full_access") {
                window.location.href = data.user.role + "_dashboard.html";
                return;
            }
        }

        // ================================
        // CUSTOMER FLOW
        // ================================
        window.location.href = "booking.html";

    } catch (err) {
        console.error("Login error:", err);
        alert("Server error. Try again later.");
    }
});