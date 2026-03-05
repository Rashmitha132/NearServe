// public/js/mybooking.js
const tableBody = document.querySelector("#bookingTable tbody");
const welcomeEl = document.getElementById("welcomeUser");
const logoutBtn = document.getElementById("logoutBtn");

const phone = (localStorage.getItem("phone") || "").trim();
const role = (localStorage.getItem("role") || "").trim().toLowerCase();
const name = localStorage.getItem("name") || "";

if (!phone || role !== "customer") {
  alert("Please login as customer");
  window.location.href = "login.html";
}

if (name && welcomeEl) {
  welcomeEl.innerText = `Welcome, ${name}! Here are your bookings:`;
}

logoutBtn.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});

function safe(v) {
  return (v === undefined || v === null || v === "") ? "--" : String(v);
}

function prettyStatus(s) {
  s = (s || "pending").toLowerCase();
  if (s === "pending") return "Pending (waiting for worker)";
  if (s === "accepted") return "Accepted ✅";
  if (s === "rejected") return "Rejected ❌";
  if (s === "completed") return "Completed ✅";
  return s;
}

async function submitRating(bookingId) {
  const ratingStr = prompt("Rate this worker (1 to 5):");
  if (!ratingStr) return;

  const rating = Number(ratingStr);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    alert("Rating must be between 1 and 5");
    return;
  }

  const comment = prompt("Write feedback (optional):") || "";

  try {
    const res = await fetch("/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        customerPhone: phone,
        rating,
        comment
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to submit review");
      return;
    }

    alert("Thanks! Your rating was saved.");
    fetchBookings();
  } catch (err) {
    console.log(err);
    alert("Error submitting rating");
  }
}

async function fetchBookings() {
  try {
    const res = await fetch(`/mybookings/${encodeURIComponent(phone)}`);
    const bookings = await res.json();

    tableBody.innerHTML = "";

    if (!Array.isArray(bookings) || bookings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`;
      return;
    }

    bookings.forEach(b => {
      const status = (b.status || "pending").toLowerCase();

      const canRate =
        status === "completed" && b.reviewed === false;

      const workerText =
        b.chosenWorkerRole && b.chosenWorkerPhone
          ? `${b.chosenWorkerRole} (${b.chosenWorkerPhone})`
          : "--";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${safe(b.service)}</td>
        <td>${workerText}</td>
        <td>${safe(b.address)}</td>
        <td>${safe(b.date)}</td>
        <td>${prettyStatus(status)}</td>
        <td>${status === "accepted" || status === "completed" ? safe(b.visitTime) : "--"}</td>
        <td>${status === "accepted" || status === "completed" ? safe(b.workerMessage) : "--"}</td>
        <td>${status === "rejected" ? safe(b.rejectReason) : "--"}</td>
        <td>
          ${
            canRate
              ? `<button data-id="${b._id}">Rate</button>`
              : (b.reviewed ? "Rated ✅" : "--")
          }
        </td>
      `;

      tableBody.appendChild(row);

      // attach click handler for rate button
      if (canRate) {
        const btn = row.querySelector("button");
        btn.addEventListener("click", () => submitRating(b._id));
      }
    });

  } catch (err) {
    console.log("Error fetching bookings:", err);
    tableBody.innerHTML = `<tr><td colspan="9">Error fetching bookings</td></tr>`;
  }
}

fetchBookings();