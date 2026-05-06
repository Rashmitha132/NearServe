const API_BASE = window.NEARSERVE_API_BASE;

function showToast(msg, type) {
  window.nearServeToast(msg, type || "error");
}

function getRoleEmoji(role) {
  if (role === "carpenter")   return "Carpenter";
  if (role === "electrician") return "Electrician";
  if (role === "plumber")     return "Plumber";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Worker";
}

function getDashboardUrl(role) {
  if (role === "carpenter")   return "carpenter_requests.html";
  if (role === "electrician") return "electrician_requests.html";
  if (role === "plumber")     return "plumber_requests.html";
  return "login.html";
}

window.addEventListener("DOMContentLoaded", async function() {
  const phone      = (localStorage.getItem("phone") || localStorage.getItem("userPhone") || "").trim();
  const role       = (localStorage.getItem("userRole") || localStorage.getItem("role")  || "").trim().toLowerCase();
  const storedName = localStorage.getItem("name") || localStorage.getItem("userName") || "";

  if (!phone || !role || role === "customer") {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = getDashboardUrl(role);
  });
  document.getElementById("sideDashboardLink").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = getDashboardUrl(role);
  });
  document.getElementById("nsDashboardLink").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = getDashboardUrl(role);
  });
  document.getElementById("sideLogoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "login.html";
  });
  document.getElementById("nsLogoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "login.html";
  });
  const nsSidebar = document.getElementById("nsSidebar");
  const nsSidebarBackdrop = document.getElementById("nsSidebarBackdrop");
  function openMobileMenu() {
    nsSidebar.classList.add("open");
    nsSidebarBackdrop.classList.add("show");
  }
  function closeMobileMenu() {
    nsSidebar.classList.remove("open");
    nsSidebarBackdrop.classList.remove("show");
  }
  document.getElementById("mobileMenuBtn").addEventListener("click", openMobileMenu);
  document.getElementById("nsSidebarClose").addEventListener("click", closeMobileMenu);
  nsSidebarBackdrop.addEventListener("click", closeMobileMenu);
  document.querySelectorAll(".ns-nav a").forEach(link => link.addEventListener("click", closeMobileMenu));
  document.getElementById("mobileLogoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });

  document.getElementById("profileRole").textContent = getRoleEmoji(role);
  document.getElementById("roleDisplay").value = getRoleEmoji(role);
  document.getElementById("sideRole").textContent = getRoleEmoji(role);
  document.getElementById("sideWorkspace").textContent = getRoleEmoji(role) + " workspace";
  document.getElementById("mobileProfileRole").textContent = getRoleEmoji(role);
  document.querySelectorAll("[data-ns-role]").forEach(el => {
    el.textContent = getRoleEmoji(role);
  });
  document.getElementById("nsWorkspaceText").textContent = getRoleEmoji(role) + " workspace";

  const avatarImg      = document.getElementById("avatarImg");
  const avatarFallback = document.getElementById("avatarFallback");

  function setAvatar(nameText, imageSrc) {
    const firstLetter = (nameText || "W").trim().charAt(0).toUpperCase() || "W";
    const sideAvatar = document.getElementById("sideAvatar");
    const mobileAvatar = document.getElementById("mobileProfileAvatar");
    if (imageSrc) {
      avatarImg.src = imageSrc;
      avatarImg.classList.remove("hidden");
      avatarFallback.classList.add("hidden");
      sideAvatar.innerHTML = `<img src="${imageSrc}" alt="${nameText || "Worker"}">`;
      mobileAvatar.innerHTML = `<img src="${imageSrc}" alt="${nameText || "Worker"}">`;
      document.querySelectorAll("[data-ns-avatar]").forEach(el => {
        el.innerHTML = `<img src="${imageSrc}" alt="${nameText || "Worker"}">`;
      });
    } else {
      avatarFallback.textContent = firstLetter;
      avatarFallback.classList.remove("hidden");
      avatarImg.classList.add("hidden");
      avatarImg.removeAttribute("src");
      sideAvatar.textContent = firstLetter;
      mobileAvatar.textContent = firstLetter;
      document.querySelectorAll("[data-ns-avatar]").forEach(el => {
        el.textContent = firstLetter;
      });
    }
  }

  try {
    const [profileRes, workerRes] = await Promise.all([
      fetch(`${API_BASE}/profile/${phone}`),
      fetch(`${API_BASE}/workers/${encodeURIComponent(phone)}`)
    ]);

    if (profileRes.ok) {
      const user = await profileRes.json();
      let workerData = {};
      try {
        if (workerRes.ok) workerData = await workerRes.json();
      } catch (e) {}

      const currentName = user.name || storedName || "Worker";
      const dbAvatar = workerData.avatarBase64 || user.avatarBase64 || "";
      const localAvatar = localStorage.getItem("avatarBase64") || "";
      const avatarToUse = dbAvatar || localAvatar;

      if (dbAvatar) localStorage.setItem("avatarBase64", dbAvatar);
      setAvatar(currentName, avatarToUse);

      document.getElementById("profileName").textContent = user.name || "-";
      document.getElementById("sideName").textContent = user.name || storedName || "Worker";
      document.getElementById("mobileProfileName").textContent = user.name || storedName || "Worker";
      document.querySelectorAll("[data-ns-name]").forEach(el => {
        el.textContent = user.name || storedName || "Worker";
      });
      document.getElementById("fullName").value = user.name || "";
      document.getElementById("email").value = user.email || "";
      document.getElementById("phone").value = user.phone || "";
      document.getElementById("bio").value = user.bio || "";
      document.getElementById("address").value = user.address || "";
      document.getElementById("city").value = user.city || "";
      document.getElementById("state").value = user.state || "";
      document.getElementById("pincode").value = user.pincode || "";
      document.getElementById("country").value = user.country || "India";

      document.getElementById("availability").value = workerData.availability || user.availability || "available";
      document.getElementById("communicationPref").value = workerData.communicationPref || user.communicationPref || "chat";
      document.getElementById("preferredTime").value = workerData.preferredTime || user.preferredTime || "flexible";

      try {
        const jobsRes = await fetch(`${API_BASE}/bookings/chosen/${role}/${encodeURIComponent(phone)}`);
        if (jobsRes.ok) {
          const jobs = await jobsRes.json();
          const completed = Array.isArray(jobs)
            ? jobs.filter(j => (j.status || "").toLowerCase() === "completed").length
            : 0;
          document.getElementById("completedJobs").textContent = completed;
          document.getElementById("mobileCompletedJobs").textContent = completed;
        } else {
          document.getElementById("completedJobs").textContent = "0";
          document.getElementById("mobileCompletedJobs").textContent = "0";
        }
      } catch (e) {
        document.getElementById("completedJobs").textContent = "0";
        document.getElementById("mobileCompletedJobs").textContent = "0";
      }

      const createdYear = new Date(user.createdAt).getFullYear();
      const memberSince = createdYear > 1970 ? createdYear : new Date().getFullYear();
      document.getElementById("memberSince").textContent = memberSince;
      document.getElementById("mobileMemberSince").textContent = memberSince;
    } else {
      setAvatar(storedName || "Worker", localStorage.getItem("avatarBase64") || "");
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    setAvatar(storedName || "Worker", localStorage.getItem("avatarBase64") || "");
  }

  document.getElementById("avatarEditBtn").addEventListener("click", () => {
    document.getElementById("avatarUploadInput").click();
  });
  document.getElementById("mobileAvatarEditBtn").addEventListener("click", () => {
    document.getElementById("avatarUploadInput").click();
  });
  document.getElementById("mobileAvatarRemoveBtn").addEventListener("click", () => {
    document.getElementById("avatarRemoveBtn").click();
  });

  document.getElementById("avatarUploadInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
      const base64 = event.target.result;
      localStorage.setItem("avatarBase64", base64);
      setAvatar(document.getElementById("fullName").value.trim() || storedName || "Worker", base64);

      try {
        const res = await fetch(`${API_BASE}/profile/${phone}/avatar`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ avatarBase64: base64 })
        });

        if (res.ok) {
          showToast("Profile picture updated!", "success");
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Error saving profile picture", "error");
        }
      } catch (e) {
        showToast("Error saving profile picture", "error");
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("avatarRemoveBtn").addEventListener("click", async function() {
    localStorage.removeItem("avatarBase64");
    setAvatar(document.getElementById("fullName").value.trim() || storedName || "Worker", "");

    try {
      const res = await fetch(`${API_BASE}/profile/${phone}/avatar`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ avatarBase64: "" })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Error removing profile picture", "error");
        return;
      }
    } catch (e) {
      showToast("Error removing profile picture", "error");
      return;
    }

    showToast("Profile picture removed!", "success");
  });

  document.getElementById("savePersonalBtn").addEventListener("click", async function() {
    const newName  = document.getElementById("fullName").value.trim();
    const newEmail = document.getElementById("email").value.trim();
    const bio      = document.getElementById("bio").value.trim();

    if (!newName) {
      showToast("Name cannot be empty", "error");
      return;
    }

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast("Enter a valid email", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${phone}`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ name:newName, email:newEmail, bio })
      });

      if (res.ok) {
        localStorage.setItem("name", newName);
        localStorage.setItem("userName", newName);
        localStorage.setItem("email", newEmail);
        document.getElementById("profileName").textContent = newName;
        document.getElementById("sideName").textContent = newName;
        document.getElementById("mobileProfileName").textContent = newName;
        document.querySelectorAll("[data-ns-name]").forEach(el => {
          el.textContent = newName;
        });
        setAvatar(newName, localStorage.getItem("avatarBase64"));
        showToast("Personal info saved successfully!", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Error saving", "error");
      }
    } catch (err) {
      showToast("Error saving profile", "error");
    }
  });

  document.getElementById("saveAddressBtn").addEventListener("click", async function() {
    const address = document.getElementById("address").value.trim();
    const city    = document.getElementById("city").value.trim();
    const state   = document.getElementById("state").value.trim();
    const pincode = document.getElementById("pincode").value.trim();
    const country = document.getElementById("country").value.trim();

    try {
      const res = await fetch(`${API_BASE}/profile/${phone}/address`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ address, city, state, pincode, country })
      });

      if (res.ok) {
        showToast("Address saved successfully!", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Error saving", "error");
      }
    } catch (err) {
      showToast("Error saving address", "error");
    }
  });

  document.getElementById("savePreferencesBtn").addEventListener("click", async function() {
    const availability = document.getElementById("availability").value;
    const comm = document.getElementById("communicationPref").value;
    const time = document.getElementById("preferredTime").value;

    try {
      const res = await fetch(`${API_BASE}/profile/${phone}/preferences`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ availability, communicationPref: comm, preferredTime: time })
      });

      if (res.ok) {
        showToast("Preferences saved successfully!", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Error saving", "error");
      }
    } catch (err) {
      showToast("Error saving preferences", "error");
    }
  });

  document.getElementById("savePasswordBtn").addEventListener("click", async function() {
    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (!current || !newPass || !confirm) {
      showToast("All password fields are required", "error");
      return;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPass)) {
      showToast("Password must be at least 8 characters and include one uppercase letter and one special character", "error");
      return;
    }
    if (newPass !== confirm) {
      showToast("Passwords do not match", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${phone}/password`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ currentPassword: current, newPassword: newPass, confirmPassword: confirm })
      });

      if (res.ok) {
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        showToast("Password changed successfully!", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Error changing password", "error");
      }
    } catch (err) {
      showToast("Error changing password", "error");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", function() {
    localStorage.clear();
    window.location.href = "login.html";
  });

  async function loadReviews() {
    const list = document.getElementById("miniReviewsList");
    try {
      const res  = await fetch(`${API_BASE}/workers/${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const reviews   = data.reviewsList || [];
      const avgRating = parseFloat(data.avgRating) || 0;
      const count     = data.reviewsCount || 0;

      if (count === 0) {
        list.innerHTML = `<div class="mini-no-reviews">
          <div class="mini-no-icon"><i class="fa-regular fa-comment-dots"></i></div>
          <div class="mini-no-text">No reviews yet</div>
          <p style="font-size:0.75rem;color:var(--soft);margin-top:4px;">Complete jobs to get reviews!</p>
        </div>`;
        return;
      }

      document.getElementById("miniAvgNum").textContent = avgRating.toFixed(1);
      document.getElementById("miniReviewCount").textContent = count + " review" + (count !== 1 ? "s" : "");
      const starsHtml = [1,2,3,4,5].map(i => {
        if (i <= Math.floor(avgRating)) return '<span style="color:#f59e0b;">*</span>';
        if (i - avgRating < 1 && i - avgRating > 0) return '<span style="color:#fcd34d;">*</span>';
        return '<span style="color:#e5e7eb;">*</span>';
      }).join("");
      document.getElementById("miniStars").innerHTML = starsHtml;
      document.getElementById("miniRatingTop").style.display = "flex";

      if (reviews.length === 0) {
        list.innerHTML = `<div class="mini-no-reviews">
          <div class="mini-no-icon"><i class="fa-solid fa-star"></i></div>
          <div class="mini-no-text">${count} rating(s) - no comments yet</div>
        </div>`;
        return;
      }

      const sorted = [...reviews].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      list.innerHTML = sorted.map(r => {
        const cName   = r.customerName || r.customerPhone || "Customer";
        const initial = cName.charAt(0).toUpperCase();
        const stars   = [1,2,3,4,5].map(i =>
          `<span style="color:${i <= r.rating ? '#f59e0b' : '#e5e7eb'};">*</span>`
        ).join("");
        const date = r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"})
          : "";
        return `<div class="mini-review-item">
          <div class="mini-review-header">
            <div class="mini-review-user">
              <div class="mini-avatar review-avatar">${initial}</div>
              <div>
                <div class="mini-name">${cName}</div>
                <div class="mini-date">${date}</div>
              </div>
            </div>
            <div class="mini-stars-small">${stars}</div>
          </div>
          <div class="mini-comment">"${r.comment || "No written review"}"</div>
        </div>`;
      }).join("");
    } catch(err) {
      console.error("Reviews error:", err);
      list.innerHTML = `<div class="mini-no-reviews">
        <div class="mini-no-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="mini-no-text">Could not load reviews</div>
      </div>`;
    }
  }

  loadReviews();
  setInterval(loadReviews, 30000);
});