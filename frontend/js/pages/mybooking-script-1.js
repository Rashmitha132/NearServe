const API_BASE = window.NEARSERVE_API_BASE;

const phone = localStorage.getItem("userPhone") || localStorage.getItem("phone") || "";
function realName(value, fallback = "Customer") {
  const name = String(value || "").trim();
  return name && name.toLowerCase() !== "xyz" ? name : fallback;
}
const uname = realName(localStorage.getItem("userName") || localStorage.getItem("name"));
if (!phone) window.location.href = "login.html";

let allBookings = [];
let currentFilter = "all";
let currentRatingBookingId = null;
let selectedRating = 0;
let cancelBookingId = null;
let newUpdatesCount = 0;
let lastStatuses = JSON.parse(localStorage.getItem("qs_lastStatuses") || "{}");
let workerNamesByPhone = {};

const sideAvatar = document.getElementById("sideAvatar");
const sideName = document.getElementById("sideName");
sideName.textContent = uname;
document.getElementById("welcomeMsg").textContent = `Welcome, ${uname}! Here are your bookings.`;
document.getElementById("mobileWelcome").textContent = `Welcome, ${uname}! Here are your bookings.`;

function setSidebarAvatar(name, imageSrc) {
  const initial = (name || "C").trim().charAt(0).toUpperCase() || "C";
  sideAvatar.innerHTML = imageSrc ? `<img src="${imageSrc}" alt="${name || "Customer"}">` : initial;
}

setSidebarAvatar(uname, localStorage.getItem(`avatarBase64_customer_${phone}`));
fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}`)
  .then(r => r.ok ? r.json() : null)
  .then(profile => {
    if (!profile) return;
    const name = realName(profile.name, uname);
    localStorage.setItem("userName", name);
    localStorage.setItem("name", name);
    const avatar = profile.avatarBase64 || "";
    sideName.textContent = name;
    document.getElementById("welcomeMsg").textContent = `Welcome, ${name}! Here are your bookings.`;
    document.getElementById("mobileWelcome").textContent = `Welcome, ${name}! Here are your bookings.`;
    if (avatar) localStorage.setItem(`avatarBase64_customer_${phone}`, avatar);
    setSidebarAvatar(name, avatar || localStorage.getItem(`avatarBase64_customer_${phone}`));
  })
  .catch(() => {});

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function jsArg(v) { return JSON.stringify(String(v ?? "")); }
function title(v) { const s = String(v || "Service"); return s.charAt(0).toUpperCase() + s.slice(1); }
function niceDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return esc(v);
  return d.toLocaleDateString("en-CA").replaceAll("-", " - ");
}
function showToast(msg, type = "error") {
  window.nearServeToast(msg, type);
}

function statusPill(status) {
  const map = {
    pending: ["fa-hourglass-half", "Pending"],
    accepted: ["fa-check", "Accepted"],
    completed: ["fa-check", "Completed"],
    rejected: ["fa-xmark", "Rejected"],
    cancelled: ["fa-ban", "Cancelled"]
  };
  const item = map[status] || ["fa-circle-info", title(status)];
  return `<span class="status-pill ${status}"><i class="fa-solid ${item[0]}"></i>${item[1]}</span>`;
}

function workerDisplayName(b, workerPhone, workerRole) {
  const savedName = b.chosenWorkerName || b.workerName || b.assignedWorkerName || "";
  const lookedUpName = workerNamesByPhone[workerPhone] || "";
  const name = savedName || lookedUpName;
  if (name) return workerPhone ? `${name} - ${workerPhone}` : name;
  return workerPhone ? `${title(workerRole)} - ${workerPhone}` : "-";
}

function tracker(status) {
  const progress = status === "completed" ? 3 : status === "accepted" ? 2 : 1;
  return `<div class="tracker">
    <div class="step"><div class="dot on">1</div><span>Booked</span></div>
    <div class="line ${progress >= 2 ? "" : "off"}"></div>
    <div class="step"><div class="dot ${progress >= 2 ? "on" : ""}">2</div><span>Accepted</span></div>
    <div class="line ${progress >= 3 ? "" : "off"}"></div>
    <div class="step"><div class="dot ${progress >= 3 ? "on" : ""}">3</div><span>Completed</span></div>
  </div>`;
}

function buildActions(b, status, workerPhone, workerRole, workerText) {
  const actions = [
    `<button class="action-btn btn-rebook" onclick='reBook(${jsArg(b.service)}, ${jsArg(workerPhone)}, ${jsArg(workerRole)}, ${jsArg(workerText.split(" - ")[0] || "")})'><i class="fa-solid fa-rotate-left"></i> Re-book</button>`,
    `<button class="action-btn" onclick='showReceipt(${jsArg(b._id)})'><i class="fa-solid fa-receipt"></i> Receipt</button>`
  ];
  if (workerPhone && workerPhone !== "-") {
    actions.push(`<button class="action-btn btn-chat" onclick='openChat(${jsArg(b._id)}, ${jsArg(workerPhone)}, ${jsArg(workerRole)})'><i class="fa-solid fa-comment"></i> Chat worker</button>`);
  }
  if (status === "completed" && !b.reviewed) {
    actions.push(`<button class="action-btn btn-rate" onclick='openRating(${jsArg(b._id)}, ${jsArg(workerText)})'><i class="fa-solid fa-star"></i> Rate worker</button>`);
  }
  if (status === "pending" || status === "accepted") {
    actions.push(`<button class="action-btn btn-cancel" onclick='cancelBooking(${jsArg(b._id)})'><i class="fa-solid fa-xmark"></i> Cancel</button>`);
  }
  if (b.reviewed) actions.push(`<span class="reviewed"><i class="fa-solid fa-star"></i> Reviewed</span>`);
  return actions.join("");
}

function buildCard(b) {
  const status = (b.status || "pending").toLowerCase();
  const workerPhone = b.chosenWorkerPhone || b.workerPhone || "";
  const workerRole = b.chosenWorkerRole || b.workerRole || b.service || "Worker";
  const workerText = workerDisplayName(b, workerPhone, workerRole);
  return `<article class="booking-card">
    <div class="card-head">
      <div class="service">
        <div class="service-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div>
        <div>
          <div class="service-name">${esc(title(b.service))}</div>
          <div class="service-date"><i class="fa-solid fa-calendar-days"></i>${esc(niceDate(b.date))}</div>
        </div>
      </div>
      ${statusPill(status)}
    </div>
    ${tracker(status)}
    <div class="info-grid">
      <div><div class="label">Worker</div><div class="value"><i class="fa-solid fa-user-helmet-safety"></i>${esc(workerText)}</div></div>
      <div><div class="label">Address</div><div class="value"><i class="fa-solid fa-location-dot"></i>${esc(b.address || "-")}</div></div>
      <div><div class="label">Booked On</div><div class="value"><i class="fa-solid fa-calendar-days"></i>${esc(niceDate(b.createdAt))}</div></div>
    </div>
    <div class="card-actions">${buildActions(b, status, workerPhone, workerRole, workerText)}</div>
  </article>`;
}

function renderCards() {
  const container = document.getElementById("cardsContainer");
  const filtered = currentFilter === "all" ? allBookings : allBookings.filter(b => (b.status || "pending").toLowerCase() === currentFilter);
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><strong>${currentFilter === "all" ? "No bookings yet" : "No " + currentFilter + " bookings"}</strong><span>Book a service to get started.</span></div>`;
    return;
  }
  container.innerHTML = filtered.map(buildCard).join("");
}

