(function () {
  const apiOrigin = "https://nearserve-api.onrender.com";
  const cleanOrigin = apiOrigin.replace(/\/+$/, "");

  window.NEARSERVE_API_ORIGIN = cleanOrigin;
  window.NEARSERVE_API_BASE = `${cleanOrigin}/api`;
  window.NEARSERVE_UPLOADS_BASE = `${cleanOrigin}/uploads`;

  window.nearServeApiUrl = function nearServeApiUrl(path) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    return `${window.NEARSERVE_API_BASE}/${cleanPath}`;
  };

  window.nearServeUploadsUrl = function nearServeUploadsUrl(path) {
    const value = String(path || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;

    const cleanPath = value
      .replace(/^\/+/, "")
      .replace(/^uploads\/?/i, "");
    return `${window.NEARSERVE_UPLOADS_BASE}/${cleanPath}`;
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function nearServeFetch(input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    if (typeof url !== "string") return nativeFetch(input, init);

    let requestUrl = url;
    if (requestUrl.startsWith("/api/")) {
      requestUrl = `${window.NEARSERVE_API_BASE}${requestUrl.slice(4)}`;
    }

    const parsedUrl = new URL(requestUrl, window.location.origin);
    const isNearServeApi =
      parsedUrl.origin === window.NEARSERVE_API_ORIGIN &&
      parsedUrl.pathname.startsWith("/api");

    if (!isNearServeApi) {
      return nativeFetch(input, init);
    }

    const options = { ...(init || {}), credentials: "include" };
    const method = String(options.method || "GET").toUpperCase();
    options.headers = { ...(options.headers || {}) };
    const authToken = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
    if (authToken && !options.headers.Authorization) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const csrfToken = localStorage.getItem("nearServeCsrf") || "";
      if (csrfToken) options.headers["X-CSRF-Token"] = csrfToken;
    }

    return nativeFetch(requestUrl, options);
  };
})();
