const API_BASE = "/api";

const list = document.getElementById("list");

// Support both old + new localStorage keys
const phone = (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
const role = (localStorage.getItem("userRole") || localStorage.getItem("role") || "").trim().toLowerCase();

if (!phone || role !== "customer") {
  alert("Please login as customer");
  window.location.href = "login.html";
}

const selectedRole = (localStorage.getItem("selectedServiceRole") || "").trim().toLowerCase();

if (!selectedRole) {
  alert("No service selected. Go back and choose a service.");
  window.location.href = "booking.html";
}

document.getElementById("roleSpan").textContent = selectedRole + "s";

let allWorkers = [];

// Save worker before moving to profile page
function handleWorkerSelect(worker) {
  localStorage.setItem("chosenWorkerPhone", worker.phone || "");
  localStorage.setItem("chosenWorkerRole", selectedRole);
  localStorage.setItem("chosenWorkerName", worker.name || "");
  window.location.href = `worker_profile.html?phone=${encodeURIComponent(worker.phone)}&role=${encodeURIComponent(selectedRole)}`;
}

function buildAddress(worker) {
  const parts = [
    worker.address,
    worker.city,
    worker.state,
    worker.pincode
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Address not added";
}

function renderWorkers(workers) {
  list.innerHTML = "";

  if (!Array.isArray(workers) || workers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="e-icon">👷</div>
        <h3>No workers available</h3>
        <p>There are no verified workers for this service right now.</p>
      </div>`;
    return;
  }

  workers.forEach((w, index) => {
    const ratingNum = parseFloat(w.avgRating) || 0;
    const reviewsCount = w.reviewsCount ?? 0;
    const roundedStars = Math.round(ratingNum);
    const stars = "★".repeat(roundedStars) + "☆".repeat(5 - roundedStars);
    const letter = w.name ? w.name.charAt(0).toUpperCase() : "W";
    const addressText = buildAddress(w);

    const avatarHTML = w.avatarBase64
      ? `<img src="${w.avatarBase64}" alt="${w.name || "Worker"}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;display:block;box-shadow:0 4px 12px rgba(37,99,235,0.25);">`
      : `${letter}`;

    const card = document.createElement("div");
    card.className = "worker-card";

    card.dataset.name = w.name || "";
    card.dataset.rating = ratingNum;
    card.dataset.reviews = reviewsCount;
    card.dataset.address = addressText.toLowerCase();

    card.innerHTML = `
      <div class="card-top">
        <div class="w-avatar" style="${w.avatarBase64 ? "padding:0;overflow:hidden;background:none;box-shadow:none;" : ""}">
          ${avatarHTML}
        </div>
        <div>
          <div class="w-name">${w.name || "Worker"}</div>
          <div class="w-role">${selectedRole}</div>
        </div>
      </div>

      <div class="w-rating">
        <span class="stars">${stars}</span>
        <span class="rating-num">${ratingNum.toFixed(1)}</span>
        <span class="review-count">(${reviewsCount} reviews)</span>
      </div>

      <div class="card-info">
        <div class="info-row">
          <div class="info-icon ii-phone">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.07 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          ${w.phone || "—"}
        </div>

        <div class="info-row">
          <div class="info-icon" style="background:#fef3c7;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          ${addressText}
        </div>
      </div>

      <button class="btn-select" id="selectBtn-${index}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Select This Worker
      </button>
    `;

    list.appendChild(card);

    document.getElementById(`selectBtn-${index}`).addEventListener("click", () => {
      handleWorkerSelect(w);
    });
  });
}

// Search
document.getElementById("searchInput").addEventListener("input", function () {
  const q = this.value.toLowerCase();
  const filtered = allWorkers.filter(w =>
    (w.name || "").toLowerCase().includes(q) ||
    buildAddress(w).toLowerCase().includes(q)
  );
  renderWorkers(filtered);
});

// Sort
window.sortCards = function(by) {
  document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("sort" + by.charAt(0).toUpperCase() + by.slice(1))?.classList.add("active");

  const q = document.getElementById("searchInput").value.toLowerCase();
  let sorted = allWorkers.filter(w =>
    (w.name || "").toLowerCase().includes(q) ||
    buildAddress(w).toLowerCase().includes(q)
  );

  if (by === "name") {
    sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (by === "rating") {
    sorted.sort((a, b) => (parseFloat(b.avgRating) || 0) - (parseFloat(a.avgRating) || 0));
  } else if (by === "reviews") {
    sorted.sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
  }

  renderWorkers(sorted);
};

// Load from server
async function loadWorkers() {
  list.innerHTML = `<div class="loading"><div class="spinner"></div>Loading workers...</div>`;

  try {
    const res = await fetch(`${API_BASE}/workers?role=${encodeURIComponent(selectedRole)}`);
    const data = await res.json().catch(() => ([]));

    allWorkers = Array.isArray(data) ? data : (data.workers || []);

    allWorkers = allWorkers.filter(w =>
      (w.role || "").toLowerCase() === selectedRole &&
      (!w.status || (w.status || "").toLowerCase() === "full_access")
    );

    allWorkers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderWorkers(allWorkers);
  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="empty-state"><div class="e-icon">⚠️</div><h3>Error loading workers</h3><p>Please try again later.</p></div>`;
  }
}

loadWorkers();