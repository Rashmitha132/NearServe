  const customerPhone = (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
  const displayName =
    localStorage.getItem("fullName") ||
    localStorage.getItem("name") ||
    localStorage.getItem("userName") ||
    "Customer";

  function setSidebarIdentity(name, imageSrc) {
    const cleanName = name || "Customer";
    const avatar = document.getElementById("sideAvatar");
    document.getElementById("sidebarUserName").textContent = cleanName;
    avatar.innerHTML = imageSrc
      ? `<img src="${imageSrc}" alt="">`
      : cleanName.charAt(0).toUpperCase();
  }

  setSidebarIdentity(displayName, customerPhone ? localStorage.getItem(`avatarBase64_customer_${customerPhone}`) : "");

  (async function syncSidebarAvatar() {
    if (!customerPhone) return;
    const apiBase =
      window.location.protocol === "file:" ||
      (window.location.port && window.location.port !== "5000")
        ? "http://localhost:5000/api"
        : "/api";
    try {
      const res = await fetch(`${apiBase}/profile/${encodeURIComponent(customerPhone)}`);
      if (!res.ok) return;
      const profile = await res.json();
      const name = profile.name || displayName;
      const image = profile.avatarBase64 || localStorage.getItem(`avatarBase64_customer_${customerPhone}`) || "";
      if (profile.avatarBase64) localStorage.setItem(`avatarBase64_customer_${customerPhone}`, profile.avatarBase64);
      setSidebarIdentity(name, image);
    } catch {}
  })();

  document.getElementById("myWorkersLink")?.addEventListener("click", () => {
    const currentRole = localStorage.getItem("selectedServiceRole") || "carpenter";
    localStorage.setItem("selectedServiceRole", currentRole);
  });