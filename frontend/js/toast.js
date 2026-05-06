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
      .ns-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        bottom: auto;
        left: auto;
        width: auto;
        min-width: min(260px, calc(100vw - 32px));
        max-width: min(380px, calc(100vw - 32px));
        min-height: 0;
        height: auto;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: #145c3f;
        color: white;
        padding: 14px 18px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 16px 34px rgba(15, 61, 46, 0.24);
        box-sizing: border-box;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.45;
        z-index: 99999;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
        text-align: left;
        overflow: visible;
      }

      .ns-toast.show {
        opacity: 1;
        transform: translateY(0);
      }

      .ns-toast.error {
        background: #b91c1c;
      }

      .ns-toast.success {
        background: #145c3f;
      }

      .ns-toast.info {
        background: #1d4ed8;
      }

      .ns-toast .toast-icon {
        flex: 0 0 auto;
        font-weight: 900;
        line-height: 1.45;
      }

      .ns-toast .toast-message {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      @media (max-width: 768px) {
        .ns-toast {
          top: 14px;
          right: 14px;
          left: 14px;
          bottom: auto;
          width: auto;
          min-width: 0;
          max-width: none;
          padding: 12px 14px;
          border-radius: 9px;
          font-size: 13px;
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
    toast.className = `ns-toast ${normalizedType}`;
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
