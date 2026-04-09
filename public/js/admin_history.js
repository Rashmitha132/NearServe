const API_BASE = "/api";
const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.href = "admin_login.html";
}

const logoutBtn = document.getElementById("adminLogout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    window.location.href = "admin_login.html";
  });
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

async function loadHistory() {
  const historyWrap = document.getElementById("historyWrap");

  try {
    const data = await api("/admin/history");
    const logs = data.logs || [];

    if (!logs.length) {
      historyWrap.innerHTML = `<p class="note">No history yet.</p>`;
      return;
    }

    const rows = logs.map((l) => {
      const typeText = l.type === "proof" ? "PDF Proof" : "Job Video";
      const decisionText = l.decision === "approved" ? "✅ Approved" : "❌ Rejected";
      const reasonText = l.reason ? l.reason : "-";

      return `
        <tr>
          <td>${fmtDate(l.createdAt)}</td>
          <td>${typeText}</td>
          <td>${l.workerPhone || "-"}</td>
          <td>${l.workerRole || "-"}</td>
          <td>${decisionText}</td>
          <td>${reasonText}</td>
        </tr>
      `;
    }).join("");

    historyWrap.innerHTML = `
      <div class="table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Worker Phone</th>
              <th>Role</th>
              <th>Decision</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (e) {
    historyWrap.innerHTML = `<p class="note" style="color:crimson;">${e.message}</p>`;

    const msg = String(e.message).toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("invalid token")) {
      localStorage.removeItem("adminToken");
      window.location.href = "admin_login.html";
    }
  }
}

loadHistory();