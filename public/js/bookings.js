const bookingForm = document.getElementById("bookingForm");
const logoutBtn = document.getElementById("logoutBtn");
const historyBtn = document.getElementById("historyBtn");

const serviceSelect = document.getElementById("serviceSelect");
const chooseWorkerBtn = document.getElementById("chooseWorkerBtn");
const selectedWorkerText = document.getElementById("selectedWorkerText");
const clearWorkerBtn = document.getElementById("clearWorkerBtn");

const welcomeEl = document.getElementById("welcomeUser");

const phone = (localStorage.getItem("phone") || "").trim();
const role = (localStorage.getItem("role") || "").trim().toLowerCase();
const nameLS = localStorage.getItem("name") || "";

if (!phone || role !== "customer") {
  alert("Please login as customer");
  window.location.href = "login.html";
}

if (welcomeEl && nameLS) {
  welcomeEl.innerText = `Welcome, ${nameLS}!`;
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});

// ✅ History button goes to separate portal
historyBtn.addEventListener("click", () => {
  window.location.href = "mybooking.html";
});

// Show selected worker (if already chosen from worker_profile.html)
function refreshSelectedWorkerUI() {
  const wName = localStorage.getItem("chosenWorkerName") || "";
  const wPhone = localStorage.getItem("chosenWorkerPhone") || "";
  const wRole = localStorage.getItem("chosenWorkerRole") || "";

  if (wPhone && wRole) {
    selectedWorkerText.innerText = `${wName || "Worker"} (${wRole}) - ${wPhone}`;
  } else {
    selectedWorkerText.innerText = "None";
  }
}

refreshSelectedWorkerUI();

clearWorkerBtn.addEventListener("click", () => {
  localStorage.removeItem("chosenWorkerName");
  localStorage.removeItem("chosenWorkerPhone");
  localStorage.removeItem("chosenWorkerRole");
  refreshSelectedWorkerUI();
});

// ✅ Open workers list in new page
chooseWorkerBtn.addEventListener("click", () => {
  const service = (serviceSelect.value || "").trim().toLowerCase();
  if (!service) return alert("Please select a service first");

  // store what service customer wants (so worker_list.html can load)
  localStorage.setItem("selectedServiceRole", service);
  window.location.href = "worker_list.html";
});

// Booking submit
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const service = (serviceSelect.value || "").trim().toLowerCase();
  const custName = document.getElementById("custName").value.trim();
  const address = document.getElementById("address").value.trim();
  const date = document.getElementById("date").value;

  const chosenWorkerPhone = (localStorage.getItem("chosenWorkerPhone") || "").trim();
  const chosenWorkerRole = (localStorage.getItem("chosenWorkerRole") || "").trim().toLowerCase();

  if (!service) return alert("Select service first");
  if (!chosenWorkerPhone || chosenWorkerRole !== service) {
    return alert("Please choose a worker for the selected service");
  }

  try {
    const res = await fetch("/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: custName,
        phone: phone,           // customer phone
        service: service,
        address,
        date,
        chosenWorkerPhone,      // ✅ saved to DB
        chosenWorkerRole        // ✅ saved to DB
      })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error || "Booking failed");

    alert("Booking successful! Request sent to worker.");

    bookingForm.reset();
    // keep worker selected (or clear if you want)
    // localStorage.removeItem("chosenWorkerPhone"); etc.
    refreshSelectedWorkerUI();

  } catch (err) {
    console.log(err);
    alert("Server error. Try again later.");
  }
});