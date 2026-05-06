const API_BASE =
  window.location.protocol === "file:" || (window.location.port && window.location.port !== "5000")
    ? "http://localhost:5000/api"
    : "/api";

function showToast(msg, type = "error") {
  window.nearServeToast(msg, type);
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function title(v) {
  const s = String(v || "Service").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function serviceIcon(service) {
  const key = String(service || "").toLowerCase();
  if (key.includes("carpenter")) return "fa-hammer";
  if (key.includes("plumber")) return "fa-wrench";
  if (key.includes("electric")) return "fa-bolt";
  return "fa-screwdriver-wrench";
}
function statusClass(status) {
  return "status-" + (status || "pending").toLowerCase();
}
function statusLabel(status) {
  const s = (status || "pending").toLowerCase();
  const map = { pending:"Pending", accepted:"Accepted", completed:"Completed", rejected:"Rejected", cancelled:"Cancelled" };
  return map[s] || title(s);
}
function statusIcon(status) {
  const s = (status || "pending").toLowerCase();
  return ({ pending:"fa-hourglass-half", accepted:"fa-check", completed:"fa-check", rejected:"fa-xmark", cancelled:"fa-ban" }[s] || "fa-circle-info");
}

function setAvatar(name, imageSrc) {
  const initial = (name || "C").trim().slice(0, 2).toUpperCase() || "C";
  const html = imageSrc ? `<img src="${imageSrc}" alt="${esc(name)}">` : initial;
  document.getElementById("sideAvatar").innerHTML = html;
  document.getElementById("mobileAvatar").innerHTML = html;
}

function buildBookingItem(booking) {
  const status = (booking.status || "pending").toLowerCase();
  const service = booking.service || "Service";
  return `<div class="booking-item">
    <div class="booking-main">
      <div class="booking-icon"><i class="fa-solid ${serviceIcon(service)}"></i></div>
      <div>
        <div class="booking-title">${esc(title(service))}</div>
        <div class="booking-meta">
          <span><i class="fa-solid fa-location-dot"></i>${esc(booking.address || "-")}</span>
          <span><i class="fa-solid fa-calendar-days"></i>${esc(booking.date || "-")}</span>
        </div>
      </div>
    </div>
    <span class="status ${statusClass(status)}"><i class="fa-solid ${statusIcon(status)}"></i>${statusLabel(status)}</span>
    <button class="btn-small" onclick="location.href='mybooking.html'">View Details</button>
  </div>`;
}

function emptyBookings() {
  return `<div class="empty-state"><strong>No upcoming bookings</strong><span>You do not have pending or accepted bookings right now.</span></div>`;
}

async function loadDashboard() {
  const phone = (localStorage.getItem("userPhone") || "").trim();
  const storedName = (localStorage.getItem("userName") || "Customer").trim();
  const role = (localStorage.getItem("userRole") || "").trim();
  if (!phone || role !== "customer") {
    window.location.href = "login.html";
    return;
  }

  const avatarKey = `avatarBase64_customer_${phone}`;
  let displayName = storedName;
  document.getElementById("sideName").textContent = displayName;
  document.getElementById("mobileName").textContent = `Welcome, ${displayName}!`;
  setAvatar(displayName, localStorage.getItem(avatarKey) || "");

  let memberYear = new Date().getFullYear();
  try {
    const profileRes = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}`);
    if (profileRes.ok) {
      const profile = await profileRes.json().catch(() => ({}));
      displayName = profile.name || displayName;
      if (profile.avatarBase64) localStorage.setItem(avatarKey, profile.avatarBase64);
      if (profile.createdAt) memberYear = new Date(profile.createdAt).getFullYear();
      document.getElementById("sideName").textContent = displayName;
      document.getElementById("mobileName").textContent = `Welcome, ${displayName}!`;
      setAvatar(displayName, profile.avatarBase64 || localStorage.getItem(avatarKey) || "");
    }
  } catch {}

  try {
    const res = await fetch(`${API_BASE}/bookings/my/${encodeURIComponent(phone)}`);
    const data = await res.json().catch(() => ({}));
    const bookings = Array.isArray(data) ? data : (data.bookings || []);
    if (!Array.isArray(bookings)) throw new Error("Invalid bookings response");

    const total = bookings.length;
    const completed = bookings.filter(b => (b.status || "").toLowerCase() === "completed").length;
    const pending = bookings.filter(b => (b.status || "").toLowerCase() === "pending").length;
    const upcoming = bookings.filter(b => ["pending", "accepted"].includes((b.status || "").toLowerCase()));

    document.getElementById("statTotalBookings").textContent = total;
    document.getElementById("statCompleted").textContent = completed;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statMember").textContent = Number.isFinite(memberYear) ? memberYear : new Date().getFullYear();
    document.getElementById("upcomingList").innerHTML = upcoming.length ? upcoming.map(buildBookingItem).join("") : emptyBookings();
  } catch (err) {
    console.error("Dashboard error:", err);
    showToast("Could not load dashboard", "error");
  }
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("userName");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userStatus");
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

const sidebar = document.querySelector(".sidebar");
const sidebarOpen = document.getElementById("sidebarOpen");
const sidebarClose = document.getElementById("sidebarClose");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

function setSidebarOpen(open) {
  sidebar.classList.toggle("open", open);
  sidebarBackdrop.classList.toggle("show", open);
  document.body.style.overflow = open ? "hidden" : "";
}

sidebarOpen?.addEventListener("click", () => setSidebarOpen(true));
sidebarClose?.addEventListener("click", () => setSidebarOpen(false));
sidebarBackdrop?.addEventListener("click", () => setSidebarOpen(false));
document.querySelectorAll(".sidebar .nav a").forEach(link => {
  link.addEventListener("click", () => setSidebarOpen(false));
});
document.querySelector(".side-user")?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    location.href = "profile.html";
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") setSidebarOpen(false);
});

window.addEventListener("DOMContentLoaded", loadDashboard);