  const API_BASE = window.NEARSERVE_API_BASE;

  // ════════════════════════════════════════════
  // CONFIGURATION & STATE
  // ════════════════════════════════════════════
  const bookingId = localStorage.getItem("chatBookingId") || localStorage.getItem("workerChatBookingId") || "";
  const customerPhone = localStorage.getItem("chatCustomerPhone") || localStorage.getItem("workerChatCustomerPhone") || "";
  const customerNameStored = localStorage.getItem("chatCustomerName") || "Customer";
  const myPhone = (localStorage.getItem("phone") || localStorage.getItem("userPhone") || "").trim();
  const myName = localStorage.getItem("name") || localStorage.getItem("userName") || "Worker";
  const myRole = (localStorage.getItem("role") || localStorage.getItem("userRole") || "worker").toLowerCase();

  let messages = [];
  let lastMessageCount = 0;
  let isSending = false;
  let pollInterval = null;

  // ════════════════════════════════════════════
  // VALIDATION
  // ════════════════════════════════════════════
  if (!bookingId || !customerPhone || !myPhone) {
    showToast("Invalid chat session. Please try again.");
    window.location.href =
      myRole === "carpenter" ? "carpenter_requests.html" :
      myRole === "plumber" ? "plumber_requests.html" :
      myRole === "electrician" ? "electrician_requests.html" :
      "login.html";
  }

  // ════════════════════════════════════════════
  // UI SETUP
  // ════════════════════════════════════════════
  document.getElementById("customerName").textContent = customerNameStored;
  document.getElementById("customerSub").textContent = customerPhone ? `Customer · ${customerPhone}` : "Booking chat";
  document.getElementById("customerAvatar").textContent =
    customerNameStored ? customerNameStored.charAt(0).toUpperCase() : "C";

  // ════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════
  function showToast(msg, type = "error") {
    window.nearServeToast(msg, type);
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  function getBackPage() {
    if (myRole === "carpenter") return "carpenter_requests.html";
    if (myRole === "plumber") return "plumber_requests.html";
    if (myRole === "electrician") return "electrician_requests.html";
    return "login.html";
  }

  // ════════════════════════════════════════════
  // LOAD & RENDER MESSAGES
  // ════════════════════════════════════════════
  async function loadMessages() {
    try {
      let res = await fetch(`${API_BASE}/chat/${encodeURIComponent(bookingId)}`);

      if (!res.ok) {
        console.log("Could not load messages");
        return;
      }

      const data = await res.json();
      const msgArray = Array.isArray(data) ? data : (data.messages || []);

      if (!Array.isArray(msgArray)) return;

      if (msgArray.length === lastMessageCount && messages.length > 0) {
        return;
      }

      lastMessageCount = msgArray.length;
      messages = msgArray.map(m => ({
        ...m,
        timestamp: m.timestamp || m.createdAt || new Date().toISOString()
      }));

      renderMessages();
    } catch (err) {
      console.log("Error loading messages:", err);
    }
  }

  function renderMessages() {
    const body = document.getElementById("chatBody");
    const emptyMsg = document.getElementById("emptyChatMsg");

    if (messages.length > 0 && emptyMsg) {
      emptyMsg.remove();
    }

    if (messages.length === 0) {
      if (!emptyMsg) {
        body.innerHTML = `
          <div class="empty-chat" id="emptyChatMsg">
            <div class="empty-chat-icon">💬</div>
            <div class="empty-chat-title">No messages yet</div>
            <p style="font-size:0.82rem;color:var(--soft);">Start the conversation with the customer.</p>
          </div>
        `;
      }
      return;
    }

    body.innerHTML = "";
    let lastDate = "";

    messages.forEach((m) => {
      const timestamp = m.timestamp || m.createdAt || new Date().toISOString();
      const msgDate = formatDate(timestamp);

      if (msgDate !== lastDate) {
        lastDate = msgDate;
        body.innerHTML += `<div class="chat-date-sep"><span>${msgDate}</span></div>`;
      }

      const senderPhone = m.senderPhone || "";
      const senderRole = (m.senderRole || "").toLowerCase();
      const isMine = senderPhone === myPhone || senderRole === myRole || senderRole === "worker";

      const senderName = m.senderName || (isMine ? myName : customerNameStored);

      body.innerHTML += `
        <div class="msg ${isMine ? "mine" : "theirs"}">
          ${!isMine ? `<div class="msg-sender">${escapeHtml(senderName)}</div>` : ""}
          <div class="msg-bubble">${escapeHtml(m.text || m.message || "")}</div>
          <div class="msg-meta">
            <span>${formatTime(timestamp)}</span>
            ${isMine ? '<i class="fa-solid fa-check" style="opacity:0.6;"></i>' : ""}
          </div>
        </div>
      `;
    });

    scrollToBottom();
  }

  // ════════════════════════════════════════════
  // SEND MESSAGE
  // ════════════════════════════════════════════
  async function sendMessage() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();

    if (!text || isSending) return;

    const tempMsg = {
      _id: "temp-" + Date.now(),
      text: text,
      senderPhone: myPhone,
      senderName: myName,
      senderRole: myRole,
      timestamp: new Date().toISOString()
    };

    messages.push(tempMsg);
    renderMessages();
    input.value = "";
    input.style.height = "auto";
    isSending = true;
    document.getElementById("sendBtn").disabled = true;

    try {
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId,
          senderPhone: myPhone,
          senderName: myName,
          senderRole: myRole,
          text: text,
          customerPhone: customerPhone
        })
      });

      if (!res.ok) {
        messages = messages.filter(m => m._id !== tempMsg._id);
        renderMessages();
        showToast("❌ Failed to send message", "error");
      } else {
        const data = await res.json();
        if (data && data._id) {
          const idx = messages.findIndex(m => m._id === tempMsg._id);
          if (idx !== -1) {
            messages[idx] = {
              ...data,
              timestamp: data.timestamp || data.createdAt || new Date().toISOString()
            };
          }
        }
        renderMessages();
      }
    } catch (err) {
      console.log("Send error:", err);
      messages = messages.filter(m => m._id !== tempMsg._id);
      renderMessages();
      showToast("❌ Error sending message", "error");
    } finally {
      isSending = false;
      document.getElementById("sendBtn").disabled = false;
      input.focus();
    }
  }

  // ════════════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════════════
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
    localStorage.removeItem("chatCustomerPhone");
    localStorage.removeItem("chatCustomerName");

    localStorage.removeItem("workerChatBookingId");
    localStorage.removeItem("workerChatCustomerPhone");

    window.location.href = getBackPage();
  });

  // ════════════════════════════════════════════
  // INITIALIZE & POLL
  // ════════════════════════════════════════════
  loadMessages();
  pollInterval = setInterval(loadMessages, 3000);

  window.addEventListener("beforeunload", () => {
    if (pollInterval) clearInterval(pollInterval);
  });

  console.log("✅ Worker Chat initialized - Booking:", bookingId, "Customer:", customerPhone, "Me:", myPhone);