const API_BASE = window.NEARSERVE_API_BASE;
const BOOKING_FEE = 29;

function showToast(msg, type) {
  const cleanMessage = String(msg || "")
    .replace(/^â\S*\s*/g, "")
    .replace(/^⚠️\s*/g, "")
    .replace(/^❌\s*/g, "");
  window.nearServeToast(cleanMessage, type || "error");
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load payment gateway"));
    document.head.appendChild(script);
  });
}

function showBookingSuccess({ service, workerText, address, date }) {
  document.getElementById("bconf-service").textContent =
    service.charAt(0).toUpperCase() + service.slice(1);
  document.getElementById("bconf-worker").textContent = workerText;
  document.getElementById("bconf-address").textContent = address;
  document.getElementById("bconf-date").textContent = date;
  document.getElementById("bookingSuccessOverlay").style.display = "flex";
}

function updateSelectedWorkerText() {
  const workerPhone = (localStorage.getItem("chosenWorkerPhone") || "").trim();
  const workerRole = (localStorage.getItem("chosenWorkerRole") || "").trim();
  const workerName = (localStorage.getItem("chosenWorkerName") || "").trim();
  const el = document.getElementById("selectedWorkerText");

  if (workerPhone) {
    el.textContent = workerName
      ? `${workerName} (${workerRole || "worker"} · ${workerPhone})`
      : `${workerRole || "worker"} · ${workerPhone}`;
    el.classList.add("on");
  } else {
    el.textContent = "No worker selected";
    el.classList.remove("on");
  }
}

function isRealName(value) {
  const name = String(value || "").trim();
  return name && name.toLowerCase() !== "xyz";
}

function syncBookingShellIdentity(name, avatarBase64) {
  if (!isRealName(name)) return;

  localStorage.setItem("userName", name);
  localStorage.setItem("name", name);
  document.querySelectorAll("[data-ns-name]").forEach(el => {
    el.textContent = name;
  });
  document.querySelectorAll("[data-ns-welcome]").forEach(el => {
    el.textContent = `Welcome, ${name}!`;
  });
  document.querySelectorAll("[data-ns-avatar]").forEach(el => {
    if (avatarBase64) {
      el.innerHTML = `<img src="${avatarBase64}" alt="${name.replace(/"/g, "&quot;")}">`;
    } else {
      el.textContent = name.split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
    }
  });
  window.nearServeSyncShellIdentity?.();
}