async function fetchBookings(silent = false) {
  try {
    const res = await fetch(`${API_BASE}/bookings/my/${encodeURIComponent(phone)}`);
    const data = await res.json().catch(() => ({}));
    const bookings = Array.isArray(data) ? data : (data.bookings || []);
    if (!Array.isArray(bookings)) return;
    if (silent) {
      bookings.forEach(b => {
        const prev = lastStatuses[b._id];
        const curr = (b.status || "pending").toLowerCase();
        if (prev && prev !== curr) newUpdatesCount++;
        lastStatuses[b._id] = curr;
      });
      updateBadge();
    } else {
      bookings.forEach(b => { if (!lastStatuses[b._id]) lastStatuses[b._id] = (b.status || "pending").toLowerCase(); });
    }
    localStorage.setItem("qs_lastStatuses", JSON.stringify(lastStatuses));
    await hydrateWorkerNames(bookings);
    allBookings = bookings;
    renderCards();
  } catch (err) {
    console.error(err);
    showToast("Could not load bookings", "error");
  }
}

async function hydrateWorkerNames(bookings) {
  const phones = [...new Set(bookings.map(b => b.chosenWorkerPhone || b.workerPhone || "").filter(Boolean))];
  const missing = phones.filter(p => !workerNamesByPhone[p]);
  if (!missing.length) return;
  await Promise.all(missing.map(async p => {
    try {
      const res = await fetch(`${API_BASE}/workers/${encodeURIComponent(p)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.name) workerNamesByPhone[p] = data.name;
    } catch(e) {}
  }));
}

function updateBadge() {
  ["notifBadge", "mobileNotifBadge"].forEach(id => {
    const badge = document.getElementById(id);
    badge.textContent = newUpdatesCount;
    badge.classList.toggle("show", newUpdatesCount > 0);
  });
}

function clearUpdates() {
  newUpdatesCount = 0;
  updateBadge();
  showToast("All updates seen", "success");
  fetchBookings(false);
}

document.getElementById("notifBtn").addEventListener("click", clearUpdates);
document.getElementById("mobileNotifBtn").addEventListener("click", clearUpdates);
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("userPhone");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  window.location.href = "login.html";
});

document.querySelectorAll(".ftab").forEach(tab => {
  tab.addEventListener("click", function() {
    document.querySelectorAll(".ftab").forEach(t => t.classList.remove("active"));
    this.classList.add("active");
    currentFilter = this.dataset.filter;
    renderCards();
  });
});

function reBook(service, workerPhone, workerRole, workerName = "") {
  localStorage.setItem("selectedServiceRole", service || "");
  localStorage.setItem("chosenWorkerPhone", workerPhone || "");
  localStorage.setItem("chosenWorkerRole", workerRole || "");
  localStorage.setItem("chosenWorkerName", workerName || workerNamesByPhone[workerPhone] || "");
  window.location.href = "booking.html";
}

function cancelBooking(id) {
  cancelBookingId = id;
  document.getElementById("cancelModal").classList.add("open");
}

document.getElementById("cancelModalNo").addEventListener("click", () => {
  document.getElementById("cancelModal").classList.remove("open");
  cancelBookingId = null;
});
document.getElementById("cancelModal").addEventListener("click", e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("open");
});
document.getElementById("cancelModalYes").addEventListener("click", async function() {
  if (!cancelBookingId) return;
  this.textContent = "Cancelling...";
  this.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/bookings/${cancelBookingId}/cancel`, { method:"PUT", headers:{ "Content-Type":"application/json" } });
    const data = await res.json().catch(() => ({}));
    document.getElementById("cancelModal").classList.remove("open");
    if (res.ok) {
      showToast("Booking cancelled successfully", "success");
      fetchBookings(false);
    } else {
      showToast(data.message || data.error || "Could not cancel", "error");
    }
  } catch(e) {
    showToast("Server error", "error");
  }
  this.textContent = "Yes, Cancel";
  this.disabled = false;
  cancelBookingId = null;
});

function showReceipt(id) {
  const b = allBookings.find(x => x._id === id);
  if (!b) return;
  const status = (b.status || "pending").toLowerCase();
  document.getElementById("receiptId").textContent = "Booking ID: " + b._id;
  document.getElementById("rService").textContent = title(b.service);
  document.getElementById("rWorker").textContent = workerDisplayName(b, b.chosenWorkerPhone || b.workerPhone || "", b.chosenWorkerRole || b.workerRole || b.service || "Worker");
  document.getElementById("rAddress").textContent = b.address || "-";
  document.getElementById("rDate").textContent = b.date || "-";
  document.getElementById("rStatus").textContent = status.toUpperCase();
  document.getElementById("rStatusBadge").innerHTML = statusPill(status);
  document.getElementById("receiptModal").classList.add("open");
}
document.getElementById("receiptCloseBtn").addEventListener("click", () => document.getElementById("receiptModal").classList.remove("open"));
document.getElementById("receiptModal").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("open"); });
document.getElementById("receiptPrintBtn").addEventListener("click", () => window.print());

