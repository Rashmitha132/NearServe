const profile = document.getElementById("profile");
const confirmBtn = document.getElementById("confirmBtn");

const phoneLS = (localStorage.getItem("phone") || "").trim();
const roleLS = (localStorage.getItem("role") || "").trim().toLowerCase();

if (!phoneLS || roleLS !== "customer") {
  showToast("Please login as customer");
  window.location.href = "login.html";
}

const params = new URLSearchParams(window.location.search);
const workerPhone = (params.get("phone") || "").trim();
const workerRole = (params.get("role") || "").trim().toLowerCase();

if (!workerPhone || !workerRole) {
  showToast("Invalid worker profile link.");
  window.location.href = "worker_list.html";
}

function makeStars(rating) {
  const rounded = Math.round(Number(rating) || 0);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function maskCustomer(phone) {
  if (!phone) return "Customer";
  const last4 = phone.slice(-4);
  return `Customer ${last4}`;
}

async function loadProfile() {
  profile.innerHTML = "Loading profile...";

  try {
    const res = await fetch(`/api/workers/${encodeURIComponent(workerPhone)}`);
    const data = await res.json();

    console.log("Worker profile response:", data);
    console.log("reviewsList from backend:", data.reviewsList);

    if (!res.ok) {
      profile.innerHTML = data.error || "Error loading worker";
      return;
    }

    const name = data.name || "Worker";
    const role = data.role || "-";
    const phone = data.phone || "-";
    const email = data.email || "-";
    const avgRating = data.avgRating ?? "New";
    const reviewsCount = data.reviewsCount ?? 0;
    const feedbackSummary = data.feedbackSummary || "No feedback yet";

    profile.innerHTML = `
      <strong>Name:</strong> ${name}<br>
      <strong>Role:</strong> ${role}<br>
      <strong>Phone:</strong> ${phone}<br>
      <strong>Email:</strong> ${email}<br>
      <strong>Rating:</strong> ${avgRating} (${reviewsCount})
    `;

    const workerNameDisplay = document.getElementById("workerNameDisplay");
    const workerRoleDisplay = document.getElementById("workerRoleDisplay");
    const phoneDisplay = document.getElementById("phoneDisplay");
    const emailDisplay = document.getElementById("emailDisplay");
    const avatar = document.getElementById("avatar");
    const ratingDisplay = document.getElementById("ratingDisplay");
    const starDisplay = document.getElementById("starDisplay");
    const callBtn = document.getElementById("callBtn");
    const feedbackList = document.getElementById("feedbackList");

    if (workerNameDisplay) workerNameDisplay.innerText = name;
    if (workerRoleDisplay) workerRoleDisplay.innerText = role;
    if (phoneDisplay) phoneDisplay.innerText = phone;
    if (emailDisplay) emailDisplay.innerText = email;
    if (avatar) avatar.innerText = name.charAt(0).toUpperCase();
    if (ratingDisplay) ratingDisplay.innerText = `${avgRating} rating (${reviewsCount} reviews)`;
    if (starDisplay && avgRating !== "New") starDisplay.innerText = makeStars(avgRating);
    if (callBtn && phone !== "-") callBtn.href = `tel:${phone}`;

    if (feedbackList) {
      if (Array.isArray(data.reviewsList) && data.reviewsList.length > 0) {
        feedbackList.innerHTML = data.reviewsList.map(review => `
          <div class="feedback-card">
            <div class="feedback-top">
              <div class="feedback-name">${review.customerName || maskCustomer(review.customerPhone)}</div>
              <div class="feedback-stars">${makeStars(review.rating)}</div>
            </div>
            <div class="feedback-text">${review.comment || "No feedback text"}</div>
          </div>
        `).join("");
      } else {
        feedbackList.innerHTML = `
          <div class="feedback-card">
            <div class="feedback-text">No feedback yet</div>
          </div>
        `;
      }
    }
  } catch (e) {
    console.log(e);
    profile.innerHTML = "Server error loading profile.";
  }
}

confirmBtn.addEventListener("click", () => {
  localStorage.setItem("chosenWorkerPhone", workerPhone);
  localStorage.setItem("chosenWorkerRole", workerRole);

  if (document.getElementById("workerNameDisplay")) {
    localStorage.setItem(
      "chosenWorkerName",
      document.getElementById("workerNameDisplay").textContent.trim()
    );
  }

  showToast("Worker selected! Now complete booking form.", "success");
  window.location.href = "booking.html";
});

loadProfile();
