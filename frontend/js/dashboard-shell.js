(function () {
  function text(key, fallback) {
    return (localStorage.getItem(key) || fallback || "").trim();
  }
  function usableName(value) {
    const name = String(value || "").trim();
    return name && name.toLowerCase() !== "xyz" ? name : "";
  }
  function getName() {
    const authUser = window.nearServeCurrentUser || {};
    return usableName(authUser.name) || usableName(text("userName")) || usableName(text("name")) || usableName(text("customerName")) || "Guest";
  }
  function getPhone() {
    return text("userPhone") || text("phone") || "";
  }
  function getRole() {
    return (text("userRole") || text("role")).toLowerCase();
  }
  function isWorkerRole() {
    return ["electrician", "plumber", "carpenter"].includes(getRole());
  }
  function getProfileUrl() {
    return isWorkerRole() ? "worker_myprofile.html" : "profile.html";
  }
  function getAvatar() {
    const phone = getPhone();
    return text("customerAvatar") ||
      text("profilePic") ||
      text("profileImage") ||
      (phone ? localStorage.getItem(`avatarBase64_customer_${phone}`) : "") ||
      "";
  }
  function initials(name) {
    return (name || "C").trim().split(/\s+/).slice(0, 2).map(s => s[0] || "").join("").toUpperCase() || "C";
  }
  function setAvatar(el, name, image) {
    if (!el) return;
    el.innerHTML = image ? `<img src="${image}" alt="${name.replace(/"/g, "&quot;")}">` : initials(name);
  }
  function syncIdentity() {
    const name = getName();
    const image = getAvatar();
    document.querySelectorAll("[data-ns-name]").forEach(el => el.textContent = name);
    document.querySelectorAll("[data-ns-welcome]").forEach(el => el.textContent = `Welcome, ${name}!`);
    document.querySelectorAll("[data-ns-avatar]").forEach(el => setAvatar(el, name, image));
  }
  window.nearServeSyncShellIdentity = syncIdentity;
  function closeMenu() {
    document.getElementById("nsSidebar")?.classList.remove("open");
    document.getElementById("nsSidebarBackdrop")?.classList.remove("show");
  }
  function openMenu() {
    document.getElementById("nsSidebar")?.classList.add("open");
    document.getElementById("nsSidebarBackdrop")?.classList.add("show");
  }
  function syncProfileLinks() {
    if (!isWorkerRole()) return;
    document.querySelectorAll('a[href="profile.html"]').forEach(a => {
      a.setAttribute("href", "worker_myprofile.html");
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    syncIdentity();
    syncProfileLinks();
    window.nearServeAuthReady?.then(syncIdentity);
    window.addEventListener("nearserve:auth-ready", syncIdentity);
    document.getElementById("nsSidebarOpen")?.addEventListener("click", openMenu);
    document.getElementById("nsSidebarClose")?.addEventListener("click", closeMenu);
    document.getElementById("nsSidebarBackdrop")?.addEventListener("click", closeMenu);
    document.querySelectorAll(".ns-nav a").forEach(a => a.addEventListener("click", closeMenu));
    document.querySelectorAll(".ns-side-user").forEach(el => {
      el.addEventListener("click", () => location.href = getProfileUrl());
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          location.href = getProfileUrl();
        }
      });
    });
  });
})();