function openRating(bookingId, workerText) {
  currentRatingBookingId = bookingId;
  selectedRating = 0;
  document.getElementById("ratingComment").value = "";
  document.getElementById("ratingModalSub").textContent = "Rating for: " + workerText;
  document.querySelectorAll(".star-btn").forEach(s => s.classList.remove("active"));
  document.getElementById("ratingModal").classList.add("open");
}
document.getElementById("ratingModalClose").addEventListener("click", () => document.getElementById("ratingModal").classList.remove("open"));
document.getElementById("ratingModal").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove("open"); });
document.querySelectorAll(".star-btn").forEach(btn => {
  btn.addEventListener("click", function() {
    selectedRating = Number(this.dataset.val);
    document.querySelectorAll(".star-btn").forEach((s, i) => s.classList.toggle("active", i < selectedRating));
  });
});
document.getElementById("ratingSubmitBtn").addEventListener("click", async function() {
  if (!selectedRating) {
    showToast("Please select a star rating", "error");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ bookingId: currentRatingBookingId, customerPhone: phone, rating: selectedRating, comment: document.getElementById("ratingComment").value.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      document.getElementById("ratingModal").classList.remove("open");
      showToast("Rating submitted. Thank you.", "success");
      fetchBookings(false);
    } else {
      showToast(data.message || data.error || "Failed to submit", "error");
    }
  } catch(e) {
    showToast("Server error", "error");
  }
});

function openChat(bookingId, workerPhone, workerRoleName) {
  const workerRole = workerRoleName || "Worker";
  localStorage.setItem("chatBookingId", bookingId);
  localStorage.setItem("chatWorkerPhone", workerPhone);
  localStorage.setItem("chatWorkerName", workerRole + " - " + workerPhone);
  localStorage.setItem("chatWorkerRole", workerRole);
  localStorage.setItem("chatCustomerName", localStorage.getItem("userName") || "Customer");
  window.location.href = "worker_chat.html";
}

fetchBookings(false);
setInterval(() => fetchBookings(true), 30000);
  
