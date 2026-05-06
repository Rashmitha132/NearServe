  const API_BASE = window.NEARSERVE_API_BASE;
  const MAX_SIZE = 2 * 1024 * 1024;

  function getStoredPhone() {
    return (localStorage.getItem("userPhone") || localStorage.getItem("phone") || "").trim();
  }

  function getStoredRole() {
    return (localStorage.getItem("userRole") || localStorage.getItem("role") || "").trim().toLowerCase();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function showError(msg) {
    const e = document.getElementById("errorMsg");
    e.textContent = msg;
    e.className = "msg-box msg-error show";
  }

  function showSuccess(msg) {
    const e = document.getElementById("successMsg");
    e.textContent = msg;
    e.className = "msg-box msg-success show";
  }

  function clearMsgs() {
    document.getElementById("errorMsg").className = "msg-box msg-error";
    document.getElementById("successMsg").className = "msg-box msg-success";
    document.getElementById("globalMsg").className = "msg-box";
    document.getElementById("globalMsg").textContent = "";
  }

  function resetSubmitButton() {
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.style.display = "";
    btn.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Submit Aadhaar for Verification
    `;
  }

  function removeFile() {
    document.getElementById("proofFile").value = "";
    document.getElementById("preview").classList.remove("show");
    const box = document.getElementById("aadhaarBox");
    box.classList.remove("has-file");
    box.style.display = "";
    resetSubmitButton();
    clearMsgs();
  }

  function redirectToWorkerDashboard() {
    const role = getStoredRole();

    if (role === "carpenter") {
      window.location.href = "/carpenter_dashboard.html";
    } else if (role === "plumber") {
      window.location.href = "/plumber_dashboard.html";
    } else if (role === "electrician") {
      window.location.href = "/electrician_dashboard.html";
    } else {
      window.location.href = "/login.html";
    }
  }

  function setWaitingUI() {
    const box = document.getElementById("aadhaarBox");
    const btn = document.getElementById("submitBtn");
    const lbl = document.querySelector(".slbl");
    const preview = document.getElementById("preview");

    box.style.display = "none";
    preview.classList.remove("show");
    document.getElementById("proofFile").style.display = "none";
    btn.style.display = "";
    btn.innerHTML = "Waiting for Admin Approval";
    btn.disabled = true;

    if (lbl) lbl.textContent = "Aadhaar Submitted - Awaiting Admin Review";
  }

  function setApprovedUI() {
    const el = document.getElementById("globalMsg");
    const box = document.getElementById("aadhaarBox");
    const btn = document.getElementById("submitBtn");
    const preview = document.getElementById("preview");
    const lbl = document.querySelector(".slbl");

    el.textContent = "Aadhaar approved. Redirecting to your dashboard...";
    el.className = "msg-box msg-success show";

    box.style.display = "none";
    preview.classList.remove("show");
    btn.style.display = "none";

    if (lbl) lbl.textContent = "Aadhaar Approved";
  }

  function setRejectedUI(reason) {
    const el = document.getElementById("globalMsg");
    const box = document.getElementById("aadhaarBox");
    const btn = document.getElementById("submitBtn");
    const fileInput = document.getElementById("proofFile");
    const preview = document.getElementById("preview");
    const lbl = document.querySelector(".slbl");

    el.textContent = "Your Aadhaar was rejected: " + (reason || "No reason given. Please re-upload.");
    el.className = "msg-box msg-error show";

    box.style.display = "";
    box.classList.remove("has-file");
    preview.classList.remove("show");
    fileInput.style.display = "none";
    fileInput.value = "";
    btn.style.display = "";
    btn.disabled = true;
    btn.innerHTML = "Re-upload Aadhaar for Verification";

    if (lbl) lbl.textContent = "Aadhaar Rejected - Upload Again";
  }

  function enableUploadAgain() {
    const box = document.getElementById("aadhaarBox");
    const fileInput = document.getElementById("proofFile");
    const btn = document.getElementById("submitBtn");

    box.style.display = "";
    fileInput.style.display = "none";
    btn.style.display = "";
    btn.disabled = true;
  }

  document.getElementById("proofFile").addEventListener("change", function () {
    clearMsgs();
    const file = this.files[0];

    if (!file) {
      document.getElementById("submitBtn").disabled = true;
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      this.value = "";
      showError("Only PDF files are allowed.");
      document.getElementById("submitBtn").disabled = true;
      return;
    }

    if (file.size > MAX_SIZE) {
      this.value = "";
      showError("File too large. Maximum allowed size is 2 MB.");
      document.getElementById("submitBtn").disabled = true;
      return;
    }

    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileSize").textContent = formatSize(file.size);
    document.getElementById("preview").classList.add("show");
    const uploadBox = document.getElementById("aadhaarBox");
    uploadBox.classList.add("has-file");
    uploadBox.style.display = "none";
    document.getElementById("submitBtn").disabled = false;
    document.getElementById("submitBtn").innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Submit Aadhaar for Verification
    `;
  });

  document.getElementById("submitBtn").addEventListener("click", async function () {
    const phone = getStoredPhone();
    const file = document.getElementById("proofFile").files[0];

    if (!phone) {
      showError("Phone not found. Please login again.");
      return;
    }

    if (!file) {
      showError("Please select your Aadhaar PDF first.");
      return;
    }

    const btn = this;
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Uploading...
    `;
    clearMsgs();

    const formData = new FormData();
    formData.append("proof", file);

    try {
      const res = await fetch(`${API_BASE}/workers/upload-proof/${phone}`, {
        method: "POST",
        body: formData
      });

      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}

      if (!res.ok) {
        showError(data.error || data.message || "Upload failed. Please try again.");
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Submit Aadhaar for Verification
        `;
        return;
      }

      showSuccess("Aadhaar submitted successfully. Please wait for admin verification (24-48 hours). You'll get access once approved.");
      setWaitingUI();
    } catch (err) {
      showError("Server not responding. Please try again.");
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Submit Aadhaar for Verification
      `;
    }
  });

  async function loadProofReviewMessage() {
    const phone = getStoredPhone();
    if (!phone) return;

    try {
      const res = await fetch(`${API_BASE}/workers/review/${phone}`);
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}

      if (!res.ok) return;

      const status = (data.status || "").toLowerCase();
      const reviewStatus = (data.proofReview?.status || "").toLowerCase();

      if (reviewStatus === "rejected") {
        enableUploadAgain();
        setRejectedUI(data.proofReview?.reason || "No reason given. Please re-upload.");
        return;
      }

      if (
        reviewStatus === "approved" ||
        status === "probation" ||
        status === "full_access"
      ) {
        setApprovedUI();
        setTimeout(() => {
          redirectToWorkerDashboard();
        }, 1500);
        return;
      }

      if (status === "proof_submitted") {
        const el = document.getElementById("globalMsg");
        el.textContent = "Aadhaar already submitted. Waiting for admin verification - please check back in 24-48 hours. You cannot re-upload until admin reviews.";
        el.className = "msg-box msg-info show";
        setWaitingUI();
        return;
      }

      resetSubmitButton();
    } catch (err) {
      console.error("Error loading proof review message:", err);
    }
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });

  loadProofReviewMessage();

  const pollInterval = setInterval(async () => {
    const phone = getStoredPhone();
    if (!phone) {
      clearInterval(pollInterval);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${phone}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) return;

      const status = (data.status || "").toLowerCase();
      const reviewStatus = (data.proofReview?.status || "").toLowerCase();

      if (
        reviewStatus === "approved" ||
        status === "probation" ||
        status === "full_access"
      ) {
        clearInterval(pollInterval);
        setApprovedUI();
        setTimeout(() => {
          redirectToWorkerDashboard();
        }, 1500);
        return;
      }

      if (reviewStatus === "rejected" && status === "pending_verification") {
        clearInterval(pollInterval);
        enableUploadAgain();
        setRejectedUI(data.proofReview?.reason || "No reason given. Please re-upload.");
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 10000);