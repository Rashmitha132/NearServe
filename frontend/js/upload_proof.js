const form = document.getElementById("proofForm");
const fileInput = document.getElementById("proofFile");
const submitBtn = document.getElementById("submitBtn");
const preview = document.getElementById("preview");
const fileNameEl = document.getElementById("fileName");
const fileSizeEl = document.getElementById("fileSize");
const errorMsg = document.getElementById("errorMsg");

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
let statusPoller = null;

function getCurrentPhone() {
  return (
    localStorage.getItem("userPhone") ||
    localStorage.getItem("phone") ||
    ""
  ).trim();
}

function getCurrentRole() {
  return (
    localStorage.getItem("userRole") ||
    localStorage.getItem("role") ||
    ""
  ).trim().toLowerCase();
}

function goToNextPageByRole(role, status) {
  if (status === "probation") {
    if (role === "carpenter") {
      window.location.href = "/carpenter_dashboard.html";
      return;
    }
    if (role === "plumber") {
      window.location.href = "/plumber_dashboard.html";
      return;
    }
    if (role === "electrician") {
      window.location.href = "/electrician_dashboard.html";
      return;
    }
    window.location.href = "/dashboard.html";
    return;
  }

  if (status === "full_access") {
    if (role === "carpenter") {
      window.location.href = "/carpenter_dashboard.html";
      return;
    }
    if (role === "plumber") {
      window.location.href = "/plumber_dashboard.html";
      return;
    }
    if (role === "electrician") {
      window.location.href = "/electrician_dashboard.html";
      return;
    }
    window.location.href = "/dashboard.html";
  }
}

function showError(msg) {
  errorMsg.style.color = "#c0392b";
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function showSuccess(msg) {
  errorMsg.style.color = "green";
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function showInfo(msg) {
  errorMsg.style.color = "#2c3e50";
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function clearMsg() {
  errorMsg.textContent = "";
  errorMsg.classList.add("hidden");
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function loadProofReviewMessage() {
  const phone = getCurrentPhone();
  const role = getCurrentRole();

  if (!phone) return;

  try {
    const res = await fetch(`${window.NEARSERVE_API_BASE}/workers/review/${encodeURIComponent(phone)}`);
    const text = await res.text();

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (!res.ok) return;

    const status = (data.status || "").trim().toLowerCase();
    const proofReviewStatus = (
      data.proofReview?.status || ""
    ).trim().toLowerCase();

    // ✅ If admin already approved and user moved ahead, redirect immediately
    if (status === "probation" || status === "full_access") {
      showSuccess("✅ Verification approved. Redirecting...");
      setTimeout(() => {
        goToNextPageByRole(role, status);
      }, 800);
      return;
    }

    // ✅ Rejected
    if (proofReviewStatus === "rejected") {
      showError(
        "❌ Proof rejected: " + (data.proofReview.reason || "No reason given.")
      );
      submitBtn.disabled = false;
      return;
    }

    // ✅ Waiting
    if (status === "proof_submitted") {
      showInfo("⏳ Proof already submitted. Waiting for admin verification.");
      submitBtn.disabled = true;
      return;
    }

    // ✅ Pending verification can upload
    if (status === "pending_verification") {
      submitBtn.disabled = false;
      return;
    }
  } catch (err) {
    console.log("Review check failed:", err);
  }
}

function startStatusPolling() {
  if (statusPoller) clearInterval(statusPoller);

  statusPoller = setInterval(async () => {
    const phone = getCurrentPhone();
    const role = getCurrentRole();
    if (!phone) return;

    try {
      const res = await fetch(`${window.NEARSERVE_API_BASE}/workers/review/${encodeURIComponent(phone)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const status = (data.status || "").trim().toLowerCase();

      if (status === "probation" || status === "full_access") {
        clearInterval(statusPoller);
        showSuccess("✅ Admin approved your proof. Redirecting...");
        setTimeout(() => {
          goToNextPageByRole(role, status);
        }, 800);
      }
    } catch (err) {
      console.log("Polling failed:", err);
    }
  }, 5000);
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    clearMsg();

    const file = fileInput.files[0];
    if (!file) {
      submitBtn.disabled = true;
      preview.classList.add("hidden");
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      fileInput.value = "";
      submitBtn.disabled = true;
      preview.classList.add("hidden");
      showError("Only PDF files are allowed.");
      return;
    }

    if (file.size > MAX_SIZE) {
      fileInput.value = "";
      submitBtn.disabled = true;
      preview.classList.add("hidden");
      showError(`File too large. Max allowed is ${formatSize(MAX_SIZE)}.`);
      return;
    }

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatSize(file.size);
    preview.classList.remove("hidden");
    submitBtn.disabled = false;
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();

    const file = fileInput.files[0];
    if (!file) {
      showError("Please select a PDF first.");
      return;
    }

    const phone = getCurrentPhone();
    const role = getCurrentRole();

    if (!phone) {
      showError("Phone not found. Please login again.");
      return;
    }

    if (!role) {
      showError("Role not found. Please login again.");
      return;
    }

    const formData = new FormData();
    formData.append("proof", file);

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading...";

      const res = await fetch(`${window.NEARSERVE_API_BASE}/workers/upload-proof/${encodeURIComponent(phone)}`, {
        method: "POST",
        body: formData
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (!res.ok) {
        showError(data.error || text || "Upload failed.");
        submitBtn.textContent = "Submit Proof";
        submitBtn.disabled = false;
        return;
      }

      showSuccess((data.message || "✅ Proof uploaded successfully!") + " Waiting for admin approval...");
      preview.classList.remove("hidden");
      submitBtn.textContent = "Submitted";
      submitBtn.disabled = true;

      // ✅ Start checking until admin approves
      startStatusPolling();

    } catch (err) {
      showError("Server not responding. Please try again.");
      submitBtn.textContent = "Submit Proof";
      submitBtn.disabled = false;
    }
  });
}

loadProofReviewMessage();
startStatusPolling();
