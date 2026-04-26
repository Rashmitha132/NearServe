// ─────────────────────────────────────────
//  SECURITY: Prevent back button after logout
// ─────────────────────────────────────────
history.pushState(null, null, location.href);
window.addEventListener("popstate", function () {
  const p = (localStorage.getItem("phone") || "").trim();
  const r = (localStorage.getItem("role") || "").trim().toLowerCase();
  if (!p || r !== "customer") {
    window.location.replace("login.html");
  } else {
    history.pushState(null, null, location.href);
  }
});

// ─────────────────────────────────────────
//  SECURITY: Session timeout (15 minutes)
// ─────────────────────────────────────────
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
let sessionTimer;
let warningTimer;
let countdownInterval;

function resetSessionTimer() {
  clearTimeout(sessionTimer);
  clearTimeout(warningTimer);
  clearInterval(countdownInterval);
  hideTimeoutWarning();

  warningTimer = setTimeout(() => {
    showTimeoutWarning();
  }, SESSION_TIMEOUT_MS - 60 * 1000);

  sessionTimer = setTimeout(() => {
    forceLogout("Session expired due to inactivity.");
  }, SESSION_TIMEOUT_MS);
}

function forceLogout(msg) {
  clearTimeout(sessionTimer);
  clearTimeout(warningTimer);
  clearInterval(countdownInterval);
  localStorage.clear();
  showToast(msg);
  window.location.replace("login.html");
}

function showTimeoutWarning() {
  const overlay = document.getElementById("sessionWarningOverlay");
  if (overlay) {
    overlay.style.display = "flex";
    let secs = 60;
    document.getElementById("sessionCountdown").textContent = secs;
    countdownInterval = setInterval(() => {
      secs--;
      const el = document.getElementById("sessionCountdown");
      if (el) el.textContent = secs;
      if (secs <= 0) clearInterval(countdownInterval);
    }, 1000);
  }
}

function hideTimeoutWarning() {
  const overlay = document.getElementById("sessionWarningOverlay");
  if (overlay) overlay.style.display = "none";
}

["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt => {
  document.addEventListener(evt, resetSessionTimer, { passive: true });
});

resetSessionTimer();

// ─────────────────────────────────────────
//  BOOKINGS LOGIC
// ─────────────────────────────────────────
const bookingForm        = document.getElementById("bookingForm");
const logoutBtn          = document.getElementById("logoutBtn");
const historyBtn         = document.getElementById("historyBtn");
const serviceSelect      = document.getElementById("serviceSelect");
const chooseWorkerBtn    = document.getElementById("chooseWorkerBtn");
const selectedWorkerText = document.getElementById("selectedWorkerText");
const clearWorkerBtn     = document.getElementById("clearWorkerBtn");
const welcomeEl          = document.getElementById("welcomeUser");

const phone  = (localStorage.getItem("phone") || "").trim();
const role   = (localStorage.getItem("role")  || "").trim().toLowerCase();
const nameLS = localStorage.getItem("name") || "";

if (!phone || role !== "customer") {
  showToast("Please login as customer");
  window.location.replace("login.html");
}

if (welcomeEl && nameLS) {
  welcomeEl.innerText = `Welcome, ${nameLS}!`;
}

// ─────────────────────────────────────────
//  RESTORE SERVICE SELECTION ON PAGE LOAD
//  When user comes back from worker_list.html,
//  restore the service they had selected
// ─────────────────────────────────────────
const savedService = localStorage.getItem("selectedServiceRole") || "";
if (savedService && serviceSelect) {
  serviceSelect.value = savedService;
}

// Also if a worker is already chosen, sync service dropdown to their role
const savedWorkerRole = (localStorage.getItem("chosenWorkerRole") || "").trim().toLowerCase();
if (savedWorkerRole && serviceSelect) {
  serviceSelect.value = savedWorkerRole;
  // Keep selectedServiceRole in sync too
  localStorage.setItem("selectedServiceRole", savedWorkerRole);
}

