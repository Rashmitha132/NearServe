const form = document.getElementById("proofForm");
const fileInput = document.getElementById("proofFile");
const submitBtn = document.getElementById("submitBtn");
const preview = document.getElementById("preview");
const fileNameEl = document.getElementById("fileName");
const fileSizeEl = document.getElementById("fileSize");
const errorMsg = document.getElementById("errorMsg");

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

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

// ✅ NEW: show admin reject reason / status message on page load
async function loadProofReviewMessage() {
  const phone = localStorage.getItem("phone");
  if (!phone) return;

  try {
    // This endpoint must exist in server.js:
    // GET /worker/review/:phone
    const res = await fetch(`/worker/review/${phone}`);
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) return;

    // When admin rejected proof, show reason
    if (data.proofReview && data.proofReview.status === "rejected") {
      showError("❌ Proof rejected: " + (data.proofReview.reason || "No reason given."));
      return;
    }

    // When proof uploaded and waiting admin
    if (data.status === "proof_submitted") {
      showInfo("⏳ Proof already submitted. Waiting for admin verification.");
      return;
    }

    // When admin approved and moved to probation
    if (data.proofReview && data.proofReview.status === "approved") {
      showSuccess("✅ Proof approved by admin. You can proceed.");
      return;
    }

  } catch (err) {
    // ignore silently (not critical)
  }
}

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

  // Preview
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatSize(file.size);
  preview.classList.remove("hidden");

  submitBtn.disabled = false;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  const file = fileInput.files[0];
  if (!file) {
    showError("Please select a PDF first.");
    return;
  }

  const phone = localStorage.getItem("phone");
  const role = localStorage.getItem("role");

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

    const res = await fetch(`/upload-proof/${phone}`, {
      method: "POST",
      body: formData
    });

    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      showError(data.error || text || "Upload failed.");
      submitBtn.textContent = "Submit Proof";
      submitBtn.disabled = false;
      return;
    }

    // ✅ SUCCESS MESSAGE
    showSuccess((data.message || "✅ Proof uploaded successfully!") + " Redirecting...");

    setTimeout(() => {
      if (role === "carpenter") window.location.href = "/carpenter_dashboard.html";
      else if (role === "plumber") window.location.href = "/plumber_dashboard.html";
      else if (role === "electrician") window.location.href = "/electrician_dashboard.html";
      else window.location.href = "/login.html";
    }, 1000);

  } catch (err) {
    showError("Server not responding. Check server and route /upload-proof/:phone");
    submitBtn.textContent = "Submit Proof";
    submitBtn.disabled = false;
  }
});

// Run on page load
loadProofReviewMessage();