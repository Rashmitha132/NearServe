/* â”€â”€ TOAST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function showToast(msg, type = "error") {
  window.nearServeToast(msg, type);
}

/* â”€â”€ MODAL (replaces native prompt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let _rejectResolve = null;

function askRejectReason(label) {
  return new Promise(resolve => {
    _rejectResolve = resolve;
    document.getElementById("rejectModalLabel").textContent =
      `Please provide a reason for rejecting this ${label}. This will be sent to the worker.`;
    document.getElementById("rejectReason").value = "";
    document.getElementById("rejectModal").classList.remove("hidden");
  });
}

document.getElementById("rejectCancel").addEventListener("click", () => {
  document.getElementById("rejectModal").classList.add("hidden");
  if (_rejectResolve) _rejectResolve(null);
});

document.getElementById("rejectConfirm").addEventListener("click", () => {
  const reason = document.getElementById("rejectReason").value.trim();
  if (!reason) {
    document.getElementById("rejectReason").style.borderColor = "var(--red)";
    return;
  }
  document.getElementById("rejectReason").style.borderColor = "";
  document.getElementById("rejectModal").classList.add("hidden");
  if (_rejectResolve) _rejectResolve(reason);
});

/* â”€â”€ COUNTERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let sessionApproved = 0;
let sessionRejected = 0;

function updateStats(pending, videos) {
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statVideos").textContent  = videos;
  document.getElementById("statApproved").textContent = sessionApproved;
  document.getElementById("statRejected").textContent = sessionRejected;
}