// ─────────────────────────────────────────
//  WHEN USER CHANGES SERVICE DROPDOWN,
//  clear the chosen worker if they don't match
// ─────────────────────────────────────────
serviceSelect.addEventListener("change", () => {
  const newService = (serviceSelect.value || "").trim().toLowerCase();
  const currentWorkerRole = (localStorage.getItem("chosenWorkerRole") || "").trim().toLowerCase();

  // Save the new service choice
  localStorage.setItem("selectedServiceRole", newService);

  // If the chosen worker doesn't match the new service, clear them
  if (currentWorkerRole && currentWorkerRole !== newService) {
    localStorage.removeItem("chosenWorkerName");
    localStorage.removeItem("chosenWorkerPhone");
    localStorage.removeItem("chosenWorkerRole");
    refreshSelectedWorkerUI();
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  clearTimeout(sessionTimer);
  clearTimeout(warningTimer);
  clearInterval(countdownInterval);
  localStorage.clear();
  window.location.replace("login.html");
});

// History button
historyBtn.addEventListener("click", () => {
  window.location.href = "mybooking.html";
});

// Session warning buttons
document.addEventListener("DOMContentLoaded", () => {
  const stayBtn = document.getElementById("sessionStayBtn");
  if (stayBtn) stayBtn.addEventListener("click", () => { resetSessionTimer(); });
  const logoutNowBtn = document.getElementById("sessionLogoutBtn");
  if (logoutNowBtn) logoutNowBtn.addEventListener("click", () => { forceLogout("You have been logged out."); });
});

// ─────────────────────────────────────────
//  SHOW SELECTED WORKER IN UI
// ─────────────────────────────────────────
function refreshSelectedWorkerUI() {
  const wName  = localStorage.getItem("chosenWorkerName")  || "";
  const wPhone = localStorage.getItem("chosenWorkerPhone") || "";
  const wRole  = localStorage.getItem("chosenWorkerRole")  || "";

  if (wPhone && wRole) {
    selectedWorkerText.innerText = `${wName || "Worker"} (${wRole}) - ${wPhone}`;
    selectedWorkerText.classList.add("on");

    // ✅ KEY FIX: Sync service dropdown to match chosen worker's role
    if (serviceSelect) {
      serviceSelect.value = wRole.toLowerCase();
      localStorage.setItem("selectedServiceRole", wRole.toLowerCase());
    }
  } else {
    selectedWorkerText.innerText = "No worker selected";
    selectedWorkerText.classList.remove("on");
  }
}

refreshSelectedWorkerUI();

// Clear worker
clearWorkerBtn.addEventListener("click", () => {
  localStorage.removeItem("chosenWorkerName");
  localStorage.removeItem("chosenWorkerPhone");
  localStorage.removeItem("chosenWorkerRole");
  // Don't clear selectedServiceRole — keep the service the user chose
  refreshSelectedWorkerUI();
});

// ─────────────────────────────────────────
//  CHOOSE WORKER BUTTON
//  Save current service before navigating
// ─────────────────────────────────────────
chooseWorkerBtn.addEventListener("click", () => {
  const service = (serviceSelect.value || "").trim().toLowerCase();
  if (!service) return showToast("Please select a service first");

  // ✅ Save service so worker_list.html knows what to show
  // and booking.html restores it when coming back
  localStorage.setItem("selectedServiceRole", service);
  window.location.href = "worker_list.html";
});

// ─────────────────────────────────────────
//  BOOKING FORM SUBMIT
// ─────────────────────────────────────────
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const service           = (serviceSelect.value || "").trim().toLowerCase();
  const custName          = document.getElementById("custName").value.trim();
  const address           = document.getElementById("address").value.trim();
  const date              = document.getElementById("date").value;
  const chosenWorkerPhone = (localStorage.getItem("chosenWorkerPhone") || "").trim();
  const chosenWorkerRole  = (localStorage.getItem("chosenWorkerRole")  || "").trim().toLowerCase();

  if (!service) return showToast("Select service first");
  if (!chosenWorkerPhone || chosenWorkerRole !== service) {
    return showToast("Please choose a worker for the selected service");
  }

  try {
    const res = await fetch("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: custName,
        phone,
        service,
        address,
        date,
        chosenWorkerPhone,
        chosenWorkerRole
      })
    });

    const data = await res.json();
    if (!res.ok) return showToast(data.error || "Booking failed");

    resetSessionTimer();

    const serviceVal  = serviceSelect.value;
    const workerName  = localStorage.getItem("chosenWorkerName")  || "Worker";
    const workerPhone = localStorage.getItem("chosenWorkerPhone") || "";

    document.getElementById("bconf-service").textContent =
      serviceVal.charAt(0).toUpperCase() + serviceVal.slice(1);
    document.getElementById("bconf-worker").textContent  = `${workerName} (${workerPhone})`;
    document.getElementById("bconf-address").textContent = address;
    document.getElementById("bconf-date").textContent    = date;

    const overlay = document.getElementById("bookingSuccessOverlay");
    overlay.style.display = "flex";

    document.getElementById("bconfViewBtn").onclick = () => { window.location.href = "mybooking.html"; };
    document.getElementById("bconfCloseBtn").onclick = () => { overlay.style.display = "none"; };

    bookingForm.reset();

    // Clear worker + service after successful booking
    localStorage.removeItem("chosenWorkerName");
    localStorage.removeItem("chosenWorkerPhone");
    localStorage.removeItem("chosenWorkerRole");
    localStorage.removeItem("selectedServiceRole");

    refreshSelectedWorkerUI();

  } catch (err) {
    console.log(err);
    showToast("Server error. Try again later.");
  }
});
