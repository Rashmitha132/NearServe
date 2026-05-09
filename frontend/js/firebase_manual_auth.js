(function () {
  const API_BASE = window.NEARSERVE_API_BASE;
  const PENDING_KEY = "nearServePendingFirebaseSignup";

  function getAuth() {
    if (!window.firebase?.auth) {
      throw new Error("Firebase Authentication is not loaded yet. Please refresh and try again.");
    }
    return window.firebase.auth();
  }

  function normalizeRole(role) {
    return String(role || "").trim().toLowerCase();
  }

  function saveSessionAndRedirect(data) {
    const user = data.user || data;
    if (data.csrfToken) localStorage.setItem("nearServeCsrf", data.csrfToken);
    if (data.token) {
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("token", data.token);
    }

    sessionStorage.setItem("nearServeBrowserSession", "1");
    localStorage.setItem("nearServeLastActivity", String(Date.now()));
    localStorage.setItem("nearServeActiveUntil", String(Date.now() + 45 * 1000));

    const userName = String(user.name || "").trim().toLowerCase() === "xyz" ? "" : user.name || "";
    const userPhone = user.phone || "";
    const userEmail = user.email || "";
    const userRole = normalizeRole(user.role);
    const userStatus = normalizeRole(user.status);

    localStorage.setItem("userName", userName);
    localStorage.setItem("userPhone", userPhone);
    localStorage.setItem("userEmail", userEmail);
    localStorage.setItem("userRole", userRole);
    localStorage.setItem("userStatus", userStatus);
    localStorage.setItem("name", userName);
    localStorage.setItem("phone", userPhone);
    localStorage.setItem("email", userEmail);
    localStorage.setItem("role", userRole);
    localStorage.setItem("status", userStatus);

    if (userRole === "customer") {
      sessionStorage.setItem("nearServeShowBookingFeePopup", "1");
    }

    window.location.href = data.redirectTo || "booking.html";
  }

  function getPendingSignup(email) {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}");
      return String(pending.email || "").toLowerCase() === String(email || "").toLowerCase() ? pending : null;
    } catch {
      return null;
    }
  }

  function setPendingSignup(profile) {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      name: profile.name,
      email: String(profile.email || "").toLowerCase(),
      phone: profile.phone,
      role: profile.role,
      createdAt: Date.now(),
    }));
  }

  async function createAndSendVerification({ name, email, phone, password, role }) {
    const auth = getAuth();
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName: name });
    await credential.user.sendEmailVerification({
      url: `${window.location.origin}/login.html#login`,
      handleCodeInApp: false,
    });
    setPendingSignup({ name, email, phone, role });
    await auth.signOut();
  }

  async function loginWithFirebase({ email, password, fallbackProfile = null }) {
    const auth = getAuth();
    const credential = await auth.signInWithEmailAndPassword(email, password);
    await credential.user.reload();

    if (!credential.user.emailVerified) {
      await credential.user.sendEmailVerification({
        url: `${window.location.origin}/login.html#login`,
        handleCodeInApp: false,
      });
      await auth.signOut();
      const error = new Error("Please verify your email first. We sent a fresh verification link to your inbox.");
      error.code = "EMAIL_NOT_VERIFIED";
      throw error;
    }

    const idToken = await credential.user.getIdToken(true);
    const pending = getPendingSignup(email);
    const profile = fallbackProfile || pending || {};

    const res = await fetch(`${API_BASE}/auth/firebase-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, profile }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Could not complete login");
    }

    localStorage.removeItem(PENDING_KEY);
    saveSessionAndRedirect(data);
  }

  async function sendPasswordReset(email) {
    await getAuth().sendPasswordResetEmail(email, {
      url: `${window.location.origin}/login.html#login`,
      handleCodeInApp: false,
    });
  }

  window.NearServeFirebaseAuth = {
    createAndSendVerification,
    loginWithFirebase,
    getPendingSignup,
    sendPasswordReset,
  };
})();
