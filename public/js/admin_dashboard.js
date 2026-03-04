const token = localStorage.getItem("adminToken");
if (!token) window.location.href = "/admin_login.html";

const workerList = document.getElementById("workerList");
const jobList = document.getElementById("jobList");

document.getElementById("adminLogout").addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin_login.html";
});

document.getElementById("refreshBtn").addEventListener("click", () => loadAll());

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || "-"; }
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`
    }
  });

  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) throw new Error(data.error || text || "Request failed");
  return data;
}

/**
 * ✅ FIXED:
 * storedPath examples:
 *  - "uploads/123.pdf"             => "/uploads/123.pdf"
 *  - "uploads/videos/job_x.mp4"    => "/uploads/videos/job_x.mp4"
 *  - windows: "uploads\\videos\\x" => "/uploads/videos/x"
 */
function toUploadsUrl(storedPath) {
  if (!storedPath) return null;

  const normalized = storedPath.replace(/\\/g, "/"); // windows -> unix

  // If already starts with "/uploads", return as-is
  if (normalized.startsWith("/uploads/")) return normalized;

  // If starts with "uploads/", just prefix "/"
  if (normalized.startsWith("uploads/")) return "/" + normalized;

  // If only filename is stored, fallback
  const fileName = normalized.split("/").pop();
  return `/uploads/${fileName}`;
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
// A) Load Workers (Proof PDFs)
// =======================
async function loadWorkers() {
  workerList.innerHTML = "";
  const data = await api("/admin/workers");
  const workers = data.workers || [];

  if (workers.length === 0) {
    workerList.innerHTML = `<li class="item"><div><strong>No workers pending proof verification.</strong></div></li>`;
    return;
  }

  workers.forEach(w => {
    const li = document.createElement("li");
    li.className = "item";

    const proofUrl = toUploadsUrl(w.proofFile);

    li.innerHTML = `
      <div style="flex:1;">
        <strong>${w.name} (${w.role})</strong><br>
        <small>Phone: ${w.phone}</small><br>
        <small>Status: ${w.status}</small><br>
        ${
          proofUrl
            ? `<small>Proof: <a href="${proofUrl}" target="_blank">View PDF</a></small>`
            : `<small style="color:crimson;">No proof uploaded</small>`
        }
      </div>

      <div class="item-actions">
        <button class="btn btn-primary" ${proofUrl ? "" : "disabled"} data-phone="${w.phone}" data-action="approveProof">
          <i class="fa fa-check"></i> Approve
        </button>
        <button class="btn btn-danger" data-phone="${w.phone}" data-action="rejectProof">
          <i class="fa fa-xmark"></i> Reject
        </button>
      </div>
    `;

    workerList.appendChild(li);
  });

  workerList.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const phone = btn.dataset.phone;
      const action = btn.dataset.action;

      try {
        if (action === "approveProof") {
          await api(`/admin/verify-proof/${phone}`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ decision: "approve" })
          });
          alert("✅ Proof approved!");
        } else {
          const reason = askRejectReason("PDF proof");
          if (!reason) { alert("Reason is required."); return; }

          await api(`/admin/verify-proof/${phone}`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ decision: "reject", reason })
          });
          alert("❌ Proof rejected (reason saved).");
        }

        loadAll();
      } catch (e) {
        alert(e.message);
      }
    });
  });
}

// =======================
// B) Load Jobs (Submitted videos)
// =======================
async function loadJobs() {
  jobList.innerHTML = "";
  const data = await api("/admin/submitted-jobs");
  const jobs = data.jobs || [];

  if (jobs.length === 0) {
    jobList.innerHTML = `<li class="item"><div><strong>No submitted job videos to verify.</strong></div></li>`;
    return;
  }

  jobs.forEach(j => {
    const li = document.createElement("li");
    li.className = "item";

    const videoUrl = toUploadsUrl(j.videoProofPath);
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
          videoUrl ? `
          <video controls preload="metadata" style="width:100%; max-width:520px; margin-top:8px; border-radius:10px;">
            <source src="${videoUrl}" ${videoType ? `type="${videoType}"` : ""}>
            Your browser cannot play this video.
          </video>
          <div style="margin-top:6px;">
            <a href="${videoUrl}" target="_blank">Open video in new tab</a>
          </div>
          ` : `<small style="color:crimson;">No video found</small>`
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

  jobList.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const jobId = btn.dataset.jobid;
      const action = btn.dataset.action;

      try {
        if (action === "approveJob") {
          await api(`/admin/verify-job/${jobId}`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ decision: "approve" })
          });
          alert("✅ Video approved. Job marked completed!");
        } else {
          const reason = askRejectReason("job video");
          if (!reason) { alert("Reason is required."); return; }

          await api(`/admin/verify-job/${jobId}`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ decision: "reject", reason })
          });
          alert("❌ Video rejected (reason saved).");
        }

        loadAll();
      } catch (e) {
        alert(e.message);
      }
    });
  });
}

// =======================
// C) History (Approved/Rejected with date + reason)
// =======================
async function loadHistory() {
  let historyWrap = document.getElementById("historyWrap");
  if (!historyWrap) {
    const cardBody = document.querySelector(".card-body");

    const hr = document.createElement("hr");
    hr.className = "soft";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = "C) Verification History (Latest actions)";

    historyWrap = document.createElement("div");
    historyWrap.id = "historyWrap";

    cardBody.appendChild(hr);
    cardBody.appendChild(title);
    cardBody.appendChild(historyWrap);
  }

  historyWrap.innerHTML = `<p class="note">Loading history...</p>`;

  try {
    const data = await api("/admin/history");
    const logs = data.logs || [];

    if (!logs.length) {
      historyWrap.innerHTML = `<p class="note">No history yet.</p>`;
      return;
    }

    const rows = logs.map(l => {
      const typeText = l.type === "proof" ? "PDF Proof" : "Job Video";
      const decisionText = l.decision === "approved" ? "✅ Approved" : "❌ Rejected";
      const reasonText = l.reason ? l.reason : "-";

      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${fmtDate(l.createdAt)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${typeText}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${l.workerPhone || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${l.workerRole || "-"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${decisionText}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${reasonText}</td>
        </tr>
      `;
    }).join("");

    historyWrap.innerHTML = `
      <div style="overflow:auto; width:100%;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;">
              <th style="padding:8px;border-bottom:1px solid #ddd;">Date</th>
              <th style="padding:8px;border-bottom:1px solid #ddd;">Type</th>
              <th style="padding:8px;border-bottom:1px solid #ddd;">Worker Phone</th>
              <th style="padding:8px;border-bottom:1px solid #ddd;">Role</th>
              <th style="padding:8px;border-bottom:1px solid #ddd;">Decision</th>
              <th style="padding:8px;border-bottom:1px solid #ddd;">Reason</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (e) {
    historyWrap.innerHTML = `<p class="note" style="color:crimson;">${e.message}</p>`;
  }
}

// =======================
// Load All
// =======================
async function loadAll() {
  try {
    await loadWorkers();
    await loadJobs();
    await loadHistory();
  } catch (e) {
    alert(e.message);
    if (String(e.message).toLowerCase().includes("unauthorized")) {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin_login.html";
    }
  }
}

loadAll();