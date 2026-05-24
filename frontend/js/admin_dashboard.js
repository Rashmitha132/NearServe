const API_BASE = window.NEARSERVE_API_BASE;
const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.href = "admin_login.html";
}

const workerList = document.getElementById("workerList");
const jobList = document.getElementById("jobList");
const logoutBtn = document.getElementById("adminLogout");
const refreshBtn = document.getElementById("refreshBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    window.location.href = "admin_login.html";
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => loadAll());
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "-";
  }
}

async function api(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const text = await res.text();
  let data = {};

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || text || "Request failed");
  }

  return data;
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

function toJobVideoUrl(job) {
  if (!job?._id || !job.videoProofPath) return null;
  const encodedToken = encodeURIComponent(token);
  return `${API_BASE}/admin/jobs/${encodeURIComponent(job._id)}/video?token=${encodedToken}`;
}

function askRejectReason(label) {
  const reason = prompt(`Enter reason for rejecting this ${label} (required):`);
  if (!reason || !reason.trim()) return null;
  return reason.trim();
}

function guessVideoType(url) {
  const u = (url || "").toLowerCase();
  if (u.endsWith(".mp4")) return "video/mp4";
  if (u.endsWith(".webm")) return "video/webm";
  if (u.endsWith(".ogg")) return "video/ogg";
  return "";
}

// =======================
// A) Load Workers
// =======================
async function loadWorkers() {
  workerList.innerHTML = "";

  const data = await api("/admin/workers");
  const workers = data.workers || [];

  if (workers.length === 0) {
    workerList.innerHTML = `
      <li class="item">
        <div><strong>No workers pending proof verification.</strong></div>
      </li>
    `;
    return;
  }

  workers.forEach((w) => {
    const li = document.createElement("li");
    li.className = "item";

    const hasProof = Boolean(w.proofFile);
    const proofApproved = (w.proofReview?.status || "").toLowerCase() === "approved";
    const canReview = (w.status || "").toLowerCase() === "proof_submitted" && !proofApproved;

    li.innerHTML = `
      <div style="flex:1;">
        <strong>${w.name} (${w.role})</strong><br>
        <small>Phone: ${w.phone}</small><br>
        <small>Status: ${w.status}</small><br>
        ${
          hasProof
            ? `<small>Proof: <button class="item-proof-link proof-view-btn" type="button" data-phone="${w.phone}">View ID Proof PDF</button></small>`
            : `<small style="color:crimson;">No proof uploaded</small>`
        }
        ${proofApproved ? `<br><small>Approved proof stored privately</small>` : ""}
      </div>

      <div class="item-actions">
        ${canReview ? `
          <button class="btn btn-primary" ${hasProof ? "" : "disabled"} data-phone="${w.phone}" data-action="approveProof">
            <i class="fa fa-check"></i> Approve
          </button>
          <button class="btn btn-danger" data-phone="${w.phone}" data-action="rejectProof">
            <i class="fa fa-xmark"></i> Reject
          </button>
        ` : `<span>Approved</span>`}
      </div>
    `;

    workerList.appendChild(li);
  });

  workerList.querySelectorAll(".proof-view-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await openAdminProof(btn.dataset.phone);
      } catch (e) {
        showToast(e.message);
      }
    });
  });

  workerList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const phone = btn.dataset.phone;
      const action = btn.dataset.action;

      try {
        if (action === "approveProof") {
          await api(`/admin/verify-proof/${phone}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "approve" })
          });
          showToast("Proof approved!", "success");
        } else {
          const reason = askRejectReason("PDF proof");
          if (!reason) {
            showToast("Reason is required.");
            return;
          }

          await api(`/admin/verify-proof/${phone}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "reject", reason })
          });
          showToast("Proof rejected.", "success");
        }

        loadAll();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

// =======================
// B) Load Jobs
// =======================
async function loadJobs() {
  jobList.innerHTML = "";

  const data = await api("/admin/submitted-jobs");
  const jobs = data.jobs || [];

  if (jobs.length === 0) {
    jobList.innerHTML = `
      <li class="item">
        <div><strong>No submitted job videos to verify.</strong></div>
      </li>
    `;
    return;
  }

  jobs.forEach((j) => {
    const li = document.createElement("li");
    li.className = "item";

    const videoUrl = toJobVideoUrl(j);
    const videoType = guessVideoType(videoUrl);

    const jobTitle = j.description
      ? j.description
      : `Upload a video proof related to your ${j.jobType} work`;

    li.innerHTML = `
      <div style="flex:1;">
        <strong>${jobTitle}</strong><br>
        <small>Assigned To: ${j.assignedTo}</small><br>
        <small>Status: ${j.status}</small><br>

        ${
          videoUrl
            ? `
            <video controls preload="metadata" style="width:100%; max-width:520px; margin-top:8px; border-radius:10px;">
              <source src="${videoUrl}" ${videoType ? `type="${videoType}"` : ""}>
              Your browser cannot play this video.
            </video>
            <div style="margin-top:6px;">
              <a href="${videoUrl}" target="_blank">Open video in new tab</a>
            </div>
          `
            : `<small style="color:crimson;">No video found</small>`
        }
      </div>

      <div class="item-actions">
        <button class="btn btn-primary" ${videoUrl ? "" : "disabled"} data-jobid="${j._id}" data-action="approveJob">
          <i class="fa fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" data-jobid="${j._id}" data-action="rejectJob">
          <i class="fa fa-xmark"></i> Reject
        </button>
      </div>
    `;

    jobList.appendChild(li);
  });

  jobList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const jobId = btn.dataset.jobid;
      const action = btn.dataset.action;

      try {
        if (action === "approveJob") {
          await api(`/admin/verify-job/${jobId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "approve" })
          });
          showToast("Video approved. Job marked completed!", "success");
        } else {
          const reason = askRejectReason("job video");
          if (!reason) {
            showToast("Reason is required.");
            return;
          }

          await api(`/admin/verify-job/${jobId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision: "reject", reason })
          });
          showToast("Video rejected.", "success");
        }

        loadAll();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

// =======================
// Load All
// =======================
async function loadAll() {
  try {
    await loadWorkers();
    await loadJobs();
  } catch (e) {
    showToast(e.message);

    const msg = String(e.message).toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("invalid token")) {
      localStorage.removeItem("adminToken");
      window.location.href = "admin_login.html";
    }
  }
}

loadAll();
