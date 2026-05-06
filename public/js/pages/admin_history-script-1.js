/* â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const API_BASE = "/api";
const token    = localStorage.getItem("adminToken");
if (!token) window.location.href = "admin_login.html";

document.getElementById("adminLogout").addEventListener("click", () => {
  localStorage.removeItem("adminToken");
  window.location.href = "admin_login.html";
});

/* â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
      + " Â· " + d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
  } catch { return iso || "â€“"; }
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

/* â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let allLogs = [];

function renderRows(logs) {
  const tbody = document.getElementById("historyBody");

  if (!logs.length) {
    tbody.innerHTML = `
      <tr class="state-row">
        <td colspan="6">
          <div class="state-inner">
            <i class="fa-solid fa-inbox"></i>
            <p>No matching records found</p>
          </div>
        </td>
      </tr>`;
    document.getElementById("countNum").textContent = 0;
    document.getElementById("footerText").textContent = "0 records";
    return;
  }

  tbody.innerHTML = logs.map((l, i) => {
    const typeLabel = l.type === "proof" ? "PDF Proof" : "Job Video";
    const typeClass = l.type === "proof" ? "pdf" : "video";
    const typeIcon  = l.type === "proof" ? "fa-file-pdf" : "fa-video";
    const isApproved = l.decision === "approved";

    return `
      <tr style="animation: fadeUp .3s ${i * 0.03}s ease both; opacity:0;">
        <td class="td-date">${fmtDate(l.createdAt)}</td>
        <td>
          <span class="type-badge ${typeClass}">
            <i class="fa-solid ${typeIcon}"></i> ${typeLabel}
          </span>
        </td>
        <td class="td-phone">${l.workerPhone || "â€“"}</td>
        <td>
          <span class="role-chip">
            <i class="fa-solid fa-screwdriver-wrench" style="font-size:9px;"></i>
            ${l.workerRole || "â€“"}
          </span>
        </td>
        <td>
          <span class="decision-badge ${isApproved ? "approved" : "rejected"}">
            <i class="fa-solid ${isApproved ? "fa-circle-check" : "fa-circle-xmark"}"></i>
            ${isApproved ? "Approved" : "Rejected"}
          </span>
        </td>
        <td class="td-reason ${!l.reason ? "na" : ""}">${l.reason || "â€“"}</td>
      </tr>`;
  }).join("");

  document.getElementById("countNum").textContent = logs.length;
  document.getElementById("footerText").textContent = `${logs.length} record${logs.length !== 1 ? "s" : ""} Â· Last updated ${new Date().toLocaleTimeString()}`;
}

function applyFilters() {
  const q        = document.getElementById("searchInput").value.toLowerCase();
  const typeF    = document.getElementById("typeFilter").value;
  const decisionF= document.getElementById("decisionFilter").value;

  const filtered = allLogs.filter(l => {
    const matchSearch   = !q || [l.workerPhone, l.workerRole, l.reason].some(v => (v||"").toLowerCase().includes(q));
    const matchType     = !typeF     || (typeF === "proof" ? l.type === "proof" : l.type !== "proof");
    const matchDecision = !decisionF || l.decision === decisionF;
    return matchSearch && matchType && matchDecision;
  });

  renderRows(filtered);
}

/* â”€â”€ LOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function loadHistory() {
  try {
    const data = await api("/admin/history");
    allLogs = data.logs || [];

    document.getElementById("filterBar").style.display   = "flex";
    document.getElementById("tableFooter").style.display = "flex";

    renderRows(allLogs);

    document.getElementById("searchInput").addEventListener("input",  applyFilters);
    document.getElementById("typeFilter").addEventListener("change",  applyFilters);
    document.getElementById("decisionFilter").addEventListener("change", applyFilters);

  } catch (e) {
    document.getElementById("historyBody").innerHTML = `
      <tr class="state-row">
        <td colspan="6">
          <div class="state-inner" style="color:var(--red);">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>${e.message}</p>
          </div>
        </td>
      </tr>`;

    const msg = String(e.message).toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("invalid token")) {
      localStorage.removeItem("adminToken");
      window.location.href = "admin_login.html";
    }
  }
}

loadHistory();