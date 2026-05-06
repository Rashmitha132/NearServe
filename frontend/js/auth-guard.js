(function () {
  document.documentElement.style.visibility = "hidden";

  const page = (location.pathname.split("/").pop() || "login.html").toLowerCase();
  const publicPages = new Set([
    "",
    "index.html",
    "login.html",
    "signup.html",
    "reset-password.html",
    "admin_login.html",
  ]);

  if (publicPages.has(page)) {
    document.documentElement.style.visibility = "";
    return;
  }

  const adminPages = new Set(["admin_dashboard.html", "admin_history.html"]);
  const adminToken = (localStorage.getItem("adminToken") || "").trim();

  function redirect(url) {
    location.replace(url);
  }

  function getCookie(name) {
    return document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) || "";
  }

  function storeUser(user) {
    localStorage.setItem("userName", user.name || "");
    localStorage.setItem("userPhone", user.phone || "");
    localStorage.setItem("userEmail", user.email || "");
    localStorage.setItem("userRole", user.role || "");
    localStorage.setItem("userStatus", user.status || "");
    localStorage.setItem("name", user.name || "");
    localStorage.setItem("phone", user.phone || "");
    localStorage.setItem("email", user.email || "");
    localStorage.setItem("role", user.role || "");
    localStorage.setItem("status", user.status || "");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
  }

  function storeCsrf(token) {
    if (token) localStorage.setItem("nearServeCsrf", token);
  }

  function clearUser() {
    ["userName", "userPhone", "userEmail", "userRole", "userStatus", "name", "phone", "email", "role", "status", "token", "authToken", "nearServeCsrf"]
      .forEach((key) => localStorage.removeItem(key));
  }

  window.nearServeLogout = function nearServeLogout() {
    return window.fetch(`${window.NEARSERVE_API_BASE}/auth/logout`, { method: "POST" })
      .catch(() => {})
      .finally(() => {
        clearUser();
        redirect("login.html#login");
      });
  };

  if (adminPages.has(page)) {
    if (!adminToken) {
      redirect("admin_login.html?auth_required=1");
    }
    document.documentElement.style.visibility = "";
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    let isApi = false;
    if (typeof url === "string") {
      const parsedUrl = new URL(url, window.location.origin);
      isApi =
        parsedUrl.origin === window.NEARSERVE_API_ORIGIN &&
        parsedUrl.pathname.startsWith("/api");
    }

    if (!isApi) {
      return originalFetch(input, init);
    }

    const options = { ...(init || {}) };
    const method = String(options.method || "GET").toUpperCase();
    options.credentials = "include";
    options.headers = {
      ...(options.headers || {}),
    };

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      options.headers["X-CSRF-Token"] =
        localStorage.getItem("nearServeCsrf") || decodeURIComponent(getCookie("ns_csrf"));
    }

    return originalFetch(input, options).then((res) => {
      if (res.status === 401 || res.status === 403) {
        clearUser();
        redirect("login.html?auth_required=1#login");
      }
      return res;
    });
  };

  const workerRoles = new Set(["plumber", "electrician", "carpenter"]);
  const workerOnlyPages = new Set([
    "upload_proof.html",
    "worker_myprofile.html",
    "carpenter_dashboard.html",
    "carpenter_requests.html",
    "electrician_dashboard.html",
    "electrician_requests.html",
    "plumber_dashboard.html",
    "plumber_requests.html",
    "worker_chat.html",
    "worker_chat_page.html",
  ]);

  const customerOnlyPages = new Set([
    "booking.html",
    "confirmation.html",
    "dashboard.html",
    "mybooking.html",
    "profile.html",
    "worker_list.html",
    "worker_profile.html",
  ]);

  originalFetch(`${window.NEARSERVE_API_BASE}/auth/session`, { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("No active session");
      return res.json();
    })
    .then((data) => {
      const user = data.user || {};
      const role = String(user.role || "").toLowerCase();
      storeUser(user);
      storeCsrf(data.csrfToken);

      if (workerOnlyPages.has(page) && !workerRoles.has(role)) {
        redirect("login.html?invalid_access=1#login");
        return;
      }

      if (customerOnlyPages.has(page) && role !== "customer") {
        redirect("login.html?invalid_access=1#login");
        return;
      }

      document.documentElement.style.visibility = "";
    })
    .catch(() => {
      clearUser();
      redirect("login.html?auth_required=1#login");
    });
})();
