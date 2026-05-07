const API_BASE = window.NEARSERVE_API_BASE;
const token = localStorage.getItem("adminToken");

if (!token) window.location.href = "admin_login.html";

const workerList = document.getElementById("workerList");
const jobList    = document.getElementById("jobList");

document.getElementById("adminLogout").addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  window.location.href = "admin_login.html";
});

document.getElementById("refreshBtn").addEventListener("click", () => loadAll());

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || "-"; }
}

async function api(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.message || data.error || text || "Request failed");
  return data;
}

function guessVideoType(url) {
  const u = (url || "").toLowerCase();
  if (u.endsWith(".mp4"))  return "video/mp4";
  if (u.endsWith(".webm")) return "video/webm";
  if (u.endsWith(".ogg"))  return "video/ogg";
  return "";
}

async function openAdminProof(phone) {
  const res = await fetch(`${API_BASE}/admin/workers/${encodeURIComponent(phone)}/proof`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not open proof file");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}

function toUploadsUrl(storedPath) {
  if (!storedPath) return null;
  return window.nearServeUploadsUrl(storedPath.replace(/\\/g, "/"));
}

function statusClass(s) {
  if (!s) return "pending";
  const l = s.toLowerCase();
  if (l.includes("approved") || l.includes("complete")) return "approved";
  if (l.includes("rejected")) return "rejected";
  if (l.includes("submitted") || l.includes("proof")) return "submitted";
  return "pending";
}

/* â”€â”€ A) Workers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function loadWorkers() {
  workerList.innerHTML = "";
  const data    = await api("/admin/workers");
  const workers = data.workers || [];

  if (workers.length === 0) {
    workerList.innerHTML = `
      <li class="item empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>No workers pending proof verification</p>
      </li>`;
    return workers.length;
  }

  workers.forEach(w => {
    const li = document.createElement("li");
    li.className = "item";
    const hasProof = Boolean(w.proofFile);
    const proofApproved = (w.proofReview?.status || "").toLowerCase() === "approved";
    const canReview = (w.status || "").toLowerCase() === "proof_submitted" && !proofApproved;
    const sc = statusClass(w.status);

    li.innerHTML = `
      <div class="item-avatar"><i class="fa-solid fa-user-tie"></i></div>
      <div class="item-body">
        <div class="item-name">${w.name}</div>
        <div class="item-meta">
          <span class="meta-chip"><i class="fa-solid fa-screwdriver-wrench"></i> ${w.role}</span>
          <span class="meta-chip"><i class="fa-solid fa-phone"></i> ${w.phone}</span>
          <span class="status-chip ${sc}">${w.status}</span>
        </div>
        ${hasProof
          ? `<button class="item-proof-link proof-view-btn" type="button" data-phone="${w.phone}"><i class="fa-solid fa-file-pdf"></i> View Aadhaar PDF</button>`
          : `<div class="no-proof"><i class="fa-solid fa-triangle-exclamation"></i> No proof uploaded</div>`}
        ${proofApproved ? `<div class="status-chip approved"><i class="fa-solid fa-lock"></i> Approved proof stored privately</div>` : ""}
      </div>
      <div class="item-actions">
        ${canReview ? `
          <button class="btn btn-primary" ${hasProof ? "" : "disabled"} data-phone="${w.phone}" data-action="approveProof">
            <i class="fa-solid fa-check"></i> Approve
          </button>
          <button class="btn btn-danger" data-phone="${w.phone}" data-action="rejectProof">
            <i class="fa-solid fa-xmark"></i> Reject
          </button>
        ` : `<span class="status-chip approved"><i class="fa-solid fa-check"></i> Approved</span>`}
      </div>`;

    workerList.appendChild(li);
  });

  workerList.querySelectorAll(".proof-view-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await openAdminProof(btn.dataset.phone);
      } catch (e) {
        showToast(e.message, "error");
      }
    });
  });

  workerList.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const phone  = btn.dataset.phone;
      const action = btn.dataset.action;
      try {
        if (action === "approveProof") {
          await api(`/admin/verify-proof/${phone}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "approve" })
          });
          sessionApproved++;
          showToast("Proof approved successfully!", "success");
        } else {
          const reason = await askRejectReason("PDF proof");
          if (!reason) return;
          await api(`/admin/verify-proof/${phone}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "reject", reason })
          });
          sessionRejected++;
          showToast("Proof rejected.", "error");
        }
        loadAll();
      } catch (e) { showToast(e.message, "error"); }
    });
  });

  return workers.length;
}

/* â”€â”€ B) Jobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function loadJobs() {
  jobList.innerHTML = "";
  const data = await api("/admin/submitted-jobs");
  const jobs = data.jobs || [];

  if (jobs.length === 0) {
    jobList.innerHTML = `
      <li class="item empty-state">
        <i class="fa-solid fa-video-slash"></i>
        <p>No submitted job videos to verify</p>
      </li>`;
    return jobs.length;
  }

  jobs.forEach(j => {
    const li = document.createElement("li");
    li.className = "item";
    const videoUrl  = toUploadsUrl(j.videoProofPath);
    const videoType = guessVideoType(videoUrl);
    const jobTitle  = j.description || `Video proof â€” ${j.jobType} job`;
    const sc = statusClass(j.status);

    li.innerHTML = `
      <div class="item-avatar" style="background:var(--teal-dim);color:var(--teal);">
        <i class="fa-solid fa-briefcase"></i>
      </div>
      <div class="item-body">
        <div class="item-name">${jobTitle}</div>
        <div class="item-meta">
          <span class="meta-chip"><i class="fa-solid fa-user"></i> ${j.assignedTo}</span>
          <span class="status-chip ${sc}">${j.status}</span>
        </div>
        ${videoUrl ? `
          <div class="video-wrap">
            <video controls preload="metadata">
              <source src="${videoUrl}" ${videoType ? `type="${videoType}"` : ""}>
              Your browser cannot play this video.
            </video>
          </div>
          <a class="video-link" href="${videoUrl}" target="_blank">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in new tab
          </a>` : `<div class="no-proof"><i class="fa-solid fa-triangle-exclamation"></i> No video found</div>`}
      </div>
      <div class="item-actions">
        <button class="btn btn-primary" ${videoUrl ? "" : "disabled"} data-jobid="${j._id}" data-action="approveJob">
          <i class="fa-solid fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" data-jobid="${j._id}" data-action="rejectJob">
          <i class="fa-solid fa-xmark"></i> Reject
        </button>
      </div>`;

    jobList.appendChild(li);
  });

  jobList.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const jobId  = btn.dataset.jobid;
      const action = btn.dataset.action;
      try {
        if (action === "approveJob") {
          await api(`/admin/verify-job/${jobId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "approve" })
          });
          sessionApproved++;
          showToast("Video approved. Job marked complete!", "success");
        } else {
          const reason = await askRejectReason("job video");
          if (!reason) return;
          await api(`/admin/verify-job/${jobId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "reject", reason })
          });
          sessionRejected++;
          showToast("Video rejected.", "error");
        }
        loadAll();
      } catch (e) { showToast(e.message, "error"); }
    });
  });

  return jobs.length;
}

/* â”€â”€ Load All â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function loadAll() {
  try {
    const [wCount, jCount] = await Promise.all([loadWorkers(), loadJobs()]);
    updateStats(wCount, jCount);
  } catch (e) {
    showToast(e.message, "error");
    const msg = String(e.message).toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("invalid token")) {
      localStorage.removeItem("adminToken");
      window.location.href = "admin_login.html";
    }
  }
}

loadAll();
