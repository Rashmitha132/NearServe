const profile = document.getElementById("profile");
const confirmBtn = document.getElementById("confirmBtn");

const phoneLS = (localStorage.getItem("phone") || "").trim();
const roleLS = (localStorage.getItem("role") || "").trim().toLowerCase();
if (!phoneLS || roleLS !== "customer") {
  alert("Please login as customer");
  window.location.href = "login.html";
}

const params = new URLSearchParams(window.location.search);
const workerPhone = (params.get("phone") || "").trim();
const workerRole = (params.get("role") || "").trim().toLowerCase();

if (!workerPhone || !workerRole) {
  alert("Invalid worker profile link.");
  window.location.href = "worker_list.html";
}

async function loadProfile() {
  profile.innerHTML = "Loading profile...";
  try {
    const res = await fetch(`/workers/${encodeURIComponent(workerPhone)}`);
    const data = await res.json();

    if (!res.ok) {
      profile.innerHTML = data.error || "Error loading worker";
      return;
    }

    profile.innerHTML = `
      <h3>${data.name}</h3>
      <p><b>Role:</b> ${data.role}</p>
      <p><b>Phone:</b> ${data.phone}</p>
      <p><b>Email:</b> ${data.email || "-"}</p>
      <p><b>Rating:</b> ${data.avgRating ?? "New"} (${data.reviewsCount ?? 0})</p>
      <p><b>Customer Feedback:</b> ${data.feedbackSummary ?? "No feedback yet"}</p>
    `;
  } catch (e) {
    console.log(e);
    profile.innerHTML = "Server error loading profile.";
  }
}

confirmBtn.addEventListener("click", () => {
  // Save chosen worker and go back to booking page
  localStorage.setItem("chosenWorkerPhone", workerPhone);
  localStorage.setItem("chosenWorkerRole", workerRole);

  // Optional: if API returned name, it will be set after load; else keep empty
  const nameMatch = profile.querySelector("h3");
  if (nameMatch) localStorage.setItem("chosenWorkerName", nameMatch.textContent.trim());

  alert("Worker selected! Now complete booking form.");
  window.location.href = "booking.html";
});

loadProfile();