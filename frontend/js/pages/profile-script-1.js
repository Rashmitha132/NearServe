function showToast(msg, type) {
  window.nearServeToast(msg, type || "error");
}

window.addEventListener("DOMContentLoaded", async function() {
  const API_BASE = window.NEARSERVE_API_BASE;

  const phone =
    (localStorage.getItem("userPhone") ||
     localStorage.getItem("phone") ||
     "").trim();

  const role =
    (localStorage.getItem("userRole") ||
     localStorage.getItem("role") ||
     "").trim().toLowerCase();

  const storedName =
    localStorage.getItem("userName") ||
    localStorage.getItem("name") ||
    "";

  const storedEmail =
    localStorage.getItem("userEmail") ||
    localStorage.getItem("email") ||
    "";

  if (!phone || role !== "customer") {
    showToast("Please login as customer");
    window.location.href = "login.html";
    return;
  }

  const avatarKey = `avatarBase64_customer_${phone}`;

  const avatarImg = document.getElementById("avatarImg");
  const avatarFallback = document.getElementById("avatarFallback");
  const avatarWrapper = document.querySelector(".avatar-wrapper");
  const sideAvatar = document.getElementById("sideAvatar");
  const sideName = document.getElementById("sideName");

  function syncDisplayName(nameText) {
    const cleanName = nameText || "Customer";
    document.getElementById("profileName").textContent = cleanName;
    sideName.textContent = cleanName;
    if (!sideAvatar.querySelector("img")) {
      sideAvatar.textContent = cleanName.trim().charAt(0).toUpperCase() || "U";
    }
  }

  function setAvatar(nameText, imageSrc) {
    const firstLetter = (nameText || "User").trim().charAt(0).toUpperCase() || "U";

    if (imageSrc) {
      avatarImg.src = imageSrc;
      avatarImg.classList.remove("hidden");
      avatarFallback.classList.add("hidden");
      avatarWrapper.classList.add("has-image");
      sideAvatar.innerHTML = `<img src="${imageSrc}" alt="">`;
    } else {
      avatarFallback.textContent = firstLetter;
      avatarFallback.classList.remove("hidden");
      avatarImg.classList.add("hidden");
      avatarImg.removeAttribute("src");
      avatarWrapper.classList.remove("has-image");
      sideAvatar.textContent = firstLetter;
    }
  }

  function activateSection(targetId) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.target === targetId);
    });
    document.querySelectorAll(".form-section").forEach(section => {
      section.classList.toggle("active", section.id === targetId);
      section.classList.toggle("highlighted", section.id === targetId);
    });
  }

  function resizeImageFile(file, maxSize = 640, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load image"));
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => activateSection(btn.dataset.target));
  });

  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Profile load failed");
      }

      const user = data.profile || data || {};

      if ((user.role || "customer").toLowerCase() !== "customer") {
        showToast("This is not a customer profile");
        window.location.href = "login.html";
        return;
      }

      const dbAvatar = user.avatarBase64 || "";
      const avatarToUse = dbAvatar || localStorage.getItem(avatarKey) || "";
      const currentName = user.name || storedName || "User";

      if (dbAvatar) localStorage.setItem(avatarKey, dbAvatar);

      syncDisplayName(currentName);
      setAvatar(currentName, avatarToUse);

      document.getElementById("fullName").value = currentName;
      document.getElementById("email").value = user.email || storedEmail || "";
      document.getElementById("phone").value = user.phone || phone;
      document.getElementById("bio").value = user.bio || "";
      document.getElementById("address").value = user.address || "";
      document.getElementById("city").value = user.city || "";
      document.getElementById("state").value = user.state || "";
      document.getElementById("pincode").value = user.pincode || "";
      document.getElementById("country").value = user.country || "India";
      document.getElementById("serviceLocation").value = user.serviceLocation || "";
      document.getElementById("communicationPref").value = user.communicationPref || "email";
      document.getElementById("preferredTime").value = user.preferredTime || "flexible";

      const bookingsRes = await fetch(`${API_BASE}/bookings/my/${encodeURIComponent(phone)}`);
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json().catch(() => []);
        const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []);
        document.getElementById("totalBookings").textContent = bookings.length;
      } else {
        document.getElementById("totalBookings").textContent = "0";
      }

      const createdYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
      document.getElementById("memberSince").textContent = createdYear > 1970 ? createdYear : new Date().getFullYear();

    } catch (err) {
      console.error("Error loading profile:", err);
      const fallbackName = storedName || "Customer";
      syncDisplayName(fallbackName);
      setAvatar(fallbackName, localStorage.getItem(avatarKey) || "");
      document.getElementById("email").value = storedEmail || "";
      document.getElementById("phone").value = phone;
      document.getElementById("fullName").value = fallbackName;
      document.getElementById("totalBookings").textContent = "0";
      document.getElementById("memberSince").textContent = new Date().getFullYear();
    }
  }

  await loadProfile();

  document.getElementById("avatarEditBtn").addEventListener("click", () => {
    document.getElementById("avatarUploadInput").click();
  });

  document.getElementById("avatarUploadInput").addEventListener("change", async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }

    try {
      const base64 = await resizeImageFile(file);
      const currentName = document.getElementById("fullName").value.trim() || storedName || "User";

      localStorage.setItem(avatarKey, base64);
      setAvatar(currentName, base64);

      try {
        const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}/avatar`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarBase64: base64 })
        });

        if (res.ok) {
          showToast("Profile picture updated!", "success");
        } else {
          const err = await res.json().catch(() => ({}));
          localStorage.removeItem(avatarKey);
          setAvatar(currentName, "");
          showToast(err.message || err.error || "Error saving profile picture", "error");
        }
      } catch {
        localStorage.removeItem(avatarKey);
        setAvatar(currentName, "");
        showToast("Error saving profile picture", "error");
      }
    } catch {
      showToast("Error reading profile picture", "error");
    }
  });

  document.getElementById("avatarRemoveBtn").addEventListener("click", async function() {
    localStorage.removeItem(avatarKey);
    setAvatar(document.getElementById("fullName").value.trim() || storedName || "User", "");

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}/avatar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarBase64: "" })
      });

      if (res.ok) showToast("Profile picture removed!", "success");
      else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || err.error || "Error removing profile picture", "error");
      }
    } catch {
      showToast("Error removing profile picture", "error");
    }
  });

  document.getElementById("savePersonalBtn").addEventListener("click", async function() {
    const newName = document.getElementById("fullName").value.trim();
    const newEmail = document.getElementById("email").value.trim();
    const bio = document.getElementById("bio").value.trim();

    if (!newName) return showToast("Name cannot be empty", "error");
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return showToast("Enter a valid email", "error");
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, bio })
      });

      if (res.ok) {
        localStorage.setItem("userName", newName);
        localStorage.setItem("name", newName);
        localStorage.setItem("userEmail", newEmail);
        localStorage.setItem("email", newEmail);
        syncDisplayName(newName);
        setAvatar(newName, localStorage.getItem(avatarKey) || "");
        showToast("Personal info saved successfully!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || err.error || "Error saving", "error");
      }
    } catch {
      showToast("Error saving profile", "error");
    }
  });

  document.getElementById("saveAddressBtn").addEventListener("click", async function() {
    const address = document.getElementById("address").value.trim();
    const city = document.getElementById("city").value.trim();
    const state = document.getElementById("state").value.trim();
    const pincode = document.getElementById("pincode").value.trim();
    const country = document.getElementById("country").value.trim();

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}/address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city, state, pincode, country })
      });

      if (res.ok) showToast("Address saved successfully!", "success");
      else showToast("Error saving address", "error");
    } catch {
      showToast("Error saving address", "error");
    }
  });

  document.getElementById("savePreferencesBtn").addEventListener("click", async function() {
    const serviceLocation = document.getElementById("serviceLocation").value;
    const communicationPref = document.getElementById("communicationPref").value;
    const preferredTime = document.getElementById("preferredTime").value;

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceLocation, communicationPref, preferredTime })
      });

      if (res.ok) showToast("Preferences saved successfully!", "success");
      else showToast("Error saving preferences", "error");
    } catch {
      showToast("Error saving preferences", "error");
    }
  });

  document.getElementById("savePasswordBtn").addEventListener("click", async function() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return showToast("All password fields are required", "error");
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return showToast("Password must be at least 8 characters and include one uppercase letter and one special character", "error");
    }

    if (newPassword !== confirmPassword) {
      return showToast("Passwords do not match", "error");
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      if (res.ok) {
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        showToast("Password changed successfully!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || err.error || "Error changing password", "error");
      }
    } catch {
      showToast("Error changing password", "error");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", function() {
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
    window.location.href = "login.html";
  });
});
