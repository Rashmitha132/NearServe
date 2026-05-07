// js/script.js

const form = document.getElementById("bookingForm");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeEl = document.getElementById("welcomeUser");

// Get logged-in user's phone and name from localStorage
const loggedInPhone = localStorage.getItem("phone");
const storedUserName = localStorage.getItem("name") || localStorage.getItem("userName") || "";
const userName = storedUserName.trim().toLowerCase() === "xyz" ? "" : storedUserName.trim();


// Optional: Show welcome message
if (userName && welcomeEl) {
    welcomeEl.innerText = `Welcome, ${userName}!`;
}

// Logout functionality
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        if (window.nearServeLogout) {
            window.nearServeLogout();
        } else {
            window.location.href = "login.html";
        }
    });
}

// Booking form submission
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = {
            name: form.name.value,
            phone: loggedInPhone, // ✅ use phone from logged-in user
            service: form.service.value,
            address: form.address.value,
            date: form.date.value
        };

        try {
            const res = await fetch(`${window.NEARSERVE_API_BASE}/bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                // No need to set phone again
                window.location.href = "confirmation.html";
            } else {
                showToast(data.error);
            }
        } catch (err) {
            console.log(err);
            showToast("Error booking service");
        }
    });
}
