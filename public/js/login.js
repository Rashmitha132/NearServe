// ─────────────────────────────────────────
//  LOCATION CHECK — Karnataka only
// ─────────────────────────────────────────
function checkKarnataka() {
  return new Promise((resolve, reject) => {

    // Show the location overlay
    document.getElementById("locationOverlay").style.display = "flex";
    document.getElementById("locStatus").textContent = "Detecting your location...";
    document.getElementById("locIcon").textContent = "📍";
    document.getElementById("locIconWrap").className = "loc-icon-wrap checking";
    document.getElementById("locDots").style.display = "flex";
    document.getElementById("locDeniedMsg").style.display = "none";

    if (!navigator.geolocation) {
      reject("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          document.getElementById("locStatus").textContent = "Verifying your region...";

          const { latitude, longitude } = pos.coords;

          // Try Nominatim with a proper User-Agent and timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          let state = "";

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: {
                  "Accept-Language": "en",
                  "User-Agent": "NearServe/1.0"
                },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);
            const data = await res.json();
            state = (data.address?.state || data.address?.county || "").toLowerCase();
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            // Nominatim failed — try fallback API
            try {
              const fallback = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const fallbackData = await fallback.json();
              state = (fallbackData.principalSubdivision || "").toLowerCase();
            } catch (fallbackErr) {
              // Both APIs failed — allow login (don't block user due to API issues)
              console.warn("Location APIs unavailable, allowing login");
              resolve();
              return;
            }
          }

          if (
            state.includes("karnataka") ||
            state.includes("karṇāṭaka") ||
            state === ""  // If state is empty (API issue), allow through
          ) {
            resolve(); // ✅ Allow
          } else {
            // Get a clean display name for the region
            const displayRegion = state.charAt(0).toUpperCase() + state.slice(1) || "your region";
            reject(displayRegion);
          }

        } catch (err) {
          console.error("Location verify error:", err);
          // On any unexpected error, allow login rather than blocking
          resolve();
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject("location_denied");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          // Position unavailable — allow through rather than blocking
          resolve();
        } else {
          reject("Unable to fetch location. Please try again.");
        }
      },
      { timeout: 12000, enableHighAccuracy: false }
    );
  });
}

// ─────────────────────────────────────────
//  Show "not available" screen
// ─────────────────────────────────────────
function showNotAvailable(region) {
  // Hide dots
  const dots = document.getElementById("locDots");
  if (dots) dots.style.display = "none";

  document.getElementById("locIconWrap").className = "loc-icon-wrap denied";
  document.getElementById("locIcon").textContent = "😔";
  document.getElementById("locStatus").textContent = "";
  document.getElementById("locDeniedMsg").style.display = "block";

  if (region === "location_denied") {
    document.getElementById("locDeniedTitle").textContent = "Location Access Denied";
    document.getElementById("locDeniedSub").textContent =
      "We need your location to check service availability. Please allow location access in your browser and try again.";
    const regionEl = document.getElementById("locDeniedRegion");
    if (regionEl) regionEl.style.display = "none";
  } else {
    document.getElementById("locDeniedTitle").textContent = "Service Not Available";
    const regionEl = document.getElementById("locDeniedRegion");
    if (regionEl) {
      regionEl.style.display = "block";
      regionEl.textContent = `📍 Detected region: ${region}`;
    }
    document.getElementById("locDeniedSub").textContent =
      "Sorry! NearServe is currently available only in Karnataka. We're working hard to expand to more regions soon. 🙏";
  }
}

// ─────────────────────────────────────────
//  LOGIN FORM SUBMIT
// ─────────────────────────────────────────
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const emailOrPhone = document.getElementById("emailOrPhone").value.trim();
  const password     = document.getElementById("password").value.trim();
  const role         = document.getElementById("role").value.trim().toLowerCase();

  if (!emailOrPhone || !password || !role) {
    alert("Please fill all fields and select a role.");
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone, password, role })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Login failed");
      return;
    }

    // ✅ Store user info
    localStorage.setItem("phone", data.user.phone);
    localStorage.setItem("role",  data.user.role);
    localStorage.setItem("name",  data.user.name);

    // ✅ Determine redirect destination
    let redirectTo = "";

    if (data.user.role !== "customer") {
      if (data.user.status === "pending_verification") {
        redirectTo = "upload_proof.html";
      } else if (data.user.status === "probation") {
        redirectTo = data.user.role + "_dashboard.html";
      } else if (data.user.status === "blocked") {
        alert("Your account is blocked. Contact admin.");
        return;
      } else {
        redirectTo = data.user.role + "_requests.html";
      }
    } else {
      redirectTo = "booking.html";
    }

    // ✅ Workers skip location check — only customers go through it
    if (data.user.role !== "customer") {
      window.location.href = redirectTo;
      return;
    }

    // Store redirect for retry button
    window._pendingRedirect = redirectTo;

    // ── LOCATION CHECK for customers ──
    try {
      await checkKarnataka();
      // ✅ Karnataka confirmed
      const dots = document.getElementById("locDots");
      if (dots) dots.style.display = "none";
      document.getElementById("locIconWrap").className = "loc-icon-wrap success";
      document.getElementById("locIcon").textContent = "✅";
      document.getElementById("locStatus").textContent = "Karnataka confirmed! Redirecting...";
      setTimeout(() => { window.location.href = redirectTo; }, 1200);

    } catch (region) {
      showNotAvailable(region);
    }

  } catch (err) {
    console.error("Login error:", err);
    alert("Server error. Try again later.");
  }
});