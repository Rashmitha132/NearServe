  const API_BASE =
    window.location.protocol === "file:" ||
    (window.location.port && window.location.port !== "5000")
      ? "http://localhost:5000/api"
      : "/api";

  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = (
    urlParams.get("bookingId") ||
    urlParams.get("booking") ||
    localStorage.getItem("chatBookingId") ||
    ""
  ).trim();
  const workerPhone = (
    urlParams.get("workerPhone") ||
    urlParams.get("phone") ||
    localStorage.getItem("chatWorkerPhone") ||
    ""
  ).trim();
  const workerRole = (
    urlParams.get("workerRole") ||
    urlParams.get("role") ||
    localStorage.getItem("chatWorkerRole") ||
    ""
  ).trim();
  const myPhone = (
  localStorage.getItem("userPhone") ||
  localStorage.getItem("phone") ||
  ""
).trim();

const myName =
  localStorage.getItem("userName") ||
  localStorage.getItem("name") ||
  "User";

const myRole = (
  localStorage.getItem("userRole") ||
  localStorage.getItem("role") ||
  "customer"
).trim().toLowerCase();

  const isWorker = ["carpenter","electrician","plumber"].includes(myRole);
  const senderPhone = isWorker ? (myPhone || workerPhone) : myPhone;
  const senderRole = isWorker ? myRole : "customer";

  function roleLabel(role) {
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Customer";
  }

  function dashboardForRole(role) {
    if (role === "electrician") return "electrician_requests.html";
    if (role === "carpenter") return "carpenter_requests.html";
    if (role === "plumber") return "plumber_requests.html";
    return "dashboard.html";
  }

  function logout() {
    localStorage.clear();
    window.location.href = "login.html";
  }

  function normalizeProfileImage(value) {
    const image = String(value || "").trim();
    if (!image) return "";
    if (image.startsWith("data:") || image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }
    return "data:image/png;base64," + image;
  }

  function setSidebarAvatar(name, imageValue) {
    const displayName = (name || myName || "User").trim();
    const image = normalizeProfileImage(imageValue);
    const fallback = (displayName || "U").charAt(0).toUpperCase();

    document.querySelectorAll("[data-ns-avatar]").forEach(avatar => {
      avatar.innerHTML = image
        ? `<img src="${image}" alt="Profile">`
        : fallback;
    });
  }

  async function loadLoggedInSidebarProfile() {
    const phone = myPhone || localStorage.getItem("userPhone") || localStorage.getItem("phone") || "";
    if (!phone) {
      setSidebarAvatar(myName, "");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}`);
      if (!res.ok) {
        setSidebarAvatar(myName, localStorage.getItem("avatarBase64") || "");
        return;
      }

      const data = await res.json();
      const user = data.profile || data.user || data || {};
      const image =
        user.avatarBase64 ||
        user.profileImage ||
        user.image ||
        user.profilePhoto ||
        localStorage.getItem("avatarBase64") ||
        "";
      const name = user.name || myName || "User";

      document.querySelectorAll("[data-ns-name]").forEach(el => {
        el.textContent = name;
      });
      document.querySelectorAll("[data-ns-welcome]").forEach(el => {
        el.textContent = `Welcome, ${name}!`;
      });
      setSidebarAvatar(name, image);
    } catch (err) {
      console.log("Sidebar profile error:", err);
      setSidebarAvatar(myName, localStorage.getItem("avatarBase64") || "");
    }
  }

  function renderRoleSidebar() {
    const nav = document.getElementById("chatRoleNav");
    const info = document.getElementById("chatSideInfo");
    const mobileAction = document.getElementById("chatMobileAction");
    const mobileInfo = document.getElementById("chatMobileInfo");
    const label = isWorker ? roleLabel(myRole) : "Customer";

    document.querySelectorAll("[data-ns-role]").forEach(el => {
      el.textContent = label;
    });

    if (isWorker) {
      const dashboardUrl = dashboardForRole(myRole);
      if (nav) {
        nav.innerHTML = `
          <a class="active" href="${dashboardUrl}"><i class="fa-solid fa-table-cells-large"></i>Dashboard</a>
          <a href="worker_myprofile.html"><i class="fa-regular fa-user"></i>My Profile</a>
          <a href="#" id="chatLogoutLink"><i class="fa-solid fa-arrow-right-from-bracket"></i>Logout</a>
        `;
      }

      if (info) {
        info.innerHTML = `
          <div><i class="fa-solid fa-bolt"></i>${label} workspace</div>
          <div><i class="fa-solid fa-clipboard-list"></i>Service requests</div>
          <div><i class="fa-regular fa-user"></i>Profile access</div>
        `;
      }

      if (mobileAction) {
        mobileAction.textContent = "Dashboard";
        mobileAction.onclick = () => { window.location.href = dashboardUrl; };
      }

      if (mobileInfo) {
        mobileInfo.innerHTML = `<span>${label} workspace</span><span>Service requests</span><span>Profile access</span>`;
      }

      document.querySelectorAll(".ns-side-user").forEach(el => {
        el.setAttribute("aria-label", "Open my profile");
        el.onclick = () => { window.location.href = "worker_myprofile.html"; };
      });
      document.getElementById("chatLogoutLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
      return;
    }

    if (nav) {
      nav.innerHTML = `
        <a href="dashboard.html"><i class="fa-solid fa-table-cells-large"></i>Dashboard</a>
        <a href="booking.html"><i class="fa-solid fa-screwdriver-wrench"></i>Book a service</a>
        <a class="active" href="mybooking.html"><i class="fa-regular fa-file-lines"></i>Booking history</a>
        <a href="profile.html"><i class="fa-regular fa-user"></i>My profile</a>
        <a href="worker_list.html"><i class="fa-solid fa-users"></i>My workers</a>
      `;
    }
  }

  renderRoleSidebar();
  loadLoggedInSidebarProfile();

  let displayName, displaySub;

  if (isWorker) {
    displayName = localStorage.getItem("chatCustomerName") || "Customer";
    displaySub = "Customer";
  } else {
    displayName = workerRole || (localStorage.getItem("chatWorkerName") || "Worker").split(" - ")[0].trim();
    displaySub = workerPhone ? workerPhone + " - Online" : "Worker - Online";
  }

const avatarEl = document.getElementById("workerAvatar");

document.getElementById("workerName").textContent = displayName;
document.getElementById("workerAvatar").textContent = displayName.charAt(0).toUpperCase();
document.getElementById("workerSub").textContent = displaySub;

async function loadChatHeaderProfile() {
  try {
    let targetPhone = "";
    let targetRole = "";

    if (isWorker) {
      // Worker viewing customer
      targetPhone = localStorage.getItem("chatCustomerPhone") || "";
      targetRole = "customer";
    } else {
      // Customer viewing worker
      targetPhone = workerPhone;
      targetRole = workerRole;
    }

    if (!targetPhone) return;

    const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(targetPhone)}`);
    if (!res.ok) return;

    const data = await res.json();
    const profile = data.profile || data || {};

    const name = profile.name || displayName;
    const avatarBase64 = profile.avatarBase64 || "";

    // Set name
    document.getElementById("workerName").textContent = name;

    // Set subtitle
    if (isWorker) {
      document.getElementById("workerSub").textContent = "Customer";
    } else {
      document.getElementById("workerSub").textContent =
        (targetRole || "Worker") + " - Online";
    }

    // Set avatar
    if (avatarBase64) {
      avatarEl.innerHTML = `<img src="${avatarBase64}" 
        style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }

  } catch (err) {
    console.log("Header profile error:", err);
  }
}

  if (bookingId) localStorage.setItem("chatBookingId", bookingId);
  if (workerPhone) localStorage.setItem("chatWorkerPhone", workerPhone);
  if (workerRole) localStorage.setItem("chatWorkerRole", workerRole);

  if (!bookingId || !senderPhone) {
    showToast("Invalid chat session. Please try again.");
    window.location.href = isWorker ? (myRole + "_requests.html") : "mybooking.html";
  }

  const otherName = isWorker
    ? (localStorage.getItem("chatCustomerName") || "Customer")
    : displayName;

  let messages = [];
  let lastMessageCount = 0;
  let isSending = false;
  let pollInterval = null;

  function showToast(msg, type = "error") {
    window.nearServeToast(msg, type);
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    } catch {
      return "";
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return "Today";
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
      return d.toLocaleDateString();
    } catch {
      return "";
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      const body = document.getElementById("chatBody");
      body.scrollTop = body.scrollHeight;
    }, 100);
  }

  function escapeHtml(text) {
    const map = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};
    return String(text || "").replace(/[&<>"']/g, m => map[m]);
  }

  async function loadMessages() {
    try {
      const endpoint = `${API_BASE}/chat/${encodeURIComponent(bookingId)}`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error loading chat messages", { endpoint, status: res.status, response: errData });
        return;
      }

      const data = await res.json().catch(() => ({}));
      const msgArray = Array.isArray(data) ? data : (data.messages || []);

      if (!Array.isArray(msgArray)) return;
      if (msgArray.length === lastMessageCount && messages.length > 0) return;

      lastMessageCount = msgArray.length;
      messages = msgArray.map(m => ({
        ...m,
        timestamp: m.timestamp || m.createdAt || new Date().toISOString()
      })).sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));

      renderMessages();
    } catch (err) {
      console.error("Error loading chat messages", err);
    }
  }

  function renderMessages() {
    const body = document.getElementById("chatBody");

    if (messages.length === 0) {
      body.innerHTML = `
        <div class="empty-chat" id="emptyChatMsg">
          <div class="empty-chat-icon"><i class="fa-regular fa-comment-dots"></i></div>
          <div class="empty-chat-title">No messages yet</div>
          <p style="font-size:0.82rem;color:var(--soft);">Send a message to start the conversation!</p>
        </div>
      `;
      return;
    }

    body.innerHTML = "";
    let lastDate = "";

    messages.forEach(m => {
      const timestamp = m.timestamp || m.createdAt || new Date().toISOString();
      const msgDate = formatDate(timestamp);

      if (msgDate !== lastDate) {
        lastDate = msgDate;
        body.innerHTML += `<div class="chat-date-sep"><span>${msgDate}</span></div>`;
      }

      const isMine = String(m.senderPhone || "").trim() === senderPhone;
      const senderName = m.senderName || (isMine ? myName : otherName);

      body.innerHTML += `
        <div class="msg ${isMine ? "mine" : "theirs"}">
          ${!isMine ? `<div class="msg-sender">${escapeHtml(senderName)}</div>` : ""}
          <div class="msg-bubble">${escapeHtml(m.text || m.message || "")}</div>
          <div class="msg-meta">
            <span>${formatTime(timestamp)}</span>
            ${isMine ? '<i class="fa-solid fa-check" style="opacity:0.6;"></i>' : ""}
          </div>
        </div>`;
    });

    scrollToBottom();
  }

  async function sendMessage() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text || isSending) return;

    const tempMsg = {
      _id: "temp-" + Date.now(),
      text,
      senderPhone,
      senderName: myName,
      senderRole,
      timestamp: new Date().toISOString()
    };

    messages.push(tempMsg);
    renderMessages();

    input.value = "";
    input.style.height = "auto";

    isSending = true;
    document.getElementById("sendBtn").disabled = true;

    try {
      const endpoint = `${API_BASE}/chat/send`;
      const payload = {
        bookingId,
        senderPhone,
        senderName: myName,
        senderRole,
        text
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Error sending chat message", { endpoint, status: res.status, payload, response: data });
        messages = messages.filter(m => m._id !== tempMsg._id);
        renderMessages();
        showToast(data.error || data.message || "Failed to send", "error");
      } else {
        if (data._id || data.message || data.text) {
          const idx = messages.findIndex(m => m._id === tempMsg._id);
          if (idx !== -1) {
            messages[idx] = {
              ...tempMsg,
              ...data,
              timestamp: data.timestamp || data.createdAt || tempMsg.timestamp
            };
          }
        }
        renderMessages();
      }
    } catch (err) {
      console.error("Error sending chat message", err);
      messages = messages.filter(m => m._id !== tempMsg._id);
      renderMessages();
      showToast("Error sending. Check server connection.", "error");
    } finally {
      isSending = false;
      document.getElementById("sendBtn").disabled = false;
      input.focus();
    }
  }

  document.getElementById("sendBtn").addEventListener("click", sendMessage);

  document.getElementById("chatInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById("chatInput").addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    if (pollInterval) clearInterval(pollInterval);

    localStorage.removeItem("chatBookingId");
    localStorage.removeItem("chatWorkerPhone");
    localStorage.removeItem("chatWorkerRole");
    localStorage.removeItem("chatWorkerName");
    localStorage.removeItem("chatCustomerName");
    localStorage.removeItem("chatCustomerPhone");

    if (myRole === "carpenter") {
      window.location.href = "carpenter_requests.html";
    } else if (myRole === "electrician") {
      window.location.href = "electrician_requests.html";
    } else if (myRole === "plumber") {
      window.location.href = "plumber_requests.html";
    } else {
      window.location.href = "mybooking.html";
    }
  });

  loadChatHeaderProfile();
  loadMessages();
  pollInterval = setInterval(loadMessages, 3000);

  window.addEventListener("beforeunload", () => {
    if (pollInterval) clearInterval(pollInterval);
  });