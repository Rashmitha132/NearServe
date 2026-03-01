// js/mybooking.js
const tableBody = document.querySelector("#bookingTable tbody");
const welcomeEl = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");

// Get logged-in user's phone and name from localStorage
const phone = localStorage.getItem("phone");
const userName = localStorage.getItem("name");

// ⚠ Force login if not logged in


// Show welcome message if available
if (userName && welcomeEl) {
    welcomeEl.innerText = `Welcome, ${userName}! Here are your bookings:`;
}

// Logout button redirects to login page
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        window.location.href = "login.html";
    });
}

// Fetch bookings for this user
async function fetchBookings() {
    try {
        const res = await fetch(`http://localhost:5000/mybookings/${phone.trim()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const bookings = await res.json();
        tableBody.innerHTML = "";

        if (bookings.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7">No bookings found for your account</td></tr>`;
            return;
        }

        bookings.forEach(b => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${b.name}</td>
                <td>${b.phone}</td>
                <td>${b.service}</td>
                <td>${b.address}</td>
                <td>${b.date}</td>
                <td>Confirmed</td>
                <td>${b.arrivalTime || "--"}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (err) {
        console.log("Error fetching bookings:", err);
        tableBody.innerHTML = `<tr><td colspan="7">Error fetching bookings</td></tr>`;
    }
}

// Call the function on page load
fetchBookings();