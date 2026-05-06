  const API_BASE = "/api";

  const phone = (localStorage.getItem("phone") || localStorage.getItem("userPhone") || "").trim();
  const role  = (localStorage.getItem("userRole") || "").trim().toLowerCase();
  const name  = localStorage.getItem("name") || localStorage.getItem("userName") || "Electrician";

  if (!phone || role !== "electrician") {
    window.location.replace("login.html");
    throw new Error("Electrician role required");
  }

  function renderRoleSidebar() {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const nav = document.getElementById("roleNav");
    const info = document.getElementById("roleSideInfo");

    document.querySelectorAll("[data-ns-role]").forEach(el => {
      el.textContent = roleLabel;
    });

    if (nav) {
      nav.innerHTML = `
        <a class="active" href="electrician_requests.html"><i class="fa-solid fa-table-cells-large"></i>Dashboard</a>
        <a href="worker_myprofile.html"><i class="fa-regular fa-user"></i>My Profile</a>
        <a href="#" onclick="logout(); return false;"><i class="fa-solid fa-arrow-right-from-bracket"></i>Logout</a>
      `;
    }

    if (info) {
      info.innerHTML = `
        <div><i class="fa-solid fa-bolt"></i>Electrician workspace</div>
        <div><i class="fa-solid fa-clipboard-list"></i>Service requests</div>
        <div><i class="fa-regular fa-user"></i>Profile access</div>
      `;
    }
  }

  renderRoleSidebar();

  document.getElementById("workerNameEl").textContent = name;
  document.getElementById("workerAvatar").textContent = name.charAt(0).toUpperCase();

  const workerAvatarKey = `avatarBase64_${role}_${phone}`;
  const savedWorkerAvatar = localStorage.getItem(workerAvatarKey);

  function normalizeAvatarSrc(value) {
    if (!value) return "";
    const src = String(value).trim();
    if (!src) return "";
    if (src.startsWith("data:image/") || src.startsWith("http://") || src.startsWith("https://")) {
      return src;
    }
    return `data:image/png;base64,${src}`;
  }

  function setWorkerAvatar(imageValue, displayName) {
    const imageSrc = normalizeAvatarSrc(imageValue);
    const initial = (displayName || name || "E").trim().charAt(0).toUpperCase() || "E";

    document.querySelectorAll("[data-ns-avatar]").forEach(el => {
      el.innerHTML = imageSrc
        ? `<img src="${imageSrc}" alt="${displayName || "Electrician"}">`
        : initial;
    });

    const headerImg = document.getElementById("workerAvatarImg");
    const headerFallback = document.getElementById("workerAvatar");
    if (imageSrc) {
      headerImg.src = imageSrc;
      headerImg.style.display = "block";
      headerFallback.style.display = "none";
    } else {
      headerImg.removeAttribute("src");
      headerImg.style.display = "none";
      headerFallback.style.display = "flex";
      headerFallback.textContent = initial;
    }
  }

  if (savedWorkerAvatar) {
    setWorkerAvatar(savedWorkerAvatar, name);
  }

  async function loadWorkerHeaderAvatar() {
    try {
      const res = await fetch(`${API_BASE}/workers/${encodeURIComponent(phone)}`);
      if (!res.ok) return;
      const worker = await res.json();

      if (worker.avatarBase64) {
        localStorage.setItem(workerAvatarKey, worker.avatarBase64);
        setWorkerAvatar(worker.avatarBase64, name);
      }
    } catch (e) {}
  }

  async function loadSidebarProfileAvatar() {
    try {
      const [profileResult, workerResult] = await Promise.allSettled([
        fetch(`${API_BASE}/profile/${encodeURIComponent(phone)}`),
        fetch(`${API_BASE}/workers/${encodeURIComponent(phone)}`)
      ]);

      let user = {};
      let worker = {};

      if (profileResult.status === "fulfilled" && profileResult.value.ok) {
        user = await profileResult.value.json();
        console.log("Electrician profile user:", user);
      }

      if (workerResult.status === "fulfilled" && workerResult.value.ok) {
        worker = await workerResult.value.json();
      }

      const profileImage = user.avatarBase64 ||
        user.profileImage ||
        user.image ||
        worker.avatarBase64 ||
        localStorage.getItem(workerAvatarKey) ||
        localStorage.getItem("avatarBase64") ||
        "";
      const displayName = user.name || name || "Electrician";

      if (profileImage) {
        localStorage.setItem(workerAvatarKey, normalizeAvatarSrc(profileImage));
      }

      setWorkerAvatar(profileImage, displayName);
    } catch (e) {
      console.error("Could not load electrician sidebar avatar", e);
      setWorkerAvatar(localStorage.getItem(workerAvatarKey), name);
    }
  }

  loadWorkerHeaderAvatar();
  window.addEventListener("load", loadSidebarProfileAvatar);

  let activeJobId = null;
  let allBookings = [];
  let allJobs = allBookings;
  let selectedFilter = "all";

  function safe(v){ return (!v || v === "") ? "Not available" : String(v); }
  function enc(v){ return encodeURIComponent(String(v ?? "")); }
  function dec(v){ return decodeURIComponent(String(v ?? "")); }
  function closeModal(id){ document.getElementById(id).classList.remove("open"); }

  function customerName(job) {
    return job.customerName || job.name || "Customer";
  }

  function customerPhone(job) {
    return job.customerPhone || job.phone || "";
  }

  function customerAddress(job) {
    return [
      job.customerAddress || job.address,
      job.customerCity,
      job.customerState,
      job.customerPincode
    ].filter(Boolean).join(", ") || "Address not added";
  }

  function customerPref(job) {
    const pref = job.customerCommunicationPref || job.communicationPref || "";
    if (pref === "chat") return "Chat";
    if (pref === "phone") return "Phone Call";
    if (pref === "email") return "Email";
    return "Not added";
  }

  function customerAvatarHtml(job, size = 38) {
    const avatar = job.customerAvatarBase64 || "";
    const cname = customerName(job);
    const letter = cname.charAt(0).toUpperCase();

    if (avatar) {
      return `<img src="${avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
    }

    return `<div class="avatar-circle" style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-family:'Nunito';">${letter}</div>`;
  }

  function setModalCustomer(prefix, job) {
    const avatarEl = document.getElementById(prefix + "Avatar");
    avatarEl.innerHTML = customerAvatarHtml(job, 44);
    document.getElementById(prefix + "CustomerName").textContent = customerName(job);
    document.getElementById(prefix + "CustomerPhone").textContent = safe(customerPhone(job));
  }

  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", function(e){
      if(e.target === this) this.classList.remove("open");
    });
  });

  document.querySelectorAll(".ftab").forEach(tab => {
    tab.addEventListener("click", function(){
      document.querySelectorAll(".ftab").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      selectedFilter = this.dataset.filter || "all";
      renderBookings();
    });
  });

  function normalizeBookingStatus(booking) {
    const status = String(booking.status || booking.bookingStatus || booking.requestStatus || "pending").toLowerCase().trim();
    return ["pending", "accepted", "completed", "rejected"].includes(status) ? status : "pending";
  }

  function statusBadge(status){
    const s = String(status || "pending").toLowerCase().trim();
    if(s === "accepted")  return `<span class="badge badge-accepted">&#9989; Accepted</span>`;
    if(s === "rejected")  return `<span class="badge badge-rejected">&#10060; Rejected</span>`;
    if(s === "completed") return `<span class="badge badge-completed">&#127937; Completed</span>`;
    return `<span class="badge badge-pending">&#9203; Pending</span>`;
  }

  function renderBooking(job){
    const st = normalizeBookingStatus(job);

    let extraInfo = "";
    if(st === "accepted") {
      extraInfo = `<div class="req-extra"><strong>Visit Time:</strong> ${safe(job.visitTime)}<br>${job.workerMessage ? `<strong>Your Message:</strong> ${safe(job.workerMessage)}` : ""}</div>`;
    }

    if(st === "rejected") {
      extraInfo = `<div class="req-extra"><strong>Reject Reason:</strong> ${safe(job.rejectReason)}</div>`;
    }

    if(st === "completed") {
      extraInfo = `<div class="req-extra"><strong>Completed At:</strong> ${job.completedAt ? new Date(job.completedAt).toLocaleString() : "Not available"}</div>`;
    }

    const cname = customerName(job);
    const cphone = customerPhone(job);
    const jobId = enc(job._id);

    const chatBtn = `<button class="btn-chat" onclick="openChat('${jobId}','${enc(cname)}','${enc(cphone)}')">&#128172; Chat</button>`;
    const callBtn = `<button class="btn-call" onclick="openCall('${jobId}')">&#128222; Call</button>`;

    let actions = "";
    if(st === "pending"){
      actions = `
        <button class="btn-accept" onclick="openAccept('${jobId}')">&#9989; Accept</button>
        <button class="btn-reject" onclick="openReject('${jobId}')">&#10060; Reject</button>
        ${callBtn}
        ${chatBtn}`;
    } else if(st === "accepted"){
      actions = `
        <button class="btn-complete" onclick="openComplete('${jobId}')">&#127937; Complete</button>
        ${callBtn}
        ${chatBtn}`;
    } else if(st === "completed"){
      actions = `${callBtn}${chatBtn}`;
    } else if(st === "rejected"){
      actions = chatBtn;
    } else {
      actions = `${callBtn}${chatBtn}`;
    }

    return `<div class="req-card ${st}">
      <div class="req-top">
        <div style="display:flex;align-items:center;gap:10px;">
          ${customerAvatarHtml(job)}
          <div>
            <div class="req-name">${safe(cname)}</div>
            <div style="font-size:0.75rem;color:var(--soft);font-weight:600;">Customer</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${statusBadge(st)}
          <span class="req-date">Date: ${safe(job.date)}</span>
        </div>
      </div>

      <div class="req-meta">
        <div class="req-meta-item"> ${safe(cphone)}</div>
        <div class="req-meta-item">Address: ${safe(customerAddress(job))}</div>
        <div class="req-meta-item">Preference: ${safe(customerPref(job))}</div>
        <div class="req-meta-item">Service: ${safe(job.service)}</div>
      </div>

      ${extraInfo}
      <div class="req-actions">${actions}</div>
    </div>`;
  }

  function renderBookings(){
    const list = document.getElementById("requestList");
    const filtered = selectedFilter === "all"
      ? allBookings
      : allBookings.filter(j => normalizeBookingStatus(j) === selectedFilter);

    if(filtered.length === 0){
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">${selectedFilter === "all" ? "&#128203;" : "&#128269;"}</div>
        <div class="empty-title">${selectedFilter === "all" ? "No requests yet" : "No " + selectedFilter + " requests"}</div>
        <div class="empty-text">Customers who choose you will appear here automatically.</div>
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(renderBooking).join("");
  }

  function renderJobs(){
    renderBookings();
  }

  async function fetchRequests(){
    const list = document.getElementById("requestList");
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9203;</div><div class="empty-title">Loading...</div></div>`;

    try {
      const res = await fetch(`${API_BASE}/bookings/chosen/electrician/${encodeURIComponent(phone)}`);
      const bookings = await res.json();

      const rawJobs = (bookings || []).filter(j =>
        (j.chosenWorkerRole || "").toLowerCase() === "electrician" &&
        String(j.chosenWorkerPhone || "") === String(phone)
      );

      allBookings = await Promise.all(rawJobs.map(async (job) => {
        const cPhone = job.customerPhone || job.phone;

        try {
          const profileRes = await fetch(`${API_BASE}/profile/${encodeURIComponent(cPhone)}`);
          if (!profileRes.ok) return job;

          const customer = await profileRes.json();

          return {
            ...job,
            customerName: customer.name || job.name || "Customer",
            customerPhone: customer.phone || cPhone,
            customerAvatarBase64: customer.avatarBase64 || "",
            customerAddress: customer.address || job.address || "",
            customerCity: customer.city || "",
            customerState: customer.state || "",
            customerPincode: customer.pincode || "",
            customerCommunicationPref: customer.communicationPref || "",
            customerPreferredTime: customer.preferredTime || ""
          };
        } catch (e) {
          return job;
        }
      }));

      allJobs = allBookings;
      renderBookings();
    } catch(err){
      console.error(err);
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><div class="empty-title">Error loading requests</div></div>`;
    }
  }

  let tHour = 6, tMin = 0, tAmpm = "AM", selectedDateMode = "today";

  function pad(n){ return String(n).padStart(2,"0"); }

  function updateDrumDisplay(){
    document.getElementById("hourDisplay").textContent = pad(tHour);
    document.getElementById("minDisplay").textContent  = pad(tMin);
    document.getElementById("ampmDisplay").textContent = tAmpm;
  }

  function changeTime(part,dir){
    if(part === "hour") tHour = ((tHour - 1 + dir + 12) % 12) + 1;
    else if(part === "min") tMin = (tMin + dir * 5 + 60) % 60;
    else tAmpm = tAmpm === "AM" ? "PM" : "AM";
    updateDrumDisplay();
    document.querySelectorAll(".time-quick-btn").forEach(b => b.classList.remove("active"));
  }

  function setQuickTime(h,m,ap){
    tHour = h;
    tMin = m;
    tAmpm = ap;
    updateDrumDisplay();
    document.querySelectorAll(".time-quick-btn").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
  }

  function selectDate(btn){
    document.querySelectorAll(".date-preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDateMode = btn.dataset.val;
    document.getElementById("acceptCustomDate").style.display = selectedDateMode === "custom" ? "block" : "none";
  }

  function setMsg(btn,text){
    document.querySelectorAll(".msg-preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const ta = document.getElementById("acceptMessage");
    ta.value = text;
    if(!text) ta.focus();
  }

  function getVisitTimeString(){
    let dateStr = "";

    if(selectedDateMode === "today") dateStr = "Today";
    else if(selectedDateMode === "tomorrow") dateStr = "Tomorrow";
    else {
      const d = document.getElementById("acceptCustomDate").value;
      if(!d) return null;
      dateStr = new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
    }

    return `${dateStr} ${pad(tHour)}:${pad(tMin)} ${tAmpm}`;
  }

  function openAccept(jobId){
    activeJobId = dec(jobId);

    tHour = 6;
    tMin = 0;
    tAmpm = "AM";
    selectedDateMode = "today";

    updateDrumDisplay();
    document.querySelectorAll(".date-preset-btn").forEach((b,i) => b.classList.toggle("active",i === 0));
    document.getElementById("acceptCustomDate").style.display = "none";
    document.getElementById("acceptCustomDate").value = "";
    document.getElementById("acceptMessage").value = "";
    document.querySelectorAll(".msg-preset-btn,.time-quick-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("acceptModal").classList.add("open");
  }

  document.getElementById("acceptConfirmBtn").addEventListener("click", async function(){
    const visitTime = getVisitTimeString();
    const msg = document.getElementById("acceptMessage").value.trim();

    if(!visitTime){
      showToast("Please select a visit date!");
      return;
    }

    this.textContent = "Accepting...";
    this.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/bookings/${activeJobId}/status`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          status:"accepted",
          visitTime,
          workerMessage:msg,
          rejectReason:""
        })
      });

      const data = await res.json();

      if(!res.ok) showToast(data.error || "Accept failed");
      else {
        closeModal("acceptModal");
        showToast("Booking accepted successfully", "success");
        fetchRequests();
      }
    } catch(e) {
      showToast("Server error");
    }

    this.textContent = " Confirm Accept";
    this.disabled = false;
  });

  function openReject(jobId){
    activeJobId = dec(jobId);
    document.getElementById("rejectReason").value = "";
    document.getElementById("rejectModal").classList.add("open");
  }

  document.getElementById("rejectConfirmBtn").addEventListener("click", async function(){
    const reason = document.getElementById("rejectReason").value.trim();

    if(!reason){
      document.getElementById("rejectReason").style.borderColor = "#ef4444";
      return;
    }

    this.textContent = "Rejecting...";
    this.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/bookings/${activeJobId}/status`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          status:"rejected",
          rejectReason:reason,
          visitTime:"",
          workerMessage:""
        })
      });

      const data = await res.json();

      if(!res.ok) showToast(data.error || "Reject failed");
      else {
        closeModal("rejectModal");
        showToast("Booking rejected successfully", "success");
        fetchRequests();
      }
    } catch(e) {
      showToast("Server error");
    }

    this.textContent = " Confirm Reject";
    this.disabled = false;
  });

  function openComplete(jobId){
    activeJobId = dec(jobId);
    const job = allBookings.find(j => String(j._id) === String(activeJobId));
    if (job) setModalCustomer("complete", job);
    document.getElementById("completeModal").classList.add("open");
  }

  document.getElementById("completeConfirmBtn").addEventListener("click", async function(){
    this.textContent = "Completing...";
    this.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/bookings/${activeJobId}/complete`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          workerPhone:phone,
          workerRole:role
        })
      });

      const data = await res.json();

      if(!res.ok) showToast(data.error || "Complete failed");
      else {
        closeModal("completeModal");
        showToast("Booking marked as completed successfully", "success");
        fetchRequests();
      }
    } catch(e) {
      showToast("Server error");
    }

    this.textContent = " Yes, Mark Complete";
    this.disabled = false;
  });

  function openChat(bookingId,custName,custPhone){
    bookingId = dec(bookingId);
    custName = dec(custName);
    custPhone = dec(custPhone);

    localStorage.setItem("chatBookingId", bookingId);
    localStorage.setItem("chatWorkerPhone", phone);
    localStorage.setItem("chatWorkerName", name);
    localStorage.setItem("chatWorkerRole", role);
    localStorage.setItem("chatCustomerName", custName);
    localStorage.setItem("chatCustomerPhone", custPhone);
    window.location.href = "worker_chat.html";
  }

  function openCall(jobId){
    jobId = dec(jobId);
    const job = allBookings.find(j => String(j._id) === String(jobId));

    if (!job) {
      showToast("Customer phone number not available");
      return;
    }

    const cPhone = String(customerPhone(job) || "").trim();

    if(!cPhone || cPhone === "Not available"){
      showToast("Customer phone number not available");
      return;
    }

    window.location.href = `tel:${cPhone}`;
  }

  document.getElementById("callConfirmBtn").addEventListener("click", function(){
    const custPhone = document.getElementById("callCustomerPhone").textContent.replace(" ","").trim();
    closeModal("callModal");
    window.location.href = "tel:" + custPhone;
  });

  function logout(){
    localStorage.clear();
    window.location.href = "login.html";
  }

  fetchRequests();
  setInterval(fetchRequests, 30000);