const API_BASE = "/api";

const params = new URLSearchParams(window.location.search);
const workerPhone = (params.get("phone") || "").trim();
const workerRole = (params.get("role") || "").trim().toLowerCase();

if (!workerPhone || !workerRole) {
  window.location.href = "worker_list.html";
}

document.getElementById("roleSpan").textContent = workerRole || "professional";

const customerPhone = (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
const displayName =
  localStorage.getItem("fullName") ||
  localStorage.getItem("name") ||
  localStorage.getItem("userName") ||
  "Customer";

function setSidebarIdentity(name, imageSrc) {
  const cleanName = name || "Customer";
  const avatar = document.getElementById("sideAvatar");
  document.getElementById("sidebarUserName").textContent = cleanName;
  avatar.innerHTML = imageSrc
    ? `<img src="${imageSrc}" alt="">`
    : cleanName.charAt(0).toUpperCase();
}

setSidebarIdentity(displayName, customerPhone ? localStorage.getItem(`avatarBase64_customer_${customerPhone}`) : "");

(async function syncSidebarAvatar() {
  if (!customerPhone) return;
  try {
    const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(customerPhone)}`);
    if (!res.ok) return;
    const profile = await res.json();
    const name = profile.name || displayName;
    const image = profile.avatarBase64 || localStorage.getItem(`avatarBase64_customer_${customerPhone}`) || "";
    if (profile.avatarBase64) localStorage.setItem(`avatarBase64_customer_${customerPhone}`, profile.avatarBase64);
    setSidebarIdentity(name, image);
  } catch {}
})();

document.getElementById("myWorkersLink")?.addEventListener("click", () => {
  localStorage.setItem("selectedServiceRole", workerRole || "carpenter");
});

const timeMap = {
  morning: "Morning (6AM-12PM)",
  afternoon: "Afternoon (12PM-5PM)",
  evening: "Evening (5PM-10PM)",
  flexible: "Flexible Anytime"
};

const communicationMap = {
  chat: "Chat",
  phone: "Phone call",
  email: "Email"
};

function availInfo(val) {
  if (val === "busy") return { cls: "avail-busy", text: "• Currently Busy" };
  if (val === "off") return { cls: "avail-off", text: "• Not Taking Jobs" };
  return { cls: "avail-available", text: "• Available" };
}

function makeStars(rating) {
  const rounded = Math.round(Number(rating) || 0);
  return "★".repeat(rounded) + "★".repeat(5 - rounded);
}

function iconSvg(type) {
  const common = `width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    user: `<svg ${common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    tool: `<svg ${common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.1-2.1a5.8 5.8 0 0 1-7.5 7.5L6.8 20.3a2.2 2.2 0 0 1-3.1-3.1l5.6-5.6a5.8 5.8 0 0 1 7.5-7.5l-2.1 2.2z"/></svg>`,
    phone: `<svg ${common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.07 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    mail: `<svg ${common}><rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,13 22,4"/></svg>`,
    star: `<svg ${common}><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2z"/></svg>`,
    status: `<svg ${common}><circle cx="12" cy="12" r="9"/></svg>`,
    clock: `<svg ${common}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    chat: `<svg ${common}><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>`,
    pin: `<svg ${common}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
  };
  return icons[type] || icons.user;
}

function detailRow(icon, label, value) {
  return `
    <div class="detail-row">
      <span class="detail-label"><span class="detail-icon">${iconSvg(icon)}</span>${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `;
}

async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/workers/${encodeURIComponent(workerPhone)}`);
    if (!res.ok) throw new Error("Not found");

    const data = await res.json().catch(() => ({}));
    const w = data.worker || data;

    const photo = document.getElementById("avatarPhoto");
    const letter = document.getElementById("avatarLetter");
    const initial = (w.name || "W").charAt(0).toUpperCase();

    if (w.avatarBase64) {
      photo.src = w.avatarBase64;
      photo.style.display = "block";
      letter.style.display = "none";
    } else {
      letter.textContent = initial;
      photo.style.display = "none";
      letter.style.display = "flex";
    }

    document.getElementById("workerNameDisplay").textContent = w.name || "Worker";
    document.getElementById("workerRoleDisplay").textContent = w.role || workerRole;
    document.getElementById("phoneDisplay").textContent = w.phone || "-";
    document.getElementById("emailDisplay").textContent = w.email || "-";

    const av = availInfo(w.availability);
    const badge = document.getElementById("availBadge");
    badge.className = "avail-badge " + av.cls;
    badge.textContent = av.text;

    const avg = parseFloat(w.avgRating) || 0;
    const reviewsCount = w.reviewsCount ?? 0;
    const starDisplay = document.getElementById("starDisplay");
    starDisplay.textContent = makeStars(avg);
    starDisplay.classList.toggle("has-rating", avg > 0);

    document.getElementById("ratingDisplay").textContent = avg > 0
      ? `${avg.toFixed(1)} (${reviewsCount} review${reviewsCount !== 1 ? "s" : ""})`
      : "No rating yet";

    if (w.bio && w.bio.trim()) {
      const b = document.getElementById("bioBox");
      b.textContent = `"${w.bio.trim()}"`;
      b.style.display = "block";
    }

    const addrParts = [w.address, w.city, w.state, w.pincode].filter(Boolean);
    if (addrParts.length) {
      document.getElementById("addressDisplay").textContent = addrParts.join(", ");
      document.getElementById("addressItem").style.display = "flex";
    }

    if (w.preferredTime) {
      document.getElementById("timeDisplay").textContent = timeMap[w.preferredTime] || w.preferredTime;
      document.getElementById("timeItem").style.display = "flex";
    }

    if (w.communicationPref) {
      document.getElementById("commDisplay").textContent = `${communicationMap[w.communicationPref] || w.communicationPref} preferred`;
      document.getElementById("commItem").style.display = "flex";
    }

    const grid = document.getElementById("detailGrid");
    const roleLabel = w.role || workerRole || "-";
    const availabilityText = av.text.replace("• ", "");

    const rows = [
      detailRow("user", "Name", w.name || "-"),
      detailRow("tool", "Role", roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)),
      detailRow("phone", "Phone", w.phone || "-"),
      detailRow("mail", "Email", w.email || "-"),
      detailRow("star", "Rating", avg > 0 ? `<span class="rating-value">${avg.toFixed(1)} / 5 (${reviewsCount} reviews)</span>` : `<span class="no-feedback">No reviews yet</span>`),
      detailRow("status", "Availability", `<span class="detail-chip">${availabilityText}</span>`)
    ];

    if (w.preferredTime) rows.push(detailRow("clock", "Work hours", `<span class="detail-chip">${timeMap[w.preferredTime] || w.preferredTime}</span>`));
    if (w.communicationPref) rows.push(detailRow("chat", "Contact pref", `<span class="detail-chip">${communicationMap[w.communicationPref] || w.communicationPref}</span>`));
    if (addrParts.length) rows.push(detailRow("pin", "Location", addrParts.join(", ")));
    if (w.bio) rows.push(detailRow("chat", "Bio", w.bio));

    grid.innerHTML = rows.join("");

    const feedbackList = document.getElementById("feedbackList");
    const reviews = w.reviewsList || w.reviews || [];

    if (!reviews.length) {
      feedbackList.innerHTML = `<div class="feedback-empty">No feedback yet - be the first to review!</div>`;
    } else {
      feedbackList.innerHTML = reviews.map(r => {
        const stars = makeStars(r.rating);
        const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
        return `<div class="feedback-card">
          <div class="feedback-top">
            <div><div class="feedback-name">${r.customerName || "Customer"}</div><div class="feedback-date">${date}</div></div>
            <div class="feedback-stars">${stars}</div>
          </div>
          <div class="feedback-text">"${r.comment || "No written feedback"}"</div>
        </div>`;
      }).join("");
    }

  } catch (err) {
    document.getElementById("detailGrid").innerHTML = `<div style="color:#b91c1c;font-size:0.75rem;">Could not load worker details.</div>`;
    document.getElementById("feedbackList").innerHTML = `<div class="feedback-empty">Could not load feedback.</div>`;
  }
}

loadProfile();

document.getElementById("callBtn").addEventListener("click", function() {
  const phone = document.getElementById("phoneDisplay").textContent.trim();
  const name = document.getElementById("workerNameDisplay").textContent.trim();

  if (!phone || phone === "-") {
    const original = this.innerHTML;
    this.textContent = "Phone not available";
    setTimeout(() => { this.innerHTML = original; }, 2000);
    return;
  }

  document.getElementById("modalAvatar").textContent = name.charAt(0).toUpperCase();
  document.getElementById("modalWorkerName").textContent = name;
  document.getElementById("modalWorkerPhone").textContent = phone;
  document.getElementById("callModal").classList.add("open");
});

document.getElementById("callModalCancel").addEventListener("click", () => {
  document.getElementById("callModal").classList.remove("open");
});

document.getElementById("callModal").addEventListener("click", function(e) {
  if (e.target === this) this.classList.remove("open");
});

document.getElementById("callModalConfirm").addEventListener("click", function() {
  const phone = document.getElementById("phoneDisplay").textContent.trim();
  document.getElementById("callModal").classList.remove("open");
  window.location.href = "tel:" + phone;
});

document.getElementById("confirmBtn").addEventListener("click", function() {
  const name = document.getElementById("workerNameDisplay").textContent.trim();

  localStorage.setItem("chosenWorkerPhone", workerPhone);
  localStorage.setItem("chosenWorkerRole", workerRole);
  localStorage.setItem("chosenWorkerName", name);

  document.getElementById("successAvatar").textContent = name.charAt(0).toUpperCase();
  document.getElementById("successWorkerName").textContent = name;
  document.getElementById("successWorkerRole").textContent = workerRole;
  document.getElementById("workerSuccessModal").classList.add("open");
});

document.getElementById("successModalGoBtn").addEventListener("click", () => {
  window.location.href = "booking.html";
});

document.getElementById("workerSuccessModal").addEventListener("click", function(e) {
  if (e.target === this) this.classList.remove("open");
});
