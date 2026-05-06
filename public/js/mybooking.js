// public/js/mybooking.js
// This file now works ALONGSIDE the new card-based UI (mybooking_fixed.html)
// It handles role validation and cleanup - the main rendering is done in the HTML

const phone = (localStorage.getItem("phone") || "").trim();
const role = (localStorage.getItem("role") || "").trim().toLowerCase();
const name = localStorage.getItem("name") || "";

// ════════════════════════════════════════════
// ROLE VALIDATION
// ════════════════════════════════════════════
if (!phone || role !== "customer") {
  showToast("Please login as customer");
  window.location.href = "login.html";
}

// ════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════
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

// ════════════════════════════════════════════
// LEGACY TABLE POPULATION (for backward compatibility)
// If #bookingTable exists, populate it
// ════════════════════════════════════════════
const tableBody = document.querySelector("#bookingTable tbody");

async function populateLegacyTable() {
  if (!tableBody) return; // Only run if table exists

  try {
    const res = await fetch(`/api/bookings/my/${encodeURIComponent(phone)}`);
    const bookings = await res.json();

    tableBody.innerHTML = "";

    if (!Array.isArray(bookings) || bookings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`;
      return;
    }

    bookings.forEach(b => {
      const status = (b.status || "pending").toLowerCase();
      const canRate = status === "completed" && b.reviewed === false;
      const workerText = b.chosenWorkerRole && b.chosenWorkerPhone
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
              ? `<button class="legacy-rate-btn" data-id="${b._id}">Rate</button>`
              : (b.reviewed ? "Rated ✅" : "--")
          }
        </td>
      `;

      tableBody.appendChild(row);

      // Attach click handler for rate button
      if (canRate) {
        const btn = row.querySelector(".legacy-rate-btn");
        btn.addEventListener("click", () => submitRatingLegacy(b._id));
      }
    });

  } catch (err) {
    console.log("Error fetching bookings for legacy table:", err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="9">Error fetching bookings</td></tr>`;
    }
  }
}

// ════════════════════════════════════════════
// LEGACY RATING SUBMISSION
// ════════════════════════════════════════════
async function submitRatingLegacy(bookingId) {
  const ratingStr = prompt("Rate this worker (1 to 5):");
  if (!ratingStr) return;

  const rating = Number(ratingStr);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    showToast("Rating must be between 1 and 5");
    return;
  }

  const comment = prompt("Write feedback (optional):") || "";

  try {
    const res = await fetch("/api/reviews", {
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
      showToast(data.error || "Failed to submit review");
      return;
    }

    showToast("Thanks! Your rating was saved.", "success");
    populateLegacyTable(); // Refresh table
  } catch (err) {
    console.log(err);
    showToast("Error submitting rating");
  }
}

// Only populate legacy table if it exists (backward compatibility)
if (tableBody) {
  populateLegacyTable();
}

// ════════════════════════════════════════════
// NEW CARD-BASED UI SUPPORT
// ════════════════════════════════════════════
// These functions are called by the new HTML card-based interface

// Expose helper functions globally for the HTML to use
window.safeVal = safe;
window.prettyStatusVal = prettyStatus;

console.log("✅ mybooking.js loaded - Card UI is ready!");
