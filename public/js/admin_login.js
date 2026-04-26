window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const msg = document.getElementById("msg");
  const loginBtn = document.getElementById("adminLoginBtn");

  function showMsg(text, color = "crimson") {
    msg.style.color = color;
    msg.textContent = text;
  }

  if (!form) {
    console.log("Admin login form not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Admin submit event triggered");

    const username = document.getElementById("adminUser").value.trim();
    const password = document.getElementById("adminPass").value.trim();

    if (!username || !password) {
      showMsg("Please fill all fields.");
      return;
    }

    showMsg("");

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));
      console.log("ADMIN LOGIN RESPONSE:", data);

      if (!res.ok) {
        showMsg(data.message || data.error || "Login failed");
        return;
      }

      if (!data.token) {
        showMsg("No token received from server");
        return;
      }

      localStorage.setItem("adminToken", data.token);

      if (data.admin) {
        localStorage.setItem("adminUser", data.admin.username || username);
      }

      window.location.href = "admin_dashboard.html";
    } catch (err) {
      console.error("Admin login error:", err);
      showMsg("Server not responding");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  });
});
