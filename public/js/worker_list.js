const API_BASE =
  window.location.protocol === "file:" ||
  (window.location.port && window.location.port !== "5000")
    ? "http://localhost:5000/api"
    : "/api";

const list = document.getElementById("list");

const phone = (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
const role = (localStorage.getItem("userRole") || localStorage.getItem("role") || "").trim().toLowerCase();

if (!phone || role !== "customer") {
  showToast("Please login as customer");
  window.location.href = "login.html";
}

const allowedRoles = ["carpenter", "plumber", "electrician"];
const roleFromUrl = new URLSearchParams(window.location.search).get("role") || "";
let selectedRole = (roleFromUrl || localStorage.getItem("selectedServiceRole") || "").trim().toLowerCase();

if (!allowedRoles.includes(selectedRole)) {
  selectedRole = "carpenter";
}

localStorage.setItem("selectedServiceRole", selectedRole);
document.getElementById("roleSpan").textContent = selectedRole + "s";

let allWorkers = [];

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

function getInitials(name) {
  const parts = (name || "Worker").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] || "W").slice(0, 2).toUpperCase();
}

function renderWorkers(workers) {
  list.innerHTML = "";

  if (!Array.isArray(workers) || workers.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="e-icon">No workers</div>
        <h3>No workers available</h3>
        <p>There are no verified workers for this service right now.</p>
      </div>`;
    return;
  }

  workers.forEach((w, index) => {
    const ratingNum = parseFloat(w.avgRating) || 0;
    const reviewsCount = w.reviewsCount ?? 0;
    const roundedStars = Math.round(ratingNum);
    const stars = "★".repeat(roundedStars) + "★".repeat(5 - roundedStars);
    const addressText = buildAddress(w);

    const avatarHTML = w.avatarBase64
      ? `<img src="${w.avatarBase64}" alt="${w.name || "Worker"}">`
      : getInitials(w.name);

    const card = document.createElement("div");
    card.className = "worker-card";

    card.dataset.name = w.name || "";
    card.dataset.rating = ratingNum;
    card.dataset.reviews = reviewsCount;
    card.dataset.address = addressText.toLowerCase();

    card.innerHTML = `
      <div class="card-top">
        <div class="w-avatar">${avatarHTML}</div>
        <div>
          <div class="w-name-line">
            <div class="w-name">${w.name || "Worker"}</div>
            <span class="verified-badge">✓ Verified</span>
          </div>
          <div class="w-role">${selectedRole}</div>
        </div>
      </div>

      <div class="w-rating">
        <span class="stars ${ratingNum > 0 ? "has-rating" : ""}">${stars}</span>
        <span class="rating-num">${ratingNum.toFixed(1)}</span>
        <span class="review-count">(${reviewsCount} reviews)</span>
      </div>

      <div class="card-info">
        <div class="info-row">
          <span class="info-icon">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.07 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </span>
          <span>${w.phone || "-"}</span>
        </div>

        <div class="info-row">
          <span class="info-icon">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </span>
          <span>${addressText}</span>
        </div>
      </div>

      <button class="btn-select" id="selectBtn-${index}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Select this worker
      </button>
    `;

    list.appendChild(card);

    document.getElementById(`selectBtn-${index}`).addEventListener("click", () => {
      handleWorkerSelect(w);
    });
  });
}

document.getElementById("searchInput").addEventListener("input", function () {
  const q = this.value.toLowerCase();
  const filtered = allWorkers.filter(w =>
    (w.name || "").toLowerCase().includes(q) ||
    buildAddress(w).toLowerCase().includes(q)
  );
  renderWorkers(filtered);
});

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

async function loadWorkers() {
  list.innerHTML = `<div class="loading"><div><div class="spinner"></div>Loading workers...</div></div>`;

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
    list.innerHTML = `<div class="empty-state"><div class="e-icon">Error</div><h3>Error loading workers</h3><p>Please try again later.</p></div>`;
  }
}

loadWorkers();