window.addEventListener("DOMContentLoaded", async function () {
  if (window.nearServeAuthReady) {
    await window.nearServeAuthReady;
  }

  const pPhone =
    (localStorage.getItem("userPhone") ||
     localStorage.getItem("phone") ||
     "").trim();

  const storedName =
    localStorage.getItem("userName") ||
    localStorage.getItem("name") ||
    "";
  const pName = isRealName(storedName) ? storedName : "";

  if (!pPhone) {
    window.location.href = "login.html";
    return;
  }

  const userAvatar = document.getElementById("userAvatar");
  const avatarContainer = document.querySelector(".avatar-container");
  const custNameInput = document.getElementById("custName");
  const addressInput = document.getElementById("address");
  const dateInput = document.getElementById("date");

  try {
    const r = await fetch(`${API_BASE}/profile/${encodeURIComponent(pPhone)}`);
    const data = await r.json().catch(() => ({}));
    const profile = data.profile || data || {};

    const fullName = (profile.name || pName || "").trim();
    const fullAddress = [profile.address, profile.city, profile.state, profile.pincode]
      .filter(v => v && String(v).trim())
      .join(", ");

    const avatarBase64 = profile.avatarBase64 || "";

    avatarContainer.innerHTML = "";

    if (avatarBase64) {
      const img = document.createElement("img");
      img.src = avatarBase64;
      img.style.width = "44px";
      img.style.height = "44px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";
      img.style.boxShadow = "0 4px 12px rgba(37,99,235,0.3)";
      avatarContainer.appendChild(img);
    } else {
      const div = document.createElement("div");
      div.className = "uavatar";
      div.id = "userAvatar";
      div.textContent = (fullName || "U").charAt(0).toUpperCase();
      avatarContainer.appendChild(div);
    }

    document.getElementById("welcomeUser").textContent =
      "Welcome, " + (fullName || "Guest") + "!";
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sideAvatar = document.querySelector(".side-avatar");
    if (sidebarUserName) sidebarUserName.textContent = fullName || "Guest";
    if (avatarBase64) localStorage.setItem(`avatarBase64_customer_${pPhone}`, avatarBase64);
    if (sideAvatar) {
      sideAvatar.innerHTML = avatarBase64
        ? `<img src="${avatarBase64}" alt="">`
        : (fullName || "U").charAt(0).toUpperCase();
    }

    custNameInput.value = fullName || "";
    addressInput.value = fullAddress || "";
    syncBookingShellIdentity(fullName, avatarBase64);
  } catch (err) {
    console.error("Profile load error:", err);
    userAvatar.textContent = (pName || "U").charAt(0).toUpperCase();
    document.getElementById("welcomeUser").textContent =
      "Welcome, " + (pName || "Guest") + "!";
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sideAvatar = document.querySelector(".side-avatar");
    const cachedAvatar = pPhone ? localStorage.getItem(`avatarBase64_customer_${pPhone}`) : "";
    if (sidebarUserName) sidebarUserName.textContent = pName || "Guest";
    if (sideAvatar) {
      sideAvatar.innerHTML = cachedAvatar
        ? `<img src="${cachedAvatar}" alt="">`
        : (pName || "U").charAt(0).toUpperCase();
    }
    custNameInput.value = pName || "";
    addressInput.value = "";
    syncBookingShellIdentity(pName, cachedAvatar);
  }

  dateInput.min = new Date().toISOString().split("T")[0];
  updateSelectedWorkerText();

  const presetService = localStorage.getItem("selectedServiceRole");
  if (presetService) {
    document.getElementById("serviceSelect").value = presetService;
  }
  localStorage.setItem("selectedServiceRole", document.getElementById("serviceSelect").value);

  function syncServiceCards() {
    const selectedService = document.getElementById("serviceSelect").value;
    document.querySelectorAll(".service-card[data-service]").forEach(card => {
      card.classList.toggle("active", card.dataset.service === selectedService);
    });
  }

  function syncServiceLinks() {
    const selectedService = document.getElementById("serviceSelect").value;
    const workersLink = document.getElementById("myWorkersLink");
    if (workersLink) {
      workersLink.href = `worker_list.html?role=${encodeURIComponent(selectedService)}`;
    }
  }

  document.querySelectorAll(".service-card[data-service]").forEach(card => {
    card.addEventListener("click", () => {
      const serviceSelect = document.getElementById("serviceSelect");
      serviceSelect.value = card.dataset.service;
      serviceSelect.dispatchEvent(new Event("change"));
      syncServiceCards();
      localStorage.setItem("selectedServiceRole", card.dataset.service);
      window.location.href = `worker_list.html?role=${encodeURIComponent(card.dataset.service)}`;
    });
  });

  syncServiceCards();
  syncServiceLinks();

  document.getElementById("serviceSelect").addEventListener("change", () => {
    const selectedService = document.getElementById("serviceSelect").value;
    const chosenRole = (localStorage.getItem("chosenWorkerRole") || "").toLowerCase();
    syncServiceCards();
    syncServiceLinks();
    localStorage.setItem("selectedServiceRole", selectedService);

    if (chosenRole && chosenRole !== selectedService) {
      localStorage.removeItem("chosenWorkerPhone");
      localStorage.removeItem("chosenWorkerName");
      localStorage.removeItem("chosenWorkerRole");
      updateSelectedWorkerText();
      showToast("Worker selection cleared because service changed.", "error");
    }
  });

  document.getElementById("historyBtn").addEventListener("click", () => {
    window.location.href = "mybooking.html";
  });

  document.getElementById("chooseWorkerBtn").addEventListener("click", () => {
    const service = document.getElementById("serviceSelect").value;
    localStorage.setItem("selectedServiceRole", service);
    window.location.href = `worker_list.html?role=${encodeURIComponent(service)}`;
  });

  document.getElementById("myWorkersLink")?.addEventListener("click", () => {
    localStorage.setItem("selectedServiceRole", document.getElementById("serviceSelect").value);
  });

  document.getElementById("clearWorkerBtn").addEventListener("click", () => {
    localStorage.removeItem("chosenWorkerPhone");
    localStorage.removeItem("chosenWorkerName");
    localStorage.removeItem("chosenWorkerRole");
    updateSelectedWorkerText();
  });

  document.getElementById("bookingForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const service = document.getElementById("serviceSelect").value;
    const custName = custNameInput.value.trim();
    const address = addressInput.value.trim();
    const date = dateInput.value;
    const wPhone = (localStorage.getItem("chosenWorkerPhone") || "").trim();
    const wRole = (localStorage.getItem("chosenWorkerRole") || "").trim().toLowerCase();
    const wName = localStorage.getItem("chosenWorkerName") || "";

    if (!wPhone || wRole !== service) {
      showToast("⚠️ Please choose a worker for the selected service first!", "error");
      return;
    }

    if (!custName || !address || !date) {
      showToast("❌ Please fill in all fields", "error");
      return;
    }

    const btn = document.getElementById("confirmBtn");
    btn.disabled = true;
    btn.innerHTML = "Confirming...";

    try {
      const bookingPayload = {
        name: custName,
        phone: pPhone,
        service,
        address,
        date,
        chosenWorkerPhone: wPhone,
        chosenWorkerRole: wRole
      };

      const res = await fetch(`${API_BASE}/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("❌ " + (data.message || data.error || "Booking failed"), "error");
        return;
      }

      const workerText = wName ? `${wName} (${wPhone})` : `${wRole} (${wPhone})`;

      if (data.free) {
        showToast("First booking is free. Booking confirmed!", "success");
      } else {
        if (!data.key_id || !data.id || Number(data.amount) !== BOOKING_FEE * 100) {
          showToast("Payment order could not be created. Please try again.", "error");
          return;
        }

        await loadRazorpayScript();

        const paymentResult = await new Promise((resolve, reject) => {
          const razorpay = new Razorpay({
            key: data.key_id,
            amount: data.amount,
            currency: data.currency || "INR",
            name: "NearServe",
            description: `Booking fee - Rs ${data.displayAmount || BOOKING_FEE}`,
            order_id: data.id,
            prefill: {
              name: custName,
              contact: pPhone
            },
            theme: {
              color: "#145c3f"
            },
            handler(response) {
              resolve(response);
            },
            modal: {
              ondismiss() {
                reject(new Error("Payment cancelled"));
              }
            }
          });

          razorpay.open();
        });

        const verifyRes = await fetch(`${API_BASE}/payments/book-with-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bookingPayload,
            paymentId: paymentResult.razorpay_payment_id,
            orderId: paymentResult.razorpay_order_id,
            signature: paymentResult.razorpay_signature
          })
        });
        const verifyData = await verifyRes.json().catch(() => ({}));

        if (!verifyRes.ok) {
          showToast("Payment verification failed: " + (verifyData.error || "Please contact support"), "error");
          return;
        }

        showToast("Payment successful. Booking confirmed!", "success");
      }

      showBookingSuccess({ service, workerText, address, date });

      document.getElementById("bconfViewBtn").onclick = () => {
        window.location.href = "mybooking.html";
      };

      document.getElementById("bconfCloseBtn").onclick = () => {
        document.getElementById("bookingSuccessOverlay").style.display = "none";
        document.getElementById("bookingForm").reset();
        dateInput.min = new Date().toISOString().split("T")[0];
        custNameInput.value = custName;
        addressInput.value = address;
      };

      localStorage.removeItem("chosenWorkerPhone");
      localStorage.removeItem("chosenWorkerName");
      localStorage.removeItem("chosenWorkerRole");
      localStorage.setItem("selectedServiceRole", service);
      updateSelectedWorkerText();

    } catch (err) {
      showToast(err.message === "Payment cancelled" ? "Payment cancelled" : "Server error. Please try again.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17 4 12"/></svg> Confirm Booking';
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem("userName");
    localStorage.removeItem("name");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("phone");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("email");
    localStorage.removeItem("userRole");
    localStorage.removeItem("role");
    localStorage.removeItem("userStatus");
    localStorage.removeItem("token");
    localStorage.removeItem("chosenWorkerPhone");
    localStorage.removeItem("chosenWorkerName");
    localStorage.removeItem("chosenWorkerRole");
    localStorage.removeItem("selectedServiceRole");
    window.location.href = "login.html";
  });
});
