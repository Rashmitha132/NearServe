// Get booking info from localStorage
const confirmationMessage = document.getElementById("confirmationMessage");
const booking = JSON.parse(localStorage.getItem("lastBooking"));

if (booking) {
    // Randomly generate status & arrival time (or you can calculate based on DB)
    const status = Math.random() > 0.5 ? "Available" : "Busy";
    const hours = Math.floor(Math.random() * 4) + 1;
    const arrivalTime = `${hours} hour(s)`;

    confirmationMessage.innerHTML = `
        <strong>${booking.name}</strong>, your booking for <strong>${booking.service}</strong> is confirmed!<br>
        Status: <strong>${status}</strong><br>
        Estimated Arrival Time: <strong>${arrivalTime}</strong><br>
        Address: <strong>${booking.address}</strong><br>
        Date: <strong>${booking.date}</strong>
    `;

    // Clear it from localStorage after showing
    localStorage.removeItem("lastBooking");
}