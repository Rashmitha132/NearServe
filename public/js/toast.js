(function () {
  if (window.nearServeToast) {
    window.showToast = window.nearServeToast;
    return;
  }

  function ensureToastStyles() {
    if (document.getElementById("nearserve-toast-styles")) return;

    const style = document.createElement("style");
    style.id = "nearserve-toast-styles";
    style.textContent = `
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: min(360px, calc(100vw - 32px));
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: #1f6f4a;
        color: white;
        padding: 14px 18px;
        border-radius: 10px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        font-size: 14px;
        font-weight: 700;
        line-height: 1.45;
        z-index: 99999;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .toast.show {
        opacity: 1;
        transform: translateY(0);
      }

      .toast.error {
        background: #e74c3c;
      }

      .toast.success {
        background: #27ae60;
      }

      .toast.info {
        background: #3498db;
      }

      .toast-icon {
        flex: 0 0 auto;
        font-weight: 900;
      }

      .toast-message {
        min-width: 0;
      }

      @media (max-width: 768px) {
        .toast {
          top: 14px;
          right: 14px;
          left: 14px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.nearServeToast = function showToast(message, type = "error") {
    ensureToastStyles();

    const normalizedType = ["success", "error", "info"].includes(type) ? type : "error";
    const icons = {
      success: "\u2714",
      error: "\u274C",
      info: "\u2139"
    };

    const toast = document.createElement("div");
    toast.className = `toast ${normalizedType}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = icons[normalizedType];

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = String(message || "");

    toast.append(icon, text);
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  window.showToast = window.nearServeToast;
})();
