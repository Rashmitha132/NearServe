const API_BASE = window.NEARSERVE_API_BASE;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const selectedFiles = { 1: null, 2: null, 3: null };
let submittedJobs = {};

function getStoredPhone() {
  return (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
}

function getStoredRole() {
  return (localStorage.getItem("userRole") || localStorage.getItem("role") || "").trim().toLowerCase();
}

function getStoredName() {
  return localStorage.getItem("userName") || localStorage.getItem("name") || "Plumber";
}

const phone = getStoredPhone();
const role = getStoredRole();
const workerName = getStoredName();

document.getElementById("workerName").textContent = workerName;
document.getElementById("workerAvatar").textContent = workerName.charAt(0).toUpperCase();

function showGlobal(message, type = "info") {
  const box = document.getElementById("globalMsg");
  box.textContent = message;
  box.className = "msg-box msg-" + type + " show";
}

function hideGlobal() {
  const box = document.getElementById("globalMsg");
  box.textContent = "";
  box.className = "msg-box";
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function resetPreview(i) {
  selectedFiles[i] = null;
  document.getElementById(`file${i}`).value = "";
  document.getElementById(`preview${i}`).classList.remove("show");
  document.getElementById(`name${i}`).textContent = "-";
  document.getElementById(`size${i}`).textContent = "-";
  document.getElementById(`btnUpload${i}`).disabled = true;
}

function removeSelectedFile(i) {
  resetPreview(i);
}

function setCardState(i, type, badgeText, reason = "") {
  const card = document.getElementById(`card${i}`);
  const badge = document.getElementById(`badge${i}`);
  const reasonEl = document.getElementById(`reason${i}`);
  const chooseBtn = document.getElementById(`btnChoose${i}`);
  const uploadBtn = document.getElementById(`btnUpload${i}`);

  card.className = "video-card";
  badge.className = "vc-badge";
  reasonEl.classList.remove("show");
  reasonEl.textContent = "";

  if (type === "approved") {
    card.classList.add("approved");
    badge.classList.add("badge-approved");
    chooseBtn.style.display = "none";
    uploadBtn.style.display = "none";
    resetPreview(i);
  } else if (type === "review") {
    card.classList.add("review");
    badge.classList.add("badge-review");
    chooseBtn.style.display = "none";
    uploadBtn.style.display = "none";
    resetPreview(i);
  } else if (type === "rejected") {
    card.classList.add("rejected");
    badge.classList.add("badge-rejected");
    chooseBtn.style.display = "inline-flex";
    uploadBtn.style.display = "inline-flex";
    if (reason) {
      reasonEl.textContent = "Reason: " + reason;
      reasonEl.classList.add("show");
    }
  } else {
    badge.classList.add("badge-pending");
    chooseBtn.style.display = "inline-flex";
    uploadBtn.style.display = "inline-flex";
  }

  badge.textContent = badgeText;
}

async function checkWorkerStatus() {
  const res = await fetch(`${API_BASE}/profile/${phone}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Failed to load profile");
  }

  const status = (data.status || "").toLowerCase();

  if (status === "pending_verification" || status === "proof_submitted") {
    window.location.replace("upload_proof.html");
    return false;
  }

  if (status === "full_access") {
    window.location.replace("plumber_requests.html");
    return false;
  }

  return true;
}

async function loadDashboard() {
  try {
    hideGlobal();

    if (!phone || role !== "plumber") {
      window.location.replace("login.html");
      return;
    }

    const ok = await checkWorkerStatus();
    if (!ok) return;

    const res = await fetch(`${API_BASE}/workers/my-jobs/${phone}`);
    const data = await res.json().catch(() => ({}));
    const jobs = Array.isArray(data.jobs) ? data.jobs : (Array.isArray(data) ? data : []);

    submittedJobs = {};
    for (let i = 1; i <= 3; i++) {
      setCardState(i, "pending", "Not uploaded");
    }

    jobs.forEach(job => {
      if (Number(job.videoIndex) >= 1 && Number(job.videoIndex) <= 3) {
        submittedJobs[Number(job.videoIndex)] = job;
      }
    });

    let approvedCount = 0;

    for (let i = 1; i <= 3; i++) {
      const job = submittedJobs[i];
      if (!job) continue;

      const status = (job.status || "").toLowerCase();
      const reviewStatus = (job.videoReview?.status || "").toLowerCase();
      const rejectReason = job.videoReview?.reason || "";

      if (status === "completed" || reviewStatus === "approved") {
        approvedCount++;
        setCardState(i, "approved", "Approved");
      } else if (status === "submitted") {
        setCardState(i, "review", "Under Review");
      } else if (status === "rejected" || reviewStatus === "rejected") {
        setCardState(i, "rejected", "Rejected", rejectReason);
      } else {
        setCardState(i, "pending", "Not uploaded");
      }
    }

    if (approvedCount === 3) {
      showGlobal("All 3 videos approved. Redirecting...", "success");
      setTimeout(() => {
        window.location.replace("plumber_requests.html");
      }, 1200);
      return;
    }
  } catch (err) {
    console.error(err);
    showGlobal(err.message || "Failed to submit video", "error");
  }
}

for (let i = 1; i <= 3; i++) {
  document.getElementById(`file${i}`).addEventListener("change", function () {
    hideGlobal();
    const file = this.files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      showGlobal(`Only video files are allowed for Video ${i}.`, "error");
      this.value = "";
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      showGlobal(`Video ${i} is too large. Maximum 50 MB allowed.`, "error");
      this.value = "";
      return;
    }

    selectedFiles[i] = file;
    document.getElementById(`name${i}`).textContent = file.name;
    document.getElementById(`size${i}`).textContent = formatSize(file.size);
    document.getElementById(`preview${i}`).classList.add("show");
    document.getElementById(`btnUpload${i}`).disabled = false;
  });
}

async function submitVideo(index) {
  try {
    hideGlobal();

    const file = selectedFiles[index];
    if (!file) {
      showGlobal(`Choose video ${index} first.`, "error");
      return;
    }

    const createRes = await fetch(`${API_BASE}/workers/probation-job/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        role: "plumber",
        videoIndex: index
      })
    });

    const createData = await createRes.json().catch(() => ({}));

    if (!createRes.ok) {
      throw new Error(createData.error || createData.message || "Failed to prepare job");
    }

    const jobId = createData.jobId;

    const formData = new FormData();
    formData.append("status", "submitted");
    formData.append("videoProof", file);

    const uploadRes = await fetch(`${API_BASE}/workers/update-job/${jobId}`, {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json().catch(() => ({}));

    if (!uploadRes.ok) {
      throw new Error(uploadData.error || uploadData.message || "Upload failed");
    }

    showGlobal(`Video ${index} submitted successfully.`, "success");
    resetPreview(index);
    await loadDashboard();
  } catch (err) {
    console.error(err);
    showGlobal(err.message || "Failed to submit video", "error");
  }
}

document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("userPhone");
  localStorage.removeItem("phone");
  localStorage.removeItem("userName");
  localStorage.removeItem("name");
  localStorage.removeItem("userRole");
  localStorage.removeItem("role");
  window.location.href = "login.html";
});

window.addEventListener("DOMContentLoaded", loadDashboard);

setInterval(async () => {
  if (document.visibilityState === "visible") {
    await loadDashboard();
  }
}, 8000);