const tableBody = document.querySelector("#bookingsTable tbody");
const phone = localStorage.getItem("phone");

if (!phone) {
    alert("Please login first!");
    window.location.href = "login.html";
}

async function fetchBookings() {
    try {
        const res = await fetch(`/bookings/${phone}`);
        const bookings = await res.json();

        tableBody.innerHTML = "";

        bookings.forEach(b => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${b.name}</td>
                <td>${b.phone}</td>
                <td>${b.service}</td>
                <td>${b.address}</td>
                <td>${b.date}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (err) {
        console.log(err);
    }
}

fetchBookings